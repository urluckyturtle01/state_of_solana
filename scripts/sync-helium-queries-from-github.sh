#!/usr/bin/env bash
# Pull Topledger/helium-queries and sync *.sql group folders into state_of_solana/queries/
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

echo "📦 Helium queries sync"
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

declare -A upstream_groups=()

synced=0
for dir in "$CLONE_DIR"/*/; do
  [[ -d "$dir" ]] || continue
  name="$(basename "$dir")"
  [[ "$name" != .* ]] || continue

  shopt -s nullglob
  sql_files=("$dir"*.sql)
  shopt -u nullglob
  if [[ ${#sql_files[@]} -eq 0 ]]; then
    continue
  fi

  upstream_groups["$name"]=1
  mkdir -p "$QUERIES_DEST/$name"
  rsync -a --delete "$dir" "$QUERIES_DEST/$name/"
  echo "   ✓ ${name}/ (${#sql_files[@]} sql files)"
  synced=$((synced + 1))
done

# Remove local group folders that no longer exist upstream (e.g. deleted on GitHub)
for dir in "$QUERIES_DEST"/*/; do
  [[ -d "$dir" ]] || continue
  name="$(basename "$dir")"
  [[ "$name" != .* ]] || continue
  if [[ -z "${upstream_groups[$name]:-}" ]]; then
    rm -rf "$QUERIES_DEST/$name"
    echo "   🗑 removed stale ${name}/ (not in ${REPO})"
  fi
done

for doc in API.md GLOSSARY.md; do
  if [[ -f "$CLONE_DIR/$doc" ]]; then
    cp "$CLONE_DIR/$doc" "$QUERIES_DEST/$doc"
    echo "   ✓ ${doc}"
  fi
done

if [[ "$synced" -eq 0 ]]; then
  echo "⚠️  No group folders with .sql files found in clone."
  exit 1
fi

echo "✅ Synced ${synced} group folder(s) into ${QUERIES_DEST}"
