#!/usr/bin/env bash
#
# Shanti — Tab Viewer installer (macOS / Linux)
# Clones the repo, installs dependencies, builds the desktop app, and launches it.
# Usage:  curl -fsSL https://mh3-project.vercel.app/install.sh | sh
#
set -euo pipefail

REPO="https://github.com/the-X-alien/mh3-project.git"
APP_DIR="${SHANTI_HOME:-$HOME/.shanti}"

say()  { printf "  \033[36m%s\033[0m\n" "$1"; }
ok()   { printf "  \033[32m%s\033[0m\n" "$1"; }
warn() { printf "  \033[33m%s\033[0m\n" "$1"; }
err()  { printf "  \033[31m%s\033[0m\n" "$1" >&2; }

printf "\n  \033[1mShanti — Tab Viewer\033[0m\n\n"

# ── Prerequisites ──────────────────────────────────────────────
if ! command -v git >/dev/null 2>&1; then
  err "Git is required but not installed."
  if [ "$(uname)" = "Darwin" ]; then say "Install it with: xcode-select --install"; else say "Install it with your package manager, e.g. sudo apt install git"; fi
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  warn "Node.js not found — attempting to install it..."
  if command -v brew >/dev/null 2>&1; then
    brew install node
  elif command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update && sudo apt-get install -y nodejs npm
  else
    err "Could not auto-install Node.js. Install Node 18+ from https://nodejs.org and re-run."
    exit 1
  fi
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
if [ "$NODE_MAJOR" -lt 18 ]; then
  err "Node.js 18 or newer is required (found $(node -v)). Please upgrade and re-run."
  exit 1
fi

# ── Fetch source ───────────────────────────────────────────────
if [ -d "$APP_DIR/.git" ]; then
  say "Updating existing install in $APP_DIR ..."
  git -C "$APP_DIR" fetch --depth 1 origin main
  git -C "$APP_DIR" reset --hard origin/main
else
  say "Cloning Shanti into $APP_DIR ..."
  rm -rf "$APP_DIR"
  git clone --depth 1 "$REPO" "$APP_DIR"
fi

cd "$APP_DIR"

# ── Build ──────────────────────────────────────────────────────
say "Installing dependencies (this may take a minute) ..."
npm install --no-audit --no-fund

say "Building the desktop app ..."
npm run build:electron

# ── Launcher ───────────────────────────────────────────────────
LAUNCHER="$APP_DIR/launch-shanti.sh"
cat > "$LAUNCHER" <<LAUNCH
#!/usr/bin/env bash
cd "$APP_DIR"
exec npx electron .
LAUNCH
chmod +x "$LAUNCHER"

# Convenience symlink on PATH if /usr/local/bin is writable
if [ -w /usr/local/bin ]; then
  ln -sf "$LAUNCHER" /usr/local/bin/shanti 2>/dev/null || true
fi

ok "Shanti installed."
say "Launching now — look for the 🙏 icon in your menu bar."
echo ""
say "To launch again later, run:  $LAUNCHER"
command -v shanti >/dev/null 2>&1 && say "...or just:  shanti"
echo ""

# ── Launch ─────────────────────────────────────────────────────
nohup npx electron . >/dev/null 2>&1 &
disown 2>/dev/null || true
