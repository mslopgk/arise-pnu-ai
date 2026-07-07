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
