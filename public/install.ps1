# Shanti — Tab Viewer installer (Windows)
# Clones the repo, builds tabdashboardv2, launches it as a system tray app.
# Usage:  powershell -c "irm https://mh3-project.vercel.app/install.ps1 | iex"

$ErrorActionPreference = "Stop"

$repo    = "https://github.com/the-X-alien/mh3-project.git"
$appBase = Join-Path $env:LOCALAPPDATA "Shanti"
$appDir  = Join-Path $appBase "tabdashboardv2"

function Say  ($m) { Write-Host "  $m" -ForegroundColor Cyan }
function Ok   ($m) { Write-Host "  ✓ $m" -ForegroundColor Green }
function Fail ($m) { Write-Host "  ✗ $m" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "  🙏 Shanti — Tab Viewer" -ForegroundColor White
Write-Host ""

# ── Prerequisites ──────────────────────────────────────────────
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Say "Git not found — attempting install via winget..."
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
  } else {
    Fail "Git is required. Install from https://git-scm.com and re-run."
  }
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Say "Node.js not found — attempting install via winget..."
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    winget install --id OpenJS.NodeJS.LTS -e --source winget --accept-package-agreements --accept-source-agreements
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
  } else {
    Fail "Node.js 18+ is required. Install from https://nodejs.org and re-run."
  }
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Fail "Node.js still not on PATH. Open a new terminal and re-run."
}

$nodeMajor = [int](node -p "process.versions.node.split('.')[0]")
if ($nodeMajor -lt 18) { Fail "Node.js 18+ required (found $(node -v)). Please upgrade." }

# ── Fetch source ───────────────────────────────────────────────
if (Test-Path (Join-Path $appBase ".git")) {
  Say "Updating existing install..."
  git -C $appBase fetch --depth 1 origin main
  git -C $appBase reset --hard origin/main
} else {
  Say "Cloning Shanti..."
  if (Test-Path $appBase) { Remove-Item -Recurse -Force $appBase }
  git clone --depth 1 $repo $appBase
}

# ── Build tabdashboardv2 ───────────────────────────────────────
Say "Installing dependencies (this may take a minute)..."
Set-Location $appDir
npm install --no-audit --no-fund

Say "Building..."
npm run build

# ── Launcher script ────────────────────────────────────────────
$launcher = Join-Path $appBase "Shanti.cmd"
"@echo off`r`ncd /d `"$appDir`"`r`nnpx electron . %*" | Out-File -FilePath $launcher -Encoding ascii -Force

# Start Menu shortcut
$programs  = Join-Path ([Environment]::GetFolderPath("StartMenu")) "Programs"
$shortcut  = Join-Path $programs "Shanti.lnk"
$wscript   = New-Object -ComObject WScript.Shell
$sc = $wscript.CreateShortcut($shortcut)
$sc.TargetPath       = "cmd.exe"
$sc.Arguments        = "/c `"$launcher`""
$sc.WorkingDirectory = $appDir
$sc.WindowStyle      = 7
$sc.Save()

# ── Launch ─────────────────────────────────────────────────────
Say "Launching Shanti..."
Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "`"$launcher`"" -WindowStyle Hidden

Write-Host ""
Ok "Shanti installed and running!"
Say "Look for 🙏 in your system tray."
Say "To relaunch: Start Menu → Shanti"
Write-Host ""
