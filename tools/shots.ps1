# 시험판의 장면을 그림 파일로 찍는다. 크롬을 머리 없이 띄운다.
# 쓰는 법(저장소 맨 위에서): powershell -NoProfile -ExecutionPolicy Bypass -File tools/shots.ps1
# 윈도우의 크롬은 창 너비를 500픽셀 아래로 줄이지 못한다. 700픽셀로 찍고 가운데 420픽셀을 잘라 낸다.
# 머리 없는 크롬이 그림을 쓰고도 끝나지 않을 때가 있다. 그래서 그림이 생기면 크롬을 끝낸다.
param([string]$Chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe")
Add-Type -AssemblyName System.Drawing
$root = (Get-Location).Path -replace '\\', '/'

function Shot([string]$name, [string]$tail) {
  $png = "$root/docs/mock/$name.png"
  if (Test-Path $png) { Remove-Item $png -Confirm:$false }
  $args = @('--headless=new', '--hide-scrollbars', '--allow-file-access-from-files', '--window-size=700,832',
    '--virtual-time-budget=4000', "--screenshot=$png", "file:///$root/docs/overlay-proto.html$tail")
  $p = Start-Process -FilePath $Chrome -ArgumentList $args -PassThru -WindowStyle Hidden
  for ($i = 0; $i -lt 60 -and -not (Test-Path $png); $i++) { Start-Sleep -Milliseconds 500 }
  Start-Sleep -Milliseconds 700
  if (-not $p.HasExited) { taskkill /PID $p.Id /T /F 2>$null | Out-Null }
  if (-not (Test-Path $png)) { "${name}: FAILED"; return }
  $b = [System.Drawing.Bitmap]::FromFile($png)
  $x = [int](($b.Width - 420) / 2)
  $c = $b.Clone((New-Object System.Drawing.Rectangle $x, 0, 420, $b.Height), $b.PixelFormat)
  $b.Dispose(); $c.Save($png, [System.Drawing.Imaging.ImageFormat]::Png); $c.Dispose()
  "$name.png"
}

Shot 'overlay-1' '?lang=ko'
Shot 'overlay-2' '?lang=ko#near'
Shot 'overlay-3' '?lang=ko#shot'
Shot 'overlay-4' '?lang=ja#shot'
Shot 'overlay-5' '?lang=zh#settings'
Shot 'overlay-6' '?lang=ko#hush'
Shot 'overlay-7' '?lang=ko#journal'
Shot 'overlay-8' '?lang=ja#list'
