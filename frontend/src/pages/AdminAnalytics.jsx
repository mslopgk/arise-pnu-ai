import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Kpi, KpiRow, Section, Funnel, CovChip, Segment, Meter, Rank, CellBar, Empty } from './adminUi.jsx';
import './admin.css';

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
const BACKFILL_FROM = '6.18'; // 서버 로그 복원 시작일
const LIVE_FROM = '7.7';      // 방문 분석 기능 도입(실측 시작)일
const RANGES = [
  { key: 'today', label: '오늘', query: () => ({ from: kstToday(), to: kstToday() }) },
  { key: '7d', label: '최근 7일', query: () => ({ from: kstToday(-6), to: kstToday() }) },
  { key: 'window', label: `접수기간 ${APPLY_WINDOW.from.slice(5).replace('-', '.')}~${APPLY_WINDOW.to.slice(5).replace('-', '.')}`, query: () => APPLY_WINDOW },
  { key: 'all', label: '전체', query: () => ({}) },
];

// recharts 는 CSS 클래스로 색을 줄 수 없어 계약 토큰 값을 그대로 상수화(불가피).
const C_DATA = '#1d4ed8';     // --adm-data
const C_INK = '#15161c';      // --adm-ink
const C_INK2 = '#55565b';     // --adm-ink2
const C_INK3 = '#8a8b90';     // --adm-ink3
const C_HAIR = '#e5e1d7';     // --adm-hairline
const MONO = '"JetBrains Mono Variable", "JetBrains Mono", ui-monospace, monospace';

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
const nf = (n) => (n ?? 0).toLocaleString('en-US');

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
    <div className="adm-viewbar">
      <Segment options={RANGES} value={range} onChange={setRange} ariaLabel="기간 선택" />
      <span className="adm-viewmeta">
        <CovChip kind="restored">{BACKFILL_FROM}~ 로그 복원</CovChip>{' '}
        <CovChip kind="measured">{LIVE_FROM}~ 실측</CovChip>
      </span>
    </div>
  );

  if (error) return <>{rangeRow}<div className="adm-error">{error}</div></>;
  if (!overview || !funnel) return <>{rangeRow}<div className="adm-loading">로딩...</div></>;

  const steps = FUNNEL_STEPS.map(([k, label]) => ({ key: k, label, count: funnel.funnel[k] ?? 0 }));
  const deptMax = Math.max(1, ...funnel.dept_interest.map((x) => x.count));

  const funnelNote = (
    <>
      OAuth 로그인 이동 <b className="adm-num">{funnel.funnel.oauth_redirect}</b> 세션 ·
      자격/장학 계산기 사용 <b className="adm-num">{funnel.funnel.calc_run}</b> 세션.
      신청 클릭 후 로그인 화면에서 돌아오지 않은 세션은 "신청 클릭 → 신청 모달 오픈" 구간의 이탈로 집계됩니다.
    </>
  );

  return (
    <>
      {rangeRow}

      <KpiRow>
        <Kpi label="페이지뷰" value={nf(overview.totals.pageviews)} chip={<CovChip kind="restored">{BACKFILL_FROM}~ 복원</CovChip>} />
        <Kpi label="순방문자" value={nf(overview.totals.visitors)} chip={<CovChip kind="restored">{BACKFILL_FROM}~ 복원</CovChip>} />
        <Kpi label="세션" value={nf(overview.totals.sessions)} chip={<CovChip kind="restored">{BACKFILL_FROM}~ 복원</CovChip>} />
        <Kpi label="제출 완료" value={nf(funnel.responses_actual)} chip={<CovChip kind="ok">DB 실측</CovChip>} delta="● DB 확정치" deltaTone="ok" />
      </KpiRow>

      <Section title="신청 퍼널 — 세션 기준" chips={<CovChip kind="measured">{LIVE_FROM}~ 실측</CovChip>}>
        {overview.totals.sessions === 0
          ? <Empty>선택한 기간에 세션이 없습니다.</Empty>
          : <Funnel steps={steps} note={funnelNote} />}
      </Section>

      <Section title="페이지별 방문 · 체류 · 이탈"
               chips={<><CovChip kind="restored">방문 {BACKFILL_FROM}~</CovChip> <CovChip kind="measured">체류·스크롤·이탈 {LIVE_FROM}~</CovChip></>}>
        {overview.pages.length === 0 ? <Empty /> : (
          <div className="adm-tablewrap">
            <table className="adm-table">
              <thead><tr>
                <th>페이지</th>
                <th className="num">뷰</th>
                <th className="num">순방문자</th>
                <th className="num">세션</th>
                <th className="num">평균 체류</th>
                <th>평균 스크롤 도달</th>
                <th className="num">이탈률</th>
              </tr></thead>
              <tbody>
                {overview.pages.map((p) => (
                  <tr key={p.page}>
                    <td>{PAGE_LABELS[p.page] || p.page}</td>
                    <td className="num">{nf(p.pageviews)}</td>
                    <td className="num">{nf(p.visitors)}</td>
                    <td className="num">{nf(p.sessions)}</td>
                    <td className="num">{fmtDwell(p.avg_dwell_ms)}</td>
                    <td><Meter pct={p.avg_scroll_pct} /></td>
                    <td className="num">{p.exit_rate == null ? '—' : `${p.exit_rate}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <div className="adm-grid2">
        <Section title="안내 페이지 내부 뷰 도달 — 세션" chips={<CovChip kind="measured">{LIVE_FROM}~ 실측</CovChip>}>
          {funnel.admission_views.length === 0 ? <Empty /> : (
            <div className="adm-tablewrap">
              <table className="adm-table">
                <thead><tr><th>뷰</th><th className="num">세션</th><th className="num">뷰 수</th></tr></thead>
                <tbody>
                  {funnel.admission_views.map((v) => (
                    <tr key={v.view}>
                      <td>{VIEW_LABELS[v.view] || v.view}</td>
                      <td className="num">{nf(v.sessions)}</td>
                      <td className="num">{nf(v.pageviews)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title="학과 상세 조회 Top 10" chips={<CovChip kind="measured">{LIVE_FROM}~ 실측</CovChip>}>
          {funnel.dept_interest.length === 0 ? <Empty /> : (
            <div className="adm-tablewrap">
              <table className="adm-table">
                <thead><tr><th>#</th><th>학과</th><th className="num">조회수</th></tr></thead>
                <tbody>
                  {funnel.dept_interest.map((d, i) => (
                    <tr key={d.dept}>
                      <td><Rank i={i} /></td>
                      <td>{d.dept}</td>
                      <td className="num"><CellBar value={d.count} max={deptMax} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>

      <Section title="일별 추이 — 페이지뷰" chips={<CovChip kind="restored">{BACKFILL_FROM}~ 로그 복원</CovChip>}>
        {overview.daily.length === 0 ? <Empty /> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={overview.daily} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={C_HAIR} />
              <XAxis dataKey="day" stroke={C_INK3} tickLine={false} axisLine={{ stroke: C_HAIR }}
                     tick={{ fontSize: 11, fontFamily: MONO, fill: C_INK3 }} />
              <YAxis allowDecimals={false} stroke={C_INK3} tickLine={false} axisLine={false}
                     tick={{ fontSize: 11, fontFamily: MONO, fill: C_INK3 }} />
              <Tooltip cursor={{ fill: 'rgba(29,78,216,0.06)' }}
                       contentStyle={{ background: '#fff', border: `1px solid ${C_HAIR}`, borderRadius: 4, fontSize: 12, fontFamily: MONO }}
                       labelStyle={{ color: C_INK2 }} itemStyle={{ color: C_INK }} />
              <Bar dataKey="pageviews" name="페이지뷰" fill={C_DATA} radius={[4, 4, 0, 0]} maxBarSize={26} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Section>

      <div className="adm-footer">
        집계 기준 <span className="adm-num">{new Date(funnel.generated_at).toLocaleString('ko-KR')}</span> ·
        익명 집계(ADR 0007) — IP·이메일·계산기 입력값은 수집하지 않습니다.
      </div>
    </>
  );
}
