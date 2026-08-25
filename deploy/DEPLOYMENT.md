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
- 2026-08-25: **AI대학 사이트 갱신 — 원클릭 번들로 배포 완료**. 화이트리스트 IP 를 쓰는 다른 PC 에서 `DEPLOY.cmd` 실행으로 배포됐다(접속 키 `id_ed25519`). 라이브 검증: `app.js`·`styles.css`·`faculty-data.js`·로고 5장 md5 전부 일치, `/`·`/ai-college/`·`/health`·`/bymonolog`·`/google/`·`/admission-v3-dark.html` 200, 교수 사진·폰트 CSS·인트로 영상(3.9MB) 200 으로 기존 자산 승계 확인. 롤백 태그 `arise-was:bak-20260825-oneclick`. 원본(D:/AIweb-site 17:13) 동기화·빌드·검증까지 이 PC에서 마쳤으나, 작업 PC 의 공인 IP(106.101.9.x)가 서버 SSH 화이트리스트에 없어, 화이트리스트 IP 를 쓰는 다른 PC 에서 실행할 자체 완결형 번들을 만들어 인계하는 방식으로 배포했다. 앞으로 이 PC 의 IP 가 화이트리스트에 없을 때는 이 방식을 쓴다(`deploy/oneclick-deploy.sh` + `deploy/oneclick-DEPLOY.cmd`).
  - 변경 8개: `app.js`(74020B)·`styles.css`(96772B)·`faculty-data.js`(28291B) + 파트너 로고 5장. 나머지 193개는 서버와 동일.
  - 번들: `C:/Users/user/Desktop/ARISE-배포-20260825/`(+ zip). `DEPLOY.cmd` 더블클릭 → 전송 → 서버에서 얕은 레이어 빌드 → `compose up -d`(was만) → 9개 경로 응답 + 3개 파일 md5 대조까지 자동 검증. `CHECK.cmd`(접속만), `ROLLBACK.cmd`(복구). 실행 PC에 도커 불필요. 저장소 사본은 `deploy/oneclick-deploy.sh`·`deploy/oneclick-DEPLOY.cmd`.
  - **번들 작성 시 실제 실행으로 잡은 함정 3건**: ① `printf` 로 배치파일을 쓰면 `in` 의 `` 가 백스페이스로 해석돼 경로가 깨진다(heredoc 사용). ② Git for Windows 는 설치 형태에 따라 `binash.exe` 가 없고 `usrinash.exe` 만 있다(이 PC가 그 경우) — 8개 경로를 명시적으로 탐색. ③ `where bash` 폴백은 WSL 의 `System32ash.exe` 를 먼저 잡는데 경로 규칙이 달라 못 쓴다 — System32·WindowsApps 제외.
  - **접속 키를 번들에 포함**(`key/id_ed25519`, `key/id_ed25519_new`) — 실행 PC 에서 키 준비 없이 바로 배포된다. 이번 세션의 IP 직접 접속은 기본 키 `id_ed25519` 를 썼고 `~/.ssh/config` 의 `arise` 항목은 `id_ed25519_new` 를 쓰므로, 어느 쪽을 서버가 받는지 확인할 수 없어 둘 다 넣고 순차 시도한다. zip/복사로 권한이 느슨해지면 ssh 가 키를 거부하므로 임시 사본에 600 을 주고 쓴 뒤 지운다(trap). `-F /dev/null` 로 로컬 `~/.ssh/config` 를 무시한다 — config 의 `BindAddress` 는 그 PC 의 Wi-Fi IP 라 다른 PC 에서 그대로 쓰면 접속이 깨진다.
  - 번들에 개인키가 있으므로 공유 금지. `.gitignore` 에 `key/`·`id_ed25519*`·`id_rsa*`·`*.pem` 추가로 커밋 사고를 막았다. 배포 후 옮긴 PC 에서 폴더 삭제 권장.
  - **실행 중 발견한 MSYS 경로 변환 함정**: Git-bash 는 인자가 유닉스 절대경로처럼 보이면 Windows 경로로 바꿔버린다. 그래서 `ssh host "mkdir -p ~/pnug-deploy/..."` 가 서버에 `C:/...` 로 전달되고 `mkdir` 이 `/c` 를 만들려다 `Permission denied` 로 죽었다(접속·인증은 성공한 뒤였다). 원격 경로를 `/` 로 시작하지 않는 **상대경로**(`pnug-deploy/...`, `arise-stack`)로 바꿔 해결 — 로그인 홈 기준이라 동작이 같고 변환 대상이 아니게 된다. `MSYS_NO_PATHCONV=1` 을 전역으로 켜는 방법도 있지만 이미 정상 동작하는 `-F /dev/null` 등까지 영향을 받아 택하지 않았다.
  - 한글 `.cmd` 파일명은 코드페이지에 따라 서로를 못 찾으므로 파일명은 ASCII, 본문은 UTF-8 + `chcp 65001`.
  - `index.html` 의 `?v=` 캐시버스터는 이번에 안 올랐지만 무해하다 — `express.static` 에 `maxAge` 가 없어(ETag 만) 브라우저가 매 요청 재검증한다.
- 2026-08-24: **AI대학 사이트 — 인트로 영상 교안**(원본 22:07). `assets/higgsfield-pnu-particles.mp4` 교체(3.8MB)와 `app.js` 의 `VIDEO_SRC` 에 캐시버스터 `?v=1946` 추가. 전송 2개 파일. 롤백 태그 `arise-was:bak-20260824-video`.
  - 원본이 지난 번 상호 일치화(폰트 로컬 번들·배지 제거)를 그대로 유지하고 있어 `sync-ai-college.sh` 를 그대로 돌렸다(폰트 단계는 no-change). 사본↔원본 201개 파일 바이트 전수 일치 재확인.
  - 검증: 라이브 app.js·영상 md5 원본과 일치, `?v=1946` URL 200 video/mp4 3956660B, 인트로 화면 렌더 확인, 콘솔 에러 0건.
- 2026-08-24: **AI대학 사이트 — 원본(D:/AIweb-site)과 서버 상호 일치화**. 원본과 사본이 겁겁이 서로 다른 수정을 들고 있어 전수 대조 후 양방향으로 붙였다.
  - **유참핬 사진은 양쪽이 각자 추가해 파일명이 걈렸다** (사본 `442ed1d0.webp` 320×427 12.0KB / 원본 `b6c00d33.webp` 320×426 7.4KB). 원본이 진실의 출처이고 더 가벼워 **원본 파일로 통일**하고 사본본은 삭제. 이로써 `faculty-data.js` 가 원본과 100% 동일해지며 다음 동기화 충돌이 사라진다.
  - **폰트 로컬 번들·배지 제거는 원본에도 반영**했다(`fonts/` 126개 복사 + index.html·app.js·styles.css 패치, 원본 `dist/` 도 갱신). 이제 사본에만 있는 수정은 없다.
  - **`.gitattributes` 신설**(루트, `frontend/public/ai-college/** -text`). git 자동 줄바꿈 변환이 개입하면 체크아웃 때 CRLF 로 바뀌어 원본과 바이트가 어긋난다(이번에 app.js 74406B vs 73983B 로 보이던 것이 전부 이 토인이었다 — 내용은 동일). 이제 바이트 그대로 보관한다.
  - `sync-ai-college.sh` 멀등하게 수정: 원본이 이미 로컬 폰트 링크를 쓰면 그대로 둔다(이전엔 경고 없는 경우 경고 찍다 cp949 인코딩 오류로 실패했다).
  - 검증: 서버 라이브 ↔ 원본 index.html·app.js·styles.css·faculty-data.js·fonts/noto-sans-kr.css·사진 전부 md5 일치, 사본↔원본 201개 파일 바이트 전수 일치, 서버 faculty 60장·중복본 삭제 확인. 롤백 태그 `arise-was:bak-20260824-align`.
- 2026-08-24: **AI대학 교수진 — "대표교수 미지정 · 임시 발기" 배지 제거**. `app.js` 의 대표교수 카드 템플릿에서 `${unit.usesFallback?...}` 배지와 `usesFallback` 계산부를 제거하고, 더 이상 렌더되지 않는 `styles.css` 의 `.faculty-rep-card i` 전용 셀렉토 2개도 정리. AX융합학부(교수 1명, `isRepresentative:false`)가 유일한 해당 추이었다. 전송 2개 파일. 검증: 라이브 app.js·styles.css 에서 배지 문구·usesFallback·전용 CSS 모든 0건, `node --check` 통과, 라이브 AX융합학부 화면에서 배지 사라짐·대표교수 유참핬 정상 표시 확인. 롤백 태그 `arise-was:bak-20260824-nofallbackbadge`.
  - 주의: `app.js`·`styles.css` 도 원본 `D:/AIweb-site` 에서 오는 파일이다. 재동기화 시 배지가 다시 생긴다.
- 2026-08-24: **AI대학 교수진 — 유참핬 교수 사진 보완**. 60명 중 유일하게 `"image":""` 로 미지정되었던 항목. 도시공학과 교수진 페이지(urban.pusan.ac.kr/urban/4828/subview.do)에서 원본 PNG(354×472)를 확보해 기존 사진 규겝(폭 320px WebP, 평굠 10KB)에 맞춰 320×427 WebP 12KB 로 변환 → `assets/faculty/442ed1d0.webp`. 변환은 Chrome canvas WebP 인코더를 사용(이미지 라이밌러리 무추가). 전송 2개 파일.
  - **주의**: 이 보완은 `frontend/public/ai-college/` 쓸 사본에만 있다. 원본 `D:/AIweb-site` 에는 없으므로 그곳에서 다시 동기화하면 **사진과 faculty-data.js 패치가 다시 사라진다**. 원본에도 반영하거나, sync 스크립트에 보완 단계를 추가해야 한다.
  - 검증: 사진 200 image/webp 12276B, 라이브 faculty-data.js 에 벼 이므지 0건·교수 60명, 라이브 AX융합학부 화면에서 사진 320×427 렌더 확인·미로드 이므지 0건.
- 2026-08-24: **AI대학 사이트 소스 갱신 동기화**(원본 19:54) — 교수진 사진 59장(`assets/faculty/`) 신설 + 루트 4개 파일 갱신(쿼리 `?v=20260824-5`). 전송 63개 928KB, 나머지 867개는 서버 이미지와 동일해 전송 생략. 롤백 태그 `arise-was:bak-20260824-facultysync`.
  - **동기화 스크립트 추가**: `deploy/sync-ai-college.sh`. 원본은 Google Fonts CDN 을 쓰므로 단순 복사하면 index.html 의 폰트 로컬 번들 링크가 **매번 되돌리진다**(이번에도 부확인). 스크립트가 복사·링크 치환·CDN 잔류 검사를 한 번에 하고 잔류가 있으면 생다. `fonts/` 는 보존하고 `assets/` 만 갈아끓는다.
  - 검증: 갱신 4개 파일 크기가 로컬 기대값과 일지(app.js 73983B·styles.css 95653B·faculty-data.js 28270B·index.html 3843B), 교수 사진 **59장 전수 200**, 라이브 교수진 화면(`#detail-5-1`) 사진 포함 렌더 확인, 구글 폰트 요청 0건·로컬 woff2 10건, `/`·`/bymonolog`·`/google/`·`/admission-v3-dark.html`·`/health` 200, 콘솔 에러 0건.
- 2026-08-24: **AI대학 홈페이지 자체 호스팅 + 게이트웨이 01 카드 강조** 라이브 배포. 확정 시안(외부 `pnu-ai-college.netlify.app`, 소스 `D:/AIweb-site`)을 네트리파이 의존 없이 `arise-ai.pusan.ac.kr/ai-college/` 에서 직접 서빙. 빌드 없는 정적 사이트라 `frontend/public/ai-college/` 에 그대로 두고 Vite 가 dist 로 복사한다. 내부 참조가 전부 상대경로·해시 라우팅(`#detail-1-1`)이라 하위 경로 호스팅 안전. 
  - **server.js 라우트 추가**: 기존 `express.static` 이 `index:false` 라 디렉터리 index 를 안 내준다. 또 Express 는 기본이 non-strict 라우팅이라 `/ai-college` 와 `/ai-college/` 가 같은 라우트에 걸려, 둘을 분리해 선언하면 **자기 자신으로 301 무한루프**가 난다(배포 전 로컬 검증에서 발견). 한 핸들러에서 `req.path.endsWith('/')` 로 분기 — 슬래시 없으면 301로 붙여야 상대경로(`./styles.css`)가 정상 해석된다. SPA fallback 보다 앞에 놓을 것.
  - **폰트 로컬 번들**: 사이트가 Google Fonts CDN 에서 Noto Sans KR 을 받던 것을 `@fontsource-variable/noto-sans-kr` 5.3.0 (가변, 124개 서브셋 woff2, 3.8MB)로 교체해 폐쇄망 정책에 맞췄다. 패밀리명을 'Noto Sans KR' 로 맞춰 styles.css 는 무수정. 가변이라 styles.css 가 쓰는 600·650·740·750·900 (CDN 에선 미수신해 합성되던 weight) 도 정상 렌더.
  - **게이트웨이**: 01 AI대학을 대표 카드로(`li.feature`) — 180px·제목 46px (02·03은 96px·19px), 전면 점 격자 + 오른쪽 AI 워드마크 + 왼쪽 민트 액센트 바. `<Link>` → `<a href="/ai-college/">`(SPA 밖 정적 사이트). React 의 `/ai-college` 라우트·`AiCollege.jsx`·`ai-college.css` 제거, 서버의 시안 캡처 9장(`dist/shots`)도 삭제.
  - 주의: `.gateway-btn.aicollege > *` 처럼 `> *` 로 position 을 건드리면 `.tag`·`.btn-arrow` 의 absolute 배치가 깨진다(화살표 코너가 카드 중앙으로 튀어나옴). 텍스트 요소만 명시하고 나머지는 z-index 만 줄 것.
  - 배포 방식: 서버 이미지와 md5 비교해 변경분만 전송(1차 19개 5.0MB, 2차 폰트 127개 3.8MB) → 서버에서 `FROM arise-was:latest` 얕은 레이어 빌드 → `docker compose up -d`(was만 재생성). nginx·postgres·DB·부속 사이트 무변경(Up 2 months 유지). 롤백 태그 `arise-was:bak-20260824-aicollege`·`arise-was:bak-20260824-fonts`.
  - 검증: `/ai-college` 301 → `/ai-college/` 200, 정적 자산·mp4(3.0MB) 전부 200, `/`·`/bymonolog`·`/google/`·`/admission-v3-dark.html`·`/health` 200, 라이브 브라우저에서 `document.fonts.status=loaded`·구글 폰트 요청 0건·로컬 woff2 10건·weight 650·900 렌더 가능 확인, 콘솔 에러 0건.
  - 미적용(의도): 원본의 `_headers`(Cloudflare/Netlify 전용 캐시 헤더)는 우리 nginx/express 가 읽지 않는다. `express.static` 이 ETag/Last-Modified 를 붙여 재방문 시 304 로 끝나고 CSS·JS 는 `?v=` 쿼리로 무효화하므로 실익이 작아 보류.
  - 재동기화: `D:/AIweb-site` 가 갱신되면 루트의 index.html·app.js·styles.css·faculty-data.js·assets/ 를 `frontend/public/ai-college/` 로 다시 복사한 뒤 **index.html 의 Google Fonts 링크를 로컬 번들 링크로 다시 치환**해야 한다(`fonts/` 는 그대로 두면 됨). 원본의 `dist/`·`netlify.toml`·`.netlify`·`.wrangler` 는 배포 불필요.
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
