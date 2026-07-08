# CONTEXT-MAP

이 리포는 **단일 배포** 안에 3개의 바운디드 컨텍스트를 담는다. 통합 결정: [`docs/adr/0006`](./docs/adr/0006-monorepo-merge-s30-arise-ai.md).

```
브라우저 ─▶ 단일 Caddy ─▶ 단일 Express
   /              → React 게이트웨이 (Gateway.jsx). 레거시 /arise.html 은 nginx에서 / 로 301.
   /s30/*         → (미배포 — s30 마케팅 사이트는 현재 빌드/배포되지 않음)
   /admission-*·/eligibility·/admin·/api·/auth → arise
```

## 1) arise 게이트웨이 (상위 랜딩)
- **위치**: `frontend/public/arise.html` (+ `/logos`, `/media`)
- **역할**: arise-ai 최상위 진입. 좌측 PNU 영상 + 우측 3카드 — ① s30 `about/#aura`(A.U.R.A 마스터플랜) · ② s30 `partners/#google`(Google 협력) · ③ arise 신청(`/admission.html`).
- **URL**: `/` (prod: Express가 React SPA `dist/index.html` 서빙 → `Gateway.jsx`. 레거시 정적 `arise.html`은 nginx에서 `/`로 301 리다이렉트 / dev: Vite `root-to-arise` 미들웨어). ⚠ s30은 미배포라 게이트웨이 카드의 `/s30/*` 링크는 React 게이트웨이 기준으로 갱신됨.
- 별도 CONTEXT.md 없음(단일 페이지).

## 2) s30 — arise-ai 마케팅 사이트
- **위치**: `s30/` (Vite 정적 멀티페이지, `base:'/s30/'`, React 아님·백엔드 없음)
- **내용**: 랜딩 · `about`(A.U.R.A 2.0 마스터플랜) · `partners`(Google for Education) · `programs` · `roadmap` · `news` · `achievements`
- **URL**: `/s30/*`
- **서빙**: `s30/dist` → prod Express `/s30` 정적 / dev Vite `serve-s30` 미들웨어(영상 range 지원)
- **빌드**: `cd s30 && npm run build`
- 별도 CONTEXT.md 없음(현재).

## 3) arise — 학·석사 연계과정 사전신청 시스템
- **위치**: `frontend/`(Vite+React admin + public 정적: `admission-v1/v2/v3`, `eligibility`) + `backend/`(Express + SQLite + Google Sheets 미러)
- **URL**: `/admission-*.html` · `/eligibility.html` · `/admin` · `/login` · `/api/*` · `/auth/*`
- **글로서리**: [`CONTEXT.md`](./CONTEXT.md) · **결정**: `docs/adr/0001~0005`

## 4) google — PNU × Google AI Ecosystem 페이지
- **위치**: `frontend/src/variants/google/page.jsx` (+ `google.css`, `AiGuideSection.jsx`, `/google/logos` 정적 자산)
- **역할**: 게이트웨이 2번 카드에서 진입하는 Google for Education 파트너십 소개 — 비전·파트너십·AI 서비스·교육·연구·참여·글로벌 섹션 + **AI 활용법 가이드**(교육 섹션 아래 진입 카드 → 학습 모달: Workspace/Gemini/NotebookLM 유튜브 강의 + 타임라인. 원본은 외부 제작 단일 HTML을 React 포팅, Jamboard는 서비스 종료로 영상만 유지·앱 링크 제거).
- **URL**: `/google` (방문 분석 페이지 키 `google`)
- 별도 CONTEXT.md 없음(콘텐츠 페이지). `frontend/src/variants/bymonolog/`(`/bymonolog*`)도 같은 성격의 변형 콘텐츠 페이지군.

## 시스템 전역
- **ADR**: `docs/adr/` (0001~0006). 0006 = 본 통합.
- **배포**: 프로덕션은 단일 Express(`was`) + nginx(TLS 종단), arise 앱은 `arise-ai.pusan.ac.kr` 1 도메인. 같은 nginx가 부속 기관 사이트(airc/aiedu/aigs + ax* 별칭)도 서브도메인으로 호스팅하나, 이들은 이 모노레포 밖의 별도 정적 사이트다(상세 → [`deploy/DEPLOYMENT.md`](./deploy/DEPLOYMENT.md)).
- **빌드(통합)**: `s30` 빌드 + `frontend` 빌드 → Express(prod)가 `/` + `/s30/` 전부 서빙.
