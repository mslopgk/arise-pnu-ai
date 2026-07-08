import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DeptDirectoryAdmin from './DeptDirectoryAdmin.jsx';
import DeptChangeRequestsAdmin from './DeptChangeRequestsAdmin.jsx';
import AdminAnalytics from './AdminAnalytics.jsx';
import { Masthead, Tabs, Kpi, KpiRow, Section, BarRow, Rank, CellBar, Alert, Empty } from './adminUi.jsx';
import './admin.css';

const TITLES = {
  stats: '사전신청 관리 브리프',
  analytics: '방문 분석 브리프',
  directory: '학과 디렉터리',
  requests: '학과 수정 신청',
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [me, setMe] = useState(null);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [view, setView] = useState('stats'); // 'stats' | 'analytics' | 'directory' | 'requests'
  const [chreqPending, setChreqPending] = useState(0);

  useEffect(() => {
    (async () => {
      const meRes = await fetch('/api/admin/me', { credentials: 'include' });
      if (!meRes.ok) { navigate('/admin/login'); return; }
      const meData = await meRes.json();
      setMe(meData.admin);
      fetch('/api/admin/dir-change-requests?status=pending', { credentials: 'include' })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setChreqPending(d.pending_count || 0))
        .catch(() => {});
      await loadStats();
    })();
  }, [navigate]);

  async function loadStats() {
    setError(null);
    const res = await fetch('/api/admin/stats', { credentials: 'include' });
    if (!res.ok) { setError(`통계 로드 실패: ${res.status}`); return; }
    setStats(await res.json());
  }

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
    navigate('/admin/login');
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch('/api/admin/sync', { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (!res.ok) {
        alert(`동기화 실패: ${data.error}`);
      } else {
        alert(`동기화 결과: 시도 ${data.attempted} / 성공 ${data.synced} / 실패 ${data.failed}`);
        await loadStats();
      }
    } finally {
      setSyncing(false);
    }
  }

  if (!me) return <div className="adm"><div className="adm-loading">로딩...</div></div>;

  const trackTotal = stats?.track_distribution?.reduce((a, d) => a + d.count, 0) || 0;
  const trackMax = Math.max(1, ...(stats?.track_distribution?.map((d) => d.count) ?? [1]));
  const prefMax = Math.max(1, ...(stats?.top_preferences?.map((d) => d.count) ?? [1]));

  const tabItems = [
    { key: 'stats', label: '신청 현황' },
    { key: 'analytics', label: '방문 분석' },
    { key: 'directory', label: '학과 디렉터리' },
    { key: 'requests', label: '학과 수정 신청', count: chreqPending, warn: true },
  ];

  const issueline = view === 'stats' && stats ? (
    <>
      발행 <span className="adm-num">{new Date(stats.generated_at).toLocaleString('ko-KR')}</span> KST
      <span className="sep">·</span>집계 실시간
      <span className="sep">·</span>시트 미러 {stats.sheet.configured ? '정상' : '미구성'}
    </>
  ) : view === 'analytics' ? (
    <>익명 방문 집계 · ADR 0007<span className="sep">·</span>IP·이메일 미수집</>
  ) : view === 'directory' ? (
    <>일반대학원 모집 학과 · 세부전공 디렉터리 관리</>
  ) : view === 'requests' ? (
    <>수정 요청 검토 대기 <span className="adm-num">{chreqPending}</span>건<span className="sep">·</span>승인 시 디렉터리 자동 반영</>
  ) : null;

  return (
    <div className="adm">
      <Masthead
        title={TITLES[view]}
        issueline={issueline}
        user={me.username}
        onLogout={handleLogout}
      />
      <Tabs items={tabItems} active={view} onChange={setView} />

      <div className="adm-wrap">
        {view === 'analytics' && <AdminAnalytics />}
        {view === 'directory' && <DeptDirectoryAdmin />}
        {view === 'requests' && <DeptChangeRequestsAdmin onPendingChange={setChreqPending} />}

        {view === 'stats' && error && <div className="adm-error">{error}</div>}

        {view === 'stats' && stats && (
          <>
            <div className="adm-viewbar">
              <span className="adm-viewmeta">
                집계 기준 <span className="adm-num">{new Date(stats.generated_at).toLocaleString('ko-KR')}</span>
              </span>
              <div className="adm-toolbar">
                {stats.sheet.configured && (
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${stats.sheet.sheetId}/edit`}
                    target="_blank"
                    rel="noreferrer"
                    className="adm-btn primary"
                  >
                    Google Sheets에서 전체 보기 ↗
                  </a>
                )}
                <a href="/api/admin/responses.csv" className="adm-btn secondary">CSV 다운로드</a>
                <button onClick={loadStats} className="adm-btn ghost">새로고침</button>
              </div>
            </div>

            {stats.not_synced > 0 && stats.sheet.configured && (
              <Alert
                tone="warn"
                action={
                  <button onClick={handleSync} disabled={syncing} className="adm-btn primary">
                    {syncing ? '동기화 중...' : '지금 재동기화'}
                  </button>
                }
              >
                Google Sheets에 미동기화된 응답이 <b className="adm-num">{stats.not_synced}건</b> 있습니다.
              </Alert>
            )}
            {!stats.sheet.configured && (
              <Alert tone="info" icon="ℹ">
                Google Sheets 미러가 구성되지 않았습니다. <code>GOOGLE_SHEETS_ID</code>·<code>GOOGLE_SHEETS_SA_KEY_PATH</code> 설정 후 백엔드를 재시작하세요. (사유: {stats.sheet.reason})
              </Alert>
            )}

            <KpiRow>
              <Kpi
                label="총 신청"
                value={stats.total_responses.toLocaleString('en-US')}
                delta={stats.last_24h > 0 ? `▲ 최근 24시간 +${stats.last_24h}` : '최근 24시간 신규 없음'}
                deltaTone={stats.last_24h > 0 ? 'ok' : undefined}
              />
              <Kpi label="최근 24시간 신청" value={stats.last_24h.toLocaleString('en-US')} />
              <Kpi
                label="시트 미동기화"
                value={stats.not_synced.toLocaleString('en-US')}
                stub={stats.not_synced > 0 ? 'warn' : undefined}
                delta={stats.not_synced > 0 ? '⚠ 확인 필요' : '● 미러 최신'}
                deltaTone={stats.not_synced > 0 ? 'warn' : 'ok'}
              />
              <Kpi
                label="시트 미러"
                state={stats.sheet.configured ? '정상' : '미구성'}
                stateTone={stats.sheet.configured ? 'ok' : 'muted'}
              />
            </KpiRow>

            <div className="adm-grid2">
              <Section title="희망 트랙 분포" meta={`집계 n=${trackTotal.toLocaleString('en-US')}`}>
                {(stats.track_distribution?.length ?? 0) === 0 ? (
                  <Empty>첫 신청이 들어오면 트랙별 분포가 표시됩니다.</Empty>
                ) : (
                  <div className="adm-bars">
                    {stats.track_distribution.map((d) => (
                      <BarRow
                        key={d.label}
                        label={d.label}
                        count={d.count}
                        max={trackMax}
                        share={trackTotal > 0 ? Math.round((d.count / trackTotal) * 100) : null}
                      />
                    ))}
                  </div>
                )}
              </Section>

              <Section title="지망 학과·전공 Top 10" meta="1·2·3지망 합산">
                {(stats.top_preferences?.length ?? 0) === 0 ? (
                  <Empty>첫 신청이 들어오면 지망 순위가 표시됩니다.</Empty>
                ) : (
                  <div className="adm-tablewrap">
                    <table className="adm-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>학과 / 전공</th>
                          <th className="num">지망수</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.top_preferences.map((d, i) => (
                          <tr key={i}>
                            <td><Rank i={i} /></td>
                            <td>{d.label}</td>
                            <td className="num"><CellBar value={d.count} max={prefMax} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
