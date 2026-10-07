#!/usr/bin/env bash
# 시험판의 장면을 그림 파일로 찍는다. 크롬을 머리 없이 띄운다.
# 쓰는 법: bash tools/shots.sh   (저장소 맨 위에서)
# 윈도우의 크롬은 창 너비를 500픽셀 아래로 줄이지 못한다. 700픽셀로 찍고 가운데 420픽셀을 잘라 낸다.
set -euo pipefail
CHROME="${CHROME:-/c/Program Files/Google/Chrome/Application/chrome.exe}"
ROOT="$(pwd -W 2>/dev/null || pwd)"

shot() {   # shot <그림 이름> <주소 뒤에 붙일 것>
  "$CHROME" --headless=new --hide-scrollbars --allow-file-access-from-files --window-size=700,832 \
    --virtual-time-budget=4000 --screenshot="$ROOT/docs/mock/$1.png" "file:///$ROOT/docs/overlay-proto.html$2" >/dev/null 2>&1
  powershell -NoProfile -Command "Add-Type -AssemblyName System.Drawing; \$p='$ROOT/docs/mock/$1.png'; \$b=[System.Drawing.Bitmap]::FromFile(\$p); \$x=[int]((\$b.Width-420)/2); \$c=\$b.Clone((New-Object System.Drawing.Rectangle \$x,0,420,\$b.Height),\$b.PixelFormat); \$b.Dispose(); \$c.Save(\$p,[System.Drawing.Imaging.ImageFormat]::Png); \$c.Dispose()"
  echo "$1.png"
}

shot overlay-1 "?lang=ko"
shot overlay-2 "?lang=ko#near"
shot overlay-3 "?lang=ko#shot"
shot overlay-4 "?lang=ja#shot"
shot overlay-5 "?lang=zh#settings"
shot overlay-6 "?lang=ko#hush"
