#!/usr/bin/env bash
# Pull Topledger/helium-queries (full sub-app + SQL) into state_of_solana/queries/
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CLONE_DIR="${HELIUM_QUERIES_REPO_DIR:-/root/helium-queries}"
REPO="${HELIUM_QUERIES_GITHUB_REPO:-Topledger/helium-queries}"
BRANCH="${HELIUM_QUERIES_BRANCH:-main}"
QUERIES_DEST="${HELIUM_QUERIES_DEST:-$ROOT/queries}"

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

if [[ -n "${GITHUB_PAT:-}" ]]; then
  GIT_URL="https://x-access-token:${GITHUB_PAT}@github.com/${REPO}.git"
else
  GIT_URL="https://github.com/${REPO}.git"
fi

echo "📦 Helium queries sync (full sub-app)"
echo "   Source: ${REPO} (${BRANCH})"
echo "   Clone:  ${CLONE_DIR}"
echo "   Dest:   ${QUERIES_DEST}"

if [[ ! -d "$CLONE_DIR/.git" ]]; then
  echo "⬇️  Cloning ${REPO}..."
  git clone --depth 1 --branch "$BRANCH" "$GIT_URL" "$CLONE_DIR"
else
  echo "🔄 Fetching latest..."
  git -C "$CLONE_DIR" fetch "$GIT_URL" "+refs/heads/${BRANCH}:refs/remotes/origin/${BRANCH}"
  git -C "$CLONE_DIR" reset --hard "origin/${BRANCH}"
fi

mkdir -p "$QUERIES_DEST"

rsync -a --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude '.env' \
  "$CLONE_DIR/" "$QUERIES_DEST/"

echo "✅ Synced helium-queries repo into ${QUERIES_DEST}"

if [[ -f "$QUERIES_DEST/app/catalog/generate-queries-index.js" ]]; then
  echo "📄 Regenerating static catalog copies for monorepo..."
  (
    cd "$QUERIES_DEST"
    HELIUM_MONOREPO_ROOT="$ROOT" node app/catalog/generate-queries-index.js
  ) || echo "⚠️  Catalog generation skipped (run manually if needed)"
fi
