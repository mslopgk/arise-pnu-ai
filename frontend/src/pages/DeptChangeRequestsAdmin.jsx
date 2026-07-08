import { useEffect, useState } from 'react';
import './admin.css';
import { Segment, Badge, Empty } from './adminUi.jsx';

// 학과 정보 수정 신청 — 관리자 검토 큐. 승인 시 디렉터리 자동 반영.
const api = (url, opts = {}) => fetch(url, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...opts });

const STATUS = {
  pending: { label: '검토 대기' },
  approved: { label: '승인 · 반영됨' },
  rejected: { label: '반려됨' },
};
const statusTone = (s) => (s === 'approved' ? 'ok' : s === 'rejected' ? 'danger' : 'pending');
const StatusBadge = ({ status, sm }) => (
  <Badge tone={statusTone(status)} sm={sm}>{(STATUS[status] || STATUS.pending).label}</Badge>
);

const fmtDate = (s) => { try { return new Date(s).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }); } catch { return s; } };

const FILTERS = [
  { key: 'pending', label: '검토 대기' },
  { key: 'all', label: '전체' },
  { key: 'approved', label: '승인' },
  { key: 'rejected', label: '반려' },
];

function targetText(r) {
  const del = r.action === 'delete';
  if (r.target_level === 'major') {
    const m = r.major_id ? `세부전공 「${r.major_name || `#${r.major_id}`}」` : `신규 세부전공 「${r.major_name || ''}」`;
    const d = r.dept_id ? r.dept_name : `신규 학과 「${r.dept_name || ''}」`;
    return `${del ? '삭제: ' : ''}${m} · ${d}`;
  }
  if (del) return `삭제: 학과 「${r.dept_name || `#${r.dept_id}`}」`;
  return r.dept_id ? `학과 「${r.dept_name || `#${r.dept_id}`}」 수정` : `신규 학과 「${r.dept_name || ''}」`;
}

export default function DeptChangeRequestsAdmin({ onPendingChange }) {
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [selId, setSelId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const r = await api(`/api/admin/dir-change-requests?status=${filter}`);
      const d = await r.json();
      setList(d.requests || []);
      onPendingChange?.(d.pending_count || 0);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  async function openDetail(id) {
    setSelId(id); setDetail(null);
    const r = await api(`/api/admin/dir-change-requests/${id}`);
    if (r.ok) setDetail((await r.json()).request);
  }
  async function approve(req) {
    const isDel = req.action === 'delete';
    const msg = isDel
      ? (req.target_level === 'major'
          ? `세부전공 「${req.major_name}」을(를) 디렉터리에서 삭제합니다. 계속할까요?`
          : `학과 「${req.dept_name}」과(와) 소속 세부전공 전체를 디렉터리에서 삭제합니다. 되돌릴 수 없습니다. 계속할까요?`)
      : '이 신청을 승인하고 디렉터리에 반영할까요?';
    if (!confirm(msg)) return;
    setBusy(true);
    try {
      const r = await api(`/api/admin/dir-change-requests/${req.id}/approve`, { method: 'POST' });
      if (!r.ok) { alert('승인 실패: ' + ((await r.json().catch(() => ({}))).error || r.status)); return; }
      await load(); await openDetail(req.id);
    } finally { setBusy(false); }
  }
  async function reject(id) {
    const reason = prompt('반려 사유 (선택, 비워도 됩니다)');
    if (reason === null) return; // 취소
    setBusy(true);
    try {
      const r = await api(`/api/admin/dir-change-requests/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) });
      if (!r.ok) { alert('반려 실패: ' + ((await r.json().catch(() => ({}))).error || r.status)); return; }
      await load(); await openDetail(id);
    } finally { setBusy(false); }
  }

  return (
    <div className="adm-split">
      {/* ── 좌: 검토 큐 목록 ── */}
      <div className="adm-split__list">
        <div className="adm-filterbar">
          <Segment
            options={FILTERS}
            value={filter}
            onChange={(f) => { setFilter(f); setSelId(null); setDetail(null); }}
            ariaLabel="상태 필터"
          />
          <span className="adm-listcount">{loading ? '로딩…' : `${list.length}건`}</span>
        </div>
        <div className="adm-listbody">
          {!loading && list.length === 0 && <Empty>해당 신청이 없습니다.</Empty>}
          {list.map((r) => {
            const isDel = r.action === 'delete';
            return (
              <button
                key={r.id}
                onClick={() => openDetail(r.id)}
                className={`adm-listitem${isDel ? ' is-delete' : ''}${r.id === selId ? ' is-selected' : ''}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span className="adm-listitem__title">{r.applicant_name || '(이름 없음)'}</span>
                  <span style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                    {isDel && <Badge tone="danger" sm>삭제</Badge>}
                    <StatusBadge status={r.status} sm />
                  </span>
                </div>
                <div>{targetText(r)}</div>
                <div className="adm-listitem__meta">{r.affiliation || ''} · {fmtDate(r.created_at)}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 우: 상세 ── */}
      <div className="adm-split__detail">
        {!detail ? (
          <Empty>← 신청을 선택하세요.</Empty>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
              <div>
                <div className="adm-h2">{targetText(detail)}</div>
                <div className="adm-viewmeta">
                  신청 <span className="adm-num">#{detail.id}</span> · <span className="adm-num">{fmtDate(detail.created_at)}</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
                {detail.action === 'delete' && <Badge tone="danger">삭제 요청</Badge>}
                <StatusBadge status={detail.status} />
              </div>
            </div>

            <Group title="신청자">
              <dl className="adm-dl">
                <Row k="신청자명" v={detail.applicant_name} />
                <Row k="소속" v={detail.affiliation} />
                <Row k="내선전화" v={detail.ext_phone} />
                <Row k="제출자 이메일" v={detail.submitter_email} />
              </dl>
            </Group>

            <Group title="반영 대상">
              <dl className="adm-dl">
                <Row k="계열" v={detail.gyeyeol} />
                <Row k="학과" v={`${detail.dept_name || '-'}${detail.dept_id ? ` (기존 #${detail.dept_id})` : ' (신규)'}`} />
                {detail.target_level === 'major' && (
                  <Row k="세부전공" v={`${detail.major_name || '-'}${detail.major_id ? ` (기존 #${detail.major_id})` : ' (신규)'}`} />
                )}
              </dl>
            </Group>

            {detail.action === 'delete' ? (
              <Group title="삭제 사유">
                <div className="adm-dl__v" style={{ whiteSpace: 'pre-wrap' }}>{detail.note || '(사유 없음)'}</div>
              </Group>
            ) : (
              <>
                <Group title="디렉터리 내용 (비운 항목은 기존값 유지)">
                  <dl className="adm-dl">
                    <Row k="소개" v={detail.intro} pre />
                    <Row k="위치" v={detail.location} />
                    <Row k="전화번호" v={detail.phone} />
                    <Row k="홈페이지" v={detail.homepage} link />
                    <Row k="BK21 사업단 홈페이지" v={detail.bk21_url} link />
                  </dl>
                </Group>

                {detail.has_image && (
                  <Group title="첨부 이미지">
                    <img
                      src={`/api/admin/dir-change-requests/${detail.id}/image`}
                      alt="첨부 이미지"
                      style={{ maxWidth: '100%', display: 'block', border: '1px solid var(--adm-hairline)', borderRadius: 4 }}
                    />
                  </Group>
                )}
              </>
            )}

            {detail.status !== 'pending' && (
              <Group title="검토 결과">
                <dl className="adm-dl">
                  <Row k="처리 시각" v={fmtDate(detail.reviewed_at)} />
                  {detail.reject_reason && <Row k="반려 사유" v={detail.reject_reason} pre />}
                </dl>
              </Group>
            )}

            {detail.status === 'pending' && (
              <div className="adm-group">
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    disabled={busy}
                    onClick={() => approve(detail)}
                    className={`adm-btn ${detail.action === 'delete' ? 'danger' : 'primary'}`}
                  >
                    {detail.action === 'delete' ? '🗑 승인 · 디렉터리에서 삭제' : '✓ 승인 · 디렉터리 반영'}
                  </button>
                  <button disabled={busy} onClick={() => reject(detail.id)} className="adm-btn danger">반려</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Group({ title, children }) {
  return (
    <div className="adm-group">
      <div className="adm-group__title">{title}</div>
      {children}
    </div>
  );
}

function Row({ k, v, pre, link }) {
  const empty = v == null || String(v).trim() === '';
  return (
    <>
      <div className="adm-dl__k">{k}</div>
      <div className={`adm-dl__v${empty ? ' empty' : ''}`} style={pre ? { whiteSpace: 'pre-wrap' } : undefined}>
        {empty ? '—' : (link ? <a href={v} target="_blank" rel="noreferrer">{v}</a> : v)}
      </div>
    </>
  );
}
