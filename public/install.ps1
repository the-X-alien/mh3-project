param([switch]$Silent)

$repo = "the-X-alien/mh3-project"
$releases = "https://api.github.com/repos/$repo/releases/latest"

try {
  $latest = Invoke-RestMethod -Uri $releases -ErrorAction Stop
  $asset = $latest.assets | Where-Object { $_.name -like "*.exe" -or $_.name -like "*.msi" } | Select-Object -First 1
  if (-not $asset) {
    Write-Host "No installer found for Windows in the latest release."
    exit 1
  }
  $url = $asset.browser_download_url
  $out = "$env:TEMP\Shanti-Installer.exe"
  Write-Host "Downloading Shanti $($latest.tag_name)..." -ForegroundColor Cyan
  Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing
  Write-Host "Downloaded to $out" -ForegroundColor Green
  if (-not $Silent) {
    Start-Process -FilePath $out -Wait
  }
  Write-Host "Shanti installed! Launch from Start Menu." -ForegroundColor Green
} catch {
  Write-Host "Installation failed: $_" -ForegroundColor Red
  exit 1
}
