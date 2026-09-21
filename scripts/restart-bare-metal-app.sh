#!/usr/bin/env bash
# Restart State of Solana on bare metal (:8137). Local `npm run dev` stays on :3000+ (not touched).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PM2_NAME="${PM2_APP_NAME:-state-of-solana-dev}"
PORT="${BARE_METAL_PORT:-8137}"
# dev = next dev on :8137. prod = next build + next start on :8137.
BARE_METAL_MODE="${BARE_METAL_MODE:-dev}"

cd "$ROOT"

echo "🧹 Clearing .next cache..."
rm -rf "$ROOT/.next"

if [[ "$BARE_METAL_MODE" == "prod" ]]; then
  echo "🏗️  Production mode: building..."
  npm run build
else
  echo "🔧 Dev mode: PM2 next dev on :$PORT (local npm run dev uses :3000+)"
fi

echo "🛑 Freeing :$PORT only (not local dev on :3000)..."
if command -v fuser >/dev/null 2>&1; then
  fuser -k "${PORT}/tcp" 2>/dev/null || true
elif command -v lsof >/dev/null 2>&1; then
  while read -r pid; do
    [[ -n "$pid" ]] && kill "$pid" 2>/dev/null || true
  done < <(lsof -t -iTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)
fi
sleep 1

pm2 delete "$PM2_NAME" 2>/dev/null || true

export PORT="$PORT"
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=8192}"

if [[ "$BARE_METAL_MODE" == "prod" ]]; then
  pm2 start npm --name "$PM2_NAME" -- start -- -H 0.0.0.0 -p "$PORT"
  echo "✅ $PM2_NAME → next start on :$PORT"
else
  pm2 start npm --name "$PM2_NAME" -- run dev
  echo "✅ $PM2_NAME → next dev on :$PORT (shared dev; local work: npm run dev → :3000+)"
fi

pm2 save
