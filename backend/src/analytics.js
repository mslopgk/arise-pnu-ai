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
