import express from 'express';
import { db } from './db.js';
import { requireAdmin } from './admin.js';

// ── 화이트리스트 (frontend/public/track.js의 PAGE_MAP·VIEW_KEYS와 반드시 일치) ──
export const EVENTS = ['pageview', 'page_leave', 'calc_run', 'apply_click', 'apply_modal_open', 'oauth_redirect', 'apply_submit', 'dept_detail'];
export const PAGES = ['gateway', 'admission', 'eligibility', 'scholarship', 'login', 'google', 'dept-edit-request', 'bymonolog', 'bymonolog-hub', 'bymonolog-grad', 'bymonolog-aura', 'other'];
export const VIEWS = ['intro', 'why-grad', 'eligibility', 'benefits', 'departments'];
const SUBMIT_STATUS = ['success', 'dup', 'error'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BOT_RE = /bot|crawl|spider|slurp|headless|lighthouse|preview|scan|python-|curl|wget|monitor/i;
const MAX_DWELL_MS = 12 * 3600 * 1000;

export function isBotUa(ua) { return BOT_RE.test(String(ua || '')); }
export function deviceOf(ua) { return /Mobi|Android|iPhone|iPad/i.test(String(ua || '')) ? 'mobile' : 'desktop'; }

// 수집 본문 → 정제된 insert 행 배열. 배치 자체가 불량이면 null, 불합격 이벤트는 개별 폐기.
export function normalizeBatch(body) {
  if (!body || body.v !== 1) return null;
  if (typeof body.vid !== 'string' || !UUID_RE.test(body.vid)) return null;
  if (typeof body.sid !== 'string' || !UUID_RE.test(body.sid)) return null;
  if (!Array.isArray(body.events) || body.events.length === 0 || body.events.length > 25) return null;
  const rows = [];
  for (const ev of body.events) {
    if (!ev || typeof ev !== 'object') continue;
    if (!EVENTS.includes(ev.e) || !PAGES.includes(ev.page)) continue;
    let meta = null;
    if (ev.e === 'apply_submit') {
      const s = ev.meta && ev.meta.status;
      meta = { status: SUBMIT_STATUS.includes(s) ? s : 'error' };
    } else if (ev.e === 'dept_detail') {
      const d = ev.meta && typeof ev.meta.dept === 'string' ? ev.meta.dept.slice(0, 120) : '';
      if (!d) continue; // dept 없는 dept_detail은 무의미 — 폐기
      meta = { dept: d };
      if (ev.meta && typeof ev.meta.major === 'string' && ev.meta.major) meta.major = ev.meta.major.slice(0, 120);
    }
    rows.push({
      event: ev.e,
      page: ev.page,
      view: ev.view != null && VIEWS.includes(ev.view) ? ev.view : null,
      referrer: typeof ev.ref === 'string' && ev.ref ? ev.ref.slice(0, 300) : null,
      scroll_pct: Number.isInteger(ev.scroll) && ev.scroll >= 0 && ev.scroll <= 100 ? ev.scroll : null,
      dwell_ms: Number.isInteger(ev.dwell) && ev.dwell >= 0 && ev.dwell <= MAX_DWELL_MS ? ev.dwell : null,
      meta,
    });
  }
  return rows;
}

// per-IP 토큰버킷 — IP는 메모리에서 순간 사용만, 저장하지 않는다 (ADR 0007).
export function createRateLimiter({ capacity = 60, refillPerSec = 1 } = {}) {
  const buckets = new Map();
  return {
    allow(ip, now = Date.now()) {
      let b = buckets.get(ip);
      if (!b) { b = { tokens: capacity, last: now }; buckets.set(ip, b); }
      b.tokens = Math.min(capacity, b.tokens + ((now - b.last) / 1000) * refillPerSec);
      b.last = now;
      if (b.tokens < 1) return false;
      b.tokens -= 1;
      return true;
    },
    sweep(now = Date.now()) {
      for (const [ip, b] of buckets) if (now - b.last > 10 * 60 * 1000) buckets.delete(ip);
    },
    size() { return buckets.size; },
  };
}

// 관리자 집계용 기간 필터 (KST 날짜, to 포함). 형식·달력 불량은 무시(전체 조회).
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function calendarDate(s) { // '2026-13-01'·'2026-02-30' 같은 롤오버/무효 날짜 거부
  if (typeof s !== 'string' || !DATE_RE.test(s)) return null;
  const d = new Date(s + 'T00:00:00Z');
  return !isNaN(d) && d.toISOString().slice(0, 10) === s ? d : null;
}
export function timeRange(q, column = 'occurred_at') {
  const cond = [];
  const params = [];
  if (q && calendarDate(q.from)) {
    cond.push(`${column} >= ?::timestamptz`);
    params.push(q.from + 'T00:00:00+09:00');
  }
  const dt = q && calendarDate(q.to);
  if (dt) {
    dt.setUTCDate(dt.getUTCDate() + 1);
    cond.push(`${column} < ?::timestamptz`);
    params.push(dt.toISOString().slice(0, 10) + 'T00:00:00+09:00');
  }
  return { where: cond.length ? 'AND ' + cond.join(' AND ') : '', params };
}

// ═══ 수집 엔드포인트 (공개 — 인증 없음, 항상 204) ═══
// 캠퍼스 NAT 뒤 다수 사용자가 한 IP를 공유하므로 여유 있게 (사용자당 플러시 ~1회/10초)
const limiter = createRateLimiter({ capacity: 400, refillPerSec: 20 });
setInterval(() => limiter.sweep(), 10 * 60 * 1000).unref();

// 본문 파싱 전에 봇·rate limit 차단 — server.js에서 /api/track 전용 소용량 파서 앞에 마운트
export function trackGuard(req, res, next) {
  if (isBotUa(req.headers['user-agent']) || !limiter.allow(req.ip)) return res.status(204).end();
  next();
}

export const trackRouter = express.Router();
trackRouter.post('/', async (req, res) => {
  try {
    const rows = normalizeBatch(req.body);
    if (rows && rows.length) {
      const device = deviceOf(req.headers['user-agent']);
      const params = [];
      const tuples = rows.map((r) => {
        params.push(req.body.vid, req.body.sid, r.event, r.page, r.view, r.referrer, r.scroll_pct, r.dwell_ms, device, r.meta ? JSON.stringify(r.meta) : null);
        return '(?,?,?,?,?,?,?,?,?,?::jsonb)';
      });
      await db.prepare(
        `INSERT INTO analytics_events (visitor_id,session_id,event,page,view,referrer,scroll_pct,dwell_ms,device,meta) VALUES ${tuples.join(',')}`
      ).run(...params);
    }
  } catch (e) {
    console.error('[track] failed:', e.message);
  }
  res.status(204).end(); // 드롭이어도 204 — 클라이언트 재시도 폭주 방지
});

// ═══ 집계 (관리자 전용) ═══
export const adminAnalyticsRouter = express.Router();

adminAnalyticsRouter.get('/overview', requireAdmin, async (req, res) => {
  try {
    const { where, params } = timeRange(req.query);
    const [totals, pages, depth, exits, daily] = await Promise.all([
      db.prepare(`
      SELECT COUNT(*) FILTER (WHERE event = 'pageview')::int AS pageviews,
             COUNT(DISTINCT visitor_id)::int AS visitors,
             COUNT(DISTINCT session_id)::int AS sessions
      FROM analytics_events WHERE TRUE ${where}`).get(...params),

      db.prepare(`
      SELECT page,
             COUNT(*) FILTER (WHERE event = 'pageview')::int AS pageviews,
             COUNT(DISTINCT visitor_id)::int AS visitors,
             COUNT(DISTINCT session_id)::int AS sessions
      FROM analytics_events WHERE TRUE ${where}
      GROUP BY page ORDER BY pageviews DESC`).all(...params),

      // page_leave는 (page,view) 단위 누적 스냅샷 — 뷰별 MAX(최종치)를 구한 뒤
      // 체류는 뷰 합산, 스크롤은 뷰 중 최대를 세션·페이지 값으로 쓴다
      db.prepare(`
      SELECT page,
             ROUND(AVG(dwell))::int AS avg_dwell_ms,
             ROUND(AVG(scroll))::int AS avg_scroll_pct,
             COUNT(*)::int AS measured,
             COUNT(*) FILTER (WHERE scroll >= 25)::int AS s25,
             COUNT(*) FILTER (WHERE scroll >= 50)::int AS s50,
             COUNT(*) FILTER (WHERE scroll >= 75)::int AS s75,
             COUNT(*) FILTER (WHERE scroll >= 90)::int AS s90
      FROM (SELECT session_id, page, SUM(dwell) AS dwell, MAX(scroll) AS scroll
            FROM (SELECT session_id, page, COALESCE(view, '') AS view_key,
                         MAX(dwell_ms) AS dwell, MAX(scroll_pct) AS scroll
                  FROM analytics_events WHERE event = 'page_leave' ${where}
                  GROUP BY session_id, page, COALESCE(view, '')) s
            GROUP BY session_id, page) t
      GROUP BY page`).all(...params),

      // 이탈 = 세션의 마지막 이벤트가 그 페이지에서 발생
      db.prepare(`
      SELECT page, COUNT(*)::int AS exit_sessions FROM (
        SELECT DISTINCT ON (session_id) session_id, page
        FROM analytics_events WHERE TRUE ${where}
        ORDER BY session_id, occurred_at DESC, id DESC) t
      GROUP BY page`).all(...params),

      db.prepare(`
      SELECT to_char(occurred_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD') AS day,
             COUNT(*) FILTER (WHERE event = 'pageview')::int AS pageviews,
             COUNT(DISTINCT session_id)::int AS sessions,
             COUNT(DISTINCT visitor_id)::int AS visitors
      FROM analytics_events WHERE TRUE ${where}
      GROUP BY day ORDER BY day`).all(...params),
    ]);

    const depthBy = Object.fromEntries(depth.map((d) => [d.page, d]));
    const exitBy = Object.fromEntries(exits.map((x) => [x.page, x.exit_sessions]));
    res.json({
      totals,
      pages: pages.map((p) => ({
        ...p,
        avg_dwell_ms: depthBy[p.page]?.avg_dwell_ms ?? null,
        avg_scroll_pct: depthBy[p.page]?.avg_scroll_pct ?? null,
        measured: depthBy[p.page]?.measured ?? 0,
        s25: depthBy[p.page]?.s25 ?? 0,
        s50: depthBy[p.page]?.s50 ?? 0,
        s75: depthBy[p.page]?.s75 ?? 0,
        s90: depthBy[p.page]?.s90 ?? 0,
        exit_sessions: exitBy[p.page] ?? 0,
        exit_rate: p.sessions > 0 ? Math.round(((exitBy[p.page] ?? 0) / p.sessions) * 100) : null,
      })),
      daily,
      generated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[analytics overview]', e.message);
    res.status(500).json({ error: 'internal' });
  }
});

adminAnalyticsRouter.get('/funnel', requireAdmin, async (req, res) => {
  try {
    const { where, params } = timeRange(req.query);
    const resp = timeRange(req.query, 'submitted_at'); // responses 테이블용 동일 기간
    const [funnel, admissionViews, deptInterest, actual] = await Promise.all([
      db.prepare(`
      SELECT
        COUNT(DISTINCT session_id) FILTER (WHERE page = 'gateway' AND event = 'pageview')::int AS gateway,
        COUNT(DISTINCT session_id) FILTER (WHERE page = 'admission' AND event = 'pageview')::int AS admission,
        COUNT(DISTINCT session_id) FILTER (WHERE page = 'admission' AND event = 'pageview' AND view IS NOT NULL AND view <> 'intro')::int AS engaged,
        COUNT(DISTINCT session_id) FILTER (WHERE event = 'calc_run')::int AS calc_run,
        COUNT(DISTINCT session_id) FILTER (WHERE event = 'apply_click')::int AS apply_click,
        COUNT(DISTINCT session_id) FILTER (WHERE event = 'oauth_redirect')::int AS oauth_redirect,
        COUNT(DISTINCT session_id) FILTER (WHERE event = 'apply_modal_open')::int AS modal_open,
        COUNT(DISTINCT session_id) FILTER (WHERE event = 'apply_submit' AND meta->>'status' = 'success')::int AS submit_success
      FROM analytics_events WHERE TRUE ${where}`).get(...params),

      db.prepare(`
      SELECT view, COUNT(DISTINCT session_id)::int AS sessions, COUNT(*)::int AS pageviews
      FROM analytics_events
      WHERE page = 'admission' AND event = 'pageview' AND view IS NOT NULL ${where}
      GROUP BY view ORDER BY sessions DESC, view`).all(...params),

      db.prepare(`
      SELECT meta->>'dept' AS dept, COUNT(*)::int AS count
      FROM analytics_events WHERE event = 'dept_detail' ${where}
      GROUP BY dept ORDER BY count DESC LIMIT 10`).all(...params),

      // 최종 전환 실측치 — responses 테이블(submitted_at 기준 동일 기간)
      db.prepare(
        `SELECT COUNT(*)::int AS c FROM responses WHERE survey_id = 1 ${resp.where}`
      ).get(...resp.params),
    ]);

    res.json({
      funnel,
      admission_views: admissionViews,
      dept_interest: deptInterest,
      responses_actual: actual.c,
      generated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[analytics funnel]', e.message);
    res.status(500).json({ error: 'internal' });
  }
});
