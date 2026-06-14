# Shanti — Tab Viewer installer (Windows)
# Clones the repo, installs dependencies, builds the desktop app, launches it,
# and adds a Start Menu shortcut.
# Usage:  powershell -c "irm https://mh3-project.vercel.app/install.ps1 | iex"

$ErrorActionPreference = "Stop"

$repo   = "https://github.com/the-X-alien/mh3-project.git"
$appDir = Join-Path $env:LOCALAPPDATA "Shanti"

function Say  ($m) { Write-Host "  $m" -ForegroundColor Cyan }
function Ok   ($m) { Write-Host "  $m" -ForegroundColor Green }
function Warn ($m) { Write-Host "  $m" -ForegroundColor Yellow }
function Fail ($m) { Write-Host "  $m" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "  Shanti - Tab Viewer" -ForegroundColor White
Write-Host ""

# ── Prerequisites ──────────────────────────────────────────────
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Warn "Git not found - attempting to install via winget..."
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
  } else {
    Fail "Git is required. Install it from https://git-scm.com and re-run."
  }
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Warn "Node.js not found - attempting to install via winget..."
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    winget install --id OpenJS.NodeJS.LTS -e --source winget --accept-package-agreements --accept-source-agreements
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
  } else {
    Fail "Node.js 18+ is required. Install it from https://nodejs.org and re-run."
  }
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Fail "Node.js still not on PATH. Open a new terminal and re-run this command."
}

$nodeMajor = (node -p "process.versions.node.split('.')[0]")
if ([int]$nodeMajor -lt 18) {
  Fail "Node.js 18 or newer is required (found $(node -v)). Please upgrade and re-run."
}

# ── Fetch source ───────────────────────────────────────────────
if (Test-Path (Join-Path $appDir ".git")) {
  Say "Updating existing install in $appDir ..."
  git -C $appDir fetch --depth 1 origin main
  git -C $appDir reset --hard origin/main
} else {
  Say "Cloning Shanti into $appDir ..."
  if (Test-Path $appDir) { Remove-Item -Recurse -Force $appDir }
  git clone --depth 1 $repo $appDir
}

Set-Location $appDir

# ── Build ──────────────────────────────────────────────────────
Say "Installing dependencies (this may take a minute) ..."
npm install --no-audit --no-fund

Say "Building the desktop app ..."
npm run build:electron

# ── Launcher + Start Menu shortcut ─────────────────────────────
$launcher = Join-Path $appDir "Shanti.cmd"
"@echo off`r`ncd /d `"$appDir`"`r`nnpx electron ." | Out-File -FilePath $launcher -Encoding ascii -Force

$programs = Join-Path ([Environment]::GetFolderPath("StartMenu")) "Programs"
$shortcut = Join-Path $programs "Shanti.lnk"
$wscript  = New-Object -ComObject WScript.Shell
$sc = $wscript.CreateShortcut($shortcut)
$sc.TargetPath       = "cmd.exe"
$sc.Arguments        = "/c `"$launcher`""
$sc.WorkingDirectory = $appDir
$sc.WindowStyle      = 7  # minimized
$sc.Save()

Ok "Shanti installed."
Say "Launching now - look for the praying-hands icon in your system tray."
Write-Host ""
Say "To launch again later: Start Menu -> Shanti  (or run $launcher)"
Write-Host ""

# ── Launch ─────────────────────────────────────────────────────
Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npx electron ." -WorkingDirectory $appDir -WindowStyle Hidden
