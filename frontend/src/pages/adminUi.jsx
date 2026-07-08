/* 관리 콘솔 공용 프리미티브 — admin.css "통계 브리프" 계약과 짝.
   5개 화면(로그인·신청현황·방문분석·디렉터리·수정신청)이 이 조각들을 조합해 만들어진다.
   숫자는 전부 mono·tabular, 데이터 마크는 단일 블루, 색은 마크·상태·구조선에만. */

/* ── 셸: 마스트헤드 + 탭 ── */
export function Masthead({ title, issueline, user, onLogout }) {
  return (
    <>
      <div className="adm-topline" />
      <div className="adm-hair" />
      <div className="adm-masthead">
        <div className="adm-brand">
          <img src="/logos/pnu-symbol-color.jpg" alt="부산대학교" className="adm-logo" />
          <div>
            <div className="adm-kicker">부산대학교 일반대학원 · 학·석사 연계과정</div>
            <h1 className="adm-h1">{title}</h1>
            {issueline && <div className="adm-issueline">{issueline}</div>}
          </div>
        </div>
        {user && (
          <div className="adm-user">
            <div style={{ textAlign: 'right' }}>
              <div className="adm-user__id">{user}</div>
              <div className="adm-user__role">관리자 · 학사사무실</div>
            </div>
            <button onClick={onLogout} className="adm-btn ghost">로그아웃</button>
          </div>
        )}
      </div>
    </>
  );
}

// items: [{ key, label, count }]  — count>0 이면 알림 필(warn: true면 경고색)
export function Tabs({ items, active, onChange }) {
  return (
    <nav className="adm-tabs">
      {items.map((t, i) => (
        <button key={t.key} onClick={() => onChange(t.key)} className={`adm-tab${active === t.key ? ' active' : ''}`}>
          <span className="adm-tab__num">{String(i + 1).padStart(2, '0')}</span>
          {t.label}
          {t.count > 0 && <span className={`adm-tab__count${t.warn ? ' warn' : ''}`}>{t.count}</span>}
        </button>
      ))}
    </nav>
  );
}

/* ── KPI ── */
// tone: 델타/상태색 'ok'|'warn'|'danger' · stub: 좌측 스텁 표시(경고 KPI)
export function Kpi({ label, value, chip, delta, deltaTone, state, stateTone, stub }) {
  return (
    <div className={`adm-kpi${stub ? (stub === 'danger' ? ' adm-kpi--danger' : '') : ''}`} style={stub ? { paddingLeft: 22 } : undefined}>
      {stub && <span className="adm-kpi__stub" />}
      <div className="adm-kpi__label">{label}{chip}</div>
      {state != null
        ? <div className="adm-kpi__value state"><span className={`adm-dot ${stateTone || 'muted'}`} />{state}</div>
        : <div className="adm-kpi__value">{value}</div>}
      {delta && <div className={`adm-kpi__delta${deltaTone ? ' ' + deltaTone : ''}`}>{delta}</div>}
    </div>
  );
}
export function KpiRow({ children }) { return <div className="adm-kpi-row">{children}</div>; }

/* ── 섹션 ── */
export function Section({ title, meta, chips, children, dense }) {
  return (
    <div className={`adm-section${dense ? ' dense' : ''}`}>
      <h2 className="adm-h2">{title}{meta && <span className="adm-h2__meta">{meta}</span>}{chips}</h2>
      {children}
    </div>
  );
}

/* ── 데이터 막대 행 (분포) ── */
export function BarRow({ label, count, max, share }) {
  return (
    <div className="adm-bar-row">
      <span className="adm-bar-row__label">{label}</span>
      <span className="adm-bar-row__track"><span className="adm-bar-row__fill" style={{ width: `${Math.max(2, (count / max) * 100)}%` }} /></span>
      <span className="adm-bar-row__count">{count.toLocaleString('en-US')}{share != null && <span className="pct">{share}%</span>}</span>
    </div>
  );
}

/* ── 표 조각 ── */
export function Rank({ i }) { return <span className="adm-rank">{String(i + 1).padStart(2, '0')}</span>; }
// 표 셀 안 인라인 막대 (표=차트)
export function CellBar({ value, max, format }) {
  return (
    <span className="adm-cellbar">
      <span className="adm-cellbar__track"><span className="adm-cellbar__fill" style={{ width: `${Math.max(3, (value / max) * 100)}%` }} /></span>
      {format ? format(value) : value.toLocaleString('en-US')}
    </span>
  );
}
// 스크롤/체류 미터
export function Meter({ pct }) {
  if (pct == null) return <span className="adm-num" style={{ color: 'var(--adm-ink3)' }}>—</span>;
  return (
    <span className="adm-meter">
      <span className="adm-meter__track"><span className="adm-meter__fill" style={{ width: `${pct}%` }} /></span>
      <span className="adm-meter__val">{pct}%</span>
    </span>
  );
}

/* ── §9 신청 퍼널 (시그니처) ── steps: [{ key, label, count }] */
export function Funnel({ steps, note }) {
  const max = Math.max(1, ...steps.map((s) => s.count));
  let maxDropIdx = -1, maxDrop = 0;
  steps.forEach((s, i) => {
    if (i === 0) return;
    const drop = Math.max(0, steps[i - 1].count - s.count);
    if (drop > maxDrop) { maxDrop = drop; maxDropIdx = i; }
  });
  return (
    <div>
      <div className="adm-funnel">
        {steps.map((s, i) => {
          const prev = i > 0 ? steps[i - 1].count : null;
          const conv = prev > 0 ? Math.round((s.count / prev) * 100) : null;
          const drop = prev != null ? Math.max(0, prev - s.count) : 0;
          const isMax = i === maxDropIdx && maxDrop > 0;
          return (
            <div key={s.key}>
              {i > 0 && (
                <div className={`adm-funnel__connector${isMax ? ' max' : ''}`}>
                  <span className="adm-funnel__annot">→ 전환 {conv == null ? '—' : `${conv}%`} · <span className="drop">이탈 −{drop}</span></span>
                  {isMax && <span className="adm-funnel__droptag">◆ 최다 이탈</span>}
                </div>
              )}
              <div className="adm-funnel__step">
                <span className="adm-funnel__name">{s.label}</span>
                <span className="adm-funnel__track">
                  <span className="adm-funnel__bar" style={{ width: `${Math.max(2, (s.count / max) * 100)}%` }} />
                  <span className="adm-funnel__count">{s.count.toLocaleString('en-US')}</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {note && <div className="adm-funnel__note">{note}</div>}
    </div>
  );
}

/* ── 커버리지 칩 · 세그먼트 ── */
export function CovChip({ kind, children }) { return <span className={`adm-covchip ${kind}`}>{children}</span>; }
export function Segment({ options, value, onChange, ariaLabel }) {
  return (
    <div className="adm-segment" role="tablist" aria-label={ariaLabel}>
      {options.map((o) => (
        <button key={o.key} role="tab" aria-selected={value === o.key} onClick={() => onChange(o.key)}
          className={`adm-segment__opt${value === o.key ? ' active' : ''}`}>{o.label}</button>
      ))}
    </div>
  );
}

/* ── 경고 스트립 ── */
export function Alert({ tone = 'warn', icon = '⚠', children, action }) {
  return (
    <div className={`adm-alert ${tone}`}>
      <span className="adm-alert__icon">{icon}</span>
      <span className="adm-alert__body">{children}</span>
      {action}
    </div>
  );
}

/* ── 상태 뱃지 ── tone: ok|warn|danger|pending */
export function Badge({ tone = 'pending', icon, children, sm }) {
  const mark = icon || (tone === 'ok' ? '●' : tone === 'danger' ? '■' : tone === 'warn' ? '▲' : '○');
  return <span className={`adm-badge ${tone}${sm ? ' sm' : ''}`}>{mark} {children}</span>;
}

/* ── 폼 ── */
export function Field({ label, help, children }) {
  return (
    <label className="adm-field">
      {label && <span className="adm-label">{label}</span>}
      {children}
      {help && <span className="adm-help">{help}</span>}
    </label>
  );
}

/* ── 모달 ── */
export function Modal({ title, onClose, children, foot }) {
  return (
    <div className="adm-modal__overlay" onClick={onClose}>
      <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="adm-modal__head"><div className="adm-modal__title">{title}</div></div>
        <div className="adm-modal__body">{children}</div>
        {foot && <div className="adm-modal__foot">{foot}</div>}
      </div>
    </div>
  );
}

/* ── 빈 상태 ── */
export function Empty({ children = '아직 수집된 데이터가 없습니다.' }) {
  return <div className="adm-empty">{children}</div>;
}
