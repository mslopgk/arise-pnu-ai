import React from 'react';
import { Link } from 'react-router-dom';
import './ai-college.css';

// AI대학 홈페이지는 별도로 제작 중. 완성되면 이 라우트의 element를 실제 페이지로 교체한다.
export default function AiCollege() {
  return (
    <div className="aic-container">
      <main className="aic-card">
        <div className="aic-aura" aria-hidden />

        <img className="aic-mark" src="/logos/pnu-symbol-color.jpg" alt="부산대학교" />

        <span className="aic-eyebrow">Pusan National University</span>
        <h1 className="aic-title">AI대학</h1>

        <p className="aic-status">
          <span className="aic-dot" aria-hidden />
          홈페이지 준비 중입니다
        </p>

        <p className="aic-desc">
          부산대학교 AI대학 안내 페이지를 준비하고 있습니다.<br />
          공개되는 대로 이곳에서 바로 확인하실 수 있습니다.
        </p>

        <div className="aic-actions">
          <Link className="aic-btn primary" to="/">← 메인으로 돌아가기</Link>
          <Link className="aic-btn ghost" to="/bymonolog">A.U.R.A 데이터룸</Link>
        </div>
      </main>

      <footer className="aic-footer">ARISE PNU AI · 부산대학교 AI 거점대학</footer>
    </div>
  );
}
