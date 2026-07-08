import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Field } from './adminUi';
import './admin.css';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        navigate('/admin');
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error === 'invalid_credentials' ? '아이디 또는 비밀번호가 올바르지 않습니다.' : `로그인 실패: ${data.error || res.status}`);
      }
    } catch {
      setError('네트워크 오류');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="adm adm-login">
      <div className="adm-topline" />
      <div className="adm-login__frame">
        <div className="adm-login__card">
          <img src="/logos/pnu-signature.jpg" alt="부산대학교" className="adm-login__logo" />
          <div className="adm-kicker">부산대학교 일반대학원</div>
          <h1 className="adm-login__title">학·석사 연계과정 · 관리자 콘솔</h1>
          <p className="adm-login__sub">학사사무실 전용. 신청 결과 조회 및 시트 미러링.</p>

          {error && <div className="adm-error">⚠ {error}</div>}

          <form onSubmit={handleSubmit}>
            <Field label="아이디">
              <input
                className="adm-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </Field>
            <Field label="비밀번호">
              <input
                className="adm-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </Field>
            <button
              type="submit"
              disabled={submitting}
              className="adm-btn primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
            >
              {submitting ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <div className="adm-login__version">PNU Admin Console · v1.0</div>
        </div>
      </div>
    </div>
  );
}
