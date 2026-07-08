
import React, { useState, useRef, useEffect } from 'react';
import ceremonyImg from '/google/partnership-ceremony.jpg';
import {
  Menu, X, Mail, ChevronRight, BookOpen, Award, Users,
  ArrowUpRight, ArrowRight, Play, Sparkles, GraduationCap,
  Globe, FlaskConical, ExternalLink, Building2, ChevronDown,
  Newspaper, Quote, Handshake, AlertCircle, CheckCircle2,
  FileText, XCircle, ArrowDown,
  MailOpen, FileSpreadsheet, Presentation, Film, BookMarked,
  Lightbulb, HelpCircle, Brush, Video, Music, Type, Palette, Boxes,
  Bot, Navigation, Chrome, Code2, Terminal,
  Wrench, Flame, Search, Camera, Map, ScanLine, Languages, Headphones,
} from 'lucide-react';
import './google.css';
import AiGuideSection from './AiGuideSection.jsx';

/* ── Logo helper ── */
const L = '/google/logos/';

/* ── Constants ── */

const NAV = [
  ['vision', '사업소개'],
  ['partnership', '파트너십'],
  ['ecosystem', 'AI 서비스'],
  ['ai-services', 'AI Ecosystem'],
  ['education', '교육'],
  ['research', '연구'],
  ['participation', '참여'],
  ['network', '글로벌'],
];

const RESEARCH_LIST = [
  { dept: '교양교육원', title: '대학 교양 교과 맞춤형 혁신모델 AI Agent "MATE-PRISM" 개발 연구' },
  { dept: '언어정보학과', title: '한국어 \'형태론\' 교과 맞춤형 AI 튜터 에이전트(EnnoiAImorpho) 개발 및 메타언어 인식 수업 혁신 모델 체계화' },
  { dept: '조경학과', title: '근거기반조경계획 에이전트 개발(Smart Green Studio v2.0)' },
  { dept: '바이오소재과학과', title: '바이오소재 인체적합성 예측 AI수업 혁신모델 (BioMat)' },
  { dept: '화학과', title: '이공계 기초과학(일반화학, 일반물리) 교육을 위한 교과 맞춤형 AI Agent 개발 및 수업혁신 실증 연구' },
  { dept: '특수교육과', title: 'AI IEP/BIP Copilot: AI agents 기반 대학생 역량 강화 및 교수 전문성 혁신 모델 연구' },
  { dept: '체육교육과', title: '체육교육과 수업 혁신을 위한 운동 동작 분석 기반 AI MOVE-Agent 개발 및 적용' },
  { dept: '약학과', title: '해커톤 연계 AI 기반 의약정보학 부트캠프 프로그램 개발' },
  { dept: '식품영양학과', title: 'CGM 기반 개인맞춤형 영양 AI 학습지원 시스템 개발 및 임상영양 교육 혁신모델 실증 연구' },
  { dept: '조형학과', title: '가구·조형 교육을 위한 물성 기반 AI 구조 튜터링 개발 연구' },
  { dept: '의학과', title: 'AI 기반 환자 사례 생성과 임상수행평가(CPX) 채점 시스템 개발을 통한 의학교육 혁신 모델 연구' },
  { dept: '의생명융합공학부', title: '데이터과학 교육혁신을 위한 다차원 AI Agent 개발' },
  { dept: '간호학과', title: '개편 간호사 국가시험 대비 AI 기반 통합사례(Comprehensive Case) 수업 혁신모델 개발' },
  { dept: '건축학과', title: '생성형 AI와 멀티에이전트를 활용한 지능형 설계 스튜디오 구축' },
  { dept: '데이터사이언스', title: '다문화 수용성 증진을 위한 근거 기반 토론 지원 AI Tutor 개발 및 수업 적용 실증' },
];

/* ── Component ── */

export default function GooglePartnership() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('student');
  const [registerModal, setRegisterModal] = useState(null); // 'student' | 'faculty' | null
  const [facultyStep, setFacultyStep] = useState('check'); // 'check' | 'method1' | 'method2'
  const [agreedNotice, setAgreedNotice] = useState(false);

  // 홍보 영상: 화면 안이면 자동재생(가능하면 소리 포함, 브라우저가 막으면 음소거로 폴백),
  // 화면 밖이면 일시정지, 재진입 시 재생 재개.
  const promoVideoRef = useRef(null);
  useEffect(() => {
    const v = promoVideoRef.current;
    if (!v) return;
    const tryPlay = () => v.play().catch(() => { v.muted = true; v.play().catch(() => {}); });
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) tryPlay(); else v.pause(); },
      { threshold: 0.25 }
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  const go = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileOpen(false);
  };

  const openRegister = (type) => {
    setRegisterModal(type);
    setFacultyStep('check');
    setAgreedNotice(false);
  };

  const GoogleForEdu = ({ className = '' }) => (
    <span className={className}>
      <span className="text-[#4285F4]">G</span>
      <span className="text-[#EA4335]">o</span>
      <span className="text-[#FBBC04]">o</span>
      <span className="text-[#4285F4]">g</span>
      <span className="text-[#34A853]">l</span>
      <span className="text-[#EA4335]">e</span>
      <span className="text-gray-600"> for Education</span>
    </span>
  );

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans antialiased selection:bg-navy selection:text-white">

      {/* ================================================================
          계정 등록 모달
      ================================================================ */}
      {registerModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setRegisterModal(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <h3 className="font-bold text-navy text-lg">
                {registerModal === 'student' ? '학생 계정 등록 안내' : '교원 계정 등록 안내'}
              </h3>
              <button onClick={() => setRegisterModal(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6">
              {/* ── 학생 모달 ── */}
              {registerModal === 'student' && (
                <div className="space-y-6">
                  <div className="bg-g-blue/5 border border-g-blue/10 rounded-xl p-5">
                    <p className="text-sm font-bold text-navy mb-2">부산대학교 @pusan.ac.kr 계정으로 바로 이용 가능</p>
                    <p className="text-xs text-gray-500">구글 AI 서비스는 부산대학교 재학생 전용입니다. (휴학생, 졸업생 제외)</p>
                  </div>

                  <div className="space-y-4">
                    <div className="border border-gray-200 rounded-xl p-5">
                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-g-blue text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                        <div>
                          <h4 className="font-bold text-navy text-sm">기존 @pusan.ac.kr 계정이 있는 경우</h4>
                          <p className="text-xs text-gray-500 mt-1 leading-relaxed">google.com에서 학교 계정으로 로그인 후 즉시 구글 AI 서비스 사용 가능</p>
                          <a href="https://gemini.google.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center mt-3 px-4 py-2 bg-g-blue text-white rounded-lg text-xs font-semibold hover:bg-blue-600 transition-colors">
                            Google AI 서비스 바로가기 <ExternalLink className="w-3 h-3 ml-1.5" />
                          </a>
                        </div>
                      </div>
                    </div>

                    <div className="border border-gray-200 rounded-xl p-5">
                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-g-blue text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                        <div>
                          <h4 className="font-bold text-navy text-sm">기존 @pusan.ac.kr 계정이 없는 경우</h4>
                          <p className="text-xs text-gray-500 mt-1 leading-relaxed">부산대학교 웹메일에 접속하여 가입 진행 후, 생성된 계정으로 AI 서비스 이용 가능</p>
                          <div className="mt-3 bg-gray-50 rounded-lg p-3 space-y-1.5">
                            <p className="text-[10px] font-bold text-gray-400 uppercase">가입 절차</p>
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <span className="text-[10px] font-mono font-bold text-g-blue">01</span> 웹메일 가입 페이지 접속
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <span className="text-[10px] font-mono font-bold text-g-blue">02</span> 정보 입력 및 신청
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <span className="text-[10px] font-mono font-bold text-g-blue">03</span> 승인 후 계정 생성 완료 메일 수신
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <span className="text-[10px] font-mono font-bold text-g-blue">04</span> 생성된 계정으로 Google AI 서비스 이용
                            </div>
                          </div>
                          <a href="https://webmail.pusan.ac.kr" target="_blank" rel="noopener noreferrer" className="inline-flex items-center mt-3 px-4 py-2 bg-navy text-white rounded-lg text-xs font-semibold hover:bg-navy-light transition-colors">
                            부산대 웹메일 바로가기 <ExternalLink className="w-3 h-3 ml-1.5" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-4 flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-800 leading-relaxed">
                      <p className="font-semibold mb-1">유의사항</p>
                      <p>@pusan.ac.kr 계정은 학교에서 제공하는 교육용 계정으로, 개인 Gmail 계정과 구분됩니다.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── 교원 모달 ── */}
              {registerModal === 'faculty' && (
                <div className="space-y-6">
                  {/* Step: G-Suite 계정 확인 */}
                  {facultyStep === 'check' && (
                    <>
                      <div className="bg-g-green/5 border border-g-green/10 rounded-xl p-5 text-center">
                        <p className="text-lg font-bold text-navy mb-2">G-Suite 계정이 있으신가요?</p>
                        <p className="text-xs text-gray-500">기존 부산대 도메인 구글 계정(@pusan.ac.kr) 보유 여부를 확인해주세요.</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => setFacultyStep('has-account')} className="p-5 rounded-xl border-2 border-g-green bg-g-green/5 text-center hover:bg-g-green/10 transition-colors">
                          <CheckCircle2 className="w-8 h-8 text-g-green mx-auto mb-2" />
                          <p className="font-bold text-navy text-sm">네, 있습니다</p>
                          <p className="text-[10px] text-gray-400 mt-1">구글 서비스 그대로 사용</p>
                        </button>
                        <button onClick={() => setFacultyStep('no-account')} className="p-5 rounded-xl border-2 border-gray-200 text-center hover:border-navy hover:bg-navy-50 transition-colors">
                          <XCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="font-bold text-navy text-sm">아니요, 없습니다</p>
                          <p className="text-[10px] text-gray-400 mt-1">계정 신청 필요</p>
                        </button>
                      </div>
                    </>
                  )}

                  {/* G-Suite 있음 */}
                  {facultyStep === 'has-account' && (
                    <>
                      <button onClick={() => setFacultyStep('check')} className="text-xs text-gray-400 hover:text-navy flex items-center gap-1"><ChevronRight className="w-3 h-3 rotate-180" /> 돌아가기</button>
                      <div className="bg-g-green/5 border border-g-green/10 rounded-xl p-5">
                        <CheckCircle2 className="w-8 h-8 text-g-green mb-3" />
                        <h4 className="font-bold text-navy mb-2">이미 준비 완료!</h4>
                        <p className="text-sm text-gray-500 leading-relaxed">기존 @pusan.ac.kr 구글 계정으로 바로 AI 서비스를 이용하실 수 있습니다.</p>
                      </div>
                      <a href="https://gemini.google.com" target="_blank" rel="noopener noreferrer" className="block w-full text-center px-5 py-3 bg-g-green text-white rounded-xl font-semibold text-sm hover:bg-green-600 transition-colors">
                        Google AI 서비스 바로가기 <ExternalLink className="w-3.5 h-3.5 ml-1.5 inline" />
                      </a>
                    </>
                  )}

                  {/* G-Suite 없음 → 두 가지 방법 선택 */}
                  {facultyStep === 'no-account' && (
                    <>
                      <button onClick={() => setFacultyStep('check')} className="text-xs text-gray-400 hover:text-navy flex items-center gap-1"><ChevronRight className="w-3 h-3 rotate-180" /> 돌아가기</button>
                      <p className="text-sm font-bold text-navy">계정 신청 방법을 선택하세요</p>
                      <div className="space-y-3">
                        <button onClick={() => setFacultyStep('method1')} className="w-full text-left p-5 rounded-xl border-2 border-gray-200 hover:border-g-blue hover:bg-g-blue/5 transition-colors">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-full bg-g-blue/10 text-g-blue text-[10px] font-bold">방법 1</span>
                            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold">기존 메일 유지</span>
                          </div>
                          <h4 className="font-bold text-navy text-sm">신규 웹메일 생성 (구글 AI 서비스용)</h4>
                          <p className="text-xs text-gray-500 mt-1">기존 웹메일은 유지하면서, 별도 구글 계정을 새로 만듭니다.</p>
                        </button>
                        <button onClick={() => { setFacultyStep('method2'); setAgreedNotice(false); }} className="w-full text-left p-5 rounded-xl border-2 border-gray-200 hover:border-g-green hover:bg-g-green/5 transition-colors">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-full bg-g-green/10 text-g-green text-[10px] font-bold">방법 2</span>
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">메일 전환</span>
                          </div>
                          <h4 className="font-bold text-navy text-sm">기존 웹메일 ID를 그대로 사용</h4>
                          <p className="text-xs text-gray-500 mt-1">기존 웹메일을 Google 서비스로 전환합니다.</p>
                        </button>
                      </div>
                    </>
                  )}

                  {/* 방법 1: 신규 웹메일 생성 */}
                  {facultyStep === 'method1' && (
                    <>
                      <button onClick={() => setFacultyStep('no-account')} className="text-xs text-gray-400 hover:text-navy flex items-center gap-1"><ChevronRight className="w-3 h-3 rotate-180" /> 돌아가기</button>
                      <div className="bg-g-blue/5 border border-g-blue/10 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="px-2 py-0.5 rounded-full bg-g-blue/10 text-g-blue text-[10px] font-bold">방법 1</span>
                          <h4 className="font-bold text-navy">신규 구글 AI 서비스용 웹메일 ID 생성</h4>
                        </div>
                        <p className="text-xs text-gray-500 mb-1">기존 @pusan.ac.kr 계정을 그대로 사용하면서, 새로운 Google 계정을 추가로 만들어 AI 서비스를 이용하는 방법입니다.</p>
                      </div>

                      <div className="bg-gray-50 rounded-xl p-5 space-y-3">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">신청 절차</p>
                        {[
                          '기존 부산대학교 웹메일 로그인 (현재 사용 중인 ID로 접속)',
                          '좌측 메뉴 하단 「구글 아이디 신청」 클릭',
                          '신규 구글 아이디 신청서 작성 (기존 ID와 다른 ID로 생성)',
                        ].map((step, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <span className="w-5 h-5 rounded-full bg-g-blue text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                            <p className="text-xs text-gray-600">{step}</p>
                          </div>
                        ))}
                        <p className="text-xs text-g-blue font-semibold mt-2">※ 신청 후 구글 서비스를 즉시 사용 가능합니다.</p>
                      </div>

                      <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-4 flex items-start gap-3">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-800">신규로 생성된 계정(또 다른 @pusan.ac.kr)으로 Google AI 서비스를 이용할 수 있으며, 기존 계정의 메일도 계속 사용할 수 있습니다.</p>
                      </div>

                      <a href="https://webmail.pusan.ac.kr" target="_blank" rel="noopener noreferrer" className="block w-full text-center px-5 py-3 bg-navy text-white rounded-xl font-semibold text-sm hover:bg-navy-light transition-colors">
                        부산대 웹메일 바로가기 <ExternalLink className="w-3.5 h-3.5 ml-1.5 inline" />
                      </a>
                    </>
                  )}

                  {/* 방법 2: 기존 웹메일 ID 그대로 사용 */}
                  {facultyStep === 'method2' && (
                    <>
                      <button onClick={() => setFacultyStep('no-account')} className="text-xs text-gray-400 hover:text-navy flex items-center gap-1"><ChevronRight className="w-3 h-3 rotate-180" /> 돌아가기</button>
                      <div className="bg-g-green/5 border border-g-green/10 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="px-2 py-0.5 rounded-full bg-g-green/10 text-g-green text-[10px] font-bold">방법 2</span>
                          <h4 className="font-bold text-navy">기존 부산대학교 웹메일 ID를 그대로 사용</h4>
                        </div>
                        <p className="text-xs text-gray-500">기존 @pusan.ac.kr 웹메일을 Google 서비스로 전환하여 사용하는 방법입니다.</p>
                      </div>

                      <div className="bg-gray-50 rounded-xl p-5 space-y-3">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">신청 절차</p>
                        {[
                          '메일 백업 (웹메일 로그인 → 설정 → 백업 → ZIP 파일 저장)',
                          'AX·정보화혁신본부(help@pusan.ac.kr)로 신청서 작성 후 구글 서비스 신청 메일 발송',
                          '신청 후 2~3일 이내에 기존 ID로 구글 AI 사용 가능',
                        ].map((step, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <span className="w-5 h-5 rounded-full bg-g-green text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                            <p className="text-xs text-gray-600">{step}</p>
                          </div>
                        ))}
                      </div>

                      <div className="bg-red-50 border border-red-200/60 rounded-xl p-4 space-y-2">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                          <div className="text-xs text-red-800 leading-relaxed space-y-1">
                            <p className="font-semibold">유의사항을 반드시 확인하세요</p>
                            <p>• 기존 부산대 도메인 구글 계정이 있으면 전환할 수 없습니다.</p>
                            <p>• 전환 완료 후 기존 웹메일 서비스는 더 이상 사용할 수 없습니다.</p>
                            <p>• 전환 후 메일 화면은 초기화 상태(빈 화면)로 표시됩니다.</p>
                            <p>• 백업 파일은 보관용이며, 새 구글 메일 서비스로 업로드하여 복원할 수 없습니다.</p>
                          </div>
                        </div>
                        <label className="flex items-center gap-2 mt-3 cursor-pointer">
                          <input type="checkbox" checked={agreedNotice} onChange={(e) => setAgreedNotice(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-g-green" />
                          <span className="text-xs font-semibold text-red-800">위 유의사항을 모두 확인했습니다.</span>
                        </label>
                      </div>

                      {agreedNotice ? (
                        <a href="https://docs.google.com/forms/d/e/1FAIpQLSfhUVnUCP1JDNJ4q8sV5Vt2-CNlsWslGEoOKKysuoxGtHci5Q/viewform?usp=header" target="_blank" rel="noopener noreferrer" className="block w-full text-center px-5 py-3 bg-navy text-white rounded-xl font-semibold text-sm hover:bg-navy-light transition-colors">
                          구글 서비스 전환 신청하기 <ExternalLink className="w-3.5 h-3.5 ml-1.5 inline" />
                        </a>
                      ) : (
                        <button disabled className="block w-full text-center px-5 py-3 bg-gray-200 text-gray-400 rounded-xl font-semibold text-sm cursor-not-allowed">
                          유의사항을 확인해주세요
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {/* ================================================================
          NAV
      ================================================================ */}
      <nav className="sticky top-0 z-50 glass-nav border-b border-gray-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between h-14 lg:h-16 items-center">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <span className="text-navy">ARISE</span>
            <span className="text-g-blue">PNU</span>
            <span className="text-gray-300 font-light">|</span>
            <GoogleForEdu className="text-lg font-bold" />
          </button>

          <div className="hidden lg:flex items-center gap-0.5">
            {NAV.map(([id, label]) => (
              <button key={id} onClick={() => go(id)} className="px-3 py-1.5 rounded-md text-[13px] text-gray-500 hover:text-navy hover:bg-navy-50 font-medium transition-all">{label}</button>
            ))}
          </div>

          <a href="mailto:pnucde@pusan.ac.kr" className="hidden lg:inline-flex items-center px-4 py-2 rounded-lg bg-navy text-white text-[13px] font-semibold hover:bg-navy-light transition-all">
            <Mail className="w-3.5 h-3.5 mr-1.5 opacity-60" /> 문의하기
          </a>

          <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-2" aria-label="메뉴">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="lg:hidden bg-white border-t border-gray-100 px-4 pt-2 pb-4 space-y-1 shadow-xl">
            {NAV.map(([id, label]) => (
              <button key={id} onClick={() => go(id)} className="block w-full text-left py-3 px-4 rounded-lg hover:bg-gray-50 text-gray-700 font-medium text-sm">{label}</button>
            ))}
            <a href="mailto:pnucde@pusan.ac.kr" className="block w-full text-center py-3 px-4 rounded-xl bg-navy text-white font-bold text-sm mt-2">문의하기</a>
          </div>
        )}
      </nav>


      {/* ================================================================
          1. HERO
      ================================================================ */}
      <section className="relative bg-navy overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-g-blue/[0.08] rounded-full blur-[120px]"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-g-green/[0.06] rounded-full blur-[100px]"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="pt-16 pb-8 lg:pt-24 lg:pb-12 text-center max-w-4xl mx-auto anim-fade-up">
            <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold bg-g-blue/10 text-g-blue border border-g-blue/20 mb-6">
              ARISE PNU · AI EDTECH 교육혁신 생태계 구축 사업
            </span>

            <h1 className="text-3xl sm:text-5xl lg:text-[3.25rem] font-extrabold text-white leading-[1.2] tracking-tight">
              부산대학교 <span className="text-g-blue">X</span>{' '}
              <GoogleForEdu className="text-3xl sm:text-5xl lg:text-[3.25rem] font-extrabold [&>span]:!text-white/90 [&>span.text-gray-600]:!text-white/50" />
              <br />
              <span className="relative inline-block mt-2">
                AI 교육혁신 파트너십
                <span className="absolute -bottom-1 left-0 right-0 h-2 bg-gradient-to-r from-g-blue/30 via-g-red/30 to-g-yellow/30 rounded-full"></span>
              </span>
              {' '}구축
            </h1>

            <p className="mt-6 text-lg text-white/40 max-w-2xl mx-auto leading-relaxed">
              부산대학교와 Google for Education이 함께 대학 교육의 미래를 열어갑니다.
            </p>
          </div>

          {/* Video */}
          <div className="max-w-4xl mx-auto pb-8 anim-fade-up" style={{ animationDelay: '0.15s' }}>
            <div className="bg-gray-900 rounded-2xl shadow-2xl shadow-black/30 overflow-hidden relative aspect-video ring-1 ring-white/10">
              <video
                ref={promoVideoRef}
                className="absolute inset-0 w-full h-full object-cover"
                controls
                loop
                playsInline
                preload="metadata"
                poster="/google/hero-bg.jpg"
                controlsList="nodownload noplaybackrate"
                disablePictureInPicture
                aria-label="부산대 X 구글 파트너십 홍보 영상"
              >
                <source src="/google/pnu-google.mp4" type="video/mp4" />
              </video>
            </div>
          </div>

          {/* KPI */}
          <div className="border-t border-white/10 py-10 grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            {[
              { value: '국내 최초', sub: '교육용 AI Ecosystem 전면 도입' },
              { value: '28,000', sub: (<>Workspace for Education Plus<br/>AI Pro for Education</>) },
              { value: '1,000', sub: 'Gemini Enterprise 라이선스 제공' },
              { value: '15개 과제', sub: 'AI STAR 연구 프로젝트' },
            ].map((k, i) => (
              <div key={i}>
                <p className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">{k.value}</p>
                <p className="mt-1 text-sm text-white/35 font-medium">{k.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ================================================================
          2. WHY PNU X GOOGLE FOR EDUCATION — 4대 혁신 트랙
      ================================================================ */}
      <section id="vision" className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-14">
            <p className="text-sm font-bold text-navy/40 tracking-widest uppercase mb-3">WHY PNU X GOOGLE FOR EDUCATION</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-navy">글로벌 AI 교육혁신 대학 도약,<br/>파트너십 4대 혁신 트랙</h2>
          </div>

          <div className="grid lg:grid-cols-4 gap-px bg-gray-200 rounded-2xl overflow-hidden">
            {[
              { icon: <GraduationCap className="w-6 h-6" />, num: '01', title: 'AI 교육', lines: ['부산대 맞춤형 Gemini Academy', '모두를 위한 AI Literacy MOOC', '단과대학 맞춤형 AI+X 활용교육'], accent: 'border-t-g-blue' },
              { icon: <FlaskConical className="w-6 h-6" />, num: '02', title: 'AI 연구', lines: ['AI STAR 프로젝트', 'AI 수업혁신 실증 연구', 'Google Cloud 연계 연구 프로그램'], accent: 'border-t-g-green' },
              { icon: <Users className="w-6 h-6" />, num: '03', title: '참여 프로그램', lines: ['Google 기술 & 전문가 세션', '실전형 산학 협력 프로젝트', 'AI 학생 커뮤니티'], accent: 'border-t-g-yellow' },
              { icon: <Globe className="w-6 h-6" />, num: '04', title: '글로벌', lines: ['Gemini Connect Seoul', 'APAC 리더 시리즈', 'Google Korea 파트너 포럼'], accent: 'border-t-g-red' },
            ].map((item) => (
              <div key={item.num} className={`bg-white p-8 lg:p-10 border-t-[3px] ${item.accent}`}>
                <span className="text-xs font-mono font-bold text-gray-300">{item.num}</span>
                <div className="mt-4 mb-4 text-navy">{item.icon}</div>
                <h3 className="text-lg font-bold text-navy mb-3">{item.title}</h3>
                <ul className="space-y-1.5">
                  {item.lines.map((line) => (
                    <li key={line} className="text-sm text-gray-500 flex items-start gap-2">
                      <span className="w-1 h-1 rounded-full bg-gray-300 mt-2 shrink-0"></span>{line}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ================================================================
          2.5. 파트너십 체결 + 보도자료
      ================================================================ */}
      <section id="partnership" className="py-20 lg:py-28 bg-navy-50 border-b border-gray-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <p className="text-sm font-bold text-g-blue tracking-widest uppercase mb-3">Partnership</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-navy">AI 교육혁신 파트너십 체결</h2>
            <p className="mt-3 text-gray-500">2026년 5월 13일, 부산대학교와 Google for Education이 공식 파트너십을 체결했습니다.</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 items-start">
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="aspect-[4/3] bg-gradient-to-br from-navy-50 to-gray-100 flex items-center justify-center relative overflow-hidden">
                <img src={ceremonyImg} alt="부산대학교-Google for Education AI 교육혁신 파트너십 세레모니" className="w-full h-full object-cover"
                />
                  <div className="hidden absolute inset-0 items-center justify-center flex-col gap-3 text-gray-400">
                  <Handshake className="w-16 h-16 text-gray-300" />
                  <p className="text-sm font-semibold">파트너십 세레모니 사진</p>
                </div>
              </div>
              <div className="p-6">
                <p className="text-xs font-mono text-gray-400 mb-2">2026.05.13 · 부산대 대학본부 3층 대회의실</p>
                <h4 className="font-bold text-navy mb-2">AI 교육혁신 파트너십 세레모니</h4>
                <p className="text-sm text-gray-500 leading-relaxed">Kevin Kells Google for Education 글로벌 디렉터, 최재원 부산대학교 총장이 참석하여 'AI 교육혁신 파트너십'을 공식 체결하고 협력의 시작을 알렸습니다.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
                <div className="flex items-center gap-2 mb-5">
                  <Newspaper className="w-5 h-5 text-g-blue" />
                  <span className="text-xs font-bold tracking-widest text-g-blue uppercase">Press Release</span>
                </div>
                <h3 className="text-xl font-bold text-navy mb-4 leading-snug">국내 대학 최초 교육용 AI Ecosystem 전면 도입</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-5">부산대학교가 국내 대학 최초로 전체 학생과 교원 대상 Google Workspace for Education Plus와 Google AI Pro for Education을 동시 도입합니다.</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'AI Pro', value: '28,000', unit: '라이선스' },
                    { label: 'Workspace Plus', value: '28,000', unit: '라이선스' },
                    { label: 'Gemini Enterprise', value: '1,000', unit: '계정' },
                  ].map((item) => (
                    <div key={item.label} className="bg-navy-50 rounded-xl p-3 text-center">
                      <p className="text-lg font-extrabold text-navy">{item.value}</p>
                      <p className="text-[10px] text-gray-400 font-semibold mt-0.5">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-navy rounded-2xl p-8 text-white relative overflow-hidden">
                <div className="absolute top-4 right-6 text-white/5"><Quote className="w-20 h-20" /></div>
                <div className="relative">
                  <p className="text-white/70 leading-relaxed text-sm mb-5">"학생이 자신의 자료를 넣어 함께 분석하고, 교수가 강의 전체를 AI와 함께 다룰 수 있는 — 학습과 연구 방식 자체를 바꾸는 인프라를 구축하는 것입니다. 부산대는 모든 구성원이 디지털 격차 없이 AI 시대를 준비할 수 있도록 앞장서겠습니다."</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/50 text-sm font-bold">최</div>
                    <div><p className="font-bold text-white text-sm">최재원</p><p className="text-white/35 text-xs">부산대학교 총장</p></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 교육용 AI Ecosystem 핵심 가치 — 디지털 격차 해소 first */}
          <div className="mt-12 bg-white rounded-2xl border border-gray-200 p-8 lg:p-10 shadow-sm">
            <h4 className="text-lg font-bold text-navy mb-6 text-center">교육용 AI Ecosystem이 바꾸는 대학 교육</h4>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: '디지털 격차 해소', desc: '개인 유료 구독 없이 전 구성원에게 동일한 AI 교육 환경을 보편적 복지로 제공', color: 'border-l-[#FBBC04]' },
                { title: '맥락 기반 AI', desc: '개인 드라이브 자료를 AI가 직접 분석·학습하여 맞춤형 인사이트 도출', color: 'border-l-[#4285F4]' },
                { title: 'NotebookLM 연구 인프라', desc: '수백 페이지의 논문·실험 데이터를 AI가 요약·대화·분석하는 개인 맞춤형 수석 연구원', color: 'border-l-[#EA4335]' },
                { title: '멀티모달 연구 지원', desc: '고해상도 이미지 생성·편집, 실시간 코드 디버깅까지 전 학문 분야 연구 생산성 극대화', color: 'border-l-[#34A853]' },
              ].map((item) => (
                <div key={item.title} className={`border-l-[3px] ${item.color} pl-5`}>
                  <h5 className="font-bold text-navy text-sm mb-1">{item.title}</h5>
                  <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>


      {/* ================================================================
          3. AI 생태계 — 인포그래픽 + 계정 등록 (모달)
      ================================================================ */}
      <section id="ecosystem" className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <p className="text-sm font-bold text-g-blue tracking-widest uppercase mb-3">AI Ecosystem</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-navy">교육용 AI Ecosystem 제공</h2>
            <p className="mt-3 text-gray-500">국내 최초, 교육용 AI Ecosystem을 모든 교원과 학생에게 제공합니다.</p>
          </div>

          <div className="max-w-4xl mx-auto mb-16">
            <div className="flex flex-col items-center">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-8 py-5 flex items-center gap-3">
                <GoogleForEdu className="text-xl font-extrabold" />
              </div>
              <div className="w-px h-8 bg-gray-300 relative"><ChevronDown className="w-4 h-4 text-gray-300 absolute -bottom-2 left-1/2 -translate-x-1/2" /></div>
              <div className="bg-navy rounded-2xl px-8 py-5 text-center shadow-lg">
                <p className="text-white font-extrabold text-lg">PNU 교육용 AI Ecosystem</p>
                <p className="text-white/40 text-xs mt-1">부산대학교 AI 교육 통합 플랫폼</p>
              </div>
              <div className="w-px h-8 bg-gray-300 relative"><ChevronDown className="w-4 h-4 text-gray-300 absolute -bottom-2 left-1/2 -translate-x-1/2" /></div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 mt-2">
              {[
                { name: 'Workspace for Education Plus', count: '28,000 라이선스', desc: 'Gmail·Docs·Drive 통합 협업 플랫폼', color: 'border-t-g-blue' },
                { name: 'Google AI Pro for Education', count: '28,000 라이선스', desc: 'Gemini 3.1 Pro 기반 AI 교수학습 도구', color: 'border-t-g-red' },
                { name: 'Gemini Enterprise', count: '1,000 계정', desc: '고성능 AI 모델 + 커스텀 에이전트 개발', color: 'border-t-g-yellow' },
              ].map((s) => (
                <div key={s.name} className={`bg-navy-50 rounded-xl p-5 border border-gray-200 border-t-[3px] ${s.color} text-center`}>
                  <p className="font-bold text-navy text-sm">{s.name}</p>
                  <p className="text-xs text-g-blue font-semibold mt-1">{s.count}</p>
                  <p className="text-xs text-gray-400 mt-1">{s.desc}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-center mt-3 mb-3">
              <div className="w-px h-6 bg-gray-300 relative"><ChevronDown className="w-4 h-4 text-gray-300 absolute -bottom-2 left-1/2 -translate-x-1/2" /></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { who: '학생 · 대학원생', count: '28,000명', icon: <GraduationCap className="w-5 h-5" /> },
                { who: '교원', count: '전원 대상', icon: <BookOpen className="w-5 h-5" /> },
              ].map((u) => (
                <div key={u.who} className="bg-navy-50 rounded-xl p-4 border border-gray-200 text-center flex flex-col items-center gap-2">
                  <div className="text-navy/40">{u.icon}</div>
                  <p className="text-sm font-semibold text-navy">{u.who}</p>
                  <p className="text-xs text-gray-400">{u.count}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 계정 등록 CTA — 모달 트리거 */}
          <div className="max-w-4xl mx-auto bg-navy-50 rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <h4 className="text-lg font-bold text-navy mb-1">서비스 이용 및 계정 등록 방법</h4>
                <p className="text-gray-500 text-sm">버튼을 클릭하면 등록 방법 안내를 확인할 수 있습니다.</p>
                <p className="text-xs text-gray-400 mt-1">서비스 개시: 2026년 6월 초 · 계약일로부터 1년간 운영</p>
              </div>
              <div className="flex flex-wrap gap-3 shrink-0">
                <button onClick={() => openRegister('student')} className="inline-flex items-center px-5 py-3 bg-white border border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-100 text-sm transition-all">
                  <FileText className="w-4 h-4 mr-2 text-g-blue" /> 학생 계정 등록 <ArrowUpRight className="w-3.5 h-3.5 ml-1.5 text-gray-400" />
                </button>
                <button onClick={() => openRegister('faculty')} className="inline-flex items-center px-5 py-3 bg-navy text-white rounded-xl font-semibold hover:bg-navy-light text-sm transition-all shadow-sm">
                  <FileText className="w-4 h-4 mr-2 opacity-60" /> 교원 계정 등록 <ArrowUpRight className="w-3.5 h-3.5 ml-1.5 opacity-60" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* ================================================================
          4. Google AI Ecosystem Map — 반응형
      ================================================================ */}
      <section id="ai-services" className="py-20 lg:py-28 bg-navy-50 border-b border-gray-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <p className="text-sm font-bold text-g-green tracking-widest uppercase mb-3">Google AI Ecosystem</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-navy">Google AI Ecosystem Map</h2>
            <p className="mt-3 text-gray-500">부산대 계정으로 로그인하면 Google AI 생태계 전체를 이용할 수 있습니다.</p>
          </div>

          {/* Ecosystem Map — Google G + 제품 아이콘 ON 링 */}
          <div className="max-w-5xl mx-auto">
            <div className="relative bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
              {/* ── Desktop ── */}
              <div className="hidden lg:block relative" style={{ height: 800 }}>

                {/* ── 중앙 Google G (CSS) ── */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: 300, height: 300, zIndex: 1 }}>
                  {/* 색상 링 (gap 포함) */}
                  <div className="absolute inset-0 rounded-full" style={{
                    background: `conic-gradient(from 0deg,
                      #EA4335 0deg, #EA4335 8deg,
                      transparent 14deg, transparent 76deg,
                      #4285F4 82deg, #4285F4 142deg,
                      #FBBC04 150deg, #FBBC04 205deg,
                      #34A853 213deg, #34A853 292deg,
                      #4285F4 300deg, #4285F4 335deg,
                      #EA4335 343deg, #EA4335 360deg)`,
                    boxShadow: '0 15px 50px rgba(0,0,0,0.08)',
                  }} />
                  {/* 흰 중앙 */}
                  <div className="absolute rounded-full bg-white" style={{ inset: 55 }} />
                  {/* 파란 바 (G 가로획) */}
                  <div className="absolute" style={{ top: '50%', left: '50%', right: 0, height: 55, transform: 'translateY(-50%)', backgroundColor: '#4285F4', borderRadius: '0 4px 4px 0' }} />
                </div>

                {/* ── 제품 아이콘 (링 위에 배치) ── */}
                {[
                  { name: 'Gemini Gems', desc: '목표와 선호에 맞춘\n맞춤형 AI 어시스턴트', logo: L+'gemini-lg.png', color: '#4285F4' },
                  { name: 'NotebookLM', desc: '개인 문서를 정리·분석하는\nAI 연구 어시스턴트', logo: L+'notebooklm.png', color: '#0B57D0' },
                  { name: 'Google Pomelli', desc: '브랜드 맞춤 소셜 미디어\n캠페인을 만드는 AI 마케팅 툴', fallback: 'P', color: '#34A853' },
                  { name: 'Google Stitch', desc: '텍스트 프롬프트를\n레이아웃으로 변환하는 AI UI 툴', fallback: 'S', color: '#1A73E8' },
                  { name: 'Google AI Studio', desc: 'Google 생성형 모델로\n앱을 프로토타이핑하는 Web IDE', logo: L+'gemini.png', color: '#FBBC04' },
                  { name: 'Google Opal', desc: '간단한 AI 마이크로앱을\n만들고 공유하는 노코드 도구', fallback: 'O', color: '#9334E6' },
                  { name: 'Google Whisk', desc: 'Labs에서 만든\nAI 이미지 리믹싱·생성 도구', fallback: 'W', color: '#34A853' },
                  { name: 'Google Imagen 3', desc: '타이포·디테일에 강한\n초현실 텍스트-이미지 AI', fallback: 'I', color: '#4285F4' },
                  { name: 'Nano Banana', desc: 'Google DeepMind의\nAI 이미지 생성·편집 모델', fallback: 'N', color: '#FBBC04' },
                  { name: 'Google Lumiere', desc: '텍스트에서 사실적이고\n일관된 영상을 생성하는 AI 모델', fallback: 'L', color: '#EA4335' },
                ].map((item, i, arr) => {
                  // 중앙 G 기준 균일 원형 배치 (반지름 250px, 정상부터 시계방향)
                  const ang = (-90 + i * (360 / arr.length)) * Math.PI / 180;
                  const dx = Math.cos(ang) * 250, dy = Math.sin(ang) * 250;
                  const vertical = Math.abs(Math.cos(ang)) < 0.2; // 12·6시: 라벨을 아이콘 위/아래 중앙 정렬
                  const icon = (
                    <div className="w-14 h-14 rounded-full bg-white shadow-lg border-2 border-white flex items-center justify-center shrink-0 overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}>
                      {item.logo
                        ? <img src={item.logo} alt={item.name} className="w-9 h-9 object-contain" />
                        : <span className="text-xl font-black" style={{ color: item.color }}>{item.fallback}</span>
                      }
                    </div>
                  );
                  if (vertical) {
                    const isTop = Math.sin(ang) < 0; // 12시면 라벨을 위로, 6시면 아래로
                    return (
                      <div key={item.name} className="absolute" style={{ left: '50%', top: `${(400 + dy).toFixed(1)}px`, transform: 'translate(-50%, -50%)', zIndex: 5 }}>
                        {icon}
                        <div className="absolute left-1/2 -translate-x-1/2 text-center" style={{ [isTop ? 'bottom' : 'top']: 'calc(100% + 8px)', width: 180 }}>
                          <p className="text-[13px] font-extrabold leading-tight" style={{ color: item.color }}>{item.name}</p>
                          <p className="text-[10px] text-gray-500 mt-1 leading-relaxed whitespace-pre-line">{item.desc}</p>
                        </div>
                      </div>
                    );
                  }
                  const right = Math.cos(ang) > 0; // 오른쪽 반원이면 라벨을 바깥(오른쪽)으로
                  return (
                  <div key={item.name} className="absolute flex items-center gap-3" style={{
                    left: `calc(50% + ${dx.toFixed(1)}px)`, top: `${(400 + dy).toFixed(1)}px`, zIndex: 5,
                    width: 'max-content', maxWidth: 210,
                    transform: right ? 'translate(-28px, -50%)' : 'translate(calc(-100% + 28px), -50%)',
                    flexDirection: right ? 'row' : 'row-reverse',
                    textAlign: right ? 'left' : 'right',
                  }}>
                    {icon}
                    <div>
                      <p className="text-[13px] font-extrabold leading-tight" style={{ color: item.color }}>{item.name}</p>
                      <p className="text-[10px] text-gray-500 mt-1 leading-relaxed whitespace-pre-line">{item.desc}</p>
                    </div>
                  </div>
                  );
                })}
              </div>

              {/* ── Mobile ── */}
              <div className="lg:hidden p-5">
                <div className="flex justify-center mb-8">
                  <div className="relative" style={{ width: 100, height: 100 }}>
                    <div className="absolute inset-0 rounded-full" style={{
                      background: `conic-gradient(from 0deg,
                        #EA4335 0deg, #EA4335 8deg,
                        transparent 14deg, transparent 76deg,
                        #4285F4 82deg, #4285F4 142deg,
                        #FBBC04 150deg, #FBBC04 205deg,
                        #34A853 213deg, #34A853 292deg,
                        #4285F4 300deg, #4285F4 335deg,
                        #EA4335 343deg, #EA4335 360deg)`,
                      boxShadow: '0 8px 25px rgba(0,0,0,0.08)',
                    }} />
                    <div className="absolute rounded-full bg-white" style={{ inset: 20 }} />
                    <div className="absolute" style={{ top: '50%', left: '50%', right: 0, height: 20, transform: 'translateY(-50%)', backgroundColor: '#4285F4', borderRadius: '0 2px 2px 0' }} />
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { name: 'Gemini Gems', desc: '맞춤형 AI 어시스턴트', logo: L+'gemini-lg.png', color: '#4285F4' },
                    { name: 'NotebookLM', desc: 'AI 연구 어시스턴트', logo: L+'notebooklm.png', color: '#0B57D0' },
                    { name: 'Google Lumiere', desc: 'AI 영상 생성 모델', fallback: 'L', color: '#EA4335' },
                    { name: 'Nano Banana', desc: 'AI 이미지 생성·편집', fallback: 'N', color: '#FBBC04' },
                    { name: 'Google Imagen 3', desc: '텍스트→이미지 AI', fallback: 'I', color: '#4285F4' },
                    { name: 'Google Pomelli', desc: 'AI 마케팅 도구', fallback: 'P', color: '#34A853' },
                    { name: 'Google Stitch', desc: 'AI UI 디자인 툴', fallback: 'S', color: '#1A73E8' },
                    { name: 'Google Opal', desc: 'AI 노코드 빌더', fallback: 'O', color: '#9334E6' },
                    { name: 'Google AI Studio', desc: '생성형 모델 IDE', logo: L+'gemini.png', color: '#FBBC04' },
                    { name: 'Google Whisk', desc: 'AI 이미지 리믹싱', fallback: 'W', color: '#34A853' },
                  ].map((item) => (
                    <div key={item.name} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/70">
                      <div className="w-11 h-11 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                        {item.logo
                          ? <img src={item.logo} alt={item.name} className="w-7 h-7 object-contain" />
                          : <span className="text-lg font-black" style={{ color: item.color }}>{item.fallback}</span>
                        }
                      </div>
                      <div>
                        <p className="text-sm font-bold" style={{ color: item.color }}>{item.name}</p>
                        <p className="text-[11px] text-gray-500 leading-snug">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 주요 서비스 바로가기 */}
            <div className="mt-10 bg-white rounded-2xl border border-gray-200 p-6">
              <p className="text-xs font-bold text-navy/40 tracking-widest uppercase mb-4 text-center">주요 서비스 바로가기</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { name: 'Gemini', desc: 'AI 채팅·분석·코딩', logo: L+'gemini-lg.png', href: 'https://gemini.google.com' },
                  { name: 'NotebookLM', desc: '논문·자료 AI 분석', logo: L+'notebooklm.png', href: 'https://notebooklm.google.com' },
                  { name: 'Google AI Studio', desc: 'Gemini API 실험', logo: L+'gemini.png', href: 'https://aistudio.google.com' },
                  { name: 'Gemini Omni(FLOW)', desc: '최신 Google 서비스 만나보기', logo: L+'google_flow.png', href: 'https://labs.google/fx/tools/flow?gad_source=1&gad_campaignid=23877477981&gbraid=0AAAABDRA0IWA6nj_8Df3woyD3he1K1Vk4&gclid=Cj0KCQjwrZTRBhDSARIsAHidYffBvEDP6Dv7ObV-KKR8a4MmWvqFvZyzRZPafqYjiJmoOLPV4ak1clQaArnTEALw_wcB#models' },
                ].map((t) => (
                  <a key={t.name} href={t.href} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
                    <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 overflow-hidden">
                      <img src={t.logo} alt={t.name} className="w-6 h-6 object-contain" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-navy truncate">{t.name}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{t.desc}</p>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-navy ml-auto shrink-0 transition-colors" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* ================================================================
          6. 교육 프로그램
      ================================================================ */}
      <section id="education" className="py-20 lg:py-28 bg-g-blue/[0.03] border-b border-gray-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            <div>
              <p className="text-sm font-bold text-g-blue tracking-widest uppercase mb-3">Education</p>
              <h2 className="text-3xl font-bold text-navy mb-3">교육 프로그램</h2>
              <p className="text-gray-500 leading-relaxed mb-8">Google과 함께 설계한 부산대 맞춤형 AI 교육 커리큘럼. 기초 소양부터 전공 융합, 국제 자격증까지 체계적으로 제공합니다.</p>

              <div className="space-y-6">
                {[
                  { tag: '인증/자격', title: '부산대 맞춤형 Gemini Academy', desc: '부산대 교육 환경 및 인프라를 반영한 맞춤형 Gemini Academy 운영 및 구글 공인 국제 자격증 연계 과정 기회 제공', color: 'bg-g-blue', cta: '추후 업데이트 예정', ctaColor: 'text-gray-400' },
                  { tag: '기초/소양', title: '모두를 위한 AI Literacy', desc: '부산대 우수 교수진과 현업 구글러(Googler)가 공동으로 기획 및 제작한 MOOC 기반의 전교생 대상 AI 기초 소양 교육', color: 'bg-g-red', cta: '추후 업데이트 예정', ctaColor: 'text-gray-400' },
                  { tag: '융합/전공', title: '단과대학 맞춤형 AI+X 교육', desc: '각 전공 영역 고유의 도메인 지식(X)과 최신 AI 활용 기술을 융합 결합하여 학과별 경쟁력을 높이는 단과대 맞춤 교육', color: 'bg-g-yellow', cta: '추후 업데이트 예정', ctaColor: 'text-gray-400' },
                  { tag: '커뮤니티', title: 'AI 챔피언 그룹 & 캠퍼스 아웃리치', desc: '학생 중심 AI 기반 학습혁신 가속화 그룹 구성 및 구글 임직원 캠퍼스 방문 실전 경험 공유 프로그램', color: 'bg-g-green', cta: '추후 업데이트 예정', ctaColor: 'text-gray-400' },
                ].map((p) => (
                  <div key={p.title} className="flex gap-4 group">
                    <div className={`${p.color} w-1 rounded-full shrink-0`}></div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{p.tag}</span>
                      <h4 className="font-bold text-navy mt-0.5">{p.title}</h4>
                      <p className="text-sm text-gray-500 mt-1 leading-relaxed">{p.desc}</p>
                      <span className={`inline-flex items-center mt-2 text-sm font-semibold ${p.ctaColor}`}>{p.cta}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 lg:p-10 lg:sticky lg:top-24">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-11 h-11 rounded-xl bg-g-blue/10 text-g-blue flex items-center justify-center"><Award className="w-5 h-5" /></div>
                <div><p className="font-bold text-navy">Gemini Academy</p><p className="text-xs text-gray-400">Google 공인 인증 과정</p></div>
              </div>
              <div className="space-y-3">
                {['AI 기초 활용', '프롬프트 엔지니어링', 'Workspace AI 통합', '전공별 Gemini 심화'].map((step, i) => (
                  <div key={step} className="flex items-center gap-4 bg-navy-50 px-5 py-4 rounded-xl">
                    <span className="w-7 h-7 rounded-full bg-g-blue text-white text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                    <span className="text-sm font-medium text-navy">{step}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8 pt-6 border-t border-gray-100 text-sm font-semibold text-gray-400">추후 업데이트 예정</div>
            </div>
          </div>
        </div>
      </section>


      {/* ================================================================
          6.5 AI 활용법 가이드 (진입 카드 + 학습 모달)
      ================================================================ */}
      <AiGuideSection />


      {/* ================================================================
          7. 연구 프로그램
      ================================================================ */}
      <section id="research" className="py-20 lg:py-28 bg-navy">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <p className="text-sm font-bold text-g-green tracking-widest uppercase mb-3">Research</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">연구 프로그램</h2>
            <p className="mt-3 text-white/35">AI 교육혁신의 첫 단추는 수업의 변화로부터 시작됩니다.</p>
          </div>

          <div className="grid lg:grid-cols-5 gap-10 items-start">
            <div className="lg:col-span-2 bg-white/5 backdrop-blur-sm p-8 sm:p-10 rounded-2xl border border-white/10 lg:sticky lg:top-24">
              <div className="flex items-center gap-2 mb-5">
                <Sparkles className="w-5 h-5 text-g-green" />
                <span className="text-xs font-bold tracking-widest text-g-green uppercase">AI STAR Project</span>
              </div>
              <h3 className="text-3xl font-bold text-white mb-5">AI STAR<br/>프로젝트</h3>
              <p className="text-white/40 leading-relaxed text-sm mb-6">AI STAR는 부산대학교 에듀테크센터와 구글이 공동으로 추진하는 현장 맞춤형 AI 교육과정 실증 모델 연구 사업입니다.</p>
              <div className="border-t border-white/10 pt-5 space-y-2.5 text-sm text-white/30">
                <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-g-blue"></span> 기간: 2026학년도 연중 진행</div>
                <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-g-red"></span> 협력: Google Cloud</div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-8 pt-6 border-t border-white/10">
                {[{ v: '15', l: '선정 과제' }, { v: '50+', l: '참여 연구자' }, { v: '8', l: '연구 분야' }].map((m) => (
                  <div key={m.l} className="text-center">
                    <p className="text-2xl font-extrabold text-white">{m.v}</p>
                    <p className="text-[10px] text-white/25 mt-0.5">{m.l}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-3">
              <h4 className="text-sm font-bold text-white/60 mb-4 flex items-center gap-2">
                <span className="w-1 h-4 bg-g-green rounded-full"></span>
                2026학년도 연구 과제 공모 선정 리스트 (15개 과제)
              </h4>
              <div className="bg-white/5 border border-white/10 rounded-2xl divide-y divide-white/5 max-h-[600px] overflow-y-auto custom-scrollbar">
                {RESEARCH_LIST.map((item, i) => (
                  <div key={i} className="px-5 py-4 hover:bg-white/5 transition-colors flex items-start gap-3 group">
                    <span className="font-mono text-xs font-bold text-g-green mt-0.5 shrink-0 w-5 text-right">{(i + 1).toString().padStart(2, '0')}</span>
                    <div>
                      <span className="text-[10px] font-bold text-white/25 uppercase">{item.dept}</span>
                      <p className="text-white/60 text-sm leading-relaxed group-hover:text-white/80 transition-colors">{item.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* ================================================================
          8. 참여 프로그램
      ================================================================ */}
      <section id="participation" className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-14">
            <p className="text-sm font-bold text-g-red tracking-widest uppercase mb-3">Engagement</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-navy">참여 프로그램</h2>
            <p className="mt-3 text-gray-500">구글과 함께 생생한 현장을 직접 경험하며 AI 실무의 진짜 답을 찾아갑니다.</p>
          </div>

          {/* 상시 운영 */}
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-2 h-2 rounded-full bg-g-blue animate-pulse"></div>
              <span className="text-xs font-bold text-g-blue tracking-widest uppercase">상시 운영</span>
            </div>
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-navy-50 rounded-2xl p-7 border border-gray-200">
                <h3 className="text-lg font-bold text-navy mb-2">Google 기술 & 전문가 세션</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-4">구글러와의 만남, 글로벌 테크 멘토링, GTO 세션 등 구글 엔지니어 실무 전문가 기술을 만나는 기회를 매달 제공합니다.</p>
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-g-blue/10 text-g-blue text-xs font-semibold">매월 정기 운영</span>
              </div>
              <div className="bg-navy-50 rounded-2xl p-7 border border-gray-200">
                <h3 className="text-lg font-bold text-navy mb-2">실전형 산학 협력 프로젝트</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-4">구글의 AI 프레임워크 기술을 활용하여 지역 사회 문제, 실제 비즈니스 문제를 창의적으로 해결해보는 실무형 프로젝트.</p>
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-g-blue/10 text-g-blue text-xs font-semibold">학기별 상시 운영</span>
              </div>
            </div>
          </div>

          {/* 진행중 NOW OPEN */}
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-5">
              <div className="relative w-2 h-2">
                <div className="absolute inset-0 rounded-full bg-g-red animate-ping opacity-75"></div>
                <div className="relative w-2 h-2 rounded-full bg-g-red"></div>
              </div>
              <span className="text-xs font-bold text-g-red tracking-widest uppercase">진행중 · Now Open</span>
            </div>
            <div className="max-w-lg">
              <div className="bg-white rounded-xl border-2 border-g-red/20 p-6 hover:shadow-md transition-shadow group">
                <h4 className="font-bold text-navy text-sm mb-2">Google 교육용 AI Ecosystem 계정 발급</h4>
                <p className="text-xs text-gray-500 leading-relaxed mb-3">부산대 전체 학생·교원 대상 Google AI Pro for Education, Workspace for Education Plus 무료 계정을 지금 바로 발급받으세요.</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-2 py-0.5 rounded-full bg-navy-50 text-navy text-[10px] font-semibold">학생 · 교원 전원</span>
                  <span className="px-2 py-0.5 rounded-full bg-g-red/10 text-g-red text-[10px] font-bold">상시 발급</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openRegister('student')} className="inline-flex items-center text-xs font-semibold text-g-blue hover:underline">학생 등록 <ArrowUpRight className="w-3 h-3 ml-0.5" /></button>
                  <span className="text-gray-300">|</span>
                  <button onClick={() => openRegister('faculty')} className="inline-flex items-center text-xs font-semibold text-g-green hover:underline">교원 등록 <ArrowUpRight className="w-3 h-3 ml-0.5" /></button>
                </div>
              </div>
            </div>
          </div>

          {/* 완료된 행사 + 예정 행사 */}
          <div className="grid lg:grid-cols-2 gap-10">
            <div>
              <div className="flex items-center gap-2 mb-5">
                <div className="w-2 h-2 rounded-full bg-g-green"></div>
                <span className="text-xs font-bold text-g-green tracking-widest uppercase">완료된 행사</span>
              </div>
              <div className="space-y-3">
                {[
                  { date: '2026.05.13', title: 'AI 교육혁신 파트너십 세레모니', desc: 'Kevin Kells 글로벌 디렉터 · 최재원 총장 참석, 공식 파트너십 체결', tag: 'Partnership' },
                  { date: '2026.05', title: 'Gemini Connect Seoul', desc: '에듀테크센터장 공식 스피커 참여, 파트너십 사례 전 세계 소개', tag: 'Global' },
                  { date: '2026.05', title: 'Google Tech Orientation (GTO)', desc: '구글 엔지니어 실무 세션, 학생 대상 기술 오리엔테이션 진행', tag: 'Session' },
                  { date: '2026.06', title: '교육용 AI Ecosystem 전면 도입', desc: '28,000 라이선스 전교생·교원 대상 서비스 개시', tag: 'Launch' },
                ].map((event) => (
                  <div key={event.title} className="flex gap-4 bg-white rounded-xl p-5 border border-gray-200 group hover:border-g-green/30 transition-colors">
                    <div className="shrink-0 pt-0.5"><p className="text-xs font-mono font-bold text-g-green">{event.date}</p></div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-navy text-sm">{event.title}</h4>
                        <span className="px-2 py-0.5 rounded-full bg-g-green/10 text-g-green text-[10px] font-bold shrink-0">{event.tag}</span>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">{event.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-5">
                <div className="w-2 h-2 rounded-full bg-g-yellow"></div>
                <span className="text-xs font-bold text-amber-600 tracking-widest uppercase">예정된 행사</span>
              </div>
              <div className="space-y-3">
                {[
                  { date: '2026', title: '부산대 맞춤형 Gemini Academy', desc: 'Google 공인 국제 자격증 연계 부산대 맞춤형 인증 과정 개설', tag: 'Education' },
                  { date: '2026', title: 'Travel Busan with Google Gemini', desc: '구글 Gemini 기반 부산 지역 문제 해결 산학 프로젝트', tag: 'Project' },
                  { date: '2026', title: 'Higher Ed Leader Series APAC', desc: 'APAC 고등교육 리더 시리즈 포럼 패널 토론자 초청', tag: 'Global' },
                  { date: '2026', title: 'AI Literacy MOOC', desc: '부산대 교수진 + 구글러 공동 기획 전교생 AI 기초 소양 MOOC 개강', tag: 'MOOC' },
                  { date: '2026', title: '단과대학 맞춤형 AI+X 활용 교육 프로그램', desc: '전공별 도메인 지식과 AI 활용 기술을 융합한 단과대 맞춤 교육', tag: 'AI+X' },
                ].map((event) => (
                  <div key={event.title} className="flex gap-4 bg-white rounded-xl p-5 border border-gray-200 group hover:border-g-yellow/30 transition-colors">
                    <div className="shrink-0 pt-0.5"><p className="text-xs font-mono font-bold text-amber-600">{event.date}</p></div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-bold text-navy text-sm">{event.title}</h4>
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold shrink-0">{event.tag}</span>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">{event.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* ================================================================
          9. 글로벌 네트워크
      ================================================================ */}
      <section id="network" className="py-20 lg:py-28 bg-navy-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-bold text-g-red tracking-widest uppercase mb-3">Global Network</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-navy">글로벌 네트워크</h2>
            <p className="mt-3 text-gray-500">Google과 함께 글로벌 허브 교육혁신 생태계를 이끌어 갑니다.</p>
          </div>

          <div className="relative bg-white rounded-2xl border border-gray-200 p-8 lg:p-12 overflow-hidden">
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #0B1F4A 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

            <div className="relative grid lg:grid-cols-5 gap-8">
              <div className="lg:col-span-3 flex flex-col items-center justify-center gap-6">
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  {[
                    { city: 'Seoul', flag: '\u{1F1F0}\u{1F1F7}', active: true },
                    { city: 'Singapore', flag: '\u{1F1F8}\u{1F1EC}', active: true },
                    { city: 'Busan', flag: '\u{1F1F0}\u{1F1F7}', active: true },
                    { city: 'and more', flag: '\u{1F30F}' },
                  ].map((loc) => (
                    <div key={loc.city} className={`flex items-center gap-2 px-4 py-3 rounded-xl border ${loc.active ? 'bg-navy text-white border-navy' : 'bg-white text-navy border-gray-200'}`}>
                      <span className="text-lg">{loc.flag}</span>
                      <span className="text-sm font-semibold">{loc.city}</span>
                      {loc.active && <div className="w-2 h-2 rounded-full bg-g-green animate-pulse"></div>}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 tracking-widest uppercase font-mono">PNU AI EDTECH Global Hub</p>
              </div>

              <div className="lg:col-span-2 space-y-4">
                {[
                  { label: 'Gemini Connect Seoul', desc: '에듀테크센터장 공식 스피커 참여, 파트너십 사례 전 세계 소개', tag: 'GLOBAL', color: 'border-l-g-blue' },
                  { label: 'Google Korea & PNU', desc: 'Kevin Kells 글로벌 디렉터 참석, 교육혁신본부장 VIP 포럼', tag: 'PARTNER', color: 'border-l-g-red' },
                  { label: 'Higher Ed Leader Series APAC', desc: 'APAC 고등교육 리더 시리즈 포럼 패널 토론자 초청', tag: 'APAC', color: 'border-l-g-yellow' },
                  { label: 'PNU AI EDTECH SUMMIT', desc: '부산대 주최 AI 에듀테크 서밋, 글로벌 교육혁신 사례 공유', tag: '2026.11 BUSAN', color: 'border-l-g-green' },
                ].map((ms) => (
                  <div key={ms.label} className={`bg-gray-50 rounded-xl p-5 border border-gray-200 border-l-[3px] ${ms.color}`}>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">{ms.tag}</span>
                    <h4 className="font-bold text-navy text-sm mt-1">{ms.label}</h4>
                    <p className="text-xs text-gray-500 mt-1">{ms.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <p className="text-center text-xs font-mono text-gray-400 tracking-[0.2em] mt-10 uppercase">and more global milestones to come</p>
        </div>
      </section>


      {/* ================================================================
          10. CTA
      ================================================================ */}
      <section className="py-20 lg:py-24 bg-navy relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-g-blue/[0.06] rounded-full blur-[100px]"></div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">부산대학교 AI 혁신 생태계에<br/>참여하세요</h2>
          <p className="text-white/35 mb-10 text-lg">AI 거점대학의 교육·연구·협력 프로그램에 지금 바로 참여할 수 있습니다.</p>
          <div className="grid sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <button onClick={() => openRegister('student')} className="bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl p-5 transition-all text-center group">
              <p className="text-white font-bold">학생 참여</p>
              <p className="text-white/35 text-xs mt-1 group-hover:text-white/50 transition-colors">AI Pro 계정 발급·교육과정</p>
            </button>
            <button onClick={() => openRegister('faculty')} className="bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl p-5 transition-all text-center group">
              <p className="text-white font-bold">교원 참여</p>
              <p className="text-white/35 text-xs mt-1 group-hover:text-white/50 transition-colors">AI STAR·Gemini Enterprise</p>
            </button>
            <a href="mailto:pnucde@pusan.ac.kr" className="bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl p-5 transition-all text-center group">
              <p className="text-white font-bold">문의하기</p>
              <p className="text-white/35 text-xs mt-1 group-hover:text-white/50 transition-colors">pnucde@pusan.ac.kr</p>
            </a>
          </div>
        </div>
      </section>


      {/* ================================================================
          FOOTER
      ================================================================ */}
      <footer className="bg-gray-950 text-gray-500 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b border-gray-800/50 pb-8 mb-8">
            <div>
              <p className="font-bold text-white text-sm mb-1">부산대학교 에듀테크센터</p>
              <p className="text-xs text-gray-600">ARISE PNU AI · AI EDTECH 교육혁신 생태계 구축 사업</p>
              <p className="text-xs text-gray-700 mt-1">본 페이지는 부산대학교 x Google for Education 협력 AI 교육 거점 대학 연계 프로그램 안내 페이지입니다.</p>
              <div className="flex gap-4 mt-2 text-[10px] text-gray-700">
                <span>문의: 교육혁신본부 에듀테크센터 ☎ 051-510-7886</span>
              </div>
            </div>
            <a href="mailto:pnucde@pusan.ac.kr" className="flex items-center gap-3 bg-gray-800/50 px-5 py-3 rounded-xl border border-gray-700/50 hover:bg-gray-700/50 transition-colors">
              <Mail className="w-4 h-4 text-g-blue" />
              <div>
                <p className="text-[10px] text-gray-600 font-semibold">공식 문의처</p>
                <span className="text-white text-sm font-mono font-semibold">pnucde@pusan.ac.kr</span>
              </div>
            </a>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-gray-700">
            <div className="flex gap-4">
              <span className="hover:text-gray-400 cursor-pointer font-semibold text-gray-500">개인정보처리방침</span>
              <span>&bull;</span>
              <span className="hover:text-gray-400 cursor-pointer">이용약관</span>
            </div>
            <p>&copy; 2026 Pusan National University Edutech Center. All Rights Reserved.</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
