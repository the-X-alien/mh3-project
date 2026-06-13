#!/usr/bin/env bash
set -euo pipefail

REPO="the-X-alien/mh3-project"
API="https://api.github.com/repos/$REPO/releases/latest"

echo "Fetching latest Shanti release..."
LATEST=$(curl -sfL "$API" 2>/dev/null || true)
if [ -z "$LATEST" ]; then
  echo "Error: Could not fetch release info."
  exit 1
fi

if [ "$(uname)" = "Darwin" ]; then
  ASSET=$(echo "$LATEST" | grep -o '"browser_download_url": *"[^"]*\.dmg"' | head -1 | cut -d'"' -f4)
  [ -z "$ASSET" ] && ASSET=$(echo "$LATEST" | grep -o '"browser_download_url": *"[^"]*\.zip"' | head -1 | cut -d'"' -f4)
  if [ -z "$ASSET" ]; then
    echo "Error: No macOS installer found."
    exit 1
  fi
  echo "Downloading Shanti..."
  curl -sfL "$ASSET" -o /tmp/Shanti.dmg
  echo "Mounting DMG..."
  hdiutil attach /tmp/Shanti.dmg -nobrowse -quiet
  cp -R "/Volumes/Shanti/Shanti.app" /Applications/
  hdiutil detach "/Volumes/Shanti" -quiet
  rm /tmp/Shanti.dmg
  echo "Shanti installed! Launch from /Applications."
else
  ASSET=$(echo "$LATEST" | grep -o '"browser_download_url": *"[^"]*\.AppImage"' | head -1 | cut -d'"' -f4)
  [ -z "$ASSET" ] && ASSET=$(echo "$LATEST" | grep -o '"browser_download_url": *"[^"]*\.deb"' | head -1 | cut -d'"' -f4)
  if [ -z "$ASSET" ]; then
    echo "Error: No Linux installer found."
    exit 1
  fi
  echo "Downloading Shanti..."
  curl -sfL "$ASSET" -o /tmp/Shanti.AppImage
  chmod +x /tmp/Shanti.AppImage
  mkdir -p ~/Applications
  mv /tmp/Shanti.AppImage ~/Applications/
  echo "Shanti downloaded to ~/Applications/Shanti.AppImage"
fi
