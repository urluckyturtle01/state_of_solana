#!/usr/bin/env bash
# Production restart for bare-metal (PM2). Avoids next dev stale .next manifest 404s.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PM2_NAME="${PM2_APP_NAME:-state-of-solana-dev}"
PORT="${PORT:-8137}"

cd "$ROOT"

echo "🧹 Removing stale Next dev cache..."
rm -rf "$ROOT/.next"

echo "🏗️  Building application..."
npm run build

echo "🔄 Restarting PM2 ($PM2_NAME) on port $PORT..."
# Stop orphan next dev processes from this repo (not other projects)
pgrep -af "state_of_solana/node_modules/.bin/next dev" | while read -r line; do
  pid="${line%% *}"
  kill "$pid" 2>/dev/null || true
done

if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
  pm2 delete "$PM2_NAME"
fi

PORT="$PORT" NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=8192}" \
  pm2 start npm --name "$PM2_NAME" -- start -- -H 0.0.0.0 -p "$PORT"

pm2 save
echo "✅ $PM2_NAME running production server on :$PORT"
