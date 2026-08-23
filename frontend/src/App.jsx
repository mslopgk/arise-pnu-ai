import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';

// Pages & Auth
import Gateway from './pages/Gateway.jsx';
import Login from './pages/Login.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import DeptEditRequest from './pages/DeptEditRequest.jsx';
import AiCollege from './pages/AiCollege.jsx';

// Bymonolog variant
import BymonologPage from './variants/bymonolog/page.jsx';
import BymonologHubPage from './variants/bymonolog/hub/page.jsx';
import BymonologGradPage from './variants/bymonolog/grad/page.jsx';
import BymonologAuraPage from './variants/bymonolog/aura/page.jsx';

// Google variant (PNU × Google AI Ecosystem)
import GooglePage from './variants/google/page.jsx';

function RedirectToAdmission() {
  useEffect(() => { window.location.replace('/admission-v3-dark.html'); }, []);
  return <div className="container">이동 중...</div>;
}

// SPA 라우트 변경 → 방문 분석 pageview (track.js가 페이지 키 정규화·중복 제거)
function RouteTracker() {
  const location = useLocation();
  useEffect(() => {
    if (window.pnugTrack) window.pnugTrack('pageview', {});
  }, [location.pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <RouteTracker />
      <Routes>
      {/* Gateway */}
      <Route path="/" element={<Gateway />} />

      {/* Admin */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminDashboard />} />

      {/* Auth / Login */}
      <Route path="/login" element={<Login />} />

      {/* 학과 정보 수정 신청 (학과 관계자 — OAuth 게이트) */}
      <Route path="/dept-edit-request" element={<DeptEditRequest />} />

      {/* AI대학 (별도 제작 중 — 임시 안내 페이지) */}
      <Route path="/ai-college" element={<AiCollege />} />

      {/* Bymonolog routes */}
      <Route path="/bymonolog" element={<BymonologPage />} />
      <Route path="/bymonolog/hub" element={<BymonologHubPage />} />
      <Route path="/bymonolog/grad" element={<BymonologGradPage />} />
      <Route path="/bymonolog/aura" element={<BymonologAuraPage />} />

      {/* Google variant */}
      <Route path="/google" element={<GooglePage />} />

      {/* Fallback to gateway */}
      <Route path="*" element={<Gateway />} />
      </Routes>
    </>
  );
}
