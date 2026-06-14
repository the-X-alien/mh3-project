#!/bin/bash
set -e

REPO="the-X-alien/mh3-project"
APP_NAME="Tab Dashboard"
INSTALL_DIR="/Applications"

echo ""
echo "  🙏 Shanti — Installing..."
echo ""

# Detect OS
OS="$(uname -s)"
ARCH="$(uname -m)"

if [ "$OS" != "Darwin" ]; then
  echo "  ✗ Shanti currently supports macOS only."
  exit 1
fi

# Get latest release download URL
RELEASE_URL="https://api.github.com/repos/${REPO}/releases/latest"
DOWNLOAD_URL=$(curl -fsSL "$RELEASE_URL" | grep "browser_download_url" | grep "\.dmg" | head -1 | cut -d '"' -f 4)

if [ -z "$DOWNLOAD_URL" ]; then
  # Fall back to direct app copy from known location
  echo "  → No release found. Trying direct install..."
  DOWNLOAD_URL=""
fi

TMPDIR_SHANTI=$(mktemp -d)
trap 'rm -rf "$TMPDIR_SHANTI"' EXIT

if [ -n "$DOWNLOAD_URL" ]; then
  echo "  → Downloading Shanti..."
  curl -fsSL -o "$TMPDIR_SHANTI/Shanti.dmg" "$DOWNLOAD_URL"

  echo "  → Mounting disk image..."
  hdiutil attach "$TMPDIR_SHANTI/Shanti.dmg" -mountpoint "$TMPDIR_SHANTI/mount" -quiet

  echo "  → Copying to Applications..."
  cp -R "$TMPDIR_SHANTI/mount/${APP_NAME}.app" "${INSTALL_DIR}/"

  hdiutil detach "$TMPDIR_SHANTI/mount" -quiet
else
  echo ""
  echo "  ✗ Could not find a release build."
  echo "    Please download Shanti manually from:"
  echo "    https://github.com/${REPO}/releases"
  echo ""
  exit 1
fi

echo ""
echo "  ✓ Shanti installed to ${INSTALL_DIR}/${APP_NAME}.app"
echo ""
echo "  Launch it from Spotlight or Applications."
echo "  It will appear as 🙏 in your menu bar."
echo ""
