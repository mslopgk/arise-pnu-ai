#!/usr/bin/env bash
# AI대학 홈페이지 소스 → frontend/public/ai-college/ 동기화.
#
# 그 사이트는 별도 저장소(기본 D:/AIweb-site)에서 개발되고, 우리는 그 산출물을
# arise-ai.pusan.ac.kr/ai-college/ 에서 직접 서빙한다. 소스가 갱신될 때마다
# 손으로 복사하면 index.html 의 Google Fonts CDN 링크를 로컬 번들 링크로
# 되돌리는 단계를 빠뜨리기 쉬우므로(원본은 CDN 을 쓴다) 이 스크립트로 묶는다.
#
# 사용:  bash deploy/sync-ai-college.sh [소스경로]
# 이후:  cd frontend && npm run build   →  변경분만 서버로 배포
set -euo pipefail

SRC="${1:-/d/AIweb-site}"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DST="$REPO/frontend/public/ai-college"

[ -d "$SRC" ] || { echo "소스 없음: $SRC" >&2; exit 1; }
[ -d "$DST/fonts" ] || { echo "폰트 번들 없음: $DST/fonts (최초 1회는 수동 생성 필요)" >&2; exit 1; }

echo "소스: $SRC"
echo "대상: $DST"

# fonts/ 는 우리가 만든 것이라 보존하고, 원본에서 오는 것만 갈아끼운다.
rm -rf "$DST/assets"
for f in index.html app.js styles.css faculty-data.js; do
  cp "$SRC/$f" "$DST/$f"
done
cp -r "$SRC/assets" "$DST/assets"

# index.html: Google Fonts CDN 링크(preconnect 2줄 + css2 1줄) → 로컬 번들 1줄.
python - "$DST/index.html" <<'PY'
import io, re, sys

p = sys.argv[1]
s = io.open(p, encoding='utf-8').read()

link = (
    '    <!-- Noto Sans KR 가변 폰트 로컬 번들 — Google Fonts CDN 대신(폐쇄망 대응) -->\n'
    '    <link rel="stylesheet" href="./fonts/noto-sans-kr.css" />\n'
)

before = s
s = re.sub(r'[ \t]*<link rel="preconnect" href="https://fonts\.(googleapis|gstatic)\.com"[^>]*>\n', '', s)
s = re.sub(r'[ \t]*<link href="https://fonts\.googleapis\.com/css2[^>]*>\n', '', s)
if s == before:
    print('  [경고] Google Fonts 링크를 찾지 못했습니다 — 원본 head 구조가 바뀐 듯합니다.')

if './fonts/noto-sans-kr.css' not in s:
    marker = '    <link rel="stylesheet" href="./styles.css'
    i = s.index(marker)
    s = s[:i] + link + s[i:]

io.open(p, 'w', encoding='utf-8').write(s)
PY

echo
echo "--- 검증 ---"
if grep -qiE 'googleapis|gstatic' "$DST/index.html"; then
  echo "  실패: index.html 에 아직 Google Fonts 참조가 남아 있습니다" >&2
  grep -niE 'googleapis|gstatic' "$DST/index.html" >&2
  exit 1
fi
grep -q './fonts/noto-sans-kr.css' "$DST/index.html" \
  && echo "  OK  로컬 폰트 링크 적용" \
  || { echo "  실패: 로컬 폰트 링크가 없습니다" >&2; exit 1; }
echo "  OK  파일 $(find "$DST" -type f | wc -l)개 / $(du -sh "$DST" | cut -f1)"
echo "      (assets $(find "$DST/assets" -type f | wc -l)개, fonts $(find "$DST/fonts" -type f | wc -l)개)"
echo
echo "다음: cd frontend && npm run build"
