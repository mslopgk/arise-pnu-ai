#!/usr/bin/env bash
# ARISE AI대학 사이트 원클릭 배포.
# 화이트리스트 IP 를 쓰는 컴퓨터에서 실행한다. 접속 키는 번들의 key/ 에 들어 있다.
#
#   bash deploy.sh              배포
#   bash deploy.sh --check      접속만 확인
#   bash deploy.sh --rollback   직전 이미지로 되돌리기
#
# 이미지 빌드는 서버에서 하므로 이 컴퓨터에 도커는 필요 없다.
set -uo pipefail

HOST=164.125.19.178
PORT=11097
USER=ubuntu
# 원격 경로는 반드시 '/' 로 시작하지 않는 상대경로로 둔다(로그인 홈 기준).
# Git-bash(MSYS)는 인자가 유닉스 절대경로처럼 보이면 Windows 경로로 바꿔버려서
# '~/pnug-deploy/...' 가 서버에 'C:/...' 로 전달되고 mkdir 이 /c 를 만들려다 실패한다.
REMOTE=pnug-deploy/oneclick-20260825
STACK=arise-stack
IMAGE=arise-was
BAK=bak-20260825-oneclick
SITE=https://arise-ai.pusan.ac.kr
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

say() { printf '\n== %s\n' "$*"; }
ok()  { printf '   OK   %s\n' "$*"; }
bad() { printf '   실패 %s\n' "$*"; }
die() { printf '\n중단: %s\n' "$*"; exit 1; }

# ---------- 접속 키 ----------
# zip/복사 과정에서 권한이 느슨해지면 ssh 가 키를 거부하므로(UNPROTECTED PRIVATE
# KEY FILE) 임시 사본에 600 을 주고 쓴다. 끝나면 지운다.
# 로컬 ~/.ssh/config 는 -F /dev/null 로 무시한다 — 다른 PC 의 config 에 남은
# BindAddress 같은 항목이 끼어들면 접속이 실패한다.
TMPKEYDIR="$(mktemp -d 2>/dev/null || echo "${TMP:-/tmp}/pnugkey.$$")"
mkdir -p "$TMPKEYDIR"; chmod 700 "$TMPKEYDIR" 2>/dev/null
trap 'rm -rf "$TMPKEYDIR" 2>/dev/null' EXIT INT TERM

KEYS=()
if [ -n "${PNUG_SSH_KEY:-}" ]; then
  KEYS=("$PNUG_SSH_KEY")
else
  for k in "$HERE"/key/id_ed25519 "$HERE"/key/id_ed25519_new; do
    [ -f "$k" ] || continue
    t="$TMPKEYDIR/$(basename "$k")"
    cp "$k" "$t" && chmod 600 "$t" 2>/dev/null && KEYS+=("$t")
  done
fi

SSHBASE=(-F /dev/null -o IdentitiesOnly=yes -o ConnectTimeout=20 \
         -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR)
KEYOPT=()
mkssh() {
  SSH=(ssh "${KEYOPT[@]}" "${SSHBASE[@]}" -p "$PORT" "$USER@$HOST")
  SCP=(scp "${KEYOPT[@]}" "${SSHBASE[@]}" -P "$PORT")
}
mkssh

# ---------- 0. 사전 점검 ----------
say "사전 점검"
command -v ssh >/dev/null || die "ssh 가 없습니다. Git for Windows 를 설치하세요."
command -v scp >/dev/null || die "scp 가 없습니다."
[ -d "$HERE/payload" ] || die "payload 폴더가 없습니다. 번들을 통째로 복사했는지 확인하세요."

if command -v md5sum >/dev/null && [ -f "$HERE/MANIFEST.md5" ]; then
  ( cd "$HERE/payload" && md5sum -c ../MANIFEST.md5 >/dev/null 2>&1 ) \
    && ok "payload 무결성 확인 (9개 파일)" \
    || die "payload 가 손상됐습니다(md5 불일치). 번들을 다시 받으세요."
fi

[ "${#KEYS[@]}" -gt 0 ] || die "key 폴더에 개인키가 없습니다. PNUG_SSH_KEY 로 지정하세요."

printf '   서버 접속 확인 ... '
CONNECTED=0; USED_KEY=""
for k in "${KEYS[@]}"; do
  KEYOPT=(-i "$k"); mkssh
  if "${SSH[@]}" -o BatchMode=yes 'echo up' >/dev/null 2>&1; then
    CONNECTED=1; USED_KEY="$(basename "$k")"; break
  fi
done

if [ "$CONNECTED" = "1" ]; then
  echo "성공 (키: $USED_KEY)"
else
  echo "실패"
  MYIP="$(curl -s --max-time 10 https://api.ipify.org 2>/dev/null || echo '조회 실패')"
  TRIED=""
  for k in "${KEYS[@]}"; do TRIED="$TRIED $(basename "$k")"; done
  cat <<MSG

  서버 $HOST:$PORT 에 접속할 수 없습니다.
  이 컴퓨터의 공인 IP : $MYIP
  시도한 키           :$TRIED

  가능한 원인
    1) 이 IP 가 서버 화이트리스트에 없다  -> 화이트리스트 IP 회선에서 실행
    2) 번들의 키가 서버에서 제거됐다      -> 서버의 authorized_keys 확인
    3) 다른 키를 쓰려면
         PNUG_SSH_KEY=/c/Users/이름/.ssh/키파일 bash deploy.sh
MSG
  exit 1
fi

[ "${1:-}" = "--check" ] && { say "접속 확인만 하고 종료"; exit 0; }

# ---------- 롤백 ----------
if [ "${1:-}" = "--rollback" ]; then
  say "롤백"
  "${SSH[@]}" "docker image inspect $IMAGE:$BAK >/dev/null 2>&1" \
    || die "롤백 대상 $IMAGE:$BAK 가 서버에 없습니다(아직 배포 전이거나 정리됨)."
  "${SSH[@]}" "set -e; docker tag $IMAGE:$BAK $IMAGE:latest; cd $STACK && docker compose up -d" \
    || die "롤백 실패"
  ok "직전 이미지로 되돌렸습니다"
  exit 0
fi

# ---------- 1. 전송 ----------
say "1/4  변경분 전송"
"${SSH[@]}" "rm -rf $REMOTE && mkdir -p $REMOTE/assets" || die "원격 디렉터리 생성 실패"
"${SCP[@]}" "$HERE/payload/Dockerfile" "$HERE/payload/app.js" "$HERE/payload/styles.css" \
            "$HERE/payload/faculty-data.js" "$USER@$HOST:$REMOTE/" || die "전송 실패"
"${SCP[@]}" "$HERE"/payload/assets/*.png "$USER@$HOST:$REMOTE/assets/" || die "이미지 전송 실패"
N="$("${SSH[@]}" "find $REMOTE -type f | wc -l" | tr -d '\r ')"
ok "전송 완료 ($N 개 파일)"

# ---------- 2. 빌드 ----------
say "2/4  서버에서 레이어 빌드"
"${SSH[@]}" "set -e; cd $REMOTE; docker tag $IMAGE:latest $IMAGE:$BAK; echo '   롤백 태그: $IMAGE:$BAK'; docker build -t $IMAGE:latest . 2>&1 | tail -3" \
  || die "빌드 실패 - 서버 이미지는 교체되지 않았습니다"
ok "이미지 빌드"

# ---------- 3. 재시작 ----------
say "3/4  was 컨테이너만 재생성"
"${SSH[@]}" "cd $STACK && docker compose up -d 2>&1 | tail -3; docker compose ps --format '{{.Name}}  {{.Status}}'" \
  || die "재생성 실패 - 'bash deploy.sh --rollback' 으로 되돌리세요"
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
check() {
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

if command -v md5sum >/dev/null; then
  for f in app.js styles.css faculty-data.js; do
    L="$(md5sum "$HERE/payload/$f" | cut -d' ' -f1)"
    R="$(curl -sk --max-time 40 "$SITE/ai-college/$f" | md5sum | cut -d' ' -f1)"
    if [ "$L" = "$R" ]; then ok "$f 내용 일치"; else bad "$f 내용 불일치 (반영 안 됨)"; FAIL=$((FAIL+1)); fi
  done
fi

echo
if [ "$FAIL" -eq 0 ]; then
  printf '배포 완료 - %s/ai-college/\n' "$SITE"
  printf '되돌리려면: bash deploy.sh --rollback (또는 ROLLBACK.cmd)\n'
else
  printf '검증 %d건 실패. 되돌리려면: bash deploy.sh --rollback\n' "$FAIL"
  exit 1
fi
