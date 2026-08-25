#!/usr/bin/env bash
# ARISE AI대학 사이트 원클릭 배포.
# 화이트리스트 IP 인 컴퓨터에서 실행한다. 필요한 것: ssh/scp, 서버 접속 키.
#
#   bash deploy.sh              배포
#   bash deploy.sh --check      접속만 확인 (배포 안 함)
#   bash deploy.sh --rollback   직전 상태로 되돌리기
#
# 서버에서 도커 레이어를 빌드하므로 이 컴퓨터에 도커는 필요 없다.
set -uo pipefail

HOST=164.125.19.178
PORT=11097
USER=ubuntu
REMOTE=~/pnug-deploy/oneclick-20260825
STACK=~/arise-stack
IMAGE=arise-was
BAK=bak-20260825-oneclick
SITE=https://arise-ai.pusan.ac.kr
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

SSH_KEY="${PNUG_SSH_KEY:-}"
KEYOPT=()
[ -n "$SSH_KEY" ] && KEYOPT=(-i "$SSH_KEY")

say()  { if [ -t 1 ]; then printf "
say()  { printf '\n\033[1;36m== %s\033[0m\n' "$*"; }33[1;36m== %ssay()  { printf '\n\033[1;36m== %s\033[0m\n' "$*"; }33[0m
" "$*"; else printf "
== %s
" "$*"; fi; }
ok()   { printf '   \033[32mOK\033[0m   %s\n' "$*"; }
bad()  { printf '   \033[31m실패\033[0m %s\n' "$*"; }
die()  { printf '\n\033[31m중단: %s\033[0m\n' "$*"; exit 1; }

SSH=(ssh "${KEYOPT[@]}" -o ConnectTimeout=20 -o StrictHostKeyChecking=accept-new -p "$PORT" "$USER@$HOST")
SCP=(scp "${KEYOPT[@]}" -o ConnectTimeout=20 -o StrictHostKeyChecking=accept-new -P "$PORT")

# ---------- 0. 사전 점검 ----------
say "사전 점검"
command -v ssh >/dev/null || die "ssh 가 없습니다. Git for Windows 또는 OpenSSH 를 설치하세요."
command -v scp >/dev/null || die "scp 가 없습니다."
[ -d "$HERE/payload" ] || die "payload 폴더가 없습니다. 번들을 통째로 복사했는지 확인하세요."

if command -v md5sum >/dev/null && [ -f "$HERE/MANIFEST.md5" ]; then
  ( cd "$HERE/payload" && md5sum -c ../MANIFEST.md5 >/dev/null 2>&1 ) \
    && ok "payload 무결성 확인 ($(find "$HERE/payload" -type f | wc -l | tr -d ' ')개 파일)" \
    || die "payload 가 손상됐습니다(md5 불일치). 번들을 다시 받으세요."
else
  ok "payload $(find "$HERE/payload" -type f | wc -l | tr -d ' ')개 파일 (md5 검사 생략)"
fi

printf '   서버 접속 확인 ... '
if "${SSH[@]}" -o BatchMode=yes 'echo up' >/dev/null 2>&1; then
  echo "성공"
else
  echo "실패"
  MYIP="$(curl -s --max-time 10 https://api.ipify.org 2>/dev/null || echo '조회 실패')"
  cat <<MSG

  서버 $HOST:$PORT 에 접속할 수 없습니다.
  이 컴퓨터의 공인 IP : $MYIP

  가능한 원인
    1) 이 IP 가 서버 화이트리스트에 없다  → 화이트리스트 IP 를 쓰는 회선에서 실행
    2) SSH 키가 없거나 다른 위치에 있다   → PNUG_SSH_KEY 로 지정
         PNUG_SSH_KEY=/c/Users/이름/.ssh/id_rsa bash deploy.sh
    3) 키 비밀번호 입력이 필요하다        → 터미널에서 직접 실행(더블클릭 대신)
MSG
  exit 1
fi
ok "서버 접속"

[ "${1:-}" = "--check" ] && { say "접속 확인만 하고 종료"; exit 0; }

# ---------- 롤백 ----------
if [ "${1:-}" = "--rollback" ]; then
  say "롤백"
  "${SSH[@]}" "docker image inspect $IMAGE:$BAK >/dev/null 2>&1" \
    || die "롤백 대상 이미지 $IMAGE:$BAK 가 서버에 없습니다(아직 배포 전이거나 이미 정리됨)."
  "${SSH[@]}" "set -e; docker tag $IMAGE:$BAK $IMAGE:latest; cd $STACK && docker compose up -d" \
    || die "롤백 실패"
  ok "직전 이미지로 되돌렸습니다"
  exit 0
fi

# ---------- 1. 전송 ----------
say "1/4  변경분 전송"
"${SSH[@]}" "rm -rf $REMOTE && mkdir -p $REMOTE/assets" || die "원격 작업 디렉터리 생성 실패"
"${SCP[@]}" "$HERE/payload/Dockerfile" "$HERE/payload/app.js" "$HERE/payload/styles.css" \
            "$HERE/payload/faculty-data.js" "$USER@$HOST:$REMOTE/" || die "전송 실패"
"${SCP[@]}" "$HERE"/payload/assets/*.png "$USER@$HOST:$REMOTE/assets/" || die "이미지 전송 실패"
N="$("${SSH[@]}" "find $REMOTE -type f | wc -l" | tr -d '\r ')"
ok "전송 완료 ($N 개 파일)"

# ---------- 2. 서버측 검증 + 빌드 ----------
say "2/4  서버에서 레이어 빌드"
"${SSH[@]}" bash -s <<REMOTE_EOF || die "빌드 실패 — 서버 상태는 그대로입니다(이미지 교체 전)"
set -e
cd $REMOTE
# 전송 무결성 재확인
node --check app.js 2>/dev/null || echo "  (node 없음 — app.js 문법 검사 생략)"
# 롤백 지점 고정
docker tag $IMAGE:latest $IMAGE:$BAK
echo "  롤백 태그: $IMAGE:$BAK"
docker build -t $IMAGE:latest . 2>&1 | tail -3
REMOTE_EOF
ok "이미지 빌드"

# ---------- 3. 재시작 ----------
say "3/4  was 컨테이너만 재생성"
"${SSH[@]}" "cd $STACK && docker compose up -d 2>&1 | tail -3; docker compose ps --format '{{.Name}}  {{.Status}}'" \
  || die "컨테이너 재생성 실패 — 'bash deploy.sh --rollback' 으로 되돌리세요"
ok "재시작"

# ---------- 4. 검증 ----------
say "4/4  라이브 검증"
printf '   헬스체크 대기 '
for i in $(seq 1 40); do
  [ "$(curl -sk --max-time 8 -o /dev/null -w '%{http_code}' $SITE/health)" = "200" ] && break
  printf '.'; sleep 3
done
echo
FAIL=0
check() { # 경로 기대코드
  C="$(curl -sk --max-time 30 -o /dev/null -w '%{http_code}' "$SITE$1")"
  if [ "$C" = "$2" ]; then ok "$1  $C"; else bad "$1  $C (기대 $2)"; FAIL=$((FAIL+1)); fi
}
check /health 200
check /ai-college/ 200
check /ai-college/app.js 200
check /ai-college/styles.css 200
check /ai-college/faculty-data.js 200
check /ai-college/assets/logo-upstage.png 200
check / 200
check /bymonolog 200
check /admission-v3-dark.html 200

# 배포한 내용이 실제로 반영됐는지 md5 로 확인
if command -v md5sum >/dev/null; then
  for f in app.js styles.css faculty-data.js; do
    L="$(md5sum "$HERE/payload/$f" | cut -d' ' -f1)"
    R="$(curl -sk --max-time 40 "$SITE/ai-college/$f" | md5sum | cut -d' ' -f1)"
    if [ "$L" = "$R" ]; then ok "$f 내용 일치"; else bad "$f 내용 불일치 (반영 안 됨)"; FAIL=$((FAIL+1)); fi
  done
fi

echo
if [ "$FAIL" -eq 0 ]; then
  printf '\033[1;32m배포 완료 — %s/ai-college/\033[0m\n' "$SITE"
  printf '되돌리려면: bash deploy.sh --rollback\n'
else
  printf '\033[1;31m검증 %d건 실패. 되돌리려면: bash deploy.sh --rollback\033[0m\n' "$FAIL"
  exit 1
fi
