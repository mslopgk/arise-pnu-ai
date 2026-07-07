# 0007. 퍼스트파티 익명 방문 분석 (Supabase·외부 SaaS 미채택)

날짜: 2026-07-07 · 상태: Accepted

## 맥락

접수기간(2026.7.9~7.16)을 앞두고 그로스해킹/퍼널 분석 요구가 들어왔다 — 페이지별 뷰어수, 스크롤 깊이, 페이지별 이탈률. 구현 수단으로 "VPS에 Supabase 추가" 제안이 있었다(회사 자체 VPS에 Supabase 로컬 설치본 존재).

## 결정

기존 Express + PostgreSQL 스택에 **퍼스트파티**로 구현한다: `analytics_events` 단일 테이블 + 공개 수집 엔드포인트 `POST /api/track` + 관리자 집계 `GET /api/admin/analytics/*` + admin 대시보드 "방문 분석" 탭 + 무의존 트래커 `frontend/public/track.js`. 외부 인프라(회사 VPS Supabase 포함)로 방문 데이터를 보내지 않는다.

## 근거

1. Supabase에는 분석 기능이 없다 — 채택해도 트래커·수집·집계·대시보드는 전부 직접 구현해야 하며, 그 네 가지는 기존 스택으로 동일하게 만들 수 있다. 역할이 100% 중복된다.
2. PNU 방문자 데이터를 회사 인프라로 전송하면 ADR 0001(구글 시트)과 같은 데이터 거버넌스 논점이 재발한다.
3. 학내망(10.x) HTTP 접속 경로(커밋 3a4947e)에서도 same-origin `/api/track`만 확실히 동작한다. 외부 도메인 비콘은 차단될 수 있다.
4. GA·Plausible 등 외부 SaaS도 같은 이유(+개인정보 정책 확인 부담)로 제외.

## 개인정보 (ADR 0005 정합)

- 방문자 식별은 **localStorage 랜덤 UUID**(`pnug_vid`)와 sessionStorage 세션 UUID(`pnug_sid`)만. 서버에서 개인 역추적 불가.
- **IP는 저장하지 않는다** — rate-limit(토큰버킷) 판정에 메모리상 순간 사용만.
- **이메일/OAuth 식별자와 연결하지 않는다.** 수집 이벤트에 계정 정보 없음.
- 자격진단·장학 계산기의 **입력값·판정결과는 수집하지 않는다**(문서화된 "클라이언트 계산만, 미저장" 약속 유지). 실행 횟수(`calc_run`)만 카운트.
- 체류시간은 탭이 보이는 동안만 누적(Page Visibility API).
- 분석 데이터는 PostgreSQL에만 저장 — **Google Sheets 미러 대상이 아니다**.

## 결과

- 페이지 키는 정규 이름(`gateway`·`admission`·`eligibility`·`scholarship` 등)으로 저장 — React 전면 마이그레이션(2026-06-22 계획) 후 URL이 바뀌어도 데이터가 이어진다. 마이그레이션 각 단계에서 track.js 태그와 인라인 훅(`window.pnugTrack`)을 함께 이식해야 한다.
- 공개 수집 엔드포인트는 per-IP 토큰버킷(60/분) + 이벤트/페이지/뷰 화이트리스트 + UUID 형식 검증으로 보호하고 항상 204를 반환한다(재시도 폭주 방지). 봇 UA와 `navigator.webdriver`는 이중 필터.
- 신청 퍼널의 최종 단계는 `responses` 테이블 실측치와 병기해 교차 검증한다.
- OAuth 왕복은 같은 탭에서 세션이 유지되므로 이탈로 오집계되지 않으며, 구글 화면에서 멈춘 세션은 `oauth_redirect`가 마지막 이벤트로 남아 구분된다.
