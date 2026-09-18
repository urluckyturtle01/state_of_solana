#!/usr/bin/env bash
# Commit synced queries/ (+ static catalog) and push state_of_solana to trigger Vercel.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BRANCH="${STATE_OF_SOLANA_DEPLOY_BRANCH:-main}"
REMOTE="${STATE_OF_SOLANA_GIT_REMOTE:-origin}"

if [[ -f "$ROOT/.env" ]]; then
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%%#*}"
    line="$(echo "$line" | xargs)"
    [[ -n "$line" && "$line" == *=* ]] || continue
    key="${line%%=*}"
    value="${line#*=}"
    key="$(echo "$key" | xargs)"
    if [[ -n "$key" && -z "${!key:-}" ]]; then
      export "$key=$value"
    fi
  done < "$ROOT/.env"
fi

cd "$ROOT"

if [[ ! -d .git ]]; then
  echo "❌ Not a git repo: $ROOT"
  exit 1
fi

git add queries/
if [[ -f public/helium-apis/index.html ]]; then
  git add public/helium-apis/index.html public/queries/index.html 2>/dev/null || true
fi

if git diff --cached --quiet; then
  echo "ℹ️  No changes under queries/ to push for Vercel"
  exit 0
fi

git -c user.name="${GIT_COMMIT_USER_NAME:-Auto Update Bot}" \
    -c user.email="${GIT_COMMIT_USER_EMAIL:-auto-update@stateofsolana.com}" \
    commit -m "$(cat <<'EOF'
Sync helium-queries for Vercel deploy.

Triggered by deploy on vercel: true in helium-queries/deploy.yml.
EOF
)"

echo "🚀 Pushing ${REMOTE}/${BRANCH} for Vercel deploy..."
git push "$REMOTE" "HEAD:${BRANCH}"
echo "✅ Push complete — Vercel should build from ${BRANCH}"
