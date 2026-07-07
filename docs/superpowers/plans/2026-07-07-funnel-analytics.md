# 퍼널 분석(방문 분석) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 페이지별 뷰어수·스크롤 깊이·이탈률·신청 퍼널을 기존 Express+PostgreSQL 스택으로 수집·집계하고 `/admin`에 "방문 분석" 탭으로 표시한다.

**Architecture:** 클라이언트 트래커(`frontend/public/track.js`, 무의존 단일 파일) → 공개 수집 엔드포인트(`POST /api/track`, rate-limit + 화이트리스트 검증) → `analytics_events` 단일 테이블 → 관리자 집계 API(`/api/admin/analytics/*`) → AdminDashboard 새 탭. 스펙: `docs/superpowers/specs/2026-07-07-funnel-analytics-design.md`.

**Tech Stack:** Express 4 (ESM), pg(`db.js`의 `?`→`$n` 심), node:test, React+recharts(기존 admin 관례), vanilla JS 트래커.

## Global Constraints

- **개인정보(ADR 0005)**: 이메일/OAuth 연결 금지 · 계산기 입력값/판정결과 수집 금지 · IP 저장 금지(rate-limit 메모리 순간 사용만) · 방문자 식별은 localStorage 랜덤 UUID만.
- SQL 문자열에 리터럴 `?` 금지(심이 전부 `$n` 치환), jsonb `?` 연산자 금지. `COUNT()`류는 `::int` 캐스트. 시간 필터는 SQL에서 (`timestamptz` 파서가 문자열 반환).
- 새 라우트는 반드시 `/api/*` 아래(서버 SPA 폴백이 `/api` 제외). nginx 변경 없음.
- 트래커는 전체 try/catch — 어떤 오류도 사용자 페이지를 깨지 않는다. 인라인 훅은 전부 `if(window.pnugTrack)` 가드.
- 페이지 키는 정규 이름(§스펙 4) — React 마이그레이션 후에도 동일해야 함.
- 커밋은 main에 직접(리포 관례), 메시지 한국어 conventional. **배포는 사용자 명시 승인 후에만.**
- 테스트는 node:test (`backend/package.json`의 `npm test` = `node --test`, `src/*.test.js` 자동 발견).
- admin UI 변경 전 frontend-design 스킬 호출(사용자 규칙).

---

### Task 1: `analytics_events` 테이블 (DDL)

**Files:**
- Modify: `backend/src/db.js` — `initSchema()`의 `exec` 블록 끝(현재 L233-234 `ALTER TABLE dir_change_requests ...` 두 줄 다음, 백틱 닫기 전)

**Interfaces:**
- Produces: `analytics_events` 테이블 — 컬럼 `(id, occurred_at, visitor_id, session_id, event, page, view, referrer, scroll_pct, dwell_ms, device, meta)`. Task 3·5가 INSERT/SELECT.

- [ ] **Step 1: DDL 추가** — `db.js` initSchema 내 `ALTER TABLE dir_change_requests ADD COLUMN IF NOT EXISTS note TEXT;` 줄 바로 뒤에 삽입:

```sql
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
```

- [ ] **Step 2: 부팅 검증** — `backend/.env`의 로컬 PG 접속정보 확인 후 backend 기동(`npm --prefix backend run dev`), 에러 없이 리슨 확인, psql로 `\d analytics_events` 존재 확인 후 종료.
- [ ] **Step 3: Commit** — `git add backend/src/db.js && git commit -m "feat(analytics): analytics_events 테이블 (부팅 시 idempotent DDL)"`

---

### Task 2: 수집 코어(검증·봇필터·rate limit) — TDD

**Files:**
- Create: `backend/src/analytics.js` (코어 함수부만; 라우터는 Task 3에서 같은 파일에 추가)
- Test: `backend/src/analytics.test.js`

**Interfaces:**
- Produces: `normalizeBatch(body) → rows[]|null`, `isBotUa(ua) → bool`, `deviceOf(ua) → 'mobile'|'desktop'`, `createRateLimiter({capacity,refillPerSec}) → {allow(ip,now?),sweep(now?),size()}`, `timeRange(query) → {where, params}` (where는 `AND ...` 접두 or 빈 문자열), 상수 `EVENTS/PAGES/VIEWS`.
- Consumes: 없음(순수 함수부).

- [ ] **Step 1: 실패하는 테스트 작성** — `backend/src/analytics.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBatch, isBotUa, deviceOf, createRateLimiter, timeRange } from './analytics.js';

const VID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const base = { v: 1, vid: VID, sid: VID, events: [{ e: 'pageview', page: 'admission', view: 'intro' }] };

test('normalizeBatch: 정상 배치 → 행 반환', () => {
  const rows = normalizeBatch(base);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], { event: 'pageview', page: 'admission', view: 'intro', referrer: null, scroll_pct: null, dwell_ms: null, meta: null });
});
test('normalizeBatch: vid 형식 불량 → null', () => {
  assert.equal(normalizeBatch({ ...base, vid: 'evil' }), null);
});
test('normalizeBatch: 26개 초과 배치 → null', () => {
  assert.equal(normalizeBatch({ ...base, events: Array(26).fill(base.events[0]) }), null);
});
test('normalizeBatch: 미등록 이벤트·페이지는 개별 폐기', () => {
  const rows = normalizeBatch({ ...base, events: [{ e: 'hack', page: 'admission' }, { e: 'pageview', page: '/etc/passwd' }, base.events[0]] });
  assert.equal(rows.length, 1);
});
test('normalizeBatch: scroll 범위 밖·dwell 12h 초과는 null 처리', () => {
  const rows = normalizeBatch({ ...base, events: [{ e: 'page_leave', page: 'eligibility', scroll: 101, dwell: 13 * 3600 * 1000 }] });
  assert.equal(rows[0].scroll_pct, null);
  assert.equal(rows[0].dwell_ms, null);
});
test('normalizeBatch: apply_submit 상태 화이트리스트 밖 → error', () => {
  const rows = normalizeBatch({ ...base, events: [{ e: 'apply_submit', page: 'admission', meta: { status: 'pwned' } }] });
  assert.deepEqual(rows[0].meta, { status: 'error' });
});
test('normalizeBatch: dept_detail은 dept 필수·120자 절단', () => {
  assert.equal(normalizeBatch({ ...base, events: [{ e: 'dept_detail', page: 'admission' }] }).length, 0);
  const rows = normalizeBatch({ ...base, events: [{ e: 'dept_detail', page: 'admission', meta: { dept: 'x'.repeat(500) } }] });
  assert.equal(rows[0].meta.dept.length, 120);
});
test('isBotUa / deviceOf', () => {
  assert.equal(isBotUa('Mozilla/5.0 (compatible; Googlebot/2.1)'), true);
  assert.equal(isBotUa('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126'), false);
  assert.equal(deviceOf('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)'), 'mobile');
  assert.equal(deviceOf('Mozilla/5.0 (Windows NT 10.0)'), 'desktop');
});
test('createRateLimiter: 용량 소진 후 거부, 시간 경과로 리필, sweep 정리', () => {
  const rl = createRateLimiter({ capacity: 3, refillPerSec: 1 });
  const t0 = 1_000_000;
  assert.equal(rl.allow('1.2.3.4', t0), true);
  assert.equal(rl.allow('1.2.3.4', t0), true);
  assert.equal(rl.allow('1.2.3.4', t0), true);
  assert.equal(rl.allow('1.2.3.4', t0), false);
  assert.equal(rl.allow('1.2.3.4', t0 + 2000), true);
  rl.sweep(t0 + 2000 + 11 * 60 * 1000);
  assert.equal(rl.size(), 0);
});
test('timeRange: KST 날짜 경계(to 포함), 형식 불량 무시', () => {
  assert.deepEqual(timeRange({}), { where: '', params: [] });
  const r = timeRange({ from: '2026-07-09', to: '2026-07-16' });
  assert.equal(r.where, 'AND occurred_at >= ?::timestamptz AND occurred_at < ?::timestamptz');
  assert.deepEqual(r.params, ['2026-07-09T00:00:00+09:00', '2026-07-17T00:00:00+09:00']);
  assert.deepEqual(timeRange({ from: 'DROP TABLE' }), { where: '', params: [] });
});
```

- [ ] **Step 2: 실패 확인** — `cd backend && npm test` → `Cannot find module './analytics.js'` FAIL.
- [ ] **Step 3: 코어 구현** — `backend/src/analytics.js` 생성(파일 상단부; 라우터부는 Task 3에서 이어 붙임):

```js
import express from 'express';
import { db } from './db.js';
import { requireAdmin } from './admin.js';

// ── 화이트리스트 (track.js의 pageKey/뷰 키와 반드시 일치) ──
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

// 관리자 집계용 기간 필터 (KST 날짜, to 포함). 형식 불량은 무시(전체 조회).
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export function timeRange(q) {
  const cond = [];
  const params = [];
  if (q && typeof q.from === 'string' && DATE_RE.test(q.from)) {
    cond.push('occurred_at >= ?::timestamptz');
    params.push(q.from + 'T00:00:00+09:00');
  }
  if (q && typeof q.to === 'string' && DATE_RE.test(q.to)) {
    const d = new Date(q.to + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + 1);
    cond.push('occurred_at < ?::timestamptz');
    params.push(d.toISOString().slice(0, 10) + 'T00:00:00+09:00');
  }
  return { where: cond.length ? 'AND ' + cond.join(' AND ') : '', params };
}
```

- [ ] **Step 4: 테스트 통과 확인** — `cd backend && npm test` → 신규 테스트 전부 PASS (기존 directory-import.test.js 포함 전체 그린).
- [ ] **Step 5: Commit** — `git add backend/src/analytics.js backend/src/analytics.test.js && git commit -m "feat(analytics): 수집 검증·봇필터·rate limit 코어 (TDD)"`

---

### Task 3: 수집·집계 라우터 + server.js 마운트

**Files:**
- Modify: `backend/src/analytics.js` (Task 2 파일 하단에 라우터부 추가)
- Modify: `backend/src/server.js:59-63` (마운트 2줄 + import 1줄)

**Interfaces:**
- Consumes: Task 1 테이블, Task 2 코어, `admin.js`의 `requireAdmin`(admin_token 쿠키 가드), `db.js`의 `db.prepare`.
- Produces:
  - `POST /api/track` (공개) — body `{v:1, vid, sid, events:[{e,page,view?,ref?,scroll?,dwell?,meta?}]}` → 항상 204.
  - `GET /api/admin/analytics/overview?from&to` → `{ totals:{pageviews,visitors,sessions}, pages:[{page,pageviews,visitors,sessions,avg_dwell_ms,avg_scroll_pct,s25,s50,s75,s90,measured,exit_sessions,exit_rate}], daily:[{day,pageviews,sessions,visitors}] }`
  - `GET /api/admin/analytics/funnel?from&to` → `{ funnel:{gateway,admission,engaged,calc_run,apply_click,oauth_redirect,modal_open,submit_success}, admission_views:[{view,sessions,pageviews}], dept_interest:[{dept,count}], responses_actual:int }`

- [ ] **Step 1: 라우터 구현** — `analytics.js` 하단에 추가:

```js
// ═══ 수집 엔드포인트 (공개 — 인증 없음, 항상 204) ═══
const limiter = createRateLimiter();
setInterval(() => limiter.sweep(), 10 * 60 * 1000).unref();

export const trackRouter = express.Router();
trackRouter.post('/', async (req, res) => {
  try {
    const ua = req.headers['user-agent'];
    if (!isBotUa(ua) && limiter.allow(req.ip)) {
      const rows = normalizeBatch(req.body);
      if (rows && rows.length) {
        const device = deviceOf(ua);
        const params = [];
        const tuples = rows.map((r) => {
          params.push(req.body.vid, req.body.sid, r.event, r.page, r.view, r.referrer, r.scroll_pct, r.dwell_ms, device, r.meta ? JSON.stringify(r.meta) : null);
          return '(?,?,?,?,?,?,?,?,?,?::jsonb)';
        });
        await db.prepare(
          `INSERT INTO analytics_events (visitor_id,session_id,event,page,view,referrer,scroll_pct,dwell_ms,device,meta) VALUES ${tuples.join(',')}`
        ).run(...params);
      }
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
    const totals = await db.prepare(`
      SELECT COUNT(*) FILTER (WHERE event = 'pageview')::int AS pageviews,
             COUNT(DISTINCT visitor_id)::int AS visitors,
             COUNT(DISTINCT session_id)::int AS sessions
      FROM analytics_events WHERE TRUE ${where}`).get(...params);

    const pages = await db.prepare(`
      SELECT page,
             COUNT(*) FILTER (WHERE event = 'pageview')::int AS pageviews,
             COUNT(DISTINCT visitor_id)::int AS visitors,
             COUNT(DISTINCT session_id)::int AS sessions
      FROM analytics_events WHERE TRUE ${where}
      GROUP BY page ORDER BY pageviews DESC`).all(...params);

    // 세션별 최대값(반복 page_leave 스냅샷 중 최종치)을 페이지 단위로 평균
    const depth = await db.prepare(`
      SELECT page,
             ROUND(AVG(dwell))::int AS avg_dwell_ms,
             ROUND(AVG(scroll))::int AS avg_scroll_pct,
             COUNT(*)::int AS measured,
             COUNT(*) FILTER (WHERE scroll >= 25)::int AS s25,
             COUNT(*) FILTER (WHERE scroll >= 50)::int AS s50,
             COUNT(*) FILTER (WHERE scroll >= 75)::int AS s75,
             COUNT(*) FILTER (WHERE scroll >= 90)::int AS s90
      FROM (SELECT session_id, page, MAX(dwell_ms) AS dwell, MAX(scroll_pct) AS scroll
            FROM analytics_events WHERE event = 'page_leave' ${where}
            GROUP BY session_id, page) t
      GROUP BY page`).all(...params);

    // 이탈 = 세션의 마지막 이벤트가 그 페이지에서 발생
    const exits = await db.prepare(`
      SELECT page, COUNT(*)::int AS exit_sessions FROM (
        SELECT DISTINCT ON (session_id) session_id, page
        FROM analytics_events WHERE TRUE ${where}
        ORDER BY session_id, occurred_at DESC, id DESC) t
      GROUP BY page`).all(...params);

    const daily = await db.prepare(`
      SELECT to_char(occurred_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD') AS day,
             COUNT(*) FILTER (WHERE event = 'pageview')::int AS pageviews,
             COUNT(DISTINCT session_id)::int AS sessions,
             COUNT(DISTINCT visitor_id)::int AS visitors
      FROM analytics_events WHERE TRUE ${where}
      GROUP BY day ORDER BY day`).all(...params);

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
    const funnel = await db.prepare(`
      SELECT
        COUNT(DISTINCT session_id) FILTER (WHERE page = 'gateway' AND event = 'pageview')::int AS gateway,
        COUNT(DISTINCT session_id) FILTER (WHERE page = 'admission' AND event = 'pageview')::int AS admission,
        COUNT(DISTINCT session_id) FILTER (WHERE page = 'admission' AND event = 'pageview' AND view IS NOT NULL AND view <> 'intro')::int AS engaged,
        COUNT(DISTINCT session_id) FILTER (WHERE event = 'calc_run')::int AS calc_run,
        COUNT(DISTINCT session_id) FILTER (WHERE event = 'apply_click')::int AS apply_click,
        COUNT(DISTINCT session_id) FILTER (WHERE event = 'oauth_redirect')::int AS oauth_redirect,
        COUNT(DISTINCT session_id) FILTER (WHERE event = 'apply_modal_open')::int AS modal_open,
        COUNT(DISTINCT session_id) FILTER (WHERE event = 'apply_submit' AND meta->>'status' = 'success')::int AS submit_success
      FROM analytics_events WHERE TRUE ${where}`).get(...params);

    const admissionViews = await db.prepare(`
      SELECT view, COUNT(DISTINCT session_id)::int AS sessions, COUNT(*)::int AS pageviews
      FROM analytics_events
      WHERE page = 'admission' AND event = 'pageview' AND view IS NOT NULL ${where}
      GROUP BY view`).all(...params);

    const deptInterest = await db.prepare(`
      SELECT meta->>'dept' AS dept, COUNT(*)::int AS count
      FROM analytics_events WHERE event = 'dept_detail' ${where}
      GROUP BY dept ORDER BY count DESC LIMIT 10`).all(...params);

    // 최종 전환 실측치 — responses 테이블(submitted_at 기준 동일 기간)
    const respWhere = where.split('occurred_at').join('submitted_at');
    const actual = await db.prepare(
      `SELECT COUNT(*)::int AS c FROM responses WHERE survey_id = 1 ${respWhere}`
    ).get(...params);

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
```

- [ ] **Step 2: server.js 마운트** — import 줄(`import dirRequestsRouter ...` 다음)에 `import { trackRouter, adminAnalyticsRouter } from './analytics.js';` 추가하고, `// === API Routes ===` 블록을 다음처럼(analytics를 `/api/admin`보다 먼저):

```js
app.use('/auth', authRouter);
app.use('/api/track', trackRouter);
app.use('/api/surveys', surveysRouter);
app.use('/api/admin/analytics', adminAnalyticsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/dir-change-requests', dirRequestsRouter);
```

- [ ] **Step 3: 스모크 검증** — backend 기동 후:
  - `curl -s -o /dev/null -w "%{http_code}" -X POST localhost:3001/api/track -H "Content-Type: application/json" -d '{"v":1,"vid":"a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d","sid":"a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d","events":[{"e":"pageview","page":"gateway"}]}'` → `204`, psql로 행 1건 확인.
  - 불량 body(`{"v":1}`) → `204` + 행 미증가.
  - `curl -s -o /dev/null -w "%{http_code}" localhost:3001/api/admin/analytics/overview` → `401` (무인증).
  - `npm test` 그린 유지.
- [ ] **Step 4: Commit** — `git add backend/src/analytics.js backend/src/server.js && git commit -m "feat(analytics): /api/track 수집 + /api/admin/analytics 집계 라우터"`

---

### Task 4: 클라이언트 트래커 `track.js` + 페이지 포함 + React RouteTracker

**Files:**
- Create: `frontend/public/track.js`
- Modify: `frontend/index.html` (head에 script 1줄)
- Modify: `frontend/public/admission-v3-dark.html`, `frontend/public/eligibility.html`, `frontend/public/scholarship.html` (각 head에 script 1줄)
- Modify: `frontend/src/App.jsx` (RouteTracker 컴포넌트)

**Interfaces:**
- Consumes: `POST /api/track` (Task 3).
- Produces: 전역 `window.pnugTrack(name, fields?)` — Task 5의 인라인 훅이 호출. `fields.view`(pageview 전용), `fields.meta`(apply_submit/dept_detail 전용). 페이지 키·뷰 키·이벤트명은 Task 2의 `PAGES/VIEWS/EVENTS`와 일치.

- [ ] **Step 1: `frontend/public/track.js` 작성** (전문):

```js
/* PNU 방문 분석 트래커 — 익명(브라우저 랜덤 UUID)·IP/이메일/입력값 미수집 (ADR 0007).
   수집: pageview · page_leave(체류/최대스크롤) · 퍼널 커스텀 이벤트(window.pnugTrack). */
(function () {
  'use strict';
  try {
    if (navigator.webdriver) return; // 자동화 브라우저 제외 (서버측 UA 필터와 이중)

    /* ── 페이지 키 정규화 — React 마이그레이션 후에도 동일 키 유지 (스펙 §4) ── */
    var PAGE_MAP = {
      '/': 'gateway',
      '/admission-v3-dark': 'admission', '/admission': 'admission', '/admission-next': 'admission',
      '/eligibility': 'eligibility', '/scholarship': 'scholarship',
      '/login': 'login', '/google': 'google', '/dept-edit-request': 'dept-edit-request',
      '/bymonolog': 'bymonolog', '/bymonolog/hub': 'bymonolog-hub',
      '/bymonolog/grad': 'bymonolog-grad', '/bymonolog/aura': 'bymonolog-aura'
    };
    var VIEW_KEYS = ['why-grad', 'eligibility', 'benefits', 'departments'];
    function pageKey() {
      var p = (location.pathname.replace(/\/+$/, '') || '/').replace(/\.html$/, '');
      if (p.indexOf('/admin') === 0 || p.indexOf('/s30') === 0) return null; // 미추적
      return PAGE_MAP[p] || 'other';
    }
    function hashView() {
      var h = location.hash.replace(/^#/, '');
      return VIEW_KEYS.indexOf(h) >= 0 ? h : 'intro';
    }

    /* ── 익명 ID (저장 불가 환경은 휘발 ID로 동작) ── */
    function uuid() {
      if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 3) | 8).toString(16);
      });
    }
    function stored(store, key) {
      try {
        var v = store.getItem(key);
        if (!v) { v = uuid(); store.setItem(key, v); }
        return v;
      } catch (e) { return uuid(); }
    }
    var vid = stored(window.localStorage, 'pnug_vid');
    var sid = stored(window.sessionStorage, 'pnug_sid');

    /* ── 전송 큐 (sendBeacon 우선, fetch keepalive 폴백) ── */
    var queue = [];
    function flush() {
      while (queue.length) {
        var body = JSON.stringify({ v: 1, vid: vid, sid: sid, events: queue.splice(0, 25) });
        var sent = false;
        if (navigator.sendBeacon) {
          try { sent = navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' })); } catch (e) {}
        }
        if (!sent) {
          try { fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body, keepalive: true }).catch(function () {}); } catch (e) {}
        }
      }
    }
    function push(ev) { queue.push(ev); if (queue.length >= 25) flush(); }
    setInterval(flush, 10000);

    /* ── 체류·스크롤 (현재 page+view 단위, page_leave는 누적 스냅샷) ── */
    var cur = null;          // { page, view }
    var visibleSince = document.visibilityState === 'hidden' ? null : Date.now();
    var activeMs = 0;
    var maxScroll = 0;

    function scrollPctOf(el) {
      var sh, st, ch;
      if (!el) {
        sh = Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0);
        st = window.pageYOffset || document.documentElement.scrollTop || 0;
        ch = window.innerHeight;
      } else { sh = el.scrollHeight; st = el.scrollTop; ch = el.clientHeight; }
      if (!sh || sh <= ch + 1) return 100; // 스크롤 없음 = 전부 노출
      return Math.max(0, Math.min(100, Math.round(((st + ch) / sh) * 100)));
    }
    function activeScroller() { return document.querySelector('.view.is-open .view-scroll'); }
    function onScroll(e) {
      var t = e && e.target;
      var pct = scrollPctOf(t && t !== document && t !== window && t.scrollHeight ? t : null);
      if (pct > maxScroll) maxScroll = pct;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('scroll', onScroll, { passive: true, capture: true }); // 내부 컨테이너(.view-scroll 등)

    function settleActive() {
      if (visibleSince != null) {
        activeMs += Date.now() - visibleSince;
        visibleSince = document.visibilityState === 'hidden' ? null : Date.now();
      }
    }
    function leaveSnapshot() { // 누적 스냅샷 — 서버는 세션별 MAX를 취함
      if (!cur) return;
      settleActive();
      push({ e: 'page_leave', page: cur.page, view: cur.view, scroll: maxScroll, dwell: Math.round(activeMs) });
    }
    var entrySent = false;
    function enter(page, view) {
      cur = { page: page, view: view };
      activeMs = 0;
      visibleSince = document.visibilityState === 'hidden' ? null : Date.now();
      maxScroll = 0;
      try { maxScroll = scrollPctOf(activeScroller()); } catch (e) {}
      var ev = { e: 'pageview', page: page, view: view };
      if (!entrySent) {
        entrySent = true;
        var ref = document.referrer;
        if (ref && ref.indexOf(location.protocol + '//' + location.host) !== 0) ev.ref = ref.slice(0, 300);
      }
      push(ev);
    }

    /* ── 공개 API ── */
    var lastKey = null; // 초기 로드 + RouteTracker/훅 이중 발화 dedupe
    window.pnugTrack = function (name, fields) {
      try {
        var page = pageKey();
        if (!page) return;
        fields = fields || {};
        if (name === 'pageview') {
          var view = page === 'admission'
            ? (VIEW_KEYS.indexOf(fields.view) >= 0 ? fields.view : (fields.view === 'intro' ? 'intro' : hashView()))
            : null;
          var key = page + '|' + (view || '');
          if (key === lastKey) return;
          lastKey = key;
          leaveSnapshot();
          enter(page, view);
        } else {
          var ev = { e: name, page: page };
          if (cur && cur.view) ev.view = cur.view;
          if (fields.meta) ev.meta = fields.meta;
          push(ev);
          if (name === 'oauth_redirect') flush(); // 곧 페이지 이탈 — 즉시 전송
        }
      } catch (e) {}
    };

    /* ── 이탈·가시성 ── */
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') { leaveSnapshot(); flush(); }
      else visibleSince = Date.now();
    });
    window.addEventListener('pagehide', function () { leaveSnapshot(); cur = null; flush(); });

    /* ── 초기 pageview + 해시 뒤로가기 대응 ── */
    window.pnugTrack('pageview', {});
    window.addEventListener('hashchange', function () { window.pnugTrack('pageview', {}); });
  } catch (e) { /* 트래커 오류는 페이지에 영향 없음 */ }
})();
```

- [ ] **Step 2: 4개 HTML에 script 태그** — 각 파일 `</head>` 직전에 `  <script src="/track.js" defer></script>` 추가: `frontend/index.html`, `frontend/public/admission-v3-dark.html`, `frontend/public/eligibility.html`, `frontend/public/scholarship.html`. (arise.html은 prod에서 301 — 제외.)
- [ ] **Step 3: App.jsx RouteTracker** — import를 `import { Routes, Route, useLocation } from 'react-router-dom';`로 바꾸고 컴포넌트 추가 + `<Routes>` 위에 렌더:

```jsx
function RouteTracker() {
  const location = useLocation();
  useEffect(() => {
    if (window.pnugTrack) window.pnugTrack('pageview', {});
  }, [location.pathname]);
  return null;
}
```

```jsx
export default function App() {
  return (
    <>
      <RouteTracker />
      <Routes>
        ...기존 그대로...
      </Routes>
    </>
  );
}
```

- [ ] **Step 4: 브라우저 검증(dev)** — backend(3001)+frontend(5173) 기동, `/` → `/admission-v3-dark.html` 이동, 스크롤, 탭 전환. psql로 `SELECT event,page,view,scroll_pct,dwell_ms FROM analytics_events ORDER BY id DESC LIMIT 20;` — gateway/admission pageview·page_leave 적재 확인. `/admin` 이동 시 이벤트가 안 생기는 것 확인.
- [ ] **Step 5: Commit** — `git add frontend/public/track.js frontend/index.html frontend/public/*.html frontend/src/App.jsx && git commit -m "feat(analytics): track.js 트래커 + 전 페이지 포함 + SPA RouteTracker"`

---

### Task 5: 인라인 퍼널 훅 (admission·계산기 2종)

**Files:**
- Modify: `frontend/public/admission-v3-dark.html` (훅 7곳: L2864 openMajorModal, L2875 openModal, L3170-3179 openApply, L3217-3229 submit 결과, L3248 showView, L3270 showIntro)
- Modify: `frontend/public/eligibility.html` (L390 근처 1곳)
- Modify: `frontend/public/scholarship.html` (L269 근처 1곳)

**Interfaces:**
- Consumes: `window.pnugTrack` (Task 4). 모든 훅은 `if(window.pnugTrack)` 가드 — track.js 미로드/차단 시 무동작.

- [ ] **Step 1: admission 뷰 전환 훅** — `showView(key)` 내 `currentView = key;`(L3260) 다음 줄에:

```js
    if(window.pnugTrack) window.pnugTrack('pageview', { view: key });
```

`showIntro()` 내 `currentView = null;`(L3274) 다음 줄에:

```js
    if(window.pnugTrack) window.pnugTrack('pageview', { view: 'intro' });
```

- [ ] **Step 2: admission 신청 퍼널 훅** — `openApply()`(L3170)를:

```js
  function openApply(){
    if(window.pnugTrack) window.pnugTrack('apply_click');
    fetch('/auth/me', { credentials:'include' }).then(function(meRes){
      if(meRes.status === 401){ if(window.pnugTrack) window.pnugTrack('oauth_redirect'); window.location.href = '/auth/google?returnTo=' + encodeURIComponent(window.location.pathname + (location.hash || '') + '?modal=apply'); return Promise.reject('redirect'); }
      if(!meRes.ok){ showToast('⚠ 사용자 정보를 불러올 수 없습니다.'); return Promise.reject('me'); }
      return fetch('/api/surveys/1/my-response', { credentials:'include' });
    }).then(function(myRes){
      if(myRes && myRes.status === 200){ showToast('이미 희망 제출을 완료하셨습니다.'); return; }
      renderPicks(); openApplyModal();
      if(window.pnugTrack) window.pnugTrack('apply_modal_open');
    }).catch(function(err){ if(err !== 'redirect' && err !== 'me') showToast('⚠ 네트워크 오류. 잠시 후 다시 시도해주세요.'); });
  }
```

(주의: OAuth 복귀 `?modal=apply` 자동 재오픈 시 apply_click이 한 번 더 찍히지만, 퍼널은 세션 DISTINCT 집계라 왜곡 없음.)

- [ ] **Step 3: admission 제출 결과 훅** — submit 체인의 `.then(function(res){`(L3217) 분기에:

```js
      if(res.status === 201){
        if(window.pnugTrack) window.pnugTrack('apply_submit', { meta: { status: 'success' } });
        ...기존 성공 처리 그대로...
      } else if(res.status === 409){ if(window.pnugTrack) window.pnugTrack('apply_submit', { meta: { status: 'dup' } }); showToast('이미 희망 제출을 완료하셨습니다.'); }
      else if(res.status === 401){ if(window.pnugTrack) window.pnugTrack('oauth_redirect'); window.location.href = ...기존... }
      else { if(window.pnugTrack) window.pnugTrack('apply_submit', { meta: { status: 'error' } }); ...기존 에러 토스트 그대로... }
```

- [ ] **Step 4: 학과 상세 모달 훅** — `openModal(d, currentMajor)`(L2875) 본문 `if (!modal || !body || !d) return;` 다음:

```js
      if(window.pnugTrack) window.pnugTrack('dept_detail', { meta: { dept: d.name } });
```

`openMajorModal(m, dept)`(L2864) 본문 `if (!modal || !body || !m) return;` 다음:

```js
      if(window.pnugTrack) window.pnugTrack('dept_detail', { meta: { dept: (dept && dept.name) || '', major: m.name } });
```

(dept가 빈 문자열이면 서버 normalizeBatch가 폐기 — 허용.)

- [ ] **Step 5: 계산기 훅** — `eligibility.html` L390 `render(tier, checks, basisSrc, ...)` 호출 직전에, `scholarship.html` L269 `render(items);` 직전에 각각:

```js
    if(window.pnugTrack) window.pnugTrack('calc_run');
```

(검증 통과 후 실제 판정 시에만 — 입력값·판정결과는 어떤 형태로도 전송하지 않는다.)

- [ ] **Step 6: 브라우저 검증(dev)** — admission에서 뷰 4개 순회→intro 복귀→학과 모달→신청 클릭(로그인 분기), 계산기 2종 실행. psql로 pageview(view별)·dept_detail·apply_click·calc_run 적재 확인. 콘솔 에러 0건.
- [ ] **Step 7: Commit** — `git add frontend/public/admission-v3-dark.html frontend/public/eligibility.html frontend/public/scholarship.html && git commit -m "feat(analytics): admission 뷰·신청 퍼널·계산기 인라인 훅"`

---

### Task 6: 관리자 대시보드 "방문 분석" 탭

**Files:**
- Create: `frontend/src/pages/AdminAnalytics.jsx`
- Modify: `frontend/src/pages/AdminDashboard.jsx` (탭 1개 + 조건 렌더 1줄 + import)

**Interfaces:**
- Consumes: `GET /api/admin/analytics/overview|funnel` (Task 3 응답 형태), AdminDashboard의 기존 다크 스타일 관례(recharts, `#0e0f13`/`#16181f` 카드).
- Produces: `<AdminAnalytics />` (props 없음, 자체 fetch).

- [ ] **Step 0: frontend-design 스킬 호출** — admin 다크 톤(#0e0f13 배경, #16181f 카드, #3672b8 계열 차트색)을 유지하는 범위에서 섹션 배치 확정. 이 계획의 마크업은 baseline — 스킬 가이드로 다듬되 데이터·API 계약은 불변.
- [ ] **Step 1: AdminAnalytics.jsx 작성** (baseline 전문):

```jsx
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#3672b8', '#5d9cd5', '#88c1eb', '#b8d9f2', '#dcebf8'];
const PAGE_LABELS = {
  gateway: '게이트웨이 (/)', admission: '연계과정 안내', eligibility: '자격 자가진단',
  scholarship: '장학 확인', login: '로그인', google: 'Google 협력', 'dept-edit-request': '학과 수정 신청',
  bymonolog: 'Bymonolog', 'bymonolog-hub': 'Bymonolog Hub', 'bymonolog-grad': 'Bymonolog Grad',
  'bymonolog-aura': 'Bymonolog Aura', other: '기타',
};
const VIEW_LABELS = { intro: '인트로', 'why-grad': '왜 대학원인가', eligibility: '자격요건', benefits: '혜택·장학', departments: '학과 디렉터리' };
const FUNNEL_STEPS = [
  ['gateway', '게이트웨이 방문'], ['admission', '안내 페이지 진입'], ['engaged', '상세 뷰 탐색'],
  ['apply_click', '신청 클릭'], ['modal_open', '신청 모달 오픈'], ['submit_success', '제출 완료'],
];
const RANGES = [
  { key: 'today', label: '오늘' }, { key: '7d', label: '최근 7일' },
  { key: 'window', label: '접수기간 7.9~7.16' }, { key: 'all', label: '전체' },
];

function kstToday(offsetDays = 0) {
  const d = new Date(Date.now() + 9 * 3600 * 1000);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}
function rangeQuery(key) {
  if (key === 'today') return { from: kstToday(), to: kstToday() };
  if (key === '7d') return { from: kstToday(-6), to: kstToday() };
  if (key === 'window') return { from: '2026-07-09', to: '2026-07-16' };
  return {};
}
function fmtDwell(ms) {
  if (ms == null) return '—';
  const s = Math.round(ms / 1000);
  return s >= 60 ? `${Math.floor(s / 60)}분 ${s % 60}초` : `${s}초`;
}

export default function AdminAnalytics() {
  const [range, setRange] = useState('window');
  const [overview, setOverview] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => { load(range); }, [range]);

  async function load(key) {
    setError(null);
    const qs = new URLSearchParams(rangeQuery(key)).toString();
    const opts = { credentials: 'include' };
    const [oRes, fRes] = await Promise.all([
      fetch(`/api/admin/analytics/overview${qs ? '?' + qs : ''}`, opts),
      fetch(`/api/admin/analytics/funnel${qs ? '?' + qs : ''}`, opts),
    ]);
    if (!oRes.ok || !fRes.ok) { setError(`방문 분석 로드 실패: ${oRes.status}/${fRes.status}`); return; }
    setOverview(await oRes.json());
    setFunnel(await fRes.json());
  }

  if (error) return <div style={st.error}>{error}</div>;
  if (!overview || !funnel) return <div style={{ padding: 24, color: '#888' }}>로딩...</div>;

  const funnelData = FUNNEL_STEPS.map(([k, label]) => ({ label, count: funnel.funnel[k] ?? 0 }));

  return (
    <>
      <div style={st.rangeRow}>
        {RANGES.map((r) => (
          <button key={r.key} onClick={() => setRange(r.key)}
            style={{ ...st.rangeBtn, ...(range === r.key ? st.rangeBtnActive : {}) }}>{r.label}</button>
        ))}
      </div>

      <div style={st.grid4}>
        <StatCard label="페이지뷰" value={overview.totals.pageviews} />
        <StatCard label="순방문자" value={overview.totals.visitors} />
        <StatCard label="세션" value={overview.totals.sessions} />
        <StatCard label="제출 완료 (실측)" value={funnel.responses_actual} />
      </div>

      <Section title="신청 퍼널 (세션 기준)">
        <ResponsiveContainer width="100%" height={FUNNEL_STEPS.length * 44 + 20}>
          <BarChart data={funnelData} layout="vertical" margin={{ left: 40, right: 30 }}>
            <XAxis type="number" allowDecimals={false} stroke="#888" />
            <YAxis dataKey="label" type="category" width={150} stroke="#888" tick={{ fontSize: 12 }} />
            <Tooltip contentStyle={{ background: '#1a1d27', border: '1px solid #2a2d38' }} />
            <Bar dataKey="count">
              {funnelData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={st.funnelNote}>
          단계 전환율: {funnelData.map((d, i) => i === 0 ? null : (
            <span key={d.label} style={{ marginRight: 12 }}>
              {FUNNEL_STEPS[i - 1][1]}→{d.label}: <b>{funnelData[i - 1].count > 0 ? Math.round((d.count / funnelData[i - 1].count) * 100) : 0}%</b>
            </span>
          ))}
          · OAuth 이동 세션 {funnel.funnel.oauth_redirect} · 계산기 사용 세션 {funnel.funnel.calc_run}
        </div>
      </Section>

      <Section title="페이지별 방문·스크롤·이탈">
        <div style={{ overflowX: 'auto' }}>
          <table style={st.table}>
            <thead><tr>
              {['페이지', '뷰', '순방문자', '세션', '평균 체류', '평균 스크롤', '이탈률'].map((h) => <th key={h} style={st.th}>{h}</th>)}
            </tr></thead>
            <tbody>
              {overview.pages.map((p) => (
                <tr key={p.page} style={{ borderTop: '1px solid #2a2d38' }}>
                  <td style={st.td}>{PAGE_LABELS[p.page] || p.page}</td>
                  <td style={st.tdNum}>{p.pageviews}</td>
                  <td style={st.tdNum}>{p.visitors}</td>
                  <td style={st.tdNum}>{p.sessions}</td>
                  <td style={st.tdNum}>{fmtDwell(p.avg_dwell_ms)}</td>
                  <td style={st.tdNum}>{p.avg_scroll_pct == null ? '—' : `${p.avg_scroll_pct}%`}</td>
                  <td style={st.tdNum}>{p.exit_rate == null ? '—' : `${p.exit_rate}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="안내 페이지 내부 뷰 도달 (세션)">
        {funnel.admission_views.length === 0 ? <Empty /> : (
          <table style={st.table}>
            <thead><tr>{['뷰', '세션', '뷰 수'].map((h) => <th key={h} style={st.th}>{h}</th>)}</tr></thead>
            <tbody>
              {funnel.admission_views.map((v) => (
                <tr key={v.view} style={{ borderTop: '1px solid #2a2d38' }}>
                  <td style={st.td}>{VIEW_LABELS[v.view] || v.view}</td>
                  <td style={st.tdNum}>{v.sessions}</td>
                  <td style={st.tdNum}>{v.pageviews}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="학과 상세 조회 Top 10">
        {funnel.dept_interest.length === 0 ? <Empty /> : (
          <table style={st.table}>
            <thead><tr>{['순위', '학과', '조회수'].map((h) => <th key={h} style={st.th}>{h}</th>)}</tr></thead>
            <tbody>
              {funnel.dept_interest.map((d, i) => (
                <tr key={d.dept} style={{ borderTop: '1px solid #2a2d38' }}>
                  <td style={st.td}>{i + 1}</td><td style={st.td}>{d.dept}</td><td style={st.tdNum}>{d.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="일별 추이">
        {overview.daily.length === 0 ? <Empty /> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={overview.daily}>
              <XAxis dataKey="day" stroke="#888" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} stroke="#888" />
              <Tooltip contentStyle={{ background: '#1a1d27', border: '1px solid #2a2d38' }} />
              <Bar dataKey="pageviews" fill="#3672b8" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Section>
    </>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={st.statCard}>
      <div style={st.statLabel}>{label}</div>
      <div style={st.statValue}>{value}</div>
    </div>
  );
}
function Section({ title, children }) {
  return <div style={st.section}><h2 style={st.h2}>{title}</h2>{children}</div>;
}
function Empty() { return <div style={{ padding: 24, textAlign: 'center', color: '#666' }}>아직 데이터가 없습니다.</div>; }

const st = {
  error: { background: '#3a1c1c', border: '1px solid #5a2a2a', color: '#ff8a8a', padding: 12, borderRadius: 8, marginBottom: 16 },
  rangeRow: { display: 'flex', gap: 8, marginBottom: 16 },
  rangeBtn: { background: 'transparent', color: '#aaa', border: '1px solid #2a2d38', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  rangeBtnActive: { background: '#23262f', color: '#fff', borderColor: '#3a3d48' },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 },
  statCard: { background: '#16181f', border: '1px solid #2a2d38', borderRadius: 10, padding: '16px 18px' },
  statLabel: { fontSize: 12, color: '#7a7a82', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 },
  statValue: { fontWeight: 700, fontSize: 28, color: '#fff' },
  section: { background: '#16181f', border: '1px solid #2a2d38', borderRadius: 10, padding: '18px 20px', marginBottom: 16 },
  h2: { fontSize: 14, fontWeight: 600, color: '#bbb', margin: '0 0 12px 0', letterSpacing: '0.05em' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '8px 6px', color: '#888', fontSize: 12, fontWeight: 500, borderBottom: '1px solid #2a2d38' },
  td: { padding: '10px 6px', fontSize: 14 },
  tdNum: { padding: '10px 6px', fontSize: 14, textAlign: 'right', fontVariantNumeric: 'tabular-nums' },
  funnelNote: { marginTop: 8, fontSize: 12, color: '#8a8a92', lineHeight: 1.8 },
};
```

(주의: 페이지 표 `<td>`가 7컬럼 헤더와 맞아야 함 — 첫 컬럼 뒤 `pageviews`부터 6개.)

- [ ] **Step 2: AdminDashboard.jsx 배선** — `import AdminAnalytics from './AdminAnalytics.jsx';` 추가, 탭 행에 버튼 추가:

```jsx
<button onClick={() => setView('analytics')} style={{ ...styles.tab, ...(view === 'analytics' ? styles.tabActive : {}) }}>방문 분석</button>
```

조건 렌더 추가: `{view === 'analytics' && <AdminAnalytics />}` (directory/requests 줄과 나란히).

- [ ] **Step 3: 브라우저 검증** — `/admin` 로그인 → 방문 분석 탭: 기간 필터 4종 전환, Task 4·5에서 쌓인 로컬 데이터가 표·퍼널에 표시되는지, 콘솔 에러 0건.
- [ ] **Step 4: Commit** — `git add frontend/src/pages/AdminAnalytics.jsx frontend/src/pages/AdminDashboard.jsx && git commit -m "feat(admin): 방문 분석 탭 (퍼널·페이지별·뷰별·일별)"`

---

### Task 7: E2E 로컬 검증 + 문서 (ADR 0007 · CONTEXT.md)

**Files:**
- Create: `docs/adr/0007-first-party-anonymous-analytics.md`
- Modify: `CONTEXT.md` (글로서리 1개 항목)

**Interfaces:**
- Consumes: Task 1~6 전부 완료 상태.

- [ ] **Step 1: 전체 퍼널 E2E** — 새 시크릿 창에서: `/` → admission → 뷰 4개 → 스크롤 → 계산기 2종 실행 → 학과 모달 → 신청 클릭(OAuth 리다이렉트 확인) 후 복귀. psql로 세션 이벤트 시퀀스 검증 + `/admin` 방문 분석 수치가 행위와 일치하는지 대조. `npm test`(backend) 그린.
- [ ] **Step 2: ADR 0007 작성**:

```markdown
# 0007. 퍼스트파티 익명 방문 분석 (Supabase·외부 SaaS 미채택)

날짜: 2026-07-07 · 상태: Accepted

## 맥락
접수기간(7.9~7.16) 퍼널 분석 요구(페이지 뷰·스크롤 깊이·이탈률). Supabase(회사 VPS) 활용 제안이 있었음.

## 결정
기존 Express+PostgreSQL에 `analytics_events` 테이블·`/api/track` 수집·`/api/admin/analytics` 집계를 추가하는 퍼스트파티 방식. 외부(회사 VPS Supabase 포함)로 방문 데이터를 보내지 않는다.

## 근거
① Supabase는 분석 기능이 없어 트래커·수집·대시보드는 어차피 직접 구현 ② PNU 방문자 데이터의 외부 인프라 전송은 ADR 0001과 같은 거버넌스 논점 재발 ③ 내부망(10.x) HTTP 접속 경로에서도 same-origin `/api/track`만 확실히 동작.

## 개인정보 (ADR 0005 정합)
방문자 식별은 localStorage 랜덤 UUID만. IP 미저장(rate-limit 메모리 순간 사용). 이메일/OAuth 미연결. 자격진단·장학 계산기의 입력값·판정결과 미수집(`calc_run` 실행 카운트만). 분석 데이터는 Google Sheets 미러 대상이 아니다.

## 결과
- 페이지 키는 정규화(`admission` 등) — React 마이그레이션(2026-06-22 계획) 후에도 연속성 유지, 마이그레이션 시 track.js 태그·인라인 훅을 함께 이식해야 한다.
- 공개 수집 엔드포인트는 per-IP 토큰버킷 + 화이트리스트 검증으로 보호(항상 204).
```

- [ ] **Step 3: CONTEXT.md 글로서리 추가** — "장학 해당 여부 확인" 항목 뒤에:

```markdown
### 방문 분석 (visitor analytics)
퍼널·페이지뷰·스크롤 깊이·이탈률을 수집하는 퍼스트파티 익명 분석 ([`docs/adr/0007`](./docs/adr/0007-first-party-anonymous-analytics.md)). 트래커 `frontend/public/track.js` → `POST /api/track` → PostgreSQL `analytics_events` → admin "방문 분석" 탭. 방문자 식별은 localStorage 랜덤 UUID만 — IP·이메일·계산기 입력값은 수집하지 않는다. 페이지 키는 정규 이름(`gateway`·`admission`·`eligibility`·`scholarship` 등)으로 React 마이그레이션과 무관하게 유지.
```

- [ ] **Step 4: Commit** — `git add docs/adr/0007-first-party-anonymous-analytics.md CONTEXT.md && git commit -m "docs: ADR 0007 퍼스트파티 익명 방문 분석 + 글로서리"`
- [ ] **Step 5: 사용자 검토 게이트** — 로컬 실행 상태로 완성본 리뷰 요청. **명시 승인 전 배포 금지.**

---

### Task 8: 배포 (사용자 승인 후에만)

**Files:** 없음(빌드 산출물). 절차는 `deploy/DEPLOYMENT.md` 관례.

- [ ] **Step 1: 프론트 빌드 + 이미지 빌드** — `cd frontend && npm run build`; (s30 dist 존재 확인) 루트에서 `docker build --provenance=false -t arise-was:latest .`
- [ ] **Step 2: 반출·적재** — `docker save arise-was:latest | gzip > arise-was.tar.gz` → `scp -P 11097 ... ubuntu@164.125.19.178:~/arise-deploy/` → 서버에서 `docker load` → `docker compose up -d was` (무중단 was 재기동; 테이블은 부팅 DDL로 생성).
- [ ] **Step 3: 포스트 배포 스모크** — ① `curl -X POST https://arise-ai.pusan.ac.kr/api/track ...`(Task 3의 정상 body) → 204 ② 실제 브라우저로 admission 방문 ③ `/admin` 방문 분석 탭에서 이벤트 확인 ④ `node deploy/test-live-visitor.mjs`로 기존 페이지 회귀 없음 확인.
- [ ] **Step 4: 서버 DB 확인** — `docker compose exec postgres psql -U arise -d arise -c "SELECT event, count(*) FROM analytics_events GROUP BY 1;"`

---

## Self-Review 결과

- 스펙 커버리지: §4 페이지 정규화(Task 4 PAGE_MAP), §5 이벤트 8종(Task 2 EVENTS + Task 4·5 발생지점), §6 트래커(Task 4), §7 수집·rate limit·스키마(Task 1·2·3), §8 집계·대시보드(Task 3·6), §9 테스트·배포(각 Task Step + Task 7·8), ADR 0007(Task 7) — 전부 매핑됨.
- 타입 일관성: track.js 이벤트 필드(`e/page/view/ref/scroll/dwell/meta`) ↔ normalizeBatch 파싱 ↔ INSERT 컬럼 ↔ 집계 SQL 컬럼 일치 확인. PAGES/VIEWS 상수 ↔ PAGE_MAP/VIEW_KEYS ↔ 대시보드 LABELS 일치 확인.
- 플레이스홀더: Task 5 Step 3의 "...기존 그대로..."는 기존 코드 무변경 표기(신규 코드는 전부 제시) — 실행자는 해당 라인 번호의 원문을 유지.
