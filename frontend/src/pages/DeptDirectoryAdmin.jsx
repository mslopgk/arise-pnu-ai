import { useEffect, useState, useRef } from 'react';
import { Modal, Badge, Alert, Empty } from './adminUi.jsx';
import './admin.css';

// 협동과정·계약학과는 학석박사 연계과정 신청 불가(대학원혁신실 회신, 2026-06-12)로 디렉터리에서 제외
const GYE = ['인문·사회', '자연과학', '공학', '예술', '체육', '의학'];
const api = (url, opts = {}) =>
  fetch(url, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...opts });

// 서버 객체 → 편집용 폼 객체
function toForm(d, isMajor) {
  return {
    id: d?.id, _isMajor: isMajor,
    gyeyeol: d?.gyeyeol || (isMajor ? undefined : GYE[0]),
    name: d?.name || '', recruit: d?.recruit !== false,
    homepage: d?.homepage || '', location: d?.location || '', phone: d?.phone || '',
    bk21: !!d?.bk21, bk21_name: d?.bk21_name || '', bk21_url: d?.bk21_url || '',
    intro: d?.intro || '', hashtags: (d?.hashtags || []).join('\n'),
    imageUrl: d?.image || '',   // 기존 이미지 URL(미리보기)
    _newImage: '', _imageCleared: false,
  };
}
// 폼 → API 본문
function toBody(f) {
  const b = {
    gyeyeol: f.gyeyeol, name: f.name.trim(), recruit: f.recruit,
    homepage: f.homepage.trim(), location: f.location.trim(), phone: f.phone.trim(),
    bk21: f.bk21, bk21_name: f.bk21_name.trim(), bk21_url: f.bk21_url.trim(),
    intro: f.intro.trim(),
    hashtags: f.hashtags.split(/[\n,]/).map(s => s.trim()).filter(Boolean).map(s => s[0] === '#' ? s : '#' + s),
  };
  if (f._isMajor) delete b.gyeyeol;
  if (f._newImage) b.image = f._newImage;
  else if (f._imageCleared) b.imageClear = true;
  return b;
}

export default function DeptDirectoryAdmin() {
  const [depts, setDepts] = useState([]);
  const [gyeFilter, setGyeFilter] = useState('');
  const [q, setQ] = useState('');
  const [selId, setSelId] = useState(null);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(null); // { encoding, garbled, summary, rows, csvBase64, phase, errorMsg }
  const [snapshot, setSnapshot] = useState({ exists: false });
  async function refreshSnapshot() {
    const r = await api('/api/admin/directory/snapshot');
    if (r.ok) setSnapshot(await r.json());
  }

  async function load() {
    const r = await api('/api/departments');
    const data = await r.json();
    setDepts(Array.isArray(data) ? data : []);
    setLoading(false);
  }
  useEffect(() => { load(); refreshSnapshot(); }, []);

  const filtered = depts
    .filter(d => (!gyeFilter || d.gyeyeol === gyeFilter) &&
      (!q || (d.name + ' ' + (d.majors || []).map(m => m.name).join(' ')).toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => String(a.name).localeCompare(b.name, 'ko'));
  const current = depts.find(d => d.id === selId);

  async function saveDept(form) {
    const method = form.id ? 'PUT' : 'POST';
    const url = form.id ? `/api/admin/departments/${form.id}` : '/api/admin/departments';
    const r = await api(url, { method, body: JSON.stringify(toBody(form)) });
    if (!r.ok) { alert('저장 실패: ' + (await r.json().catch(() => ({}))).error); return; }
    const j = await r.json();
    await load();
    setSelId(form.id || j.id);
  }
  async function delDept(id) {
    if (!confirm('이 학과를 삭제할까요? (세부전공·이미지 포함, 되돌릴 수 없음)')) return;
    await api(`/api/admin/departments/${id}`, { method: 'DELETE' });
    setSelId(null); await load();
  }
  async function saveMajor(deptId, form) {
    const method = form.id ? 'PUT' : 'POST';
    const url = form.id ? `/api/admin/departments/${deptId}/majors/${form.id}` : `/api/admin/departments/${deptId}/majors`;
    const r = await api(url, { method, body: JSON.stringify(toBody(form)) });
    if (!r.ok) { alert('세부전공 저장 실패'); return; }
    await load();
  }
  async function delMajor(deptId, mid) {
    if (!confirm('이 세부전공을 삭제할까요?')) return;
    await api(`/api/admin/departments/${deptId}/majors/${mid}`, { method: 'DELETE' });
    await load();
  }

  // === CSV 일괄 가져오기 ===
  async function onPickFile(e) {
    const file = e.target.files?.[0]; if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) { alert('CSV 파일만 업로드할 수 있습니다.'); e.target.value = ''; return; }
    if (file.size > 6 * 1024 * 1024) { alert('파일이 너무 큽니다 (최대 6MB).'); e.target.value = ''; return; }
    const bytes = new Uint8Array(await file.arrayBuffer());
    let bin = ''; for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    const csvBase64 = btoa(bin);
    e.target.value = '';
    const r = await api('/api/admin/directory/import/preview', { method: 'POST', body: JSON.stringify({ csvBase64 }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { alert('미리보기 실패: ' + (j.error || '')); return; }
    setPreview({ ...j, csvBase64 });
  }
  async function commitImport() {
    setPreview((p) => ({ ...p, phase: 'applying', errorMsg: '' }));
    let r, j;
    try {
      r = await api('/api/admin/directory/import/commit', { method: 'POST', body: JSON.stringify({ csvBase64: preview.csvBase64, confirm: true }) });
      j = await r.json().catch(() => ({}));
    } catch (e) {
      setPreview((p) => ({ ...p, phase: 'error', errorMsg: '네트워크 오류: ' + e.message })); return;
    }
    if (!r.ok) {
      setPreview((p) => ({ ...p, phase: 'error', errorMsg: j.message || j.error || ('알 수 없는 오류 (HTTP ' + r.status + ')') })); return;
    }
    setPreview(null);
    await refreshSnapshot();
    await load();
    alert(`반영 완료 — 추가 ${j.added} · 수정 ${j.updated} · 스킵 ${j.skipped}`);
  }
  async function undoImport() {
    if (!confirm('마지막 가져오기를 되돌립니다.\n⚠ 이 가져오기 이후의 디렉터리 변경도 함께 되돌아갑니다. 계속할까요?')) return;
    const r = await api('/api/admin/directory/import/undo', { method: 'POST' });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { alert('되돌리기 실패: ' + (j.message || j.error || '')); return; }
    alert(`되돌리기 완료 — 학과 ${j.depts} · 세부전공 ${j.majors} 복원`);
    await refreshSnapshot();
    await load();
  }

  return (
    <div>
      {/* 대량 관리 툴바 */}
      <div className="adm-viewbar">
        <span className="adm-viewmeta">대량 관리 · 학과·세부전공 텍스트 일괄 추가·수정 (이미지·삭제 제외)</span>
        <div className="adm-toolbar">
          <a href="/api/admin/directory/export" className="adm-btn secondary">현재 디렉터리 내보내기 (CSV)</a>
          <button type="button" onClick={() => fileRef.current?.click()} className="adm-btn primary">CSV 가져오기</button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={onPickFile} />
          {snapshot.exists && (
            <button type="button" onClick={undoImport} className="adm-btn danger" title={snapshot.summary || ''}>↺ 마지막 가져오기 되돌리기</button>
          )}
        </div>
      </div>

      <div className="adm-split">
        {/* 목록 */}
        <div className="adm-split__list">
          <div className="adm-filterbar">
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="학과·전공 검색" className="adm-input" />
            <select value={gyeFilter} onChange={e => setGyeFilter(e.target.value)} className="adm-select">
              <option value="">전체 계열</option>
              {GYE.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <button onClick={() => setSelId('new')} className="adm-btn secondary">+ 학과 추가</button>
            <div className="adm-listcount">{loading ? '로딩…' : `${filtered.length}개 학과 (총 ${depts.length})`}</div>
          </div>
          <div className="adm-listbody">
            {filtered.map(d => (
              <button key={d.id} onClick={() => setSelId(d.id)}
                className={`adm-listitem${d.id === selId ? ' is-selected' : ''}`}>
                <span className="adm-listitem__title">{d.bk21 ? '★ ' : ''}{d.name}</span>
                <span className="adm-listitem__meta">{d.gyeyeol}{(d.majors || []).length ? ` · 전공 ${d.majors.length}` : ''}{d.recruit === false ? ' · 미모집' : ''}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 편집 */}
        <div className="adm-split__detail">
          {selId === 'new' ? (
            <DeptEditor key="new" initial={toForm(null, false)} onSave={saveDept} onCancel={() => setSelId(null)} />
          ) : current ? (
            <>
              <DeptEditor key={current.id} initial={toForm(current, false)} onSave={saveDept} onDelete={() => delDept(current.id)} />
              <div className="adm-group">
                <MajorsPanel dept={current} onSaveMajor={saveMajor} onDeleteMajor={delMajor} />
              </div>
            </>
          ) : (
            <Empty>← 학과를 선택하거나 추가하세요.</Empty>
          )}
        </div>
      </div>

      {preview && (
        <ImportPreviewModal preview={preview} onClose={() => setPreview(null)} onCommit={commitImport} />
      )}
    </div>
  );
}

function ImportPreviewModal({ preview, onClose, onCommit }) {
  const { summary, rows, encoding, garbled, phase, errorMsg } = preview;
  const applying = phase === 'applying';
  const locked = applying || phase === 'error';
  const nothing = summary.added + summary.updated === 0;
  const kindKo = (k) => (k === 'dept' ? '학과' : k === 'major' ? '세부전공' : '-');
  const foot = applying ? (
    <button className="adm-btn primary" disabled>적용 중입니다…</button>
  ) : (
    <>
      <button onClick={onClose} className="adm-btn ghost">취소</button>
      <button onClick={onCommit} disabled={nothing} className="adm-btn primary">{phase === 'error' ? '다시 시도' : '적용'}</button>
    </>
  );
  return (
    <Modal title="CSV 가져오기 미리보기" onClose={locked ? () => {} : onClose} foot={foot}>
      {garbled && (
        <Alert tone="danger">한글이 깨져 보입니다. 적용하지 말고 엑셀에서 "CSV UTF-8"로 다시 저장해 올려주세요. (감지 인코딩: <span className="adm-num">{encoding}</span>)</Alert>
      )}
      <div className="adm-toolbar" style={{ alignItems: 'center', marginBottom: 12 }}>
        <Badge tone="ok" sm>추가 {summary.added}</Badge>
        <Badge tone="warn" sm>수정 {summary.updated}</Badge>
        <Badge tone="danger" sm>오류/스킵 {summary.skipped}</Badge>
        <span className="adm-help">인코딩 {encoding}</span>
      </div>
      <div className="adm-tablewrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th className="num">행</th><th>동작</th><th>구분</th><th>이름</th><th>오류</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.lineNo}>
                <td className="num">{r.lineNo}</td>
                <td>
                  {r.action === 'add' && <Badge tone="ok" sm>추가</Badge>}
                  {r.action === 'update' && <Badge tone="warn" sm>수정</Badge>}
                  {r.action === 'error' && <Badge tone="danger" sm>오류</Badge>}
                </td>
                <td>{kindKo(r.kind)}</td>
                <td>{r.name}</td>
                <td>{(r.errors || []).join('; ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {phase === 'error' && (
        <div className="adm-group"><Alert tone="danger">적용 실패 — {errorMsg}</Alert></div>
      )}
    </Modal>
  );
}

function DeptEditor({ initial, onSave, onDelete, onCancel }) {
  const [f, setF] = useState(initial);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const fileRef = useRef(null);
  function pickImage(e) {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('이미지는 2MB 이하만 가능합니다.'); return; }
    const rd = new FileReader();
    rd.onload = () => setF(p => ({ ...p, _newImage: rd.result, _imageCleared: false }));
    rd.readAsDataURL(file);
  }
  const preview = f._newImage || (f._imageCleared ? '' : (f.imageUrl ? f.imageUrl + (f.imageUrl.includes('?') ? '' : '?t=' + Date.now()) : ''));
  async function save() { setSaving(true); try { await onSave(f); } finally { setSaving(false); } }

  return (
    <div>
      <h2 className="adm-h2">{f.id ? `학과 편집 · ${f.name}` : '새 학과 추가'}</h2>
      <div className="adm-formgrid">
        <L label="학과명 *"><input className="adm-input" value={f.name} onChange={e => set('name', e.target.value)} /></L>
        <L label="계열 *">
          <select className="adm-select" value={f.gyeyeol} onChange={e => set('gyeyeol', e.target.value)}>
            {GYE.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </L>
        <L label="홈페이지"><input className="adm-input" value={f.homepage} onChange={e => set('homepage', e.target.value)} placeholder="https://" /></L>
        <L label="위치"><input className="adm-input" value={f.location} onChange={e => set('location', e.target.value)} /></L>
        <L label="전화"><input className="adm-input" value={f.phone} onChange={e => set('phone', e.target.value)} /></L>
        <L label="모집 여부">
          <label className="adm-check"><input type="checkbox" checked={f.recruit} onChange={e => set('recruit', e.target.checked)} /> 모집함</label>
        </L>
        <L label="BK21">
          <label className="adm-check"><input type="checkbox" checked={f.bk21} onChange={e => { const on = e.target.checked; setF(p => ({ ...p, bk21: on, ...(on ? {} : { bk21_name: '', bk21_url: '' }) })); }} /> 참여학과(★)</label>
        </L>
        <L label="BK21 사업단명"><input className="adm-input" value={f.bk21_name} disabled={!f.bk21} onChange={e => set('bk21_name', e.target.value)} placeholder={f.bk21 ? '' : '참여학과 체크 시 입력'} /></L>
        <L label="BK21 URL"><input className="adm-input" value={f.bk21_url} disabled={!f.bk21} onChange={e => set('bk21_url', e.target.value)} placeholder={f.bk21 ? '' : '참여학과 체크 시 입력'} /></L>
      </div>
      <L label="소개"><textarea className="adm-textarea" rows={3} value={f.intro} onChange={e => set('intro', e.target.value)} /></L>
      <L label="해시태그 (줄바꿈 또는 쉼표 구분, # 자동)"><textarea className="adm-textarea" rows={3} value={f.hashtags} onChange={e => set('hashtags', e.target.value)} /></L>
      <L label="이미지 (16:9, 2MB 이하)">
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 200px) 1fr', gap: 12, alignItems: 'start' }}>
          <div className="adm-thumb">
            {preview ? <img src={preview} alt="" /> : <span className="adm-thumb__ph">이미지 없음</span>}
          </div>
          <div style={{ display: 'grid', gap: 8, justifyItems: 'start' }}>
            <input ref={fileRef} type="file" accept="image/*" onChange={pickImage} className="adm-help" />
            {preview && <button onClick={() => { setF(p => ({ ...p, _newImage: '', _imageCleared: true })); if (fileRef.current) fileRef.current.value = ''; }} className="adm-btn danger sm">이미지 제거</button>}
          </div>
        </div>
      </L>
      <div className="adm-group adm-toolbar">
        <button onClick={save} disabled={saving} className="adm-btn primary">{saving ? '저장 중…' : '저장'}</button>
        {onDelete && <button onClick={onDelete} className="adm-btn danger">삭제</button>}
        {onCancel && <button onClick={onCancel} className="adm-btn ghost">취소</button>}
      </div>
    </div>
  );
}

function MajorsPanel({ dept, onSaveMajor, onDeleteMajor }) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="adm-subpanel">
      <h2 className="adm-h2">
        세부전공 <span className="adm-h2__meta">{(dept.majors || []).length}</span>
        <button onClick={() => setAdding(a => !a)} className="adm-btn ghost sm" style={{ marginLeft: 'auto' }}>{adding ? '닫기' : '+ 세부전공 추가'}</button>
      </h2>
      {adding && (
        <MajorEditor key="newmaj" initial={toForm(null, true)}
          onSave={async (form) => { await onSaveMajor(dept.id, form); setAdding(false); }} compact />
      )}
      {(dept.majors || []).map(m => (
        <MajorEditor key={m.id} initial={toForm(m, true)}
          onSave={(form) => onSaveMajor(dept.id, form)} onDelete={() => onDeleteMajor(dept.id, m.id)} collapsed />
      ))}
      {!(dept.majors || []).length && !adding && <div className="adm-help">세부전공 없음 (디렉터리에서 학과 클릭 시 바로 팝업)</div>}
    </div>
  );
}

function MajorEditor({ initial, onSave, onDelete, collapsed }) {
  const [open, setOpen] = useState(!collapsed);
  const [f, setF] = useState(initial);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const fileRef = useRef(null);
  function pickImage(e) {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('2MB 이하'); return; }
    const rd = new FileReader(); rd.onload = () => setF(p => ({ ...p, _newImage: rd.result, _imageCleared: false })); rd.readAsDataURL(file);
  }
  const preview = f._newImage || (f._imageCleared ? '' : (f.imageUrl ? f.imageUrl + '?t=' + Date.now() : ''));
  async function save() { setSaving(true); try { await onSave(f); } finally { setSaving(false); } }

  if (!open) return (
    <button className="adm-listitem" onClick={() => setOpen(true)}>
      <span className="adm-listitem__title">{f.recruit ? '' : '· '}{f.name}</span>
      <span className="adm-listitem__meta">편집하려면 클릭</span>
    </button>
  );
  return (
    <div className="adm-section dense">
      <div className="adm-formgrid">
        <L label="전공명 *"><input className="adm-input" value={f.name} onChange={e => set('name', e.target.value)} /></L>
        <L label="홈페이지"><input className="adm-input" value={f.homepage} onChange={e => set('homepage', e.target.value)} placeholder="비우면 학과값" /></L>
        <L label="위치"><input className="adm-input" value={f.location} onChange={e => set('location', e.target.value)} /></L>
        <L label="전화"><input className="adm-input" value={f.phone} onChange={e => set('phone', e.target.value)} /></L>
        <L label="모집"><label className="adm-check"><input type="checkbox" checked={f.recruit} onChange={e => set('recruit', e.target.checked)} /> 모집함</label></L>
        <L label="BK21"><label className="adm-check"><input type="checkbox" checked={f.bk21} onChange={e => set('bk21', e.target.checked)} /> 참여</label></L>
      </div>
      <L label="소개 (비우면 학과값)"><textarea className="adm-textarea" rows={2} value={f.intro} onChange={e => set('intro', e.target.value)} /></L>
      <L label="해시태그 (비우면 학과값)"><textarea className="adm-textarea" rows={2} value={f.hashtags} onChange={e => set('hashtags', e.target.value)} /></L>
      <L label="이미지 (비우면 학과값)">
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 160px) 1fr', gap: 12, alignItems: 'start' }}>
          <div className="adm-thumb">{preview ? <img src={preview} alt="" /> : <span className="adm-thumb__ph">없음</span>}</div>
          <div style={{ display: 'grid', gap: 8, justifyItems: 'start' }}>
            <input ref={fileRef} type="file" accept="image/*" onChange={pickImage} className="adm-help" />
            {preview && <button onClick={() => { setF(p => ({ ...p, _newImage: '', _imageCleared: true })); if (fileRef.current) fileRef.current.value = ''; }} className="adm-btn danger sm">제거</button>}
          </div>
        </div>
      </L>
      <div className="adm-group adm-toolbar">
        <button onClick={save} disabled={saving} className="adm-btn primary">{saving ? '저장 중…' : '저장'}</button>
        {onDelete && <button onClick={onDelete} className="adm-btn danger">삭제</button>}
        {collapsed && <button onClick={() => setOpen(false)} className="adm-btn ghost">접기</button>}
      </div>
    </div>
  );
}

function L({ label, children }) {
  return <label className="adm-field"><span className="adm-label">{label}</span>{children}</label>;
}
