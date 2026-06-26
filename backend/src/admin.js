import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, getDirectoryTree, tx, listChangeRequests, getChangeRequest, getChangeRequestImage, countPendingChangeRequests, approveChangeRequest, rejectChangeRequest } from './db.js';
import { mirrorResponseToSheet, getSheetStatus } from './sheets.js';
import {
  treeToRows, serializeCsv, decodeUpload, parseCsv,
  headerIndex, rowToRecord, buildPlan, applyPlan,
  snapshotDirectory, restoreLatestSnapshot,
} from './directory-import.js';

const router = express.Router();

const env = (k, fallback) => process.env[k] ?? fallback;
const JWT_SECRET = () => env('JWT_SECRET');
const ADMIN_JWT_EXPIRES_IN = () => env('ADMIN_JWT_EXPIRES_IN', '2h');
const NODE_ENV = () => env('NODE_ENV', 'development');

const ADMIN_AUDIENCE = 'admin';

function issueAdminJwt(admin) {
  return jwt.sign(
    { sub: admin.id, username: admin.username, aud: ADMIN_AUDIENCE },
    JWT_SECRET(),
    { expiresIn: ADMIN_JWT_EXPIRES_IN() }
  );
}

function setAdminCookie(res, token) {
  const isHttps = NODE_ENV() === 'production' && (res.req?.secure || res.req?.headers['x-forwarded-proto'] === 'https');
  res.cookie('admin_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isHttps,
    maxAge: 2 * 60 * 60 * 1000,
  });
}

export async function requireAdmin(req, res, next) {
  const token = req.cookies?.admin_token;
  if (!token) return res.status(401).json({ error: 'unauthenticated' });
  try {
    const payload = jwt.verify(token, JWT_SECRET(), { audience: ADMIN_AUDIENCE });
    const admin = await db.prepare('SELECT id, username FROM admins WHERE id = ?').get(payload.sub);
    if (!admin) return res.status(401).json({ error: 'admin_not_found' });
    req.admin = admin;
    next();
  } catch {
    return res.status(401).json({ error: 'invalid_token' });
  }
}

// === Routes ===

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'missing_credentials' });

  const admin = await db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
  if (!admin) return res.status(401).json({ error: 'invalid_credentials' });

  const ok = await bcrypt.compare(password, admin.password_hash);
  if (!ok) return res.status(401).json({ error: 'invalid_credentials' });

  await db.prepare('UPDATE admins SET last_login_at = now() WHERE id = ?').run(admin.id);
  setAdminCookie(res, issueAdminJwt(admin));
  res.json({ admin: { id: admin.id, username: admin.username } });
});

router.post('/logout', (req, res) => {
  res.clearCookie('admin_token');
  res.status(204).end();
});

router.get('/me', requireAdmin, (req, res) => {
  res.json({ admin: req.admin });
});

// === Dashboard 통계 ===
router.get('/stats', requireAdmin, async (req, res) => {
  const surveyId = 1; // 단일 신청 설문 가정 (MVP)

  const total = (await db.prepare('SELECT COUNT(*)::int AS c FROM responses WHERE survey_id = ?').get(surveyId)).c;

  const last24hRow = await db.prepare(
    "SELECT COUNT(*)::int AS c FROM responses WHERE survey_id = ? AND submitted_at >= now() - interval '1 day'"
  ).get(surveyId);

  const notSyncedRow = await db.prepare(
    'SELECT COUNT(*)::int AS c FROM responses WHERE survey_id = ? AND sheet_synced_at IS NULL'
  ).get(surveyId);

  // 동적 question_id 매핑 (ADR 0005: ord 1=트랙(single), 2~4=1/2/3지망(short_text))
  const qs = await db.prepare(
    'SELECT id, ord, type FROM questions WHERE survey_id = ? ORDER BY ord'
  ).all(surveyId);
  const trackQ = qs.find(q => q.ord === 1 && q.type === 'single');
  const prefQIds = qs.filter(q => q.ord >= 2 && q.ord <= 4 && q.type === 'short_text').map(q => q.id);

  // 트랙별 분포 (Q1, single)
  const trackRows = trackQ ? await db.prepare(`
    SELECT qo.label, COUNT(*)::int AS c
    FROM answers a JOIN responses r ON r.id = a.response_id
    JOIN question_options qo ON qo.id = (a.selected_option_ids::jsonb ->> 0)::int
    WHERE a.question_id = ? AND r.survey_id = ?
    GROUP BY qo.label, qo.ord
    ORDER BY qo.ord
  `).all(trackQ.id, surveyId) : [];

  // 지망 학과/전공 top 10 (1/2/3지망 short_text 통합 집계)
  let prefRows = [];
  if (prefQIds.length) {
    const placeholders = prefQIds.map(() => '?').join(',');
    prefRows = await db.prepare(`
      SELECT TRIM(a.text_value) AS pref, COUNT(*)::int AS c
      FROM answers a JOIN responses r ON r.id = a.response_id
      WHERE a.question_id IN (${placeholders}) AND r.survey_id = ?
        AND TRIM(COALESCE(a.text_value,'')) <> ''
      GROUP BY pref ORDER BY c DESC, pref LIMIT 10
    `).all(...prefQIds, surveyId);
  }

  res.json({
    total_responses: total,
    last_24h: last24hRow.c,
    not_synced: notSyncedRow.c,
    track_distribution: trackRows.map(r => ({ label: r.label, count: r.c })),
    top_preferences: prefRows.map(r => ({ label: r.pref, count: r.c })),
    sheet: getSheetStatus(),
    generated_at: new Date().toISOString(),
  });
});

// === 누락분 재동기화 ===
router.post('/sync', requireAdmin, async (req, res) => {
  const status = getSheetStatus();
  if (!status.configured) {
    return res.status(400).json({ error: 'sheet_not_configured' });
  }
  const rows = await db.prepare(
    'SELECT id FROM responses WHERE sheet_synced_at IS NULL ORDER BY id'
  ).all();

  let synced = 0;
  let failed = 0;
  for (const r of rows) {
    try {
      await mirrorResponseToSheet(r.id);
      synced++;
    } catch (err) {
      console.error(`[sync] response ${r.id} failed:`, err.message);
      failed++;
    }
  }
  res.json({ attempted: rows.length, synced, failed });
});

// === CSV 다운로드 ===
router.get('/responses.csv', requireAdmin, async (req, res) => {
  // ADR 0005 — email·트랙·1/2/3지망만 내보냄 (이름/학번/학과/이수학기 제거).
  // ord 1=트랙(single), 2~4=1/2/3지망(short_text)
  const qs = await db.prepare(
    'SELECT id, ord, type FROM questions WHERE survey_id = 1 ORDER BY ord'
  ).all();
  const trackQ = qs.find(q => q.ord === 1 && q.type === 'single');
  const pref1 = qs.find(q => q.ord === 2);
  const pref2 = qs.find(q => q.ord === 3);
  const pref3 = qs.find(q => q.ord === 4);

  const rows = await db.prepare(`
    SELECT r.id, r.submitted_at, u.email,
           (SELECT qo.label FROM answers a JOIN question_options qo
              ON qo.id = (a.selected_option_ids::jsonb ->> 0)::int
              WHERE a.response_id = r.id AND a.question_id = ?) AS 트랙,
           (SELECT a.text_value FROM answers a WHERE a.response_id = r.id AND a.question_id = ?) AS 지망1,
           (SELECT a.text_value FROM answers a WHERE a.response_id = r.id AND a.question_id = ?) AS 지망2,
           (SELECT a.text_value FROM answers a WHERE a.response_id = r.id AND a.question_id = ?) AS 지망3
    FROM responses r JOIN users u ON u.id = r.user_id
    WHERE r.survey_id = 1
    ORDER BY r.submitted_at
  `).all(trackQ?.id ?? -1, pref1?.id ?? -1, pref2?.id ?? -1, pref3?.id ?? -1);

  const headers = ['response_id','submitted_at','email','트랙','1지망','2지망','3지망'];
  const esc = v => {
    if (v == null) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
  };
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push([r.id, r.submitted_at, r.email, r.트랙, r.지망1, r.지망2, r.지망3].map(esc).join(','));
  }
  // UTF-8 BOM (엑셀에서 한글 깨짐 방지)
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="responses-${new Date().toISOString().slice(0,10)}.csv"`);
  res.send('﻿' + lines.join('\n'));
});

// === 학과 디렉터리 관리 (CRUD, 관리자 전용) ===
const MAX_IMG = 2 * 1024 * 1024; // 2MB

function parseImage(dataUrl) {
  const m = /^data:([\w/+.-]+);base64,(.+)$/s.exec(dataUrl || '');
  if (!m) return null;
  return { mime: m[1], buf: Buffer.from(m[2], 'base64') };
}

function rowParams(b) {
  return [
    String(b.gyeyeol || '').trim(), String(b.name || '').trim(),
    b.recruit === false ? 0 : 1, b.homepage || null,
    JSON.stringify(Array.isArray(b.hashtags) ? b.hashtags : []),
    b.location || null, b.phone || null,
    b.bk21 ? 1 : 0, b.bk21_name || null, b.bk21_url || null,
    b.intro || null, Number.isInteger(b.ord) ? b.ord : 0,
  ];
}

// 이미지 적용(image=dataURL 저장 / imageClear=true 제거). table: dir_departments|dir_majors
async function applyImage(table, id, b, res) {
  if (b.imageClear) {
    await db.prepare(`UPDATE ${table} SET image_mime=NULL, image_data=NULL WHERE id=?`).run(id);
  } else if (b.image) {
    const img = parseImage(b.image);
    if (!img) { res.status(400).json({ error: 'bad_image' }); return false; }
    if (!/^image\//.test(img.mime)) { res.status(400).json({ error: 'not_image' }); return false; }
    if (img.buf.length > MAX_IMG) { res.status(413).json({ error: 'image_too_large' }); return false; }
    await db.prepare(`UPDATE ${table} SET image_mime=?, image_data=? WHERE id=?`).run(img.mime, img.buf, id);
  }
  return true;
}

const DEPT_COLS = 'gyeyeol,name,recruit,homepage,hashtags,location,phone,bk21,bk21_name,bk21_url,intro,ord';
const DEPT_VALS = '?,?,?,?,?::jsonb,?,?,?,?,?,?,?';
const DEPT_SET = 'gyeyeol=?,name=?,recruit=?,homepage=?,hashtags=?::jsonb,location=?,phone=?,bk21=?,bk21_name=?,bk21_url=?,intro=?,ord=?';

// 학과 생성
router.post('/departments', requireAdmin, async (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.gyeyeol) return res.status(400).json({ error: 'name_and_gyeyeol_required' });
  const row = await db.prepare(`INSERT INTO dir_departments (${DEPT_COLS}) VALUES (${DEPT_VALS}) RETURNING id`).get(...rowParams(b));
  if (!(await applyImage('dir_departments', row.id, b, res))) return;
  res.json({ id: row.id });
});

// 학과 수정
router.put('/departments/:id', requireAdmin, async (req, res) => {
  const b = req.body || {};
  const id = req.params.id;
  const exist = await db.prepare('SELECT id FROM dir_departments WHERE id=?').get(id);
  if (!exist) return res.status(404).json({ error: 'not_found' });
  await db.prepare(`UPDATE dir_departments SET ${DEPT_SET} WHERE id=?`).run(...rowParams(b), id);
  if (!(await applyImage('dir_departments', id, b, res))) return;
  res.json({ id: Number(id) });
});

// 학과 삭제 (세부전공 cascade)
router.delete('/departments/:id', requireAdmin, async (req, res) => {
  await db.prepare('DELETE FROM dir_departments WHERE id=?').run(req.params.id);
  res.status(204).end();
});

// 세부전공 생성
router.post('/departments/:id/majors', requireAdmin, async (req, res) => {
  const b = req.body || {};
  const dept = await db.prepare('SELECT id FROM dir_departments WHERE id=?').get(req.params.id);
  if (!dept) return res.status(404).json({ error: 'dept_not_found' });
  if (!b.name) return res.status(400).json({ error: 'name_required' });
  const row = await db.prepare(`INSERT INTO dir_majors (dept_id,${DEPT_COLS.replace('gyeyeol,', '')}) VALUES (?,${DEPT_VALS.replace('?,?,', '?,')}) RETURNING id`)
    .get(req.params.id, ...rowParams({ ...b, gyeyeol: '_' }).slice(1));
  if (!(await applyImage('dir_majors', row.id, b, res))) return;
  res.json({ id: row.id });
});

// 세부전공 수정
router.put('/departments/:id/majors/:mid', requireAdmin, async (req, res) => {
  const b = req.body || {};
  const m = await db.prepare('SELECT id FROM dir_majors WHERE id=? AND dept_id=?').get(req.params.mid, req.params.id);
  if (!m) return res.status(404).json({ error: 'not_found' });
  await db.prepare(`UPDATE dir_majors SET ${DEPT_SET.replace('gyeyeol=?,', '')} WHERE id=?`).run(...rowParams({ ...b, gyeyeol: '_' }).slice(1), req.params.mid);
  if (!(await applyImage('dir_majors', req.params.mid, b, res))) return;
  res.json({ id: Number(req.params.mid) });
});

// 세부전공 삭제
router.delete('/departments/:id/majors/:mid', requireAdmin, async (req, res) => {
  await db.prepare('DELETE FROM dir_majors WHERE id=? AND dept_id=?').run(req.params.mid, req.params.id);
  res.status(204).end();
});

// === 디렉터리 CSV 일괄 수정 (내보내기 / 미리보기 / 적용) ===
router.get('/directory/export', requireAdmin, async (req, res) => {
  const tree = await getDirectoryTree();
  const csv = '﻿' + serializeCsv(treeToRows(tree)); // UTF-8 BOM
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', 'attachment; filename="directory.csv"');
  res.send(csv);
});

// 업로드 본문(base64 CSV) → 파싱·검증·plan. 쓰기 없음.
async function parseUpload(body) {
  const buf = Buffer.from((body && body.csvBase64) || '', 'base64');
  const { text, encoding, garbled } = decodeUpload(buf);
  const rows = parseCsv(text);
  if (!rows.length) return { error: 'empty' };
  if (rows.length > 5000) return { error: 'too_many_rows' }; // 디렉터리 규모(수백)를 크게 넘는 입력 차단
  const idx = headerIndex(rows[0]);
  const records = rows.slice(1)
    .filter((r) => r.some((c) => (c || '').trim() !== '')) // 빈 줄 무시
    .map((cells, i) => rowToRecord(idx, cells, i + 2));
  const plan = buildPlan(records, await getDirectoryTree());
  return { encoding, garbled, plan };
}

router.post('/directory/import/preview', requireAdmin, async (req, res) => {
  try {
    const r = await parseUpload(req.body);
    if (r.error) return res.status(400).json({ error: r.error });
    res.json({ encoding: r.encoding, garbled: r.garbled, summary: r.plan.summary, rows: r.plan.reports });
  } catch (e) { console.error('[dir import preview]', e.message); res.status(500).json({ error: 'internal' }); }
});

router.post('/directory/import/commit', requireAdmin, async (req, res) => {
  try {
    if (!req.body || req.body.confirm !== true) return res.status(400).json({ error: 'confirm_required' });
    const r = await parseUpload(req.body);
    if (r.error) return res.status(400).json({ error: r.error });
    const s = r.plan.summary;
    const result = await tx(async (t) => {
      await snapshotDirectory(t, `가져오기 직전 백업 · 추가 ${s.added}·수정 ${s.updated}`);
      return applyPlan(t, r.plan);
    });
    res.json({ ...result, skipped: s.skipped });
  } catch (e) {
    console.error('[dir import commit]', e.message);
    res.status(500).json({ error: 'commit_failed', message: e.message });
  }
});

// 마지막 가져오기 되돌리기 (직전 스냅샷 복원, 1회성)
router.post('/directory/import/undo', requireAdmin, async (req, res) => {
  try {
    const result = await tx((t) => restoreLatestSnapshot(t));
    if (!result.ok) return res.status(409).json({ error: result.error });
    res.json(result);
  } catch (e) {
    console.error('[dir import undo]', e.message);
    res.status(500).json({ error: 'undo_failed', message: e.message });
  }
});

// 되돌리기 가능 여부(직전 스냅샷 정보)
router.get('/directory/snapshot', requireAdmin, async (req, res) => {
  const row = await db.prepare('SELECT id, created_at, summary FROM dir_snapshots ORDER BY id DESC LIMIT 1').get();
  res.json(row ? { exists: true, created_at: row.created_at, summary: row.summary } : { exists: false });
});

// === 학과 정보 수정 신청 — 검토 큐 (관리자 전용) ===
router.get('/dir-change-requests', requireAdmin, async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : 'all';
  const requests = await listChangeRequests(status);
  res.json({ requests, pending_count: await countPendingChangeRequests() });
});

router.get('/dir-change-requests/:id', requireAdmin, async (req, res) => {
  const r = await getChangeRequest(req.params.id);
  if (!r) return res.status(404).json({ error: 'not_found' });
  res.json({ request: r });
});

router.get('/dir-change-requests/:id/image', requireAdmin, async (req, res) => {
  try {
    const row = await getChangeRequestImage(req.params.id);
    if (!row || !row.image_data) return res.status(404).end();
    res.set('Content-Type', row.image_mime || 'image/jpeg');
    res.set('Cache-Control', 'no-cache');
    res.send(row.image_data);
  } catch { res.status(500).end(); }
});

// 승인 → 디렉터리 자동 반영
router.post('/dir-change-requests/:id/approve', requireAdmin, async (req, res) => {
  try {
    const result = await approveChangeRequest(Number(req.params.id), req.admin.id);
    if (!result.ok) return res.status(result.error === 'not_found' ? 404 : 409).json({ error: result.error });
    res.json(result);
  } catch (e) {
    console.error('[chreq approve] failed:', e.message);
    res.status(500).json({ error: 'internal' });
  }
});

// 반려
router.post('/dir-change-requests/:id/reject', requireAdmin, async (req, res) => {
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.slice(0, 1000) : null;
  const result = await rejectChangeRequest(Number(req.params.id), req.admin.id, reason);
  if (!result.ok) return res.status(result.error === 'not_found' ? 404 : 409).json({ error: result.error });
  res.json(result);
});

export default router;
