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
    function safeStorage(kind) {
      // 'Block all cookies' 등에서는 window.localStorage 접근 자체가 SecurityError
      try { return window[kind]; } catch (e) { return null; }
    }
    function stored(store, key) {
      try {
        if (!store) return uuid();
        var v = store.getItem(key);
        if (!v) { v = uuid(); store.setItem(key, v); }
        return v;
      } catch (e) { return uuid(); }
    }
    var vid = stored(safeStorage('localStorage'), 'pnug_vid');
    var sid = stored(safeStorage('sessionStorage'), 'pnug_sid');

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
    var scrollPending = false;
    function measureScroll(el) {
      var pct = scrollPctOf(el);
      if (pct > maxScroll) maxScroll = pct;
    }
    function onScroll(e) {
      var t = e && e.target;
      var el = null;
      if (t && t !== document && t !== window) {
        // 페이지 대표 스크롤러(.view-scroll)만 측정 — 모달·내부 리스트 스크롤은 깊이에서 제외
        if (!(t.classList && t.classList.contains('view-scroll'))) return;
        el = t;
      }
      if (scrollPending) return;
      scrollPending = true;
      if (window.requestAnimationFrame) {
        requestAnimationFrame(function () { scrollPending = false; measureScroll(el); });
      } else { scrollPending = false; measureScroll(el); }
    }
    // 캡처 단계 리스너 하나로 뷰포트 스크롤(target=document)과 내부 .view-scroll 둘 다 수신
    document.addEventListener('scroll', onScroll, { passive: true, capture: true });

    function settleActive() { // 체류 = 탭이 보이는 동안만 누적 (백그라운드 탭은 0)
      if (visibleSince != null) {
        activeMs += Date.now() - visibleSince;
        visibleSince = document.visibilityState === 'hidden' ? null : Date.now();
      }
    }
    function leaveSnapshot() { // (page,view) 단위 누적 스냅샷 — 서버는 뷰별 MAX 후 체류는 뷰 합산
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
        if (!page) { // 미추적 경로(/admin 등) 진입 — 직전 페이지 체류를 마감하고 측정 중단
          leaveSnapshot();
          cur = null;
          lastKey = null;
          return;
        }
        fields = fields || {};
        if (name === 'pageview') {
          var view = null;
          if (page === 'admission') {
            if (fields.view === 'intro' || VIEW_KEYS.indexOf(fields.view) >= 0) view = fields.view;
            else view = hashView();
          }
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
    // bfcache 복원(모바일 뒤로가기) — pagehide로 비운 상태를 새 방문으로 재개
    window.addEventListener('pageshow', function (e) {
      if (e && e.persisted) { lastKey = null; window.pnugTrack('pageview', {}); }
    });

    /* ── 초기 pageview + 해시 뒤로가기 대응 ── */
    window.pnugTrack('pageview', {});
    window.addEventListener('hashchange', function () { window.pnugTrack('pageview', {}); });
  } catch (e) { /* 트래커 오류는 페이지에 영향 없음 */ }
})();
