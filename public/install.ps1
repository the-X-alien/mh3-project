param([switch]$Silent)

$repo = "the-X-alien/mh3-project"
$api  = "https://api.github.com/repos/$repo/releases/latest"

Write-Host ""
Write-Host "  Shanti — Windows Installer" -ForegroundColor Cyan
Write-Host ""

try {
  $latest = Invoke-RestMethod -Uri $api -ErrorAction Stop

  # Look for the NSIS installer by the predictable artifact name first, then any .exe
  $asset = $latest.assets | Where-Object { $_.name -like "Shanti-Setup-*.exe" } | Select-Object -First 1
  if (-not $asset) {
    $asset = $latest.assets | Where-Object { $_.name -like "*.exe" } | Select-Object -First 1
  }

  if (-not $asset) {
    Write-Host "  No Windows installer found in release $($latest.tag_name)." -ForegroundColor Yellow
    Write-Host "  Visit https://github.com/$repo/releases" -ForegroundColor Yellow
    exit 1
  }

  $version = $latest.tag_name
  $out     = "$env:TEMP\Shanti-Setup.exe"

  Write-Host "  Downloading Shanti $version..." -ForegroundColor Cyan
  Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $out -UseBasicParsing
  Write-Host "  Download complete." -ForegroundColor Green

  if (-not $Silent) {
    Write-Host "  Launching installer..." -ForegroundColor Cyan
    Start-Process -FilePath $out -Wait
  }

  Write-Host "  Shanti $version installed. Launch from Start Menu or Desktop." -ForegroundColor Green

} catch {
  $msg = $_.Exception.Message
  if ($msg -match "404|Not Found") {
    Write-Host "  No release published yet." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  To build from source (requires Node.js 18+ and Git):" -ForegroundColor Cyan
    Write-Host "    git clone https://github.com/$repo.git" -ForegroundColor White
    Write-Host "    cd mh3-project" -ForegroundColor White
    Write-Host "    npm install" -ForegroundColor White
    Write-Host "    npm run dist" -ForegroundColor White
    Write-Host "    .\release\win-unpacked\Shanti.exe  # portable, no install needed" -ForegroundColor White
    Write-Host ""
    Write-Host "  Or visit https://github.com/$repo for the latest instructions." -ForegroundColor Cyan
  } else {
    Write-Host "  Error: $msg" -ForegroundColor Red
  }
  exit 1
}
