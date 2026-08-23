# pnu-grad 배포 인수인계 (arise-ai.pusan.ac.kr)

최초 배포 2026-06-04 · **최종 현행화 2026-06-18** · 대상: `ubuntu@164.125.19.178:11097` (내부 10.125.19.178) · Ubuntu 24.04 폐쇄망

## 접근 제약 (중요)
- **SSH(11097)는 화이트리스트된 IP에서만 접속 가능** — 일반 PC/외부망에선 timeout (2026-06-12 확인).
- 화이트리스트 아닌 PC에서 작업해야 할 땐 자급자족 번들을 만들어 화이트리스트 PC에서 실행 — 패턴 예시: `deploy/rollout-2026-06-12/` (bat 더블클릭 → scp → 백업 → 적용 → 검증 → 실패 시 자동 롤백).
- 80/443은 부산대가 외부 포워딩 → 사이트 자체는 전세계 도달 가능. 서버는 폐쇄망(인터넷 불가)이라 이미지는 `docker load`로 반입.

## 현재 상태 (LIVE, 2026-06-12 확인)
- **Docker 29.5.3** 오프라인 설치(static binaries + systemd, 부팅 자동시작)
- **스택**: 서버 `~/arise-stack/docker-compose.yml`이 원본 (레포의 docker-compose.https.yml은 8491bc3에서 삭제됨)
  = `nginx`(80/443 TLS 종단) + `was`(Express) + `postgres:16`. 컨테이너명 `arise-{nginx,was,postgres}-1`.
  - 이 nginx 하나가 arise-ai **외에 부속 기관 서브도메인 사이트(airc/aiedu/aigs + ax* 별칭)도 호스팅**한다 → 아래 「부속 사이트」 절.
- **was 이미지는 self-contained** (frontend dist 내장, bind-mount 없음; `sheets-sa.json`만 마운트) — 2026-06-08 전환.
- **인증서: 부산대 공식 와일드카드** `*.pusan.ac.kr` (GlobalSign RSA OV, SAN: `*.pusan.ac.kr`/`*.pnu.edu`/`pusan.ac.kr`), **만료 2027-01-02**.
  - 위치: `~/arise-stack/certs/{fullchain.pem, privkey.pem}` (nginx 컨테이너에 `/etc/nginx/certs`로 마운트)
  - **갱신**: 전산팀에서 새 와일드카드 수령 → 위 두 파일 교체 → `docker exec arise-nginx-1 nginx -s reload`
  - ~~Let's Encrypt + acme.sh (HTTP-01 stateless)~~ → **폐기됨** (2026-06-08 와일드카드로 교체. acme 스크립트·:80 챌린지 location 불필요)
  - 참고: `pusan.ac.kr`은 브라우저 **HSTS preload** 도메인 — 도메인 접속은 항상 HTTPS로 강제되며, 유효 인증서가 필수(만료 시 우회 불가 전면 차단).
- **Google OAuth: 설정 완료** — `/auth/google`이 Google로 302 (2026-06-12 확인). redirect URI `https://arise-ai.pusan.ac.kr/auth/google/callback`.
- **HTTP(80) → HTTPS 301 강제 적용됨** (2026-06-12, 검증 완료: http→301 / https→200).
- DB: PostgreSQL 마이그레이션·시드 완료. 볼륨 `arise_pgdata`.

## 부속 사이트 (서브도메인) — airc / aiedu / aigs (2026-06-18 추가)
같은 nginx·같은 와일드카드 인증서로 부속 AI 기관 사이트 3종을 서브도메인으로 호스팅한다. 각 사이트는 `ai*` / `ax*` **두 도메인이 같은 사이트(별칭)**.

| 사이트 | 도메인(별칭) | nginx conf (canonical) | 정적 루트 (서버) |
|---|---|---|---|
| 장영실 AI융합연구원 | `airc` · `axrc` | `deploy/nginx/conf.d/site-airc.conf` | `~/arise-stack/sites/airc/` |
| AI융합교육원 | `aiedu` · `axedu` | `deploy/nginx/conf.d/site-aiedu.conf` | `~/arise-stack/sites/aiedu/` |
| AI대학원 | `aigs` · `axgs` | `deploy/nginx/conf.d/site-aigs.conf` | `~/arise-stack/sites/aigs/` |

- **구조**: 각 `site-*.conf` = 80→443 301 + 443 정적 서버 블록(`root /etc/nginx/sites/<name>`, SPA `try_files`). compose가 `./sites` → `/etc/nginx/sites:ro` 로 마운트(`docker-compose.yml`).
- **현재 내용**: "준비 중" 정적 플레이스홀더 (`deploy/sites/<name>/index.html`).
- **실제 사이트 배포**: 빌드물(`dist/*`)을 서버 `~/arise-stack/sites/<name>/` 에 떨구면 즉시 서빙(정적/SPA, 재기동 불필요). 백엔드(Express 등)가 필요한 사이트면 해당 443 블록을 `proxy_pass` 로 교체.
- **인증서**: arise-ai와 동일한 `*.pusan.ac.kr` 와일드카드 **재사용**(별도 발급 불필요). 갱신도 한 번에 전 도메인 반영.
- **배포 방식**: nginx 설정만 바뀌므로 **이미지 재빌드 불필요** — `deploy/rollout-2026-06-12/` 같은 scp+백업+`nginx -t`+reload+자동롤백 패턴 사용. 레포 canonical(`site-*.conf`)과 서버 적용본을 항상 동기화.
- **상태(2026-06-18)**: nginx 설정 프로덕션 적용·로컬 검증 완료(6개 도메인 200, arise-ai 무영향). ⚠ **공개 접속은 DNS A레코드가 있어야 — 전산팀 협조 대기**(미설정 시 외부에서 해석 안 됨).

## 해결된 문제: 내부망 관리자 로그인 무한 루프 (2026-06-12 분석·적용 완료)
- **증상**: 부산대 내부망에서 관리자 로그인 → 다시 로그인창 무한 반복. 외부망에선 정상.
- **원인**: prod에서 admin/OAuth 쿠키가 항상 `Secure`(backend/src/admin.js, auth.js)인데, 당시 nginx가
  **80 포트를 리다이렉트 없이 평문 서빙**. 내부 사용자가 `http://`(주로 IP 직접 접속)로 들어오면
  브라우저가 Secure 쿠키 저장을 거부 → 로그인 200이어도 세션 없음 → `/api/admin/me` 401 → 루프.
  외부는 HSTS preload 때문에 항상 HTTPS라 정상이었음.
- **수정**: nginx 80→443 301 리다이렉트 적용 완료 — canonical 설정: `deploy/nginx/conf.d/arise-ai.conf`,
  적용 번들(기록): `deploy/rollout-2026-06-12/`.
- **운영 안내**: 내부 사용자는 도메인(`https://arise-ai.pusan.ac.kr`)으로 접속할 것. IP 접속은 인증서 경고(우회 가능).
  ※ 향후 유사 작업 시 사전 확인: 교내에서 443이 닿는지 — 안 닿는 상태로 80을 막으면 내부 전체 불통이 됨.

## 자격증명 (서버 ~/arise-stack/.env)
- admin 계정: `admin` / `SiBwlZc81BAV0TtB` (시드값 — 2026-06-12 유지 결정)
- PostgreSQL: `arise` / `6k4P06iXKBHQwlarsoyWBJPA` (DB `arise`)
- SSH: `ubuntu` 계정, 키 인증(2026-06-08 등록) 또는 비밀번호 — sudo 비번 동일. JWT_SECRET 등은 `.env` 참조. **이 파일은 git 커밋 금지.**

## 운영 명령 (서버에서; 권한 오류 시 sudo)
```bash
cd ~/arise-stack
docker compose ps                 # 상태
docker compose logs -f was        # 앱 로그
docker compose restart was        # 앱 재시작
docker exec arise-nginx-1 nginx -t           # nginx 설정 문법 검증
docker exec arise-nginx-1 nginx -s reload    # nginx 무중단 재적용 (설정/인증서 교체 후)
docker compose down               # 중지 (DB 볼륨 arise_pgdata 보존)
docker compose up -d              # 기동
docker compose exec -T was node src/init-db.js   # 재시드(주의: 기존 응답 삭제)
```
DB 접속: `docker compose exec postgres psql -U arise -d arise`

## 재배포
### 코드(이미지) 재배포 — 빌드는 인터넷 되는 PC/WSL, 반입은 화이트리스트 PC에서
1. `docker build --provenance=false -t arise-was:latest .`
2. `docker save arise-was:latest | gzip > images.tar.gz`
3. scp(포트 11097)로 서버 `~/arise-deploy/` 반입 → `docker load -i images.tar.gz` → `cd ~/arise-stack && docker compose up -d`
   - was 컨테이너만 recreate되는 무중단 배포(2026-06-08 검증). `down` 불필요. DB·nginx 보존.
   - 화이트리스트 PC용 원클릭 패턴: `deploy/rollout-2026-06-12/apply.bat` 참고 (이미지를 폴더에 두면 자동 감지·적재)
### nginx 설정만 변경
- `deploy/rollout-2026-06-12/` 방식(scp + 백업 + nginx -t + reload + 자동 롤백). 이미지 재빌드 불필요.
- 레포 canonical(`deploy/nginx/conf.d/arise-ai.conf`)과 서버 적용본을 항상 동기화할 것.

## 파일 위치
- 서버: 스택 `~/arise-stack/` (compose·`.env`·`certs/`·nginx conf.d·부속 사이트 정적 루트 `sites/`·`backups/`) · 반입물 `~/arise-deploy/` · 소스 `~/pnu-grad/`
- 레포: `deploy/` — compose 참고본·nginx conf(canonical: `arise-ai.conf` + 부속 사이트 `site-*.conf`)·부속 사이트 플레이스홀더(`sites/<name>/`)·검증 스크립트(`server-verify.sh`, `validate-stack.sh`, `smoke.mjs`)·self-signed placeholder 인증서(`certs/`, 로컬 검증용)

## 변경 이력
- 2026-08-23: **게이트웨이 카드 재편 라이브 배포** — 01 AI대학(신규, 임시 안내 페이지 `/ai-college` 경유) · 02 A.U.R.A · 03 Google. 학·석사 연계과정 카드는 **게이트웨이 진입로만 제거**(`/admission-v3-dark.html`·신청 API·eligibility·scholarship 상호링크는 전부 존속 — 직접 URL 접속 가능). `.gateway-btn.aicollege` 그라디에이션 추가·미사용 `.apply` 제거, 신규 `AiCollege.jsx`+`ai-college.css`, `/ai-college` 라우트 등록. 배포 방식: 로컬 이미지와 서버 이미지를 파일 단위 md5 비교해 **실제 변경 3개 파일만**(`index.html`·`assets/index-Ps7zjEfc.js`·`assets/index-D7EdMCJ0.css`, 1.6MB) 전송 → 서버에서 `FROM arise-was:latest` 얕은 레이어 빌드 → `docker compose up -d`(was만 재생성). backend·나머지 dist 727개 파일은 서버 이미지와 바이트 동일 확인. nginx·postgres·DB·부속 사이트 무변경(Up 2 months 유지). 롤백 이미지 태그 `arise-was:bak-20260823-gateway`(롤백: `docker tag arise-was:bak-20260823-gateway arise-was:latest && cd ~/arise-stack && docker compose up -d`). 검증: 로컬 `npm run build` 통과, was healthy, 라이브 게이트웨이가 신규 번들 참조, `/`·`/ai-college`·`/bymonolog` 200 · `/google` 301→`/google/` 200 · `/admission-v3-dark.html` 200 · `/health` 200, 라이브 번들에 `/ai-college` 포함·학·석사 카드 미포함 확인.
- 2026-07-08: **관리 콘솔(/admin) 전면 재설계 라이브 배포** (커밋 0c1e131). 다크 콘솔 → 밝은 "통계 브리프"(세리프 마스트헤드·모노 전수 수치·단일 블루 데이터·헤어라인)로 5개 화면(로그인·신청현황·방문분석·학과 디렉터리·수정신청) 통일. 신규 `admin.css`(설계 토큰+컴포넌트) + `adminUi.jsx`(공용 프리미티브), 5개 화면 프레젠테이션만 교체(기능 100% 보존). 프론트만 변경 — was 이미지 재빌드 후 무중단 재기동(nginx·postgres·DB 무변경). 검증: 로컬 E2E 25/25 실기능 PASS(로그인·통계·분석 기간4종·디렉터리 CRUD·CSV·수정신청 필터·로그아웃), 프로덕션 스모크(새 번들·마커·/admin 200·자산·API 가드 401·신청자 사이트 무영향)·프로덕션 로그인 렌더 확인.
- 2026-07-08: **게이트웨이 2번(구글) 카드 not-allowed 커서·채도 필터 잔재 제거** (커밋 dfd215f). 카드 활성화 시 남은 disabled 스타일 정리, was 무중단 재기동.
- 2026-07-08: **/google 페이지 「AI 활용법 가이드」 섹션 라이브 배포** (커밋 6be7939). 교육 프로그램 섹션 아래 진입 카드 + 학습 모달(Workspace/Gemini/NotebookLM 유튜브 23개, 검색·클릭형 타임라인). 프론트만 변경 — was 이미지 재빌드 후 무중단 재기동(nginx·postgres·DB 무변경). 검증: was healthy, 라이브 번들에 신규 콘텐츠 포함 확인, /google·로고 자산 200.
- 2026-07-07: **퍼널 분석(방문 분석) 라이브 배포 + 과거 로그 백필**. `analytics_events` 테이블(부팅 DDL 자동 생성) + 공개 수집 `POST /api/track`(봇 필터·per-IP 토큰버킷·64kb 전용 파서) + 관리자 집계 `/api/admin/analytics/*` + admin "방문 분석" 탭 + 익명 트래커 `track.js`(전 페이지, ADR 0007 — IP·이메일·계산기 입력값 미수집). was만 무중단 재기동, nginx 무변경. 배포 직전 nginx 컨테이너 로그(2026-06-18~07-07, 72,698줄)를 파싱해 **pageview 5,959건 백필**(`meta.bf=1`, 봇 4,814건 제외, `/`는 응답 406B=arise index로 서브도메인 사이트와 판별; 백필 세션은 퍼널 계산에서 제외). 검증: 테스트 38/38·test-live-visitor 14/14·라이브 수집 즉시 적재 확인. 원본 로그·CSV는 `~/pnug-deploy/{nginx-access-predeploy.log,backfill.csv}` 보존. 서버 nginx conf 경로는 `~/arise-stack/nginx-https/conf.d/`(레포 참조본은 `deploy/nginx/conf.d/`), 서브도메인 3사이트(aiedu·aigs·airc)는 DNS 연결되어 트래픽 수신 중 확인.
- 2026-06-26: **내부망/IP 접속 지원을 위한 HTTP 우회 및 secure 쿠키 동적 설정 적용**. Nginx 설정(`arise-ai.conf`) 수정으로 도메인 접속 시에만 HTTPS 리다이렉트 처리하고, IP 직접 접속 시에는 HTTP 연결을 허용함. 동시에 백엔드(`admin.js`, `auth.js`)의 세션 쿠키 `secure` 플래그를 고정값이 아닌 실제 요청 프로토콜(HTTPS 여부)에 맞게 동적으로 체크하게 수정하여, 내부망 HTTP IP 접속 환경에서도 관리자 로그인 루프 없이 정상 접속 가능하도록 처리 완료.
- 2026-06-18: **부속 AI 기관 사이트 서브도메인 호스팅** 추가 — 장영실 AI융합연구원(airc·axrc)·AI융합교육원(aiedu·axedu)·AI대학원(aigs·axgs). 같은 nginx·와일드카드 인증서로 도메인별 `site-*.conf`(80→443 + 정적 루트), compose에 `./sites` 마운트. 현재 "준비 중" 플레이스홀더. 프로덕션 적용·검증 완료(6개 도메인 200, arise-ai 무영향). 공개 접속은 DNS A레코드(전산팀) 필요. 동시에 레거시 `/arise.html`→`/` 301, compose를 실배포(미배포 redis/모니터링 제거)와 일치화. (커밋 a594ebe, 7d8f2ec)
- 2026-06-17: 「학과 정보 수정 신청」 2차 — **공개 제출(로그인 제거)·디렉터리 진입 FAB·학과/세부전공 삭제 요청 기능** 라이브 배포. `dir_change_requests`에 `action`·`note` 컬럼 추가(부팅 시 `ALTER ... IF NOT EXISTS`로 기존 테이블 호환). 검증: was healthy·공개 제출 422 검증·삭제 사유 필수·FAB/문구 라이브 반영. (코드 커밋 114c99c)
- 2026-06-17: 「학과 정보 수정 신청」 기능 **라이브 배포 완료**. 신규 페이지 `/dept-edit-request`(@pusan.ac.kr OAuth 게이트) + 관리자 "학과 수정 신청" 검토 탭(승인 시 디렉터리 자동 반영). DB `dir_change_requests` 테이블 추가(`initSchema` 자동 생성 — 무중단 was 재생성, postgres·nginx·DB볼륨 보존). 디렉터리 안내 문구 2곳 수정(대제목 하단·검색창 옆 칩). 검증: was healthy·문구 반영·제출/관리자 API 정상. (코드 커밋 e7361b6)
- 2026-06-12: nginx 301·디렉터리 정리 **라이브 적용 완료**(통합 번들 실행, 검증 통과). 일회성 스크립트(remediate-live, verify-migration, run-install)·구식 compose(prod.yml)·중복 단독 번들 2종 삭제.
- 2026-06-12: 학과 디렉터리에서 협동과정·계약학과 제거(학석박사 연계과정 신청 불가 — 대학원혁신실 회신) — 라이브 DB 정리 번들 `deploy/dept-cleanup-rollout/` + 시드 JSON·관리자 드롭다운 정리.
- 2026-06-12: 문서 현행화(와일드카드 인증서·OAuth 완료·접근 제약 반영, acme 절차 폐기 표기). 내부망 로그인 루프 분석·수정 번들 추가.
- 2026-06-08: TLS를 Let's Encrypt → 부산대 와일드카드로 교체. was 이미지 self-contained 전환(s30 bind-mount 제거).
- 2026-06-04: 최초 배포.
