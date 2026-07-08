import React, { useEffect, useRef, useState } from 'react';
import { Play, Search, X, ChevronDown, ArrowUpRight } from 'lucide-react';

/* ============================================================
   AI 활용법 가이드 — 진입 카드 + 학습 모달
   원본: 외부 제작 단일 HTML(ai-guide.html)을 React 포팅.
   영상 목록·타임라인 출처: 인수인계 문서 「추가 내용.md」.
   Jamboard는 서비스 종료(2024-12)로 영상만 유지, 앱 링크 없음.
   ============================================================ */

const L = '/google/logos/';
const YT = (id, params = '') => `https://www.youtube.com/embed/${id}${params}`;

/* ── 로고 (public/google/logos 에 없는 앱만 인라인 SVG) ── */

const WsIcon = (props) => (
  <svg viewBox="0 0 24 24" {...props}>
    <rect x="3" y="3" width="8" height="8" rx="2" fill="#4285F4" />
    <rect x="13" y="3" width="8" height="8" rx="2" fill="#EA4335" />
    <rect x="3" y="13" width="8" height="8" rx="2" fill="#FBBC04" />
    <rect x="13" y="13" width="8" height="8" rx="2" fill="#34A853" />
  </svg>
);

const GoogleGIcon = (props) => (
  <svg viewBox="0 0 48 48" {...props}>
    <path fill="#4285F4" d="M44 24c0-1.4-.1-2.7-.4-4H24v8h11.3c-.5 2.6-2 4.8-4.3 6.3v5.2h6.9C42 35.7 44 30.3 44 24z" />
    <path fill="#34A853" d="M24 44c5.8 0 10.6-1.9 14.1-5.2l-6.9-5.2c-1.9 1.3-4.3 2-7.2 2-5.5 0-10.2-3.7-11.9-8.7H5v5.4C8.5 39.4 15.6 44 24 44z" />
    <path fill="#FBBC04" d="M12.1 26.9c-.4-1.3-.7-2.6-.7-3.9s.3-2.7.7-3.9v-5.4H5C3.6 16.5 3 20.1 3 23s.6 6.5 2 9.3l7.1-5.4z" />
    <path fill="#EA4335" d="M24 10.7c3.1 0 5.9 1.1 8.1 3.2l6.1-6.1C34.6 4.3 29.8 2 24 2 15.6 2 8.5 6.6 5 13.7l7.1 5.4c1.7-5 6.4-8.4 11.9-8.4z" />
  </svg>
);

const ChatIcon = (props) => (
  <svg viewBox="0 0 48 48" {...props}>
    <path fill="#00AC47" d="M40 6H8a2 2 0 0 0-2 2v26a2 2 0 0 0 2 2h6v7l8-7h18a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2z" />
    <circle cx="17" cy="21" r="2.4" fill="#fff" />
    <circle cx="24" cy="21" r="2.4" fill="#fff" />
    <circle cx="31" cy="21" r="2.4" fill="#fff" />
  </svg>
);

const ContactsIcon = (props) => (
  <svg viewBox="0 0 48 48" {...props}>
    <rect x="8" y="6" width="32" height="36" rx="3" fill="#4285F4" />
    <rect x="4" y="14" width="6" height="4" rx="1" fill="#1a56c4" />
    <rect x="4" y="24" width="6" height="4" rx="1" fill="#1a56c4" />
    <rect x="4" y="34" width="6" height="4" rx="1" fill="#1a56c4" />
    <circle cx="23" cy="20" r="5" fill="#fff" />
    <path fill="#fff" d="M14 34c0-5 4-8 9-8s9 3 9 8z" />
  </svg>
);

const JamboardIcon = (props) => (
  <svg viewBox="0 0 48 48" {...props}>
    <rect x="6" y="8" width="36" height="26" rx="3" fill="#F9A825" />
    <rect x="10" y="12" width="28" height="18" rx="2" fill="#fff" />
    <rect x="21" y="34" width="6" height="6" fill="#EA8600" />
    <circle cx="17" cy="21" r="3" fill="#EA4335" />
    <circle cx="26" cy="21" r="3" fill="#4285F4" />
    <circle cx="31" cy="24" r="2.4" fill="#34A853" />
  </svg>
);

const TasksIcon = (props) => (
  <svg viewBox="0 0 48 48" {...props}>
    <circle cx="24" cy="24" r="20" fill="#1967D2" />
    <path d="M15 24l6 6 13-13" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ── 콘텐츠 데이터 (영상 23개 = Workspace 20 + Gemini 2 + NotebookLM 1) ── */

const WS_APPS = [
  { name: 'Google Workspace란?', desc: '워크스페이스 전체 개념 잡기', href: 'https://workspace.google.com/intl/ko/', Icon: WsIcon, wide: true, videos: [{ id: 'z5svfCq_Hp8', badge: '시리얼', label: '개요' }] },
  { name: 'Chrome', desc: 'Google 웹 브라우저', href: 'https://www.google.com/chrome/', img: 'chrome.png', videos: [{ id: 'GBRD7QeKpiQ', badge: '시리얼', label: '크롬' }] },
  { name: '드라이브', desc: '클라우드 파일 저장·공유', href: 'https://drive.google.com/', img: 'drive.png', videos: [{ id: 'uc0nDarpzDg', badge: '시리얼', label: '드라이브' }] },
  { name: '문서 (Docs)', desc: '온라인 문서 작성', href: 'https://docs.google.com/', img: 'docs.png', videos: [{ id: '0X_YRPgXmk8', badge: '시리얼', label: '문서' }] },
  { name: '시트 (Sheets)', desc: '스프레드시트·표 계산', href: 'https://sheets.google.com/', img: 'sheets.png', videos: [{ id: 'VI6DgF_sS7U', badge: '시리얼', label: '①' }, { id: '91TH9LRPbzA', badge: '시리얼', label: '②' }] },
  { name: '슬라이드 (Slides)', desc: '프레젠테이션 제작', href: 'https://slides.google.com/', img: 'slides.png', videos: [{ id: 'mSQFTR9aulM', badge: '시리얼', label: '슬라이드' }] },
  { name: 'Gmail', desc: '이메일', href: 'https://mail.google.com/', img: 'gmail.png', videos: [{ id: 'jKMpPAVSLh4', badge: '시리얼', label: 'Gmail' }] },
  { name: 'Meet', desc: '화상 회의', href: 'https://meet.google.com/', img: 'meet.png', videos: [{ id: 'fCqHm8JvJTU', badge: '시리얼', label: 'Meet' }] },
  { name: '채팅 (Chat)', desc: '팀 메시지·협업', href: 'https://chat.google.com/', Icon: ChatIcon, videos: [{ id: 'Q4Trvt6FXWc', badge: '해커스', label: '채팅' }] },
  { name: '캘린더', desc: '일정 관리', href: 'https://calendar.google.com/', img: 'calendar.png', videos: [{ id: 'pXwXaNs0QJU', badge: '시리얼', label: '' }, { id: 'BPrXT4afZH0', badge: '해커스', label: '' }] },
  { name: '설문지 (Forms)', desc: '설문·양식 제작', href: 'https://forms.google.com/', img: 'forms.png', videos: [{ id: 'wioXLXBHrys', badge: '시리얼', label: '' }, { id: '8-x_xFu2L-g', badge: '해커스', label: '' }] },
  { name: '주소록', desc: '연락처 관리', href: 'https://contacts.google.com/', Icon: ContactsIcon, videos: [{ id: 'YGBs-F-DxBc', badge: '해커스', label: '주소록' }] },
  { name: 'Keep', desc: '메모·할 일 노트', href: 'https://keep.google.com/', img: 'keep.png', videos: [{ id: 'WuIyYR1lf0g', badge: '시리얼', label: '' }, { id: 'w--w-xu-qd8', badge: '해커스', label: '' }] },
  { name: 'Jamboard', desc: '디지털 화이트보드 (서비스 종료 — 영상만 제공)', href: null, Icon: JamboardIcon, videos: [{ id: 'iPMEs9hBXec', badge: '시리얼', label: 'Jamboard' }] },
  { name: '클래스룸', desc: '수업·과제 관리', href: 'https://classroom.google.com/', img: 'classroom.png', videos: [{ id: 'Rd2734LhdW4', badge: '시리얼', label: '종합' }] },
  { name: 'Tasks', desc: '할 일 목록', href: 'https://tasks.google.com/', Icon: TasksIcon, videos: [{ id: '7fIlNRQSFgY', badge: '시리얼', label: 'Tasks' }] },
];

const GEMINI_EMBEDS = [
  {
    key: 'gemini-main', id: 'buR2JBfu81g', title: '제미나이 완벽 가이드',
    label: '① 제미나이 완벽 가이드', sub: '디지털거북이(EBS)', cap: '왕초보를 위한 2시간 완벽 가이드', badge: '디지털거북이 · EBS',
    timeline: [
      [25, '00:25', '제미나이 기본 접속 방법'],
      [100, '01:40', '추론·딥 리서치 모델 선택법'],
      [186, '03:06', '프롬프트로 표 작성 및 스프레드시트 연동'],
      [474, '07:54', '외부 파일 업로드 및 문서 분석'],
      [496, '08:16', '딥 리서치 실행 및 사고 과정 확인'],
      [571, '09:31', '캔버스(Canvas) 창으로 문서 편집'],
      [643, '10:43', '프롬프트로 이미지 생성'],
      [6572, '1:49:32', 'Veo 3로 동영상 생성 및 장면 연결'],
    ],
  },
  {
    key: 'gemini-ws', id: 'E8X4pEKxoWI', title: '워크스페이스 제미나이',
    label: '② 워크스페이스에서 제미나이 활용법', sub: '디지털거북이(EBS)', cap: '워크스페이스 연동 실무', badge: '디지털거북이 · EBS',
    timeline: [
      [0, '00:00', '제미나이 웹 및 워크스페이스 앱 접속'],
      [185, '03:05', '표 결과물 스프레드시트로 내보내기'],
      [373, '06:13', '유튜브 영상 링크 입력 및 내용 요약'],
      [434, '07:14', '슬라이드·문서 드라이브 연동 및 요약'],
      [496, '08:16', '딥 리서치 심층 보고서 생성'],
      [571, '09:31', '캔버스로 문서 즉시 편집'],
      [642, '10:42', '이마젠 3 이미지 생성 및 스타일 변형'],
      [753, '12:33', '키워드로 드라이브 내 특정 파일 검색'],
      [795, '13:15', "나만의 맞춤형 챗봇 '젬(Gem)' 만들기"],
      [887, '14:47', "'저장된 정보' 설정으로 프롬프트 자동화"],
    ],
  },
];

const NLM_EMBEDS = [
  {
    key: 'nlm-main', id: 'xzrz_sbPTT4', title: 'NotebookLM 무료 사용법',
    label: 'NotebookLM 무료 사용법', sub: null, cap: 'NotebookLM 무료 사용법', badge: '유튜브',
    timeline: [
      [0, '00:00', 'NotebookLM 접속 및 새 노트북 생성'],
      [140, '02:20', '로컬 파일·구글 드라이브 소스 업로드'],
      [208, '03:28', '탐색 기능으로 웹 문헌 검색 및 추가'],
      [335, '05:35', '다중 소스 기반 마인드맵 시각화'],
      [394, '06:34', '방대한 매뉴얼에서 필요 정보만 추출'],
      [550, '09:10', '유튜브 영상 링크 소스 추가 및 분석'],
      [700, '11:40', '퀴즈·논술형 포함 학습 가이드 생성'],
      [848, '14:08', '자료 기반 AI 음성 팟캐스트 생성'],
      [909, '15:09', '크롬 확장 프로그램으로 실시간 스크랩'],
    ],
  },
];

/* ── 하위 조각 ── */

function AppLogo({ app, className }) {
  const inner = app.img
    ? <img src={L + app.img} alt="" className="w-full h-full object-contain" />
    : <app.Icon className="w-full h-full" />;
  if (!app.href) {
    return <div className={className} title={app.name}>{inner}</div>;
  }
  return (
    <a href={app.href} target="_blank" rel="noopener noreferrer" title={`${app.name} 열기`}
       onClick={(e) => e.stopPropagation()}
       className={`${className} transition-transform hover:scale-110`}>
      {inner}
    </a>
  );
}

function MiniVideo({ video, appName }) {
  return (
    <div>
      <div className="rounded-lg overflow-hidden bg-black aspect-video border border-gray-200">
        <iframe src={YT(video.id)} title={`${appName} ${video.label || video.badge}`} loading="lazy"
                allow="fullscreen; encrypted-media; picture-in-picture" allowFullScreen
                className="w-full h-full block border-0" />
      </div>
      <p className="text-[11.5px] text-gray-500 mt-1.5 flex items-center gap-1.5">
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{video.badge}</span>
        {video.label}
      </p>
    </div>
  );
}

function Timeline({ embed, color, onJump }) {
  return (
    <div className="border-l-2 border-gray-200 my-2 mb-1">
      {embed.timeline.map(([t, time, text]) => (
        <div key={t} className="relative">
          <span className="absolute -left-[6px] top-[15px] w-2.5 h-2.5 rounded-full border-2 border-white" style={{ background: color }} />
          <button type="button" onClick={() => onJump(t)}
                  className="group w-full text-left bg-transparent border-0 cursor-pointer py-2 pl-6 pr-2.5 flex items-baseline gap-2.5 rounded-lg transition-colors hover:bg-gray-50">
            <span className="tabular-nums font-extrabold text-[13px] shrink-0 min-w-[52px]" style={{ color }}>{time}</span>
            <span className="text-sm text-gray-800">{text}</span>
            <Play className="ml-auto w-3.5 h-3.5 shrink-0 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>
      ))}
    </div>
  );
}

function BigEmbed({ embed, color }) {
  // 점프 상태는 임베드 로컬 — 패널이 사라지면 함께 사라져 잔류 autoplay가 없다.
  // seq는 같은 시점을 다시 눌러도 iframe을 리마운트시키기 위한 카운터(원본의 src 재할당과 동일 효과).
  const [jump, setJump] = useState(null); // { t, seq }
  const boxRef = useRef(null);
  const src = jump ? YT(embed.id, `?start=${jump.t}&autoplay=1`) : YT(embed.id);

  const onJump = (t) => {
    setJump((j) => ({ t, seq: (j?.seq ?? 0) + 1 }));
    requestAnimationFrame(() => {
      boxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  return (
    <div>
      <SectionLabel color={color} sub={embed.sub}>{embed.label}</SectionLabel>
      <div ref={boxRef} className="rounded-xl overflow-hidden bg-black aspect-video mb-2 border border-gray-200">
        <iframe key={jump?.seq ?? 0} src={src} title={embed.title} loading="lazy"
                allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowFullScreen
                className="w-full h-full block border-0" />
      </div>
      <p className="text-[13px] text-gray-500 mb-4 flex items-center gap-2">
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{embed.badge}</span>
        {embed.cap}
      </p>
      <Timeline embed={embed} color={color} onJump={onJump} />
    </div>
  );
}

function RefCard({ href, dot, dotColor, title, desc }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
       className="flex items-center gap-3 px-3.5 py-3 border border-gray-200 rounded-[10px] bg-white transition-all hover:-translate-y-0.5 hover:shadow-md">
      <span className="w-[34px] h-[34px] rounded-lg shrink-0 flex items-center justify-center font-extrabold text-[13px] text-white" style={{ background: dotColor }}>{dot}</span>
      <div className="min-w-0">
        <h5 className="text-sm font-bold text-navy">{title}</h5>
        <small className="text-xs text-gray-500">{desc}</small>
      </div>
      <ArrowUpRight className="ml-auto w-4 h-4 text-gray-300 shrink-0" />
    </a>
  );
}

function SectionLabel({ color, children, sub }) {
  return (
    <p className="flex items-center gap-2 text-xs font-extrabold tracking-wider uppercase mt-5 mb-3" style={{ color }}>
      {children}
      {sub && <small className="font-semibold normal-case tracking-normal text-gray-500 text-xs">· {sub}</small>}
    </p>
  );
}

/* ── 카테고리 본문 ── */

function WsPanel({ cat }) {
  return (
    <div className="px-5 sm:px-6 pb-6">
      <p className="text-sm text-gray-500 leading-relaxed pb-4 border-b border-gray-200 mb-4">{cat.intro}</p>

      <a href="https://support.google.com/a/users/" target="_blank" rel="noopener noreferrer"
         className="block rounded-[14px] px-5 py-4 mb-1.5 bg-gradient-to-br from-[#eaf1ff] to-[#f4f8ff] border border-[#d6e2fb] transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-g-blue/15">
        <div className="flex items-center gap-3">
          <GoogleGIcon className="w-10 h-10 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-base font-extrabold text-navy flex items-center gap-2">
              Google Workspace 학습센터
              <ArrowUpRight className="ml-auto w-[18px] h-[18px] text-[#8aa6e0]" />
            </div>
            <div className="text-[13px] text-gray-500 mt-0.5">구글 공식 학습 허브 — 앱 사용법을 체계적으로 찾아볼 수 있어요.</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3.5">
          {['시작하기', '제품별 학습', '역할·업종별 학습', '생산성 팁'].map((t) => (
            <span key={t} className="text-xs font-semibold bg-white border border-[#d6e2fb] text-[#2b57b5] px-2.5 py-1 rounded-full">{t}</span>
          ))}
        </div>
      </a>

      <SectionLabel color={cat.color} sub="아이콘을 누르면 앱이 새 탭에서 열립니다">앱별 사용법</SectionLabel>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {WS_APPS.map((app) => (
          <div key={app.name} className={`border border-gray-200 rounded-[10px] overflow-hidden bg-white ${app.wide ? 'sm:col-span-2' : ''}`}>
            <div className="flex items-center gap-3 px-3.5 py-3">
              <AppLogo app={app} className="w-[38px] h-[38px] rounded-[9px] shrink-0 flex items-center justify-center bg-[#f6f8fd] border border-gray-200 p-1.5" />
              <div className="flex-1 min-w-0">
                <h5 className="text-[14.5px] font-bold text-navy">{app.name}</h5>
                <small className="text-xs text-gray-500 block mt-0.5 leading-snug">{app.desc}</small>
              </div>
            </div>
            <div className={`grid gap-2.5 px-3.5 pb-3.5 ${app.videos.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
              {app.videos.map((v) => <MiniVideo key={v.id} video={v} appName={app.name} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmbedPanel({ cat }) {
  return (
    <div className="px-5 sm:px-6 pb-6">
      <p className="text-sm text-gray-500 leading-relaxed pb-4 border-b border-gray-200 mb-1">
        {cat.intro} <b className="text-gray-700">타임라인 항목을 클릭하면 영상의 해당 지점부터 재생</b>됩니다.
      </p>
      {cat.embeds.map((embed) => <BigEmbed key={embed.key} embed={embed} color={cat.color} />)}
      <SectionLabel color={cat.color} sub={cat.refSub}>함께 보면 좋은 자료</SectionLabel>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {cat.refs.map((r) => <RefCard key={r.href} {...r} />)}
      </div>
    </div>
  );
}

/* ── 카테고리 설정 (아이콘·패널·색·검색 키워드의 단일 출처) ── */

const CATS = [
  {
    key: 'ws', title: 'Google Workspace', href: 'https://workspace.google.com/intl/ko/',
    color: 'var(--color-g-blue)', Icon: WsIcon, Panel: WsPanel,
    intro: '문서 저장부터 협업까지, 업무에 바로 쓰는 Google 도구들의 기초입니다. 각 앱 아이콘을 누르면 해당 앱으로 바로 이동하고, 아래 영상으로 사용법을 익힐 수 있어요.',
    // 앱 이름은 WS_APPS에서 자동 파생 — 별칭만 여기 유지
    keywords: WS_APPS.map((a) => a.name).join(' ') + ' workspace 워크스페이스 크롬 chrome 드라이브 drive docs 시트 sheets 슬라이드 slides gmail 지메일 캘린더 calendar meet 미트 챗 chat forms contacts 잼보드 jamboard tasks keep 킵 클래스룸 classroom 학습센터',
  },
  {
    key: 'gemini', title: 'Gemini', href: 'https://gemini.google.com/',
    color: 'var(--color-g-red)', img: 'gemini.png', Panel: EmbedPanel,
    intro: '질문·요약·이미지 생성부터 워크스페이스 연동까지. 왕초보 가이드로 전체 흐름을 잡고, 워크스페이스 연동 영상으로 실무에 적용해보세요.',
    keywords: 'gemini 제미나이 프롬프트 딥리서치 deep research 캔버스 canvas 이미지 imagen 젬 gem veo 영상 요약 워크스페이스 연동',
    embeds: GEMINI_EMBEDS,
    refSub: '구글 공식(한글)',
    refs: [
      { href: 'https://gemini.google/overview/?hl=ko', dot: 'G', dotColor: 'var(--color-g-red)', title: 'Gemini 공식 안내', desc: '주요 기능 한눈에 보기' },
      { href: 'https://support.google.com/gemini?hl=ko', dot: '?', dotColor: 'var(--color-g-blue)', title: 'Gemini 고객센터', desc: '공식 사용 가이드·도움말' },
    ],
  },
  {
    key: 'nlm', title: 'NotebookLM', href: 'https://notebooklm.google/',
    color: 'var(--color-g-green)', img: 'notebooklm.png', Panel: EmbedPanel,
    intro: '내가 올린 자료 안에서만 답하는 AI입니다. 논문·문서·강의 요약, 팟캐스트·마인드맵 생성까지 아래 영상으로 익혀보세요.',
    keywords: 'notebooklm 노트북 소스 업로드 마인드맵 팟캐스트 오디오 학습가이드 퀴즈 요약 유튜브',
    embeds: NLM_EMBEDS,
    refSub: '구글 공식',
    refs: [
      { href: 'https://notebooklm.google/', dot: 'N', dotColor: 'var(--color-g-green)', title: 'NotebookLM 공식', desc: '바로 시작하기' },
    ],
  },
];

const STRIPE = 'linear-gradient(90deg, var(--color-g-blue) 0 25%, var(--color-g-red) 25% 50%, var(--color-g-yellow) 50% 75%, var(--color-g-green) 75% 100%)';

const catMatches = (cat, q) => q === '' || (cat.keywords + ' ' + cat.title).toLowerCase().includes(q);

/* ── 모달 ── */

function GuideModal({ onClose }) {
  const [query, setQuery] = useState('');
  // openCats[key]: true=펼침, false=접힘, 미존재=아직 한 번도 안 펼침(패널 미마운트).
  // 한 번 마운트된 패널은 hidden으로만 접어 재생 중 영상과 로드된 iframe을 유지한다(원본 display:none 동작과 동일).
  const [openCats, setOpenCats] = useState({});

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !e.isComposing) onClose(); // 한글 IME 조합 취소 ESC는 무시
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const q = query.trim().toLowerCase();

  // 원본 doSearch와 동일: 검색어가 있으면 매칭 카테고리를 펼친 상태로 만들고(지속),
  // 검색 중에도 헤더 클릭으로 접을 수 있으며, 검색어를 지워도 펼침 상태가 유지된다.
  const onQueryChange = (value) => {
    setQuery(value);
    const nq = value.trim().toLowerCase();
    if (nq === '') return;
    setOpenCats((s) => {
      const next = { ...s };
      CATS.forEach((cat) => { if (catMatches(cat, nq)) next[cat.key] = true; });
      return next;
    });
  };

  const toggle = (key) => setOpenCats((s) => ({ ...s, [key]: !s[key] }));
  const anyMatch = CATS.some((cat) => catMatches(cat, q));

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#081024]/60 backdrop-blur-sm flex items-start justify-center px-4 sm:px-5 py-8 sm:py-10"
         onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label="AI 활용법"
           className="bg-[#eef1f8] w-full max-w-[960px] rounded-[22px] overflow-hidden shadow-2xl shadow-navy/40 anim-fade-up">

        {/* 헤더 */}
        <div className="relative bg-gradient-to-br from-navy-light to-navy text-white px-5 sm:px-8 pt-8 pb-7">
          <span className="absolute top-0 left-0 right-0 h-1" style={{ background: STRIPE }} />
          <p className="text-[11px] tracking-[0.2em] uppercase text-[#8fb3ff] font-bold">AI Tool Guide</p>
          <h3 className="text-xl sm:text-2xl font-extrabold mt-2 tracking-tight">Google for Education AI 활용법</h3>
          <p className="text-white/60 mt-2 text-sm">각 도구의 기초 사용법을 단계별로 익혀보세요.</p>
          <button type="button" onClick={onClose} aria-label="닫기"
                  className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/10 border border-white/15 text-white flex items-center justify-center transition-colors hover:bg-white/25">
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* 검색 */}
        <div className="px-5 sm:px-8 pt-5">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
            <input
              type="text" value={query} onChange={(e) => onQueryChange(e.target.value)}
              placeholder="도구나 앱 이름으로 검색 (예: 시트, 캘린더, 요약)"
              className="w-full py-3.5 pl-11 pr-4 border border-gray-200 rounded-xl text-[15px] bg-white text-gray-900 outline-none transition-shadow focus:border-g-blue focus:ring-[3px] focus:ring-g-blue/15"
            />
          </div>
        </div>

        {/* 본문 */}
        <div className="px-5 sm:px-8 pt-5 pb-8 max-h-[62vh] overflow-y-auto custom-scrollbar">
          {CATS.map((cat) => {
            const open = !!openCats[cat.key];
            const mounted = openCats[cat.key] !== undefined;
            return (
              <div key={cat.key} hidden={!catMatches(cat, q)}
                   className="bg-white rounded-2xl mb-3.5 shadow-sm overflow-hidden border-l-[5px]" style={{ borderLeftColor: cat.color }}>
                <div className="flex items-center gap-3.5 px-5 py-4 cursor-pointer select-none" onClick={() => toggle(cat.key)}>
                  <a href={cat.href} target="_blank" rel="noopener noreferrer" title={`${cat.title} 바로가기`}
                     onClick={(e) => e.stopPropagation()}
                     className="w-[42px] h-[42px] rounded-[10px] bg-[#f6f8fd] border border-gray-200 flex items-center justify-center shrink-0 p-1.5 transition-all hover:scale-110 hover:shadow-md">
                    {cat.img
                      ? <img src={L + cat.img} alt="" className="w-full h-full object-contain" />
                      : <cat.Icon className="w-full h-full" />}
                  </a>
                  <h4 className="flex-1 text-lg font-extrabold text-navy tracking-tight">{cat.title}</h4>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
                </div>
                {mounted && <div hidden={!open}><cat.Panel cat={cat} /></div>}
              </div>
            );
          })}
          {!anyMatch && (
            <p className="text-center py-10 text-gray-500 text-[15px]">검색 결과가 없습니다. 다른 키워드로 찾아보세요.</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── 진입 섹션 (교육 프로그램 아래 삽입) ── */

export default function AiGuideSection() {
  const [open, setOpen] = useState(false);

  return (
    <section id="ai-guide" className="py-16 lg:py-20 bg-white border-b border-gray-200/60">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-white border border-gray-200 px-6 py-10 sm:px-12 sm:py-14 shadow-sm">
          <span className="absolute top-0 left-0 right-0 h-[5px]" style={{ background: STRIPE }} />
          <p className="text-sm font-bold text-g-blue tracking-widest uppercase mb-3">AI Tool Guide</p>
          <h2 className="text-2xl sm:text-3xl leading-snug font-bold text-navy tracking-tight">
            Google for Education <span className="text-g-blue">AI 활용법</span>
          </h2>
          <p className="mt-3 text-gray-500 text-base max-w-[560px] leading-relaxed">각 도구의 기초 사용법을 단계별로 익혀보세요.</p>
          <div className="flex flex-wrap gap-2.5 mt-6">
            {CATS.map((cat) => (
              <span key={cat.key} className="inline-flex items-center gap-2 bg-navy-50 px-3.5 py-2 rounded-full text-[13px] font-medium text-navy">
                <span className="w-2 h-2 rounded-full" style={{ background: cat.color }} />
                {cat.title}
              </span>
            ))}
          </div>
          <button type="button" onClick={() => setOpen(true)}
                  className="mt-8 inline-flex items-center gap-2.5 bg-navy text-white text-base font-bold px-7 py-4 rounded-xl transition-all hover:bg-navy-light hover:-translate-y-0.5 hover:shadow-lg hover:shadow-navy/20">
            <Play className="w-[18px] h-[18px]" />
            사용법 배우기
          </button>
        </div>
      </div>

      {open && <GuideModal onClose={() => setOpen(false)} />}
    </section>
  );
}
