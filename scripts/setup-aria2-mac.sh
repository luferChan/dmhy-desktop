#!/bin/bash
# Run once before build:mac to bundle aria2c into resources/
set -e

ARIA2=$(which aria2c 2>/dev/null || echo "")
if [ -z "$ARIA2" ]; then
  BREW_PREFIX=$(brew --prefix aria2 2>/dev/null || echo "")
  if [ -n "$BREW_PREFIX" ]; then
    ARIA2="$BREW_PREFIX/bin/aria2c"
  fi
fi

if [ -z "$ARIA2" ] || [ ! -f "$ARIA2" ]; then
  echo "Error: aria2c not found. Install with: brew install aria2"
  exit 1
fi

cp "$ARIA2" resources/aria2c
chmod +x resources/aria2c

ARCH_INFO=$(file -b resources/aria2c)
if [[ "$ARCH_INFO" != *"arm64"* ]]; then
  echo "Error: resources/aria2c is not arm64 (got: $ARCH_INFO)"
  echo "This project ships arm64 macOS builds only. Install arm64 aria2c via Apple Silicon Homebrew:"
  echo "  /opt/homebrew/bin/brew install aria2"
  rm -f resources/aria2c
  exit 1
fi

echo "Copied arm64 aria2c to resources/ from $ARIA2"
