import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { SpeakerHigh, SpeakerSlash } from '@phosphor-icons/react';
import './gateway.css';

export default function Gateway() {
  // 소개 영상: 정책상 음소거로 자동재생 → 영상 위 "소리 켜기" 버튼으로 토글.
  const videoRef = useRef(null);
  const [muted, setMuted] = useState(true);
  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    v.play().catch(() => {});
    setMuted(v.muted);
  };

  return (
    <div className="gateway-container">
      <div className="gateway-wrap">
        
        {/* Brand Header */}
        <div className="brand">
          <img className="mark" src="/logos/pnu-symbol-color.jpg" alt="부산대학교" />
          <div>
            <h1>부산대학교 <span>AI 거점대학육성사업단</span></h1>
            <div className="sub">A.U.R.A · Pusan National University</div>
          </div>
        </div>

        {/* Hero Content Area */}
        <div className="gateway-box">
          <div className="gateway-video" style={{ position: 'relative' }}>
            <video
              ref={videoRef}
              muted
              autoPlay
              loop
              playsInline
              preload="auto"
              src="/video/arise-main.mp4"
              aria-label="부산대학교 소개 영상"
            />
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? '소리 켜기' : '음소거'}
              style={{
                position: 'absolute', right: 14, bottom: 14, zIndex: 5,
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: muted ? '9px 14px 9px 12px' : '9px',
                borderRadius: 999, cursor: 'pointer',
                background: 'rgba(0,0,0,0.55)', color: '#fff',
                border: '1px solid rgba(255,255,255,0.28)',
                backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
                fontSize: 13, fontWeight: 700, lineHeight: 1,
                boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
              }}
            >
              {muted
                ? <SpeakerSlash size={18} weight="fill" aria-hidden />
                : <SpeakerHigh size={18} weight="fill" aria-hidden />}
              {muted && <span>소리 켜기</span>}
            </button>
          </div>

          <ul className="gateway-right" id="main">
            <li className="gateway-slogan">
              <span className="eyebrow">ARISE · AI University</span>
              <h2>AI로 여는 부산대학교의<br />다음 100년</h2>
              <p>원하는 메뉴를 선택하세요.</p>
            </li>

            {/* Menu 1: AI대학 — 대표 진입로(가장 크게).
                React SPA 가 아닌 독립 정적 사이트(public/ai-college/)라 <a> 로 전이한다. */}
            <li className="feature">
              <a className="gateway-btn aicollege" href="/ai-college/">
                <span className="num">01</span>
                <strong>AI대학</strong>
                <span className="desc">부산대학교 AI대학 홈페이지</span>
                <span className="btn-arrow"><span className="arrow-icon"></span></span>
              </a>
            </li>

            {/* Menu 2: A.U.R.A 마스터플랜 · 데이터룸 */}
            <li>
              <Link className="gateway-btn aura" to="/bymonolog">
                <span className="num">02</span>
                <span className="org">AI 거점대학육성사업단</span>
                <strong>A.U.R.A 마스터플랜 및 데이터룸</strong>
                <span className="desc">부산대학교 AI 대전환 추진 전략 및 성과 분석 데이터룸</span>
                <span className="btn-arrow"><span className="arrow-icon"></span></span>
              </Link>
            </li>

            {/* Menu 3: Google Partnership */}
            <li>
              <Link className="gateway-btn google" to="/google">
                <span className="num">03</span>
                <strong>PNU × Google for Education AI 교육혁신 파트너십</strong>
                <span className="desc">Google과 함께하는 AI 교육·연구 협력</span>
                <span className="btn-arrow"><span className="arrow-icon"></span></span>
              </Link>
            </li>

          </ul>
        </div>

        <footer>ARISE PNU AI · 부산대학교 AI 거점대학</footer>
      </div>
    </div>
  );
}
