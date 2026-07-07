# 퍼널 분석(방문 분석) 설계 — 2026-07-07

상태: 설계 확정(사용자 사전 위임 — "완성본 검토 후 피드백" 방식). 구현계획: `docs/superpowers/plans/2026-07-07-funnel-analytics.md`

## 1. 배경·목표

조성호T 요청: 기존 부산대 페이지에 **그로스해킹 + 퍼널분석** — ① 각 페이지 뷰어수 ② 스크롤 깊이 ③ 페이지별 이탈률. 접수 기간이 **2026-07-09 ~ 07-16**이므로 그 전(오늘) 배포가 목표. 성공 기준: 접수 기간 동안 관리자가 `/admin`에서 페이지별 방문·스크롤·이탈률과 신청 퍼널 전환율을 볼 수 있다.

## 2. 접근 결정: 자체구현 (Supabase 미채택)

조성호T는 "VPS에 Supabase 추가"를 제안했으나 **기존 스택(Express + PostgreSQL) 확장**으로 구현한다.

- Supabase는 분석 기능이 없다 — 붙여도 트래커·수집 API·대시보드는 전부 직접 만들어야 하며, 그 세 가지는 기존 스택으로 그대로 만들 수 있다.
- 회사 VPS의 기존 Supabase로 이벤트를 보내는 안은 ① PNU 방문자 데이터가 외부(회사) 인프라로 나가는 거버넌스 문제(ADR 0001의 구글 시트 논점 재발) ② 내부망(10.x) HTTP 접속 사용자의 외부 비콘 차단 가능성 ③ 오늘-완성 일정 때문에 제외.
- 같은 오리진 `/api/track` 수집은 HTTPS 도메인·내부 IP HTTP(커밋 3a4947e) 양쪽 접속 경로에서 모두 동작하는 유일한 방식이다.

## 3. 개인정보 원칙 (ADR 0005 정합)

1. **이메일·OAuth 식별자와 절대 연결하지 않는다.** 수집 이벤트에 사용자 계정 정보 없음.
2. **자격진단·장학 계산기의 입력값·판정결과를 수집하지 않는다** ("클라이언트 계산만, 미저장" 문서화된 약속 유지). 계산 실행 여부(`calc_run`)만 카운트.
3. **IP를 저장하지 않는다.** rate-limit 판정에 메모리상 순간 사용만.
4. 방문자 식별 = **익명 브라우저 ID**: `localStorage`의 랜덤 UUID(`pnug_vid`). 역추적 불가. 세션 = `sessionStorage`의 랜덤 UUID(`pnug_sid`).
5. 분석 데이터는 PostgreSQL에만 저장 — **시트 미러 대상 아님**.
6. 이 결정은 ADR 0007로 문서화한다.

## 4. 페이지 키 정규화 (마이그레이션 호환)

React 전면 마이그레이션(스펙 2026-06-22, 미착수)이 완료되면 URL이 바뀐다(`/admission-v3-dark.html`→`/admission` 등). 이벤트의 `page` 키를 처음부터 **정규 이름**으로 저장해 마이그레이션 전후 데이터가 이어지게 한다.

| 정규 키 | 현재 URL | 마이그레이션 후 |
|---|---|---|
| `gateway` | `/` (React Gateway) | 동일 |
| `admission` | `/admission-v3-dark.html` | `/admission` |
| `eligibility` | `/eligibility.html` | `/eligibility` |
| `scholarship` | `/scholarship.html` | `/scholarship` |
| `bymonolog` · `bymonolog-hub` · `bymonolog-grad` · `bymonolog-aura` · `google` · `dept-edit-request` | React 라우트 | 동일 |
| `other` | 그 외 전부(404 폴백 포함) | 동일 |

`admission`은 한 URL 안에서 해시 기반 가상 뷰로 동작하므로 `view` 필드(`intro`·`why-grad`·`eligibility`·`benefits`·`departments`)를 함께 기록한다. admin(`/admin*`)·`/s30/*`는 추적하지 않는다.

## 5. 이벤트 모델

단일 수집 엔드포인트 `POST /api/track`, 배치(JSON 배열) 전송.

| event | 필드 | 발생 시점 |
|---|---|---|
| `pageview` | page, view, referrer(외부 유입만), entry(세션 최초 여부) | 페이지 로드 · SPA 라우트 변경 · admission 뷰 전환 |
| `page_leave` | page, view, dwell_ms, scroll_pct(최대 도달 %) | `pagehide`/`visibilitychange:hidden` 시 sendBeacon |
| `calc_run` | page | 자격진단·장학 계산기 "결과 보기" 실행(값 미포함) |
| `apply_click` | page, view | `data-apply` CTA 클릭 |
| `apply_modal_open` | — | 신청 모달 실제 오픈(로그인 상태) |
| `oauth_redirect` | — | 401 → 구글 OAuth로 리다이렉트 직전 |
| `apply_submit` | meta.status: success·dup·error | POST /api/surveys/1/responses 결과 |
| `dept_detail` | meta.dept | 학과 상세 모달 오픈(학과명은 공개 정보) |

퍼널 정의(세션 기준): `gateway 방문 → admission 진입 → 내부 뷰 도달 → (계산기 사용) → apply_click → apply_modal_open → apply_submit(success)`. 최종 전환의 진실값은 기존 `responses` 테이블 건수로 교차 검증.

## 6. 클라이언트 트래커 — `frontend/public/track.js`

의존성 없는 단일 파일(빌드 불요, ~150줄). 전체를 try/catch로 감싸 **어떤 오류도 페이지를 깨지 않는다**.

- **포함 방식**: 정적 HTML 3개(admission·eligibility·scholarship)와 `frontend/index.html`(React)에 `<script src="/track.js" defer>` 추가. React 측은 `App.jsx`에 `useLocation` 기반 `RouteTracker` 컴포넌트로 SPA 라우트 변경 pageview 발생(초기 로드 중복은 트래커가 dedupe).
- **전송**: 이벤트 큐 → `navigator.sendBeacon('/api/track', Blob(JSON, 'application/json'))`, 미지원 시 `fetch(keepalive:true)`. 플러시: 10초 주기 · 큐 25개 · `visibilitychange:hidden` · `pagehide`.
- **스크롤 깊이**: window 스크롤 + 캡처 단계 scroll 리스너로 내부 스크롤 컨테이너(admission의 `.view-scroll` 등)까지 최대 도달 % 추적. `(page, view)` 단위 최대값을 `page_leave`에 실어 보낸다.
- **커스텀 이벤트 API**: `window.pnugTrack(event, fields)` 전역 노출. admission 인라인 스크립트의 `showView()`·`showIntro()`·`openApply()`·제출 핸들러·학과 모달, 계산기 페이지의 결과 버튼 핸들러에 **한 줄 훅**을 추가한다(해시 감시만으로는 `showIntro()`의 `replaceState` 경로를 놓치므로 명시 훅이 정확).
- **봇 제외**: `navigator.webdriver` 체크(클라이언트) + UA 봇 패턴(서버) 이중 필터.

## 7. 수집 백엔드 — `backend/src/analytics.js`

`server.js`에 기존 라우터들과 같은 패턴으로 마운트(SPA 폴백 `app.get('*')`이 `/api`를 제외하므로 nginx 변경 불요).

- **`POST /api/track`** (공개, 무인증): 본문 `{v:1, vid, sid, events:[...]}`. 검증 — 이벤트명 화이트리스트, page 화이트리스트, view 화이트리스트, scroll_pct 0~100 정수, dwell_ms 상한(12h), 배치 ≤25개, vid/sid UUID 형식. 불합격 이벤트는 조용히 폐기. 항상 `204` 응답(재시도 폭주 방지).
- **Rate limit**: 메모리 토큰버킷 per-IP 60req/분(주기적 청소). 초과 시에도 204(드롭만). IP는 미저장.
- **타임스탬프**: 서버 수신 시각(`now()`) 사용 — 클라이언트 시계 불신.
- **스키마** (`db.js initSchema()`에 idempotent DDL 추가, 기존 패턴 그대로):

```sql
CREATE TABLE IF NOT EXISTS analytics_events (
  id bigserial PRIMARY KEY,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  visitor_id text NOT NULL,
  session_id text NOT NULL,
  event text NOT NULL,
  page text NOT NULL,
  view text,
  referrer text,
  scroll_pct int,
  dwell_ms int,
  device text,            -- UA 기반 mobile|desktop 2분류
  meta jsonb
);
CREATE INDEX IF NOT EXISTS idx_ae_occurred ON analytics_events (occurred_at);
CREATE INDEX IF NOT EXISTS idx_ae_page ON analytics_events (page, event, occurred_at);
CREATE INDEX IF NOT EXISTS idx_ae_session ON analytics_events (session_id, occurred_at);
```

주의사항(기존 코드 제약): `?`→`$n` 심 때문에 SQL 문자열에 리터럴 `?` 금지, `COUNT()`류는 `::int` 캐스트, 시간 필터는 SQL에서(`now() - interval`).

## 8. 집계 API + 관리자 대시보드

**API** (requireAdmin, `/api/admin/analytics/*`):
- `GET /api/admin/analytics/overview?from&to` — 총 방문자·세션·페이지뷰, 페이지별 {뷰수, 순방문자, 순세션, 평균 체류, 평균/분포 최대 스크롤, 이탈률}, 일별 시계열.
- `GET /api/admin/analytics/funnel?from&to` — 퍼널 단계별 세션수·전환율, admission 내부 뷰별 도달률, `responses` 실건수 병기.

**지표 정의**:
- **이탈률(exit rate)** = 그 페이지가 세션의 **마지막 이벤트 페이지**인 세션수 ÷ 그 페이지를 방문한 세션수. OAuth 왕복은 같은 탭에서 sessionStorage가 유지되어 세션이 이어지므로 오탐 없음; 구글 동의 화면에서 이탈한 세션은 마지막 이벤트가 `oauth_redirect`로 남아 퍼널에서 "OAuth 이탈"로 별도 표시.
- **스크롤 깊이** = `page_leave.scroll_pct`의 페이지별 평균 + 25/50/75/90/100% 도달 분포.

**대시보드 UI**: `AdminDashboard.jsx`에 "방문 분석" 섹션(탭) 추가. 기간 필터(오늘/7일/접수기간 7.9~7.16/전체), 요약 카드, 페이지별 표, 퍼널 바(CSS 막대 — 차트 라이브러리 불사용), admission 뷰별 도달률. 기존 대시보드 톤 답습. **구현 전 frontend-design 스킬 필수 호출**(사용자 규칙).

## 9. 테스트·배포

- **테스트**: `node:test`(기존 관례) — 검증 로직·rate limit·집계 SQL. 로컬 E2E: 로컬 Postgres(pnug)로 3001/5173 기동, 게이트웨이→어드미션→뷰 전환→계산기→신청 모달까지 클릭 후 DB 이벤트·대시보드 수치 확인.
- **배포**: 이미지 재빌드 → `docker save`→scp(:11097)→`docker load`→was만 무중단 재기동. 테이블은 부팅 시 initSchema가 생성. nginx 변경 없음. **사용자 완성본 검토·명시 승인 후에만 배포**(기존 규칙). 배포 후 `/api/track` 204 및 이벤트 적재 스모크 확인.
- **마이그레이션 관계**: 분석을 먼저 배포하고, 이후 React 마이그레이션의 패리티 기준선은 트래커 포함 상태에서 새로 캡처(마이그레이션 각 단계에서 track.js 태그와 훅을 함께 이식).

## 10. 비스코프

- 계산기 입력값·판정결과 수집(금지), IP 저장, 이메일/OAuth 연계, `/s30/*`·`/admin*` 추적, Google Sheets 미러링, 외부(회사 VPS Supabase) 전송, 히트맵·세션리플레이, 실시간 대시보드(새로고침 조회로 충분), DB 자동백업(별도 과제 — README 미완 항목).
