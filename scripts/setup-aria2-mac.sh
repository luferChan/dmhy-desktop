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
echo "Copied aria2c to resources/ from $ARIA2"
