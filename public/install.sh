#!/usr/bin/env bash
set -euo pipefail

REPO="the-X-alien/mh3-project"
API="https://api.github.com/repos/$REPO/releases/latest"

echo ""
echo "  Shanti — Installer"
echo ""

LATEST=$(curl -sfL "$API" 2>/dev/null || true)

if [ -z "$LATEST" ] || echo "$LATEST" | grep -q '"message":.*"Not Found"'; then
  echo "  No release published yet."
  echo ""
  echo "  To build from source (requires Node.js 18+ and Git):"
  echo "    git clone https://github.com/$REPO.git"
  echo "    cd mh3-project"
  echo "    npm install"
  echo "    npm run dist"
  echo ""
  echo "  Visit https://github.com/$REPO for the latest instructions."
  exit 1
fi

VERSION=$(echo "$LATEST" | grep -o '"tag_name": *"[^"]*"' | cut -d'"' -f4)

if [ "$(uname)" = "Darwin" ]; then
  # macOS — look for the predictable DMG artifact name first
  ASSET=$(echo "$LATEST" | grep -o '"browser_download_url": *"[^"]*Shanti-[^"]*\.dmg"' | head -1 | cut -d'"' -f4)
  [ -z "$ASSET" ] && ASSET=$(echo "$LATEST" | grep -o '"browser_download_url": *"[^"]*\.dmg"' | head -1 | cut -d'"' -f4)

  if [ -z "$ASSET" ]; then
    echo "  No macOS installer (.dmg) found in release $VERSION."
    echo "  Visit https://github.com/$REPO/releases"
    exit 1
  fi

  echo "  Downloading Shanti $VERSION for macOS..."
  curl -L "$ASSET" -o /tmp/Shanti.dmg --progress-bar
  echo "  Mounting..."
  hdiutil attach /tmp/Shanti.dmg -nobrowse -quiet
  echo "  Installing to /Applications..."
  cp -R "/Volumes/Shanti/Shanti.app" /Applications/
  hdiutil detach "/Volumes/Shanti" -quiet
  rm /tmp/Shanti.dmg
  echo "  Done! Launch Shanti from /Applications."

else
  # Linux
  ASSET=$(echo "$LATEST" | grep -o '"browser_download_url": *"[^"]*\.AppImage"' | head -1 | cut -d'"' -f4)
  [ -z "$ASSET" ] && ASSET=$(echo "$LATEST" | grep -o '"browser_download_url": *"[^"]*\.deb"' | head -1 | cut -d'"' -f4)

  if [ -z "$ASSET" ]; then
    echo "  No Linux installer found in release $VERSION."
    echo "  Visit https://github.com/$REPO/releases"
    exit 1
  fi

  if echo "$ASSET" | grep -q '\.deb$'; then
    echo "  Downloading Shanti $VERSION (.deb)..."
    curl -L "$ASSET" -o /tmp/shanti.deb --progress-bar
    sudo dpkg -i /tmp/shanti.deb
    rm /tmp/shanti.deb
    echo "  Done! Launch Shanti from your app launcher."
  else
    echo "  Downloading Shanti $VERSION (.AppImage)..."
    mkdir -p ~/Applications
    curl -L "$ASSET" -o ~/Applications/Shanti.AppImage --progress-bar
    chmod +x ~/Applications/Shanti.AppImage
    echo "  Done! Run ~/Applications/Shanti.AppImage to launch."
  fi
fi
