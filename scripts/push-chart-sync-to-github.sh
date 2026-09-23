#!/usr/bin/env bash
# Commit chart pipeline outputs (categories, app scaffold) and push state_of_solana → Vercel.
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

git add pipeline/chart_categories.py app/

if git diff --cached --quiet; then
  echo "ℹ️  No chart scaffold / category changes to push"
  exit 0
fi

git -c user.name="${GIT_COMMIT_USER_NAME:-Auto Update Bot}" \
    -c user.email="${GIT_COMMIT_USER_EMAIL:-auto-update@stateofsolana.com}" \
    commit -m "$(cat <<'EOF'
Sync chart sections from tl-reserach-tool-sqls webhook.

Updates CHART_CATEGORIES, Next.js section scaffold, and DB chart defs. Dev :8137 restarted on bare metal.
EOF
)"

echo "🚀 Pushing ${REMOTE}/${BRANCH} (Vercel + GitHub)..."
git push "$REMOTE" "HEAD:${BRANCH}"
echo "✅ Push complete"
