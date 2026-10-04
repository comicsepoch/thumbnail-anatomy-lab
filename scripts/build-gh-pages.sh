#!/usr/bin/env bash
# Builds a static export of the app suitable for GitHub Pages.
#
# GitHub Pages has no server, so the secure server-side /api/analyze route
# can't exist in this build — it's temporarily moved out of the way, and the
# app instead calls the vision model directly from the browser using
# NEXT_PUBLIC_GEMINI_API_KEY (see src/lib/clientAnalyze.ts for the tradeoffs
# of that approach: the key is bundled into the shipped JS and will be
# publicly visible).
#
# Usage:
#   NEXT_PUBLIC_GEMINI_API_KEY=xxxx ./scripts/build-gh-pages.sh
#
# Output goes to ./out — publish that directory's contents to your gh-pages
# branch (e.g. with the `gh-pages` npm package, or manually with git).
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -z "${NEXT_PUBLIC_GEMINI_API_KEY:-}" ]; then
  echo "Warning: NEXT_PUBLIC_GEMINI_API_KEY is not set — the deployed site will show OCR + colors only, no AI sections." >&2
fi

API_DIR="src/app/api"
BACKUP_DIR="$(mktemp -d)/api-backup"

cleanup() {
  if [ -d "$BACKUP_DIR" ] && [ ! -d "$API_DIR" ]; then
    mv "$BACKUP_DIR" "$API_DIR"
  fi
}
trap cleanup EXIT

if [ -d "$API_DIR" ]; then
  mv "$API_DIR" "$BACKUP_DIR"
fi

GITHUB_PAGES=true npm run build

touch out/.nojekyll

echo "Static export ready in ./out — publish its contents to your gh-pages branch."
