import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import DeptDirectoryAdmin from './DeptDirectoryAdmin.jsx';
import DeptChangeRequestsAdmin from './DeptChangeRequestsAdmin.jsx';
import AdminAnalytics from './AdminAnalytics.jsx';

const COLORS = ['#3672b8', '#5d9cd5', '#88c1eb', '#b8d9f2', '#dcebf8'];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [me, setMe] = useState(null);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [view, setView] = useState('stats'); // 'stats' | 'directory' | 'requests'
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

  if (!me) return <div style={{padding:32, background:'#0e0f13', color:'#aaa', minHeight:'100vh'}}>로딩...</div>;

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={{display:'flex', alignItems:'center', gap:14}}>
          <img src="/logos/pnu-symbol-color.jpg" alt="PNU" style={styles.symbol} />
          <div>
            <div style={styles.eyebrow}>PNU · ADMIN</div>
            <h1 style={styles.h1}>학·석사 연계과정 신청 현황</h1>
          </div>
        </div>
        <div style={styles.userBox}>
          <span>{me.username}</span>
          <button onClick={handleLogout} style={styles.ghostButton}>로그아웃</button>
        </div>
      </header>

      <div style={styles.tabs}>
        <button onClick={() => setView('stats')} style={{ ...styles.tab, ...(view === 'stats' ? styles.tabActive : {}) }}>신청 현황</button>
        <button onClick={() => setView('analytics')} style={{ ...styles.tab, ...(view === 'analytics' ? styles.tabActive : {}) }}>방문 분석</button>
        <button onClick={() => setView('directory')} style={{ ...styles.tab, ...(view === 'directory' ? styles.tabActive : {}) }}>학과 디렉터리 관리</button>
        <button onClick={() => setView('requests')} style={{ ...styles.tab, ...(view === 'requests' ? styles.tabActive : {}) }}>
          학과 수정 신청{chreqPending > 0 && <span style={styles.tabBadge}>{chreqPending}</span>}
        </button>
      </div>

      {view === 'analytics' && <AdminAnalytics />}
      {view === 'directory' && <DeptDirectoryAdmin />}
      {view === 'requests' && <DeptChangeRequestsAdmin onPendingChange={setChreqPending} />}

      {view === 'stats' && error && <div style={styles.error}>{error}</div>}

      {view === 'stats' && stats && (
        <>
          {stats.not_synced > 0 && stats.sheet.configured && (
            <div style={styles.warn}>
              ⚠ Google Sheets에 미동기화된 응답이 <b>{stats.not_synced}건</b> 있습니다.
              <button onClick={handleSync} disabled={syncing} style={{...styles.warnButton, marginLeft:12}}>
                {syncing ? '동기화 중...' : '지금 재동기화'}
              </button>
            </div>
          )}
          {!stats.sheet.configured && (
            <div style={styles.warn}>
              ℹ Google Sheets 미러가 구성되지 않았습니다. <code style={{fontSize:12}}>GOOGLE_SHEETS_ID</code>, <code style={{fontSize:12}}>GOOGLE_SHEETS_SA_KEY_PATH</code> 설정 후 백엔드 재시작. (사유: {stats.sheet.reason})
            </div>
          )}

          <div style={styles.grid4}>
            <Stat label="총 신청수" value={stats.total_responses} />
            <Stat label="최근 24h" value={stats.last_24h} />
            <Stat label="미동기화" value={stats.not_synced} tone={stats.not_synced > 0 ? 'warn' : 'ok'} />
            <Stat label="시트 상태" value={stats.sheet.configured ? '연결됨' : '미구성'} small tone={stats.sheet.configured ? 'ok' : 'muted'} />
          </div>

          <Section title="희망 트랙 분포">
            {(stats.track_distribution?.length ?? 0) === 0 ? (
              <Empty />
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(180, stats.track_distribution.length * 50)}>
                <BarChart data={stats.track_distribution} layout="vertical" margin={{left: 30, right: 20}}>
                  <XAxis type="number" allowDecimals={false} stroke="#888" />
                  <YAxis dataKey="label" type="category" width={200} stroke="#888" tick={{fontSize:12}} />
                  <Tooltip contentStyle={{background:'#1a1d27',border:'1px solid #2a2d38'}} />
                  <Bar dataKey="count">
                    {stats.track_distribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Section>

          <Section title="지망 학과/전공 Top 10 (1·2·3지망 합산)">
            {(stats.top_preferences?.length ?? 0) === 0 ? (
              <Empty />
            ) : (
              <table style={styles.table}>
                <thead><tr><th style={styles.th}>순위</th><th style={styles.th}>학과 / 전공</th><th style={{...styles.th, textAlign:'right'}}>지망수</th></tr></thead>
                <tbody>
                  {stats.top_preferences.map((d, i) => (
                    <tr key={i} style={{borderTop:'1px solid #2a2d38'}}>
                      <td style={styles.td}>{i+1}</td>
                      <td style={styles.td}>{d.label}</td>
                      <td style={{...styles.td, textAlign:'right', fontWeight:600}}>{d.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          <div style={styles.actions}>
            {stats.sheet.configured && (
              <a href={`https://docs.google.com/spreadsheets/d/${stats.sheet.sheetId}/edit`} target="_blank" rel="noreferrer" style={styles.primaryButton}>
                📊 Google Sheets에서 전체 보기 →
              </a>
            )}
            <a href="/api/admin/responses.csv" style={styles.secondaryButton}>⬇ CSV 다운로드</a>
            <button onClick={loadStats} style={styles.ghostButton}>🔄 새로고침</button>
          </div>

          <div style={styles.footer}>
            생성: {new Date(stats.generated_at).toLocaleString('ko-KR')}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, small, tone }) {
  const colorMap = { ok:'#5dc99e', warn:'#ffb800', muted:'#888' };
  return (
    <div style={styles.statCard}>
      <div style={styles.statLabel}>{label}</div>
      <div style={{...styles.statValue, fontSize: small ? 18 : 28, color: tone ? colorMap[tone] : '#fff'}}>{value}</div>
    </div>
  );
}
function Section({ title, children }) {
  return (
    <div style={styles.section}>
      <h2 style={styles.h2}>{title}</h2>
      {children}
    </div>
  );
}
function Empty() {
  return <div style={{padding:24, textAlign:'center', color:'#666'}}>아직 데이터가 없습니다.</div>;
}

const styles = {
  page: { minHeight:'100vh', background:'#0e0f13', color:'#e8e8ea', padding:'24px 28px 64px', fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans KR", sans-serif' },
  header: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24, paddingBottom:16, borderBottom:'1px solid #2a2d38' },
  symbol: { width:42, height:42, objectFit:'contain', background:'#fff', borderRadius:6, padding:2 },
  eyebrow: { fontSize:11, letterSpacing:'0.2em', color:'#7a7a82', textTransform:'uppercase', marginBottom:6 },
  h1: { fontSize:24, fontWeight:700, margin:0 },
  userBox: { display:'flex', alignItems:'center', gap:12, color:'#aaa', fontSize:14 },
  ghostButton: { background:'transparent', color:'#ccc', border:'1px solid #3a3d48', padding:'6px 12px', borderRadius:6, cursor:'pointer', fontSize:13 },
  error: { background:'#3a1c1c', border:'1px solid #5a2a2a', color:'#ff8a8a', padding:12, borderRadius:8, marginBottom:16 },
  warn: { background:'#2f2810', border:'1px solid #5a4a1c', color:'#ffd76e', padding:12, borderRadius:8, marginBottom:16, display:'flex', alignItems:'center', flexWrap:'wrap' },
  warnButton: { background:'#ffb800', color:'#000', border:'none', padding:'6px 14px', borderRadius:6, cursor:'pointer', fontWeight:600, fontSize:13 },
  grid4: { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:12, marginBottom:24 },
  grid2: { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(360px, 1fr))', gap:16, marginBottom:16 },
  statCard: { background:'#16181f', border:'1px solid #2a2d38', borderRadius:10, padding:'16px 18px' },
  statLabel: { fontSize:12, color:'#7a7a82', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 },
  statValue: { fontWeight:700 },
  section: { background:'#16181f', border:'1px solid #2a2d38', borderRadius:10, padding:'18px 20px', marginBottom:16 },
  h2: { fontSize:14, fontWeight:600, color:'#bbb', margin:'0 0 12px 0', letterSpacing:'0.05em' },
  table: { width:'100%', borderCollapse:'collapse' },
  th: { textAlign:'left', padding:'8px 6px', color:'#888', fontSize:12, fontWeight:500, borderBottom:'1px solid #2a2d38' },
  td: { padding:'10px 6px', fontSize:14 },
  actions: { display:'flex', gap:10, flexWrap:'wrap', marginTop:16, marginBottom:8 },
  primaryButton: { background:'#3672b8', color:'#fff', textDecoration:'none', padding:'10px 18px', borderRadius:6, fontSize:14, fontWeight:600 },
  secondaryButton: { background:'#1f2230', color:'#e8e8ea', textDecoration:'none', padding:'10px 18px', borderRadius:6, fontSize:14, border:'1px solid #3a3d48' },
  footer: { marginTop:20, color:'#5a5a62', fontSize:12, textAlign:'right' },
  tabs: { display:'flex', gap:8, marginBottom:18 },
  tab: { background:'transparent', color:'#aaa', border:'1px solid #2a2d38', padding:'8px 16px', borderRadius:8, cursor:'pointer', fontSize:14, fontWeight:600 },
  tabActive: { background:'#23262f', color:'#fff', borderColor:'#3a3d48' },
  tabBadge: { display:'inline-block', marginLeft:8, minWidth:18, padding:'1px 6px', borderRadius:999, background:'#ffb800', color:'#000', fontSize:11, fontWeight:700, textAlign:'center' },
};
