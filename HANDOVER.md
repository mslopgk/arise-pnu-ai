# 인수인계 — ARISE / PNU AI 학·석사 연계 사이트

작성 2026-09-07 · 라이브 **https://arise-ai.pusan.ac.kr**

이 문서는 **코드와 기존 문서만 봐서는 알 수 없는 것**을 모았다.
기능 설명·도메인 용어·설계 결정은 이미 리포에 있으니 그쪽을 봐라.

| 먼저 읽을 것 | 내용 |
|---|---|
| `README.md` | 기능 개요, 기술 스택, 로컬 실행 |
| `CONTEXT.md` | 도메인 용어·정책 (학·석사 연계 규정 등) |
| `CONTEXT-MAP.md` | 컨텍스트 지도 — **단, 낡았다. 6절 "문서와 실제 불일치" 참고** |
| `DEPLOY.md` | 처음부터 서버 띄우는 절차 |
| `deploy/DEPLOYMENT.md` | **실제 운영 이력 + 배포 절차.** 이 리포에서 가장 중요한 운영 문서 |
| `docs/adr/0001~0006` | 설계 결정 기록 |

---

## 1. 무엇인가 / 어디까지 됐나

### 한 도메인에 세 덩어리가 얹혀 있다

`arise-ai.pusan.ac.kr` 하나에 성격이 다른 것들이 같이 서비스된다.

1. **학·석사 연계과정 사전신청 시스템** — 이 리포의 원래 목적. 학과 디렉터리·자격 자가진단·
   장학 판정·사전신청(Google OAuth)·관리자 콘솔(`/admin`). **동작함.**
2. **게이트웨이 (`/`)** — 최상위 랜딩. 좌측 PNU 영상 + 우측 3카드.
   ① AI대학 ② A.U.R.A 마스터플랜·데이터룸 ③ PNU × Google for Education. **동작함.**
3. **AI대학 홈페이지 (`/ai-college/`)** — 2026-08-24에 새로 얹은 **독립 정적 사이트.**
   React SPA 가 아니다. **동작함.** ← 최근 작업이 거의 다 여기에 몰려 있다.

부속 기관 사이트(airc/aiedu/aigs + ax* 별칭)도 **같은 nginx** 가 서브도메인으로 호스팅하지만,
그 콘텐츠는 이 리포 밖의 별도 정적 사이트다(`deploy/sites/`, `deploy/nginx/conf.d/site-*.conf`).

### 최근 상태 (2026-08-26 기준 · 이후는 미확인)

- AI대학 홈페이지는 **원본이 다른 사람 손에 있다.** `D:/AIweb-site` 라는 **별도 저장소**에서
  개발되고, 우리는 그 산출물을 받아 자체 호스팅한다. 하루에 여러 번 갱신됐다.
- 2026-08-26 하루에만 **배포 9회 성공 / 2회 실패**(실패는 자동 재시도로 복구).
- 마지막 확인 시점에 라이브 = 원본 = 리포 사본이 **바이트 단위로 일치**했다.

### 동작하지 않는 것 / 없는 것

| 항목 | 상태 |
|---|---|
| `s30/` 마케팅 사이트 | **폴더 자체가 없다.** `CONTEXT-MAP.md`·`server.js` 는 아직 `/s30` 을 언급한다(라우트는 `next()` 로 빠짐). 미배포. |
| Redis · 모니터링(Prometheus/Grafana) | 설계만 있고 미배포. `deploy/docker-compose.yml` 주석에 "git 이력에서 복원" 안내가 있다. |
| `_headers` 캐시 헤더 | AI대학 원본에 있으나 **의도적으로 미적용.** Cloudflare/Netlify 전용이라 우리 nginx/express 가 읽지 않는다. `express.static` 의 ETag 재검증으로 충분하다고 판단했다. |
| 엄밀한 의미의 무중단 배포 | `docker compose up -d` 는 was 컨테이너를 **재생성**하므로 수 초 공백이 있다. 정적 파일만 바뀔 때 쓰는 `docker cp` 방식은 진짜 무중단. 3절 참고. |

---

## 2. 파일·폴더 지도

| 위치 | 무엇 / 왜 여기 |
|---|---|
| `frontend/src/` | Vite + React SPA. 게이트웨이(`pages/Gateway.jsx`), 관리자 콘솔, 데이터룸, `variants/google`·`variants/bymonolog` 콘텐츠 페이지 |
| `frontend/public/*.html` | **React 를 쓰지 않는** 정적 공개 페이지(`admission-v3-dark.html`, `eligibility.html`, `scholarship.html` 등). Vite 가 그대로 dist 로 복사 |
| `frontend/public/ai-college/` | **AI대학 홈페이지 사본.** 원본은 `D:/AIweb-site`. 빌드가 없는 정적 사이트라 public 에 두고 Vite 가 복사만 한다 |
| `frontend/public/ai-college/fonts/` | Noto Sans KR **가변** 폰트 로컬 번들(126개 파일, 3.8MB). 폐쇄망 대응 — 이유는 5절 |
| `frontend/public/{video,media,logos,vendor,fonts}/` | 영상·이미지·차트 라이브러리·폰트. **전부 로컬 번들** — 인터넷 차단 환경에서도 동작해야 한다 |
| `backend/src/server.js` | Express 진입점. 운영 모드에서 `frontend/dist` 정적 서빙 + SPA fallback. **라우트 순서가 중요**(5절) |
| `backend/.env` | **실제 자격증명이 들어 있다.** 값은 이 문서에 적지 않는다. 변수 목록은 `backend/.env.example` |
| `deploy/DEPLOYMENT.md` | 운영 이력·절차. **배포 전에 반드시 읽어라** |
| `deploy/docker-compose.yml` | 실배포 구성(nginx / was / postgres). 네트워크 2분할(edge 공개 / data 비공개) |
| `deploy/nginx/conf.d/` | `arise-ai.conf`(본체) + `site-*.conf`(부속 기관 사이트) |
| `deploy/sync-ai-college.sh` | **`D:/AIweb-site` → 리포 사본 동기화.** 손으로 복사하면 안 된다(5절) |
| `deploy/watch-and-deploy.sh` | 원본을 10초마다 감시해 자동 배포. **미커밋** |
| `deploy/check-faculty.js` | 교수 데이터 무결성 검사(배포 게이트). **미커밋** |
| `deploy/oneclick-deploy.sh`, `oneclick-DEPLOY.cmd` | **화이트리스트 IP 가 아닌 PC**에서 작업했을 때, 다른 PC 로 넘겨 배포하는 번들의 원본 |
| `deploy/rollout-2026-06-12/` | 2026-06-12 nginx 일회성 롤아웃 스크립트. 과거 것이지만 `DEPLOYMENT.md` 가 참조하므로 남겨 뒀다 |
| `docs/adr/` | 설계 결정 6건. `0001` = Sheets 는 거울이지 진실 공급원이 아니다 |
| `.gitattributes` | `frontend/public/ai-college/** -text` — CRLF 변환 방지. **지우면 안 된다**(5절) |
| `.superpowers/sdd/` | 과거 개발 작업 지시서·보고서(에이전트 작업 산출물). 참고용 기록 |
| `_보관/` | 인수인계 정리 중 옮긴 빌드 산출물·로그·스크린샷. **지운 건 없다.** `_보관/README.md` 참고 |

### 리포 밖에 있는데 반드시 필요한 것

| 위치 | 무엇 | 비고 |
|---|---|---|
| `D:/AIweb-site` | **AI대학 홈페이지 원본 저장소** | 없으면 AI대학 사이트를 갱신할 수 없다. 별도 git 저장소 |
| `C:/Users/user/PNU_AI/docs/AI대학교원정보.xlsx` | 교수 60명 원본 데이터 | `faculty-data.js` 의 근거. 대조 결과는 6절 |
| `C:/Users/user/Downloads/[붙임] AI대학 홈페이지 검토 요청_20260825.pdf` | 발주처 검토 요청서(**추정**) | **미처리.** 6절 |
| `C:/Users/user/Desktop/ARISE-배포-20260825/` (+ `.zip`) | 원클릭 배포 번들 | **개인키 2개 포함.** 취급 주의 |
| 작업 PC `~/.ssh/config`, `~/.ssh/id_ed25519*` | 서버 접속 설정·키 | 3절 |

---

## 3. 실행 · 빌드 · 배포 절차

### 로컬 실행

`README.md` "로컬 개발" 절차대로 하면 된다. 요점만:

```bash
# PostgreSQL 필수 (SQLite 아님). DB 가 없으면 백엔드가 아예 뜨지 않는다.
cd backend  && npm install && npm run init-db
cd frontend && npm install

cd backend  && npm run dev   # Express  :3001
cd frontend && npm run dev   # Vite     :5173
```

- DB 계정: `README.md` 는 `arise/arise` 로 안내한다. **실제로 쓰던 값은 `backend/.env` 를 봐라**
  (문서와 다를 수 있다 — 추정).
- 운영 모드는 Express 가 `frontend/dist` 를 **같은 포트 3001** 에서 서빙한다.
  그래서 배포 전 `cd frontend && npm run build` 가 **반드시** 선행되어야 한다.
  (`_보관/` 으로 옮겨 둔 `dist` 는 이 명령으로 재생성된다.)

### 서버 접속 — 여기서 제일 많이 막힌다

```
ubuntu@164.125.19.178  포트 11097     (~/.ssh/config 에 Host arise 로 등록)
스택 위치: ~/arise-stack        이미지: arise-was:latest
컨테이너: arise-nginx-1 / arise-was-1 / arise-postgres-1
```

- **서버 방화벽이 특정 공인 IP만 허용한다(화이트리스트).** 그 IP 는 작업 PC 의 **Wi-Fi 회선** 기준이다.
- 그래서 `~/.ssh/config` 의 `BindAddress` 로 **Wi-Fi 인터페이스에 바인딩**해야 접속된다.
  이 값은 Wi-Fi **사설** IP 라서 바뀐다. 2026-08-26에 `192.168.219.48` → `.45` 로 고쳤다.
- **Wi-Fi 가 끊기면 배포가 불가능하다.** 유선·테더링으로 인터넷이 되더라도 서버는 막는다.
  Wi-Fi IP 가 `169.254.x`(APIPA)면 DHCP 실패 = 실질적 연결 없음이다.
- 접속이 안 될 때: `ipconfig` 로 Wi-Fi IP 확인 → `~/.ssh/config` 의 `BindAddress` 갱신.
  또는 인터페이스를 전부 훑어 되는 것을 찾는다(`deploy/watch-and-deploy.sh` 의 `find_bind()` 가 그 방식).
- 키: `~/.ssh/id_ed25519`, `~/.ssh/id_ed25519_new`(둘 다 패스프레이즈 없음).
  IP 직접 접속은 기본 키를, `Host arise` 는 `_new` 를 쓴다.
  **서버가 어느 쪽을 받는지 확정하지 못했다** — 실측으로는 `id_ed25519` 로 성공했다.

### 배포 — 두 가지 방식

**전제**: 서버에서 얕은 레이어를 빌드하므로 **작업 PC 에 도커가 필요 없다.**
전체 이미지를 새로 만들지 않고, 바뀐 파일만 기존 이미지 위에 얹는다.

```bash
# 0) AI대학 사이트라면 먼저 동기화
bash deploy/sync-ai-college.sh
cd frontend && npm run build

# 1) 서버와 md5 를 비교해 바뀐 파일만 고른다 (전체 전송 금지 — dist 가 72MB다)
#    로컬 dist 와 "서버 이미지 안의 dist" md5 목록을 diff 하는 방식을 썼다:
#    docker run --rm --entrypoint sh arise-was:latest -c 'cd /app/frontend/dist && find . -type f -exec md5sum {} +'

# 2) 변경분만 전송 → 서버에서 얕은 레이어 빌드
#    Dockerfile:  FROM arise-was:latest  /  COPY <바뀐 파일> <경로>
#    빌드 전에 롤백 지점을 태그해 둔다:
#    docker tag arise-was:latest arise-was:bak-YYYYMMDD-xxx

# 3-A) 정적 파일만 바뀐 경우 — 무중단
docker cp <파일> arise-was-1:/app/frontend/dist/ai-college/<파일>
#      + 같은 내용을 이미지에도 구워 둔다(다음 재기동 때 사라지지 않게)

# 3-B) 백엔드 코드가 바뀐 경우 — 수 초 공백 발생
cd ~/arise-stack && docker compose up -d    # was 만 재생성. down 은 하지 말 것(DB·nginx 보존)
```

**검증은 md5 로 한다.** 응답 코드 200만 보면 낡은 파일이 올라가도 모른다.
실제로 `npm run build` 가 백그라운드에서 끊겨 `dist` 가 갱신되지 않은 채 배포되려던 것을
md5 대조로 잡았다.

```bash
curl -sk https://arise-ai.pusan.ac.kr/ai-college/app.js | md5sum   # 로컬 파일 md5 와 비교
```

**롤백**

```bash
docker tag arise-was:bak-YYYYMMDD-xxx arise-was:latest
cd ~/arise-stack && docker compose up -d
```

태그가 여러 개 남아 있다(`docker images arise-was`). 예: `bak-20260826-index`, `bak-20260826b`,
`bak-20260825-oneclick`, `bak-20260824-align`.
단, `docker cp` 로 넣은 것은 컨테이너 안에만 있으니 롤백 시 태그 복원 후 `compose up -d` 가 필요하다.

### 화이트리스트 IP 가 아닐 때

작업 PC 의 IP 가 화이트리스트에 없으면(테더링 등) 여기서 배포가 안 된다. 그때 쓴 방법:

이 PC 에서 동기화·빌드·검증까지 마치고 **자체 완결형 번들**을 만들어, 화이트리스트 IP 를 쓰는
**다른 PC 에서 실행**한다. 번들 원본이 `deploy/oneclick-deploy.sh` + `deploy/oneclick-DEPLOY.cmd` 다.
`DEPLOY.cmd` 더블클릭 → 전송 → 서버에서 빌드 → 재시작 → 검증까지 자동으로 돈다.
2026-08-25에 이 방식으로 배포 성공했다.

### 자동 배포 감시 (현재 꺼져 있음)

`deploy/watch-and-deploy.sh` — `D:/AIweb-site` 를 10초마다 감시해, 변경 후 **30초 조용해지면**
동기화 → 빌드 → 검증 → `docker cp` 배포까지 자동으로 한다.

- **30초 안정대기**가 핵심이다. 편집 중간 상태를 배포하는 사고를 막는다. 실제로 여러 번 걸렀다.
- 배포 전 게이트 4종 — 하나라도 실패하면 **배포 중단**:
  dist↔원본 md5 일치 / `app.js` 문법(`node --check`) /
  `faculty-data.js` 무결성(`deploy/check-faculty.js`) / **CDN 참조 0건**
- 중복 실행 방지 잠금: `deploy/.watch.lock`
- **주의**: 이 스크립트는 프로덕션에 **사람 확인 없이** 올린다. 문법·데이터 파괴는 게이트가 막지만
  **내용 실수는 못 막는다.** 켤 때 이 점을 알고 켜라.
- 터미널 세션이 닫히면 같이 죽는다. 다시 켜면 사본과 원본을 비교해 미배포 변경을 먼저 올린다.

---

## 4. 상대 기관 · 담당자 · 약속

### 확인된 것

- 주체: **부산대학교 AI 거점대학육성사업단 (A.U.R.A)**.
  AI대학 사이트 푸터에 `© 2026 College of AI, Pusan National University`, 연락처 `ai@pusan.ac.kr`.
- **AI대학 출범 2027년 3월** — AI대학 홈페이지 히어로에 명시된 날짜.
- **PNU × Google for Education 파트너십** — 게이트웨이 3번 카드 / `/google` 페이지.
  Jamboard 는 서비스 종료로 영상만 남기고 앱 링크를 제거했다(`CONTEXT-MAP.md`).
- AI대학 파트너 로고: AWS · Google · LG U+ · 네이버클라우드 · 업스테이지.
- 협동과정·계약학과는 학·석사 연계 신청 대상에서 **제거**했다 —
  **대학원혁신실 회신** 근거(2026-06-12, `deploy/DEPLOYMENT.md` 이력).
- 교수 데이터 근거: `AI대학교원정보.xlsx`(60명). 사이트와 전 필드 대조 완료 — 6절.

### 미확인 / 추정 — 인계받은 사람이 확인해야 함

- **개인 담당자 이름·연락처를 확보하지 못했다.** 작업 이력에 남아 있지 않다.
  사업단 내부 문서나 메일함에서 확인해야 한다.
- `[붙임] AI대학 홈페이지 검토 요청_20260825.pdf` — 발주처의 검토 요청서로 **추정**.
  **누가 보냈고 회신 기한이 언제인지 모른다.** 미처리 상태다.
- AI대학 홈페이지 원본(`D:/AIweb-site`)을 작업하는 사람이 누구인지 **문서화되지 않았다.**
  실무상 다른 담당자가 계속 수정했고 우리는 받아서 배포만 했다.
- 2027년 3월 출범 외에 **합의된 중간 마감을 확인하지 못했다.**
- 서버 인프라(방화벽 화이트리스트·인증서) 관리 주체가 누구인지 불명.
  IP 화이트리스트 변경을 요청할 창구를 확인해 둘 것.

---

## 5. 함정과 주의사항

실제로 시간을 잡아먹었거나 재발하면 곤란한 것들. **배포 전에 훑어라.**

### AI대학 사이트 — 원본과의 관계

1. **손으로 복사하지 말고 `deploy/sync-ai-college.sh` 를 써라.**
   원본은 Google Fonts **CDN** 을 쓴다. 그냥 복사하면 우리가 넣은 로컬 폰트 번들 링크가
   **되돌아가고 폐쇄망 대응이 조용히 깨진다.** 실제로 한 번 되돌아가 있었다.
   스크립트가 복사 → 링크 치환 → CDN 잔류 검사를 한 번에 하고, 잔류가 있으면 실패로 끝낸다(멱등).
2. **`.gitattributes` 의 `frontend/public/ai-college/** -text` 를 지우지 마라.**
   git 자동 줄바꿈 변환이 체크아웃 때 CRLF 로 바꿔 원본과 바이트가 어긋난다.
   이것 때문에 `app.js` 가 74406B vs 73983B 로 달라 보여 한참 헤맸다 — **내용은 같았다.**
   게다가 파일을 텍스트 모드로 읽어 크기를 재면 CRLF 가 접혀 또 다른 숫자가 나온다.
   **크기가 아니라 md5 로 봐라.**
3. **원본과 사본이 같은 작업을 각자 해서 갈린 적이 있다.** 유철희 교수 사진을 양쪽이 따로
   추가해 파일명이 달랐다(`442ed1d0.webp` vs `b6c00d33.webp`).
   우리 쪽에만 있는 수정이 생기면 **원본에도 반영해 양방향으로 맞춰라.**
   안 그러면 다음 동기화 때 사라진다. 현재 폰트 로컬 번들·배지 제거는 원본에도 반영해 뒀다.
4. 교수 사진을 새로 넣을 때 규격: **폭 320px WebP**(기존 60장 평균 10KB).
   변환은 별도 라이브러리 없이 Chrome 의 canvas WebP 인코더로 했다.

### Express 라우팅

5. **`/ai-college` 와 `/ai-college/` 를 따로 라우트로 선언하면 자기 자신으로 301 무한루프가 난다.**
   Express 는 기본이 non-strict 라우팅이라 둘이 같은 라우트에 걸린다.
   한 핸들러에서 `req.path.endsWith('/')` 로 분기해야 한다. 슬래시가 없으면 301 로 붙여야
   상대경로(`./styles.css`)가 정상 해석된다. **SPA fallback 보다 앞에 둬야 한다.**
   (`backend/src/server.js:111~120` 에 주석으로 남겨 뒀다.)
6. `express.static` 이 `index:false` 라 **디렉터리 index 를 내주지 않는다.** 그래서 명시 라우트가 필요하다.
7. SPA fallback 때문에 **없는 정적 파일도 200(HTML)** 을 돌려준다.
   404 를 기대하고 검증하면 틀린 판단을 한다. `content_type` 이나 크기를 같이 봐라.

### CSS

8. `.gateway-btn.aicollege > *` 처럼 **`> *` 로 position 을 건드리면** `.tag`·`.btn-arrow` 의
   absolute 배치가 깨진다(화살표 코너가 카드 중앙으로 튀어나옴).
   텍스트 요소만 명시하고 나머지는 z-index 만 줘라.

### Windows / Git-bash 환경

9. **MSYS 경로 변환** — Git-bash 는 인자가 유닉스 절대경로처럼 보이면 Windows 경로로 바꿔버린다.
   `ssh host "mkdir -p ~/pnug-deploy/..."` 가 서버에 `C:/...` 로 전달돼
   `mkdir: cannot create directory '/c': Permission denied` 로 죽는다.
   → **원격 경로는 `/` 로 시작하지 않는 상대경로**로 써라(`pnug-deploy/...`, `arise-stack`).
   ssh 는 로그인 홈에서 명령을 실행하므로 동작은 같다.
10. 원격 명령에 `-F /dev/null` 을 줘서 **로컬 `~/.ssh/config` 를 무시**해라.
    다른 PC 의 config 에 남은 `BindAddress` 가 끼어들면 접속이 깨진다
    (번들을 다른 PC 에서 돌릴 때 실제로 문제였다).
11. **배치파일을 `printf` 로 쓰지 마라.** `\bin` 의 `\b` 가 백스페이스로 해석돼
    `C:\Program Files\Gitinash.exe` 같은 경로가 나온다. heredoc 을 써라.
12. Git for Windows 는 설치 형태에 따라 `bin\bash.exe` 가 없고 **`usr\bin\bash.exe` 만** 있다.
    `where bash` 폴백은 **WSL 의 `System32\bash.exe`** 를 먼저 잡는데 경로 규칙이 달라 못 쓴다.
    → 후보 경로를 명시적으로 훑고 System32·WindowsApps 는 제외해야 한다.
13. **한글 `.cmd` 파일명은 코드페이지에 따라 서로를 못 찾는다.**
    파일명은 ASCII, 본문은 UTF-8 + `chcp 65001`.
14. 셸에서 `node -e "긴 스크립트"` 로 검증 로직을 넘기면 인용 문제로 조용히 깨진다.
    파일로 분리해라(`deploy/check-faculty.js` 가 그래서 생겼다).
15. 콘솔 출력이 cp949 라서 파이썬으로 한글을 `print` 하면 `UnicodeEncodeError` 가 난다.
    결과를 파일로 쓰고 읽는 편이 안전하다.

### 디스크

16. 2026-08-24에 **C: 여유가 0바이트**까지 차서 Docker Desktop 이 내려갔다.
    `npm cache clean --force` 로 공간을 확보했다. 큰 임시 작업은 **D: 드라이브**에서 해라.

---

## 6. 다음에 해야 할 일

### 즉시

1. **미커밋 작업 7건을 커밋해라. 라이브가 git 보다 앞서 있다.**
   마지막 커밋 `6561cb4`. 미커밋 목록:
   ```
   M  .gitignore
   M  frontend/public/ai-college/app.js
   M  frontend/public/ai-college/faculty-data.js
   M  frontend/public/ai-college/index.html
   M  frontend/public/ai-college/styles.css
   ?? deploy/check-faculty.js
   ?? deploy/watch-and-deploy.sh
   ```
   AI대학 사이트는 하루 여러 번 배포됐는데 커밋이 따라가지 않았다. 배포 이력이 git 에 없다.
   (이 인수인계 폴더는 사본이므로 **원본 저장소에서** 커밋해야 한다.)
2. **검토 요청 PDF 처리** — `[붙임] AI대학 홈페이지 검토 요청_20260825.pdf` 의 "확인 필요" 항목을
   `docs/` 자료와 대조해 실제 오류인지 판정하는 작업이 **미완**이다.
   진행 주체가 불명확하니 먼저 확인할 것.

### 남은 데이터 정리

3. **교수 데이터 후행 공백 6건.**
   엑셀(`AI대학교원정보.xlsx`)과 사이트가 60명 전 필드 일치하는데, 사이트 쪽에만
   눈에 안 보이는 공백이 붙어 있다.

   | 교수 | 필드 | 차이 |
   |---|---|---|
   | 감진규 | 세부전공 | 끝에 `\xa0` (non-breaking space) |
   | 조준수 | 세부전공 | 끝에 `\xa0` |
   | 선호근 | 주요경력 | `-` 뒤에 `\u3000` (전각 공백) |
   | 권준호 | 주요경력 | 끝에 일반 공백 |
   | 박찬석 | 주요경력 | 2번째 줄 끝에 공백 |
   | 홍순도 | 주요경력 | 1번째 줄 끝에 공백 |

   글자 내용은 같다. 다만 사이트에 **교수명·세부전공 검색창**이 있어서, 끝에 `\xa0` 가 붙은
   값은 검색에 걸림돌이 될 여지가 있다.
   **원본(`D:/AIweb-site`)에서 고쳐야** 동기화 때 따라온다. 원본·사본 양쪽에 똑같이 있다.

### 문서와 실제 불일치 (정리 필요)

4. `CONTEXT-MAP.md` 가 낡았다.
   - `s30/` 을 3개 컨텍스트 중 하나로 설명하는데 **폴더가 없다**(미배포).
   - "단일 **Caddy**" 라고 적혀 있으나 실제 리버스 프록시는 **nginx** 다(`docker-compose.yml` 확인).
   - `backend/src/server.js` 의 SPA fallback 에도 `/s30` 예외 처리가 남아 있다.

### 운영 개선 후보

5. **엄밀한 무중단 배포.** 지금은 was 컨테이너가 1개라 백엔드 코드가 바뀌면 수 초 공백이 생긴다.
   was 2개 + nginx upstream 롤링으로 없앨 수 있으나 compose·nginx 구조를 바꿔야 한다.
   정적 파일만 바뀔 때는 `docker cp` 로 이미 공백이 없다.
6. **자동배포 감시를 세션과 분리.** `deploy/watch-and-deploy.sh` 가 터미널 세션과 함께 죽는다.
   계속 돌려야 한다면 Windows 작업 스케줄러에 등록하는 것이 맞다.
   (재가동 시 미배포 변경을 먼저 올리므로 지금도 데이터를 놓치지는 않는다.)
7. **`~/.ssh/config` 의 `BindAddress` 자동화.** Wi-Fi IP 가 바뀔 때마다 손으로 고쳐야 한다.
   `watch-and-deploy.sh` 의 `find_bind()` 처럼 되는 인터페이스를 찾는 방식이 더 낫다.
8. **AI대학 사이트를 원본 저장소와 어떻게 계속 나눠 관리할지 정할 것.**
   지금 구조는 "남의 저장소를 받아 우리 정책(로컬 폰트 등)을 덧칠해 배포"하는 형태라
   갈림·되돌림 사고가 반복된다. 원본에 정책을 흡수시키거나, 우리 쪽 패치를 스크립트로
   완전히 자동화하는 두 방향 중 하나로 정리하는 게 좋다.

---

## 7. 자격증명이 어디 있는지

**값은 이 문서에 쓰지 않는다. 위치만 적는다.**

| 무엇 | 어디 | 비고 |
|---|---|---|
| DB · Google OAuth · JWT · 관리자 초기계정 | `backend/.env` | **이 인수인계 폴더에 실제 값이 들어 있다.** 변수 목록은 `backend/.env.example` |
| 도커 컴포즈용 환경변수 | 서버 `~/arise-stack/.env` | 리포에 없다. `docker-compose.yml` 의 `env_file: .env` |
| Google Sheets 서비스 계정 키 | `GOOGLE_SHEETS_SA_KEY_PATH` 가 가리키는 파일 | 경로는 `backend/.env` 참고 |
| 서버 SSH 개인키 | 작업 PC `~/.ssh/id_ed25519`, `~/.ssh/id_ed25519_new` | 패스프레이즈 없음 |
| 서버 SSH 개인키 (사본) | `C:/Users/user/Desktop/ARISE-배포-20260825/key/` | 원클릭 배포 번들에 **개인키 2개 포함.** zip 도 같이 있다 |
| TLS 인증서 | 서버 `~/arise-stack/certs/` | `*.pusan.ac.kr` 와일드카드. 부속 사이트와 공용 |

### 보안상 조치가 필요한 것

- **이 인수인계 폴더에 실제 `.env` 가 포함돼 있다.** 메신저·클라우드·공유 폴더로 넘기면
  DB·OAuth·관리자 계정 정보가 함께 유출된다. 전달 방식을 확인할 것.
- 인계가 끝나면 **서버에서 기존 SSH 공개키를 제거하고 새 키를 발급**하는 것이 안전하다
  (서버 `~/.ssh/authorized_keys` 에서 해당 줄 삭제).
- 관리자 계정(`ADMIN_BOOTSTRAP_*`) 비밀번호도 인계 후 교체할 것.
- 데스크톱의 배포 번들(`ARISE-배포-20260825`)은 개인키를 품고 있으니 인계 후 삭제 권장.
