import pg from 'pg';

const { Pool } = pg;

// timestamptz/timestamp는 JS Date 대신 원본 문자열로 받는다.
// (CSV·시트 미러·JSON 출력에서 Date.toString() 대신 안정적인 문자열 유지 — 기존 SQLite TEXT 동작에 근접)
pg.types.setTypeParser(1184, (v) => v); // timestamptz
pg.types.setTypeParser(1114, (v) => v); // timestamp

// === 연결 풀 ===
// DATABASE_URL 우선, 없으면 PG* 개별 변수. (Docker compose에서 postgres 서비스로 연결)
export const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, max: 10 }
    : {
        host: process.env.PGHOST || 'localhost',
        port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
        user: process.env.PGUSER || 'arise',
        password: process.env.PGPASSWORD || 'arise',
        database: process.env.PGDATABASE || 'arise',
        max: 10,
      }
);

pool.on('error', (err) => console.error('[pg] idle client error:', err.message));

// SQLite의 '?' 위치 플레이스홀더 → Postgres '$n' 변환.
// (이 코드베이스 SQL 문자열에는 리터럴 '?'가 없으므로 안전)
function toPg(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => '$' + ++i);
}

// node:sqlite의 db.prepare(sql).get/all/run(...params) 호환 셰임 — 단, 비동기.
// 호출부는 `await db.prepare(sql).get(a, b)` 형태로 await만 추가하면 됨.
export function prepare(sql) {
  const text = toPg(sql);
  return {
    get: async (...params) => (await pool.query(text, params)).rows[0],
    all: async (...params) => (await pool.query(text, params)).rows,
    run: async (...params) => await pool.query(text, params),
  };
}

// 파라미터 없는 DDL/멀티스테이트먼트 실행.
export async function exec(sql) {
  await pool.query(sql);
}

// 트랜잭션 — 전용 client를 써서 BEGIN/COMMIT/ROLLBACK이 같은 커넥션을 타도록 보장.
// fn은 { get, all, run } 헬퍼를 받는다.
export async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn({
      get: async (sql, ...p) => (await client.query(toPg(sql), p)).rows[0],
      all: async (sql, ...p) => (await client.query(toPg(sql), p)).rows,
      run: async (sql, ...p) => await client.query(toPg(sql), p),
    });
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// 기존 `import { db } from './db.js'; db.prepare(...)` 호환용.
export const db = { prepare, exec };

export async function initSchema() {
  await exec(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      google_sub TEXT UNIQUE,
      email TEXT NOT NULL UNIQUE,
      email_verified INTEGER DEFAULT 0,
      name TEXT,
      picture TEXT,
      created_at timestamptz DEFAULT now(),
      last_login_at timestamptz DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS surveys (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      author_id INTEGER NOT NULL REFERENCES users(id),
      is_public INTEGER DEFAULT 1,
      closes_at timestamptz,
      created_at timestamptz DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS questions (
      id SERIAL PRIMARY KEY,
      survey_id INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
      ord INTEGER NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('single','multi','scale5','short_text','long_text')),
      body TEXT NOT NULL,
      is_required INTEGER DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_questions_survey_ord ON questions(survey_id, ord);

    CREATE TABLE IF NOT EXISTS question_options (
      id SERIAL PRIMARY KEY,
      question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      ord INTEGER NOT NULL,
      label TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS responses (
      id SERIAL PRIMARY KEY,
      survey_id INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      submitted_at timestamptz DEFAULT now(),
      sheet_synced_at timestamptz,  -- NULL = 시트 미러 미동기. 채워지면 시트에 append됨.
      UNIQUE (survey_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_responses_survey ON responses(survey_id);
    CREATE INDEX IF NOT EXISTS idx_responses_sync ON responses(sheet_synced_at);

    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at timestamptz DEFAULT now(),
      last_login_at timestamptz
    );

    CREATE TABLE IF NOT EXISTS answers (
      id SERIAL PRIMARY KEY,
      response_id INTEGER NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
      question_id INTEGER NOT NULL REFERENCES questions(id),
      selected_option_ids TEXT,  -- JSON array 문자열, 예 "[12]" 또는 "[12,15]"
      numeric_value INTEGER CHECK (numeric_value IS NULL OR (numeric_value BETWEEN 1 AND 5)),
      text_value TEXT,
      UNIQUE (response_id, question_id)
    );
    CREATE INDEX IF NOT EXISTS idx_answers_question ON answers(question_id);

    -- === 학과 디렉터리 (관리자 편집용) ===
    CREATE TABLE IF NOT EXISTS dir_departments (
      id SERIAL PRIMARY KEY,
      gyeyeol TEXT NOT NULL,
      name TEXT NOT NULL,
      recruit INTEGER DEFAULT 1,
      homepage TEXT,
      hashtags jsonb DEFAULT '[]'::jsonb,
      location TEXT,
      phone TEXT,
      bk21 INTEGER DEFAULT 0,
      bk21_name TEXT,
      bk21_url TEXT,
      intro TEXT,
      ord INTEGER DEFAULT 0,
      image_mime TEXT,
      image_data bytea,
      created_at timestamptz DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_dir_dept_gye ON dir_departments(gyeyeol);

    CREATE TABLE IF NOT EXISTS dir_majors (
      id SERIAL PRIMARY KEY,
      dept_id INTEGER NOT NULL REFERENCES dir_departments(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      recruit INTEGER DEFAULT 1,
      homepage TEXT,
      hashtags jsonb DEFAULT '[]'::jsonb,
      location TEXT,
      phone TEXT,
      bk21 INTEGER DEFAULT 0,
      bk21_name TEXT,
      bk21_url TEXT,
      intro TEXT,
      ord INTEGER DEFAULT 0,
      image_mime TEXT,
      image_data bytea
    );
    CREATE INDEX IF NOT EXISTS idx_dir_maj_dept ON dir_majors(dept_id);

    -- === CSV 가져오기 되돌리기용 스냅샷 (최근 1건) ===
    CREATE TABLE IF NOT EXISTS dir_snapshots (
      id SERIAL PRIMARY KEY,
      created_at timestamptz DEFAULT now(),
      summary TEXT
    );
    CREATE TABLE IF NOT EXISTS dir_dept_backup (
      snapshot_id INTEGER NOT NULL REFERENCES dir_snapshots(id) ON DELETE CASCADE,
      id INTEGER, gyeyeol TEXT, name TEXT, recruit INTEGER, homepage TEXT, hashtags jsonb,
      location TEXT, phone TEXT, bk21 INTEGER, bk21_name TEXT, bk21_url TEXT, intro TEXT,
      ord INTEGER, image_mime TEXT, image_data bytea, created_at timestamptz
    );
    CREATE TABLE IF NOT EXISTS dir_major_backup (
      snapshot_id INTEGER NOT NULL REFERENCES dir_snapshots(id) ON DELETE CASCADE,
      id INTEGER, dept_id INTEGER, name TEXT, recruit INTEGER, homepage TEXT, hashtags jsonb,
      location TEXT, phone TEXT, bk21 INTEGER, bk21_name TEXT, bk21_url TEXT, intro TEXT,
      ord INTEGER, image_mime TEXT, image_data bytea
    );

    -- === 학과 정보 수정 신청 (학과 관계자 제출 → 관리자 검토 큐 → 승인 시 디렉터리 반영) ===
    CREATE TABLE IF NOT EXISTS dir_change_requests (
      id SERIAL PRIMARY KEY,
      created_at timestamptz DEFAULT now(),
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
      action TEXT NOT NULL DEFAULT 'upsert' CHECK (action IN ('upsert','delete')),  -- 수정·추가 / 삭제 요청
      submitter_email TEXT,          -- OAuth 검증 이메일(현재 공개 제출이라 NULL)
      applicant_name TEXT,           -- 신청자명 (메타)
      affiliation TEXT,              -- 소속 (메타)
      ext_phone TEXT,                -- 내선전화번호 (메타)
      target_level TEXT NOT NULL DEFAULT 'dept' CHECK (target_level IN ('dept','major')),
      dept_id INTEGER,               -- 기존 학과 선택 id (NULL=신규 학과). FK 없음(요청 이력 보존).
      major_id INTEGER,              -- 기존 세부전공 선택 id (NULL=신규/해당없음)
      gyeyeol TEXT,
      dept_name TEXT,
      major_name TEXT,
      intro TEXT,
      location TEXT,
      phone TEXT,
      homepage TEXT,
      bk21_url TEXT,                 -- 채워지면 반영 시 bk21=1
      image_mime TEXT,
      image_data bytea,
      reviewed_at timestamptz,
      reviewed_by INTEGER,           -- 검토 관리자 id
      reject_reason TEXT,
      note TEXT                      -- 신청자 메모(삭제 사유 등)
    );
    CREATE INDEX IF NOT EXISTS idx_dir_chreq_status ON dir_change_requests(status, created_at DESC);
    -- 기존 설치 호환(컬럼 추가)
    ALTER TABLE dir_change_requests ADD COLUMN IF NOT EXISTS action TEXT NOT NULL DEFAULT 'upsert';
    ALTER TABLE dir_change_requests ADD COLUMN IF NOT EXISTS note TEXT;

    -- === 방문 분석 (퍼널·페이지뷰·스크롤·이탈) — ADR 0007, 익명·IP 미저장 ===
    CREATE TABLE IF NOT EXISTS analytics_events (
      id BIGSERIAL PRIMARY KEY,
      occurred_at timestamptz NOT NULL DEFAULT now(),
      visitor_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      event TEXT NOT NULL,
      page TEXT NOT NULL,
      view TEXT,
      referrer TEXT,
      scroll_pct INTEGER,
      dwell_ms INTEGER,
      device TEXT,
      meta jsonb
    );
    CREATE INDEX IF NOT EXISTS idx_ae_occurred ON analytics_events(occurred_at);
    CREATE INDEX IF NOT EXISTS idx_ae_page ON analytics_events(page, event, occurred_at);
    CREATE INDEX IF NOT EXISTS idx_ae_session ON analytics_events(session_id, occurred_at);
  `);
}

// 디렉터리가 비어있으면 정적 departments.json 으로 1회 시드한다(이후 DB가 원본).
export async function seedDirectoryIfEmpty(seedJson) {
  const row = await prepare('SELECT count(*)::int n FROM dir_departments').get();
  if (row && row.n > 0) return { seeded: false, count: row.n };
  let n = 0;
  await tx(async (t) => {
    for (let i = 0; i < seedJson.length; i++) {
      const d = seedJson[i];
      const dep = await t.get(
        `INSERT INTO dir_departments (gyeyeol,name,recruit,homepage,hashtags,location,phone,bk21,bk21_name,bk21_url,intro,ord)
         VALUES (?,?,?,?,?::jsonb,?,?,?,?,?,?,?) RETURNING id`,
        d.gyeyeol || '', d.name || '', d.recruit === false ? 0 : 1, d.homepage || null,
        JSON.stringify(d.hashtags || []), d.location || null, d.phone || null,
        d.bk21 ? 1 : 0, d.bk21_name || null, d.bk21_url || null, d.intro || null, i
      );
      const majors = Array.isArray(d.majors) ? d.majors : [];
      for (let j = 0; j < majors.length; j++) {
        const m = majors[j];
        await t.run(
          `INSERT INTO dir_majors (dept_id,name,recruit,homepage,hashtags,location,phone,bk21,bk21_name,bk21_url,intro,ord)
           VALUES (?,?,?,?,?::jsonb,?,?,?,?,?,?,?)`,
          dep.id, m.name || '', m.recruit === false ? 0 : 1, m.homepage || null,
          JSON.stringify(m.hashtags || []), m.location || null, m.phone || null,
          m.bk21 ? 1 : 0, m.bk21_name || null, m.bk21_url || null, m.intro || null, j
        );
      }
      n++;
    }
  });
  return { seeded: true, count: n };
}

// 공개 /api/departments 용 JSON 트리 조립 (정적 departments.json 과 동일 형태).
export async function getDirectoryTree() {
  const depts = await prepare(
    `SELECT id,gyeyeol,name,recruit,homepage,hashtags,location,phone,bk21,bk21_name,bk21_url,intro,
            (image_data IS NOT NULL) AS has_image
     FROM dir_departments ORDER BY ord, id`
  ).all();
  const majors = await prepare(
    `SELECT id,dept_id,name,recruit,homepage,hashtags,location,phone,bk21,bk21_name,bk21_url,intro,
            (image_data IS NOT NULL) AS has_image
     FROM dir_majors ORDER BY ord, id`
  ).all();
  const byDept = {};
  majors.forEach((m) => { (byDept[m.dept_id] = byDept[m.dept_id] || []).push(m); });
  const shape = (r, imgUrl) => {
    const o = {
      id: r.id, gyeyeol: r.gyeyeol, name: r.name, recruit: r.recruit !== 0,
      homepage: r.homepage || '', hashtags: Array.isArray(r.hashtags) ? r.hashtags : [],
      bk21: r.bk21 === 1,
    };
    if (r.bk21_name) o.bk21_name = r.bk21_name;
    if (r.bk21_url) o.bk21_url = r.bk21_url;
    if (r.location) o.location = r.location;
    if (r.phone) o.phone = r.phone;
    if (r.intro) o.intro = r.intro;
    if (r.has_image) o.image = imgUrl;
    return o;
  };
  return depts.map((d) => {
    const o = shape(d, `/api/departments/${d.id}/image`);
    o.majors = (byDept[d.id] || []).map((m) => shape(m, `/api/departments/${d.id}/majors/${m.id}/image`));
    return o;
  });
}

// 이미지 bytea + mime 조회
export async function getDeptImage(deptId) {
  return await prepare('SELECT image_mime, image_data FROM dir_departments WHERE id = ?').get(deptId);
}
export async function getMajorImage(majorId) {
  return await prepare('SELECT image_mime, image_data FROM dir_majors WHERE id = ?').get(majorId);
}

// === 학과 정보 수정 신청 ===
export const MAX_REQ_IMG = 2 * 1024 * 1024; // 2MB

// data:image/...;base64,.... → { mime, buf } | null
export function parseImageDataUrl(dataUrl) {
  const m = /^data:([\w/+.-]+);base64,(.+)$/s.exec(dataUrl || '');
  if (!m) return null;
  return { mime: m[1], buf: Buffer.from(m[2], 'base64') };
}

const CHREQ_COLS = `id, created_at, status, action, submitter_email, applicant_name, affiliation, ext_phone,
  target_level, dept_id, major_id, gyeyeol, dept_name, major_name,
  intro, location, phone, homepage, bk21_url, note,
  (image_data IS NOT NULL) AS has_image, reviewed_at, reviewed_by, reject_reason`;

export async function createChangeRequest(d) {
  const row = await prepare(`
    INSERT INTO dir_change_requests
      (action, submitter_email, applicant_name, affiliation, ext_phone, target_level,
       dept_id, major_id, gyeyeol, dept_name, major_name,
       intro, location, phone, homepage, bk21_url, image_mime, image_data, note)
    VALUES (?,?,?,?,?,?, ?,?,?,?,?, ?,?,?,?,?, ?,?,?) RETURNING id
  `).get(
    d.action === 'delete' ? 'delete' : 'upsert',
    d.submitter_email || null, d.applicant_name || null, d.affiliation || null, d.ext_phone || null,
    d.target_level === 'major' ? 'major' : 'dept',
    d.dept_id ?? null, d.major_id ?? null, d.gyeyeol || null, d.dept_name || null, d.major_name || null,
    d.intro || null, d.location || null, d.phone || null, d.homepage || null, d.bk21_url || null,
    d.image_mime || null, d.image_data || null, d.note || null,
  );
  return row.id;
}

export async function listChangeRequests(status) {
  const filter = status && status !== 'all';
  return await prepare(`
    SELECT ${CHREQ_COLS} FROM dir_change_requests
    ${filter ? 'WHERE status = ?' : ''}
    ORDER BY (status = 'pending') DESC, created_at DESC
  `).all(...(filter ? [status] : []));
}

export async function getChangeRequest(id) {
  return await prepare(`SELECT ${CHREQ_COLS} FROM dir_change_requests WHERE id = ?`).get(id);
}

export async function getChangeRequestImage(id) {
  return await prepare('SELECT image_mime, image_data FROM dir_change_requests WHERE id = ?').get(id);
}

export async function countPendingChangeRequests() {
  const r = await prepare(`SELECT count(*)::int n FROM dir_change_requests WHERE status = 'pending'`).get();
  return r ? r.n : 0;
}

// UPDATE 시 값이 채워진 필드만 SET (빈 항목은 기존값 유지). extra는 무조건 포함.
function buildSet(fields, extra = {}) {
  const cols = [], vals = [];
  for (const [k, v] of Object.entries(fields)) {
    if (v != null && String(v).trim() !== '') { cols.push(`${k}=?`); vals.push(v); }
  }
  for (const [k, v] of Object.entries(extra)) { cols.push(`${k}=?`); vals.push(v); }
  return { cols, vals };
}

// 신청 승인 → 디렉터리에 자동 반영(원자적). 반환: { ok, dept_id?, major_id?, error? }
export async function approveChangeRequest(id, adminId) {
  return await tx(async (t) => {
    const r = await t.get('SELECT * FROM dir_change_requests WHERE id = ?', id);
    if (!r) return { ok: false, error: 'not_found' };
    if (r.status !== 'pending') return { ok: false, error: 'not_pending' };

    // 삭제 요청 — 대상 레코드 제거(학과 삭제는 소속 세부전공 cascade)
    if (r.action === 'delete') {
      if (r.major_id) {
        await t.run('DELETE FROM dir_majors WHERE id=?', r.major_id);
      } else if (r.dept_id) {
        await t.run('DELETE FROM dir_departments WHERE id=?', r.dept_id);
      } else {
        return { ok: false, error: 'delete_target_missing' };
      }
      await t.run("UPDATE dir_change_requests SET status='approved', reviewed_at=now(), reviewed_by=? WHERE id=?", adminId, id);
      return { ok: true, deleted: true, dept_id: r.dept_id, major_id: r.major_id };
    }

    const hasBk = r.bk21_url && String(r.bk21_url).trim() !== '';
    const bkExtra = hasBk ? { bk21: 1, bk21_url: r.bk21_url } : {};
    let deptId = r.dept_id, majorId = r.major_id;

    if (r.target_level === 'dept') {
      // 내용 필드 + 학과명/계열을 학과 레코드에 반영
      if (deptId) {
        const exist = await t.get('SELECT id FROM dir_departments WHERE id = ?', deptId);
        if (!exist) return { ok: false, error: 'dept_not_found' };
        const { cols, vals } = buildSet(
          { gyeyeol: r.gyeyeol, name: r.dept_name, intro: r.intro, location: r.location, phone: r.phone, homepage: r.homepage },
          bkExtra
        );
        if (cols.length) await t.run(`UPDATE dir_departments SET ${cols.join(',')} WHERE id=?`, ...vals, deptId);
      } else {
        const ins = await t.get(
          `INSERT INTO dir_departments (gyeyeol,name,intro,location,phone,homepage,bk21,bk21_url)
           VALUES (?,?,?,?,?,?,?,?) RETURNING id`,
          r.gyeyeol || '', r.dept_name || '', r.intro || null, r.location || null,
          r.phone || null, r.homepage || null, hasBk ? 1 : 0, hasBk ? r.bk21_url : null,
        );
        deptId = ins.id;
      }
      if (r.image_data) await t.run('UPDATE dir_departments SET image_mime=?, image_data=? WHERE id=?', r.image_mime, r.image_data, deptId);
    } else {
      // 세부전공 레벨 — 학과는 컨테이너(없으면 계열+학과명으로 생성), 내용은 전공 레코드에 반영
      if (!deptId) {
        const ins = await t.get('INSERT INTO dir_departments (gyeyeol,name) VALUES (?,?) RETURNING id', r.gyeyeol || '', r.dept_name || '');
        deptId = ins.id;
      }
      if (majorId) {
        const exist = await t.get('SELECT id FROM dir_majors WHERE id=? AND dept_id=?', majorId, deptId);
        if (!exist) return { ok: false, error: 'major_not_found' };
        const { cols, vals } = buildSet(
          { name: r.major_name, intro: r.intro, location: r.location, phone: r.phone, homepage: r.homepage },
          bkExtra
        );
        if (cols.length) await t.run(`UPDATE dir_majors SET ${cols.join(',')} WHERE id=?`, ...vals, majorId);
        if (r.image_data) await t.run('UPDATE dir_majors SET image_mime=?, image_data=? WHERE id=?', r.image_mime, r.image_data, majorId);
      } else {
        const ins = await t.get(
          `INSERT INTO dir_majors (dept_id,name,intro,location,phone,homepage,bk21,bk21_url,image_mime,image_data)
           VALUES (?,?,?,?,?,?,?,?,?,?) RETURNING id`,
          deptId, r.major_name || '', r.intro || null, r.location || null, r.phone || null, r.homepage || null,
          hasBk ? 1 : 0, hasBk ? r.bk21_url : null, r.image_data ? r.image_mime : null, r.image_data || null,
        );
        majorId = ins.id;
      }
    }

    await t.run("UPDATE dir_change_requests SET status='approved', reviewed_at=now(), reviewed_by=? WHERE id=?", adminId, id);
    return { ok: true, dept_id: deptId, major_id: majorId };
  });
}

export async function rejectChangeRequest(id, adminId, reason) {
  const r = await prepare('SELECT status FROM dir_change_requests WHERE id = ?').get(id);
  if (!r) return { ok: false, error: 'not_found' };
  if (r.status !== 'pending') return { ok: false, error: 'not_pending' };
  await prepare("UPDATE dir_change_requests SET status='rejected', reviewed_at=now(), reviewed_by=?, reject_reason=? WHERE id=?")
    .run(adminId, reason || null, id);
  return { ok: true };
}
