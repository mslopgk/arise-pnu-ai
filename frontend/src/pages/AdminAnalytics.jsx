import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const PAGE_LABELS = {
  gateway: '게이트웨이 (/)', admission: '연계과정 안내', eligibility: '자격 자가진단',
  scholarship: '장학 확인', login: '로그인', google: 'Google 협력', 'dept-edit-request': '학과 수정 신청',
  bymonolog: 'Bymonolog', 'bymonolog-hub': 'Bymonolog Hub', 'bymonolog-grad': 'Bymonolog Grad',
  'bymonolog-aura': 'Bymonolog Aura', other: '기타',
};
const VIEW_LABELS = { intro: '인트로', 'why-grad': '왜 대학원인가', eligibility: '자격요건', benefits: '혜택·장학', departments: '학과 디렉터리' };
const FUNNEL_STEPS = [
  ['gateway', '게이트웨이 방문'],
  ['admission', '안내 페이지 진입'],
  ['engaged', '상세 뷰 탐색'],
  ['apply_click', '신청 클릭'],
  ['modal_open', '신청 모달 오픈'],
  ['submit_success', '제출 완료'],
];
const APPLY_WINDOW = { from: '2026-07-09', to: '2026-07-16' }; // 접수기간
const BACKFILL_FROM = '2026.6.18'; // 서버 로그 복원 시작일
const LIVE_FROM = '2026.7.7';      // 방문 분석 기능 도입(실측 시작)일
const RANGES = [
  { key: 'today', label: '오늘', query: () => ({ from: kstToday(), to: kstToday() }) },
  { key: '7d', label: '최근 7일', query: () => ({ from: kstToday(-6), to: kstToday() }) },
  { key: 'window', label: `접수기간 ${APPLY_WINDOW.from.slice(5).replace('-', '.')}~${APPLY_WINDOW.to.slice(5).replace('-', '.')}`, query: () => APPLY_WINDOW },
  { key: 'all', label: '전체', query: () => ({}) },
];

function kstToday(offsetDays = 0) {
  const d = new Date(Date.now() + 9 * 3600 * 1000);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}
function rangeQuery(key) {
  const r = RANGES.find((x) => x.key === key);
  return r ? r.query() : {};
}
function fmtDwell(ms) {
  if (ms == null) return '—';
  const s = Math.round(ms / 1000);
  return s >= 60 ? `${Math.floor(s / 60)}분 ${s % 60}초` : `${s}초`;
}

export default function AdminAnalytics() {
  const [range, setRange] = useState('7d');
  const [overview, setOverview] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setError(null);
      const qs = new URLSearchParams(rangeQuery(range)).toString();
      const opts = { credentials: 'include' };
      try {
        const [oRes, fRes] = await Promise.all([
          fetch(`/api/admin/analytics/overview${qs ? '?' + qs : ''}`, opts),
          fetch(`/api/admin/analytics/funnel${qs ? '?' + qs : ''}`, opts),
        ]);
        if (!alive) return;
        if (!oRes.ok || !fRes.ok) { setError(`방문 분석 로드 실패 (${oRes.status}/${fRes.status}) — 새로고침하거나 다시 로그인해 주세요.`); return; }
        setOverview(await oRes.json());
        setFunnel(await fRes.json());
      } catch {
        if (alive) setError('방문 분석 로드 실패 — 네트워크를 확인해 주세요.');
      }
    })();
    return () => { alive = false; };
  }, [range]);

  const rangeRow = (
    <div style={st.rangeRow}>
      {RANGES.map((r) => (
        <button key={r.key} onClick={() => setRange(r.key)}
          style={{ ...st.rangeBtn, ...(range === r.key ? st.rangeBtnActive : {}) }}>{r.label}</button>
      ))}
    </div>
  );

  if (error) return <>{rangeRow}<div style={st.error}>{error}</div></>;
  if (!overview || !funnel) return <>{rangeRow}<div style={{ padding: 24, color: '#888' }}>로딩...</div></>;

  const steps = FUNNEL_STEPS.map(([k, label]) => ({ key: k, label, count: funnel.funnel[k] ?? 0 }));
  const maxStep = Math.max(1, ...steps.map((s) => s.count));

  return (
    <>
      {rangeRow}

      <div style={st.notice}>
        ⚠ <b>데이터 범위 안내</b> — <b>페이지뷰 · 순방문자 · 세션 · 일별 추이</b>는 {BACKFILL_FROM}부터
        집계됩니다(기능 도입 전 구간은 서버 로그에서 복원). 그 외 지표 —
        <b> 스크롤 깊이 · 평균 체류 · 이탈률 · 신청 퍼널 · 내부 뷰 도달 · 학과 상세 조회 · 계산기 사용</b> —
        는 기능을 도입한 <b>{LIVE_FROM}부터</b>의 실측 통계입니다.
      </div>

      <div style={st.grid4}>
        <Stat label="페이지뷰" value={overview.totals.pageviews} />
        <Stat label="순방문자" value={overview.totals.visitors} />
        <Stat label="세션" value={overview.totals.sessions} />
        <Stat label="제출 완료 (DB 실측)" value={funnel.responses_actual} />
      </div>

      <Section title="신청 퍼널 — 세션 기준">
        {overview.totals.sessions === 0 ? <Empty /> : (
          <>
            <div>
              {steps.map((s, i) => {
                const prev = i > 0 ? steps[i - 1].count : null;
                const conv = prev > 0 ? Math.round((s.count / prev) * 100) : null;
                return (
                  <div key={s.key}>
                    {i > 0 && (
                      <div style={st.funnelConn}>
                        ↓ {conv == null ? '—' : `${conv}%`}
                      </div>
                    )}
                    <div style={st.funnelRow}>
                      <span style={st.funnelLabel}>{s.label}</span>
                      <div style={st.funnelTrack}>
                        <div style={{ ...st.funnelBar, width: `${Math.max(2, (s.count / maxStep) * 100)}%` }} />
                        <span style={st.funnelCount}>{s.count}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={st.funnelNote}>
              OAuth 로그인 이동 {funnel.funnel.oauth_redirect} 세션 · 자격/장학 계산기 사용 {funnel.funnel.calc_run} 세션.
              신청 클릭 후 로그인 화면에서 돌아오지 않은 세션은 "신청 클릭"과 "신청 모달 오픈" 사이의 이탈로 나타납니다.
            </div>
          </>
        )}
      </Section>

      <Section title="페이지별 방문 · 스크롤 · 이탈">
        {overview.pages.length === 0 ? <Empty /> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={st.table}>
              <thead><tr>
                <th style={st.th}>페이지</th>
                <th style={st.thNum}>뷰</th>
                <th style={st.thNum}>순방문자</th>
                <th style={st.thNum}>세션</th>
                <th style={st.thNum}>평균 체류</th>
                <th style={{ ...st.th, minWidth: 140 }}>평균 스크롤 도달</th>
                <th style={st.thNum}>이탈률</th>
              </tr></thead>
              <tbody>
                {overview.pages.map((p) => (
                  <tr key={p.page} style={{ borderTop: '1px solid #2a2d38' }}>
                    <td style={st.td}>{PAGE_LABELS[p.page] || p.page}</td>
                    <td style={st.tdNum}>{p.pageviews}</td>
                    <td style={st.tdNum}>{p.visitors}</td>
                    <td style={st.tdNum}>{p.sessions}</td>
                    <td style={st.tdNum}>{fmtDwell(p.avg_dwell_ms)}</td>
                    <td style={st.td}>
                      {p.avg_scroll_pct == null ? '—' : (
                        <span style={st.meterWrap}>
                          <span style={st.meterTrack}><span style={{ ...st.meterFill, width: `${p.avg_scroll_pct}%` }} /></span>
                          <span style={st.meterText}>{p.avg_scroll_pct}%</span>
                        </span>
                      )}
                    </td>
                    <td style={st.tdNum}>{p.exit_rate == null ? '—' : `${p.exit_rate}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <div style={st.grid2}>
        <Section title="안내 페이지 내부 뷰 도달 — 세션">
          {funnel.admission_views.length === 0 ? <Empty /> : (
            <table style={st.table}>
              <thead><tr><th style={st.th}>뷰</th><th style={st.thNum}>세션</th><th style={st.thNum}>뷰 수</th></tr></thead>
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
              <thead><tr><th style={st.th}>순위</th><th style={st.th}>학과</th><th style={st.thNum}>조회수</th></tr></thead>
              <tbody>
                {funnel.dept_interest.map((d, i) => (
                  <tr key={d.dept} style={{ borderTop: '1px solid #2a2d38' }}>
                    <td style={st.td}>{i + 1}</td>
                    <td style={st.td}>{d.dept}</td>
                    <td style={st.tdNum}>{d.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      </div>

      <Section title="일별 추이 — 페이지뷰">
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

      <div style={st.footer}>
        생성: {new Date(funnel.generated_at).toLocaleString('ko-KR')} · 익명 집계(ADR 0007) — IP·이메일·계산기 입력값은 수집하지 않습니다.
      </div>
    </>
  );
}

function Stat({ label, value }) {
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
  notice: { background: '#2f2810', border: '1px solid #5a4a1c', color: '#ffd76e', padding: '12px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13, lineHeight: 1.7 },
  rangeRow: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  rangeBtn: { background: 'transparent', color: '#aaa', border: '1px solid #2a2d38', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  rangeBtnActive: { background: '#23262f', color: '#fff', border: '1px solid #3a3d48' },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 },
  statCard: { background: '#16181f', border: '1px solid #2a2d38', borderRadius: 10, padding: '16px 18px' },
  statLabel: { fontSize: 12, color: '#7a7a82', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 },
  statValue: { fontWeight: 700, fontSize: 28, color: '#fff' },
  section: { background: '#16181f', border: '1px solid #2a2d38', borderRadius: 10, padding: '18px 20px', marginBottom: 16 },
  h2: { fontSize: 14, fontWeight: 600, color: '#bbb', margin: '0 0 12px 0', letterSpacing: '0.05em' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '8px 6px', color: '#888', fontSize: 12, fontWeight: 500, borderBottom: '1px solid #2a2d38' },
  thNum: { textAlign: 'right', padding: '8px 6px', color: '#888', fontSize: 12, fontWeight: 500, borderBottom: '1px solid #2a2d38' },
  td: { padding: '10px 6px', fontSize: 14 },
  tdNum: { padding: '10px 6px', fontSize: 14, textAlign: 'right', fontVariantNumeric: 'tabular-nums' },
  funnelRow: { display: 'flex', alignItems: 'center', gap: 12 },
  funnelLabel: { width: 150, flexShrink: 0, fontSize: 13, color: '#ccc', textAlign: 'right' },
  funnelTrack: { flex: 1, display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 },
  funnelBar: { height: 22, background: 'linear-gradient(90deg, #3672b8, #5d9cd5)', borderRadius: 4, transition: 'width .3s' },
  funnelCount: { fontSize: 13, fontWeight: 700, color: '#e8e8ea', fontVariantNumeric: 'tabular-nums' },
  funnelConn: { margin: '2px 0', paddingLeft: 162, fontSize: 11, color: '#7a7a82', fontVariantNumeric: 'tabular-nums' },
  funnelNote: { marginTop: 14, fontSize: 12, color: '#8a8a92', lineHeight: 1.7 },
  meterWrap: { display: 'inline-flex', alignItems: 'center', gap: 8 },
  meterTrack: { display: 'inline-block', width: 90, height: 6, background: '#23262f', borderRadius: 3, overflow: 'hidden' },
  meterFill: { display: 'block', height: '100%', background: '#5d9cd5', borderRadius: 3 },
  meterText: { fontSize: 13, fontVariantNumeric: 'tabular-nums' },
  footer: { marginTop: 8, color: '#5a5a62', fontSize: 12, textAlign: 'right' },
};
