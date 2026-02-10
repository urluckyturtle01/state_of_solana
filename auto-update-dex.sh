#!/bin/bash

# Auto-update DEX data when SQL repo changes
# This script:
# 1. Pulls latest changes from tl-reserach-tool-sqls
# 2. Runs fetch-dex-data.py to update data
# 3. Commits changes to state_of_solana (NO PUSH)

set -e  # Exit on error

echo "======================================================================="
echo "🔄 DEX DATA AUTO-UPDATE"
echo "======================================================================="
echo ""

# Directories
SQL_REPO_DIR="/root/tl-reserach-tool-sqls"
PROJECT_DIR="/root/state_of_solana"
PYTHON_SCRIPT="$PROJECT_DIR/public/temp/fetch-dex-data.py"
DATA_DIR="$PROJECT_DIR/public/temp/chart-data"
CONFIG_DIR="$PROJECT_DIR/server/chart-configs"


# Step 1: Pull latest SQL changes
echo "📥 Step 1: Pulling latest changes from tl-reserach-tool-sqls..."
cd "$SQL_REPO_DIR"

# Check if repo exists
if [ ! -d ".git" ]; then
    echo "❌ Not a git repository: $SQL_REPO_DIR"
    exit 1
fi

# Get current commit before pull
BEFORE_COMMIT=$(git rev-parse HEAD)
echo "   Current commit: ${BEFORE_COMMIT:0:7}"

# Pull latest changes
git fetch origin
git pull origin main 2>&1 || git pull origin master 2>&1 || {
    echo "⚠️  Warning: Could not pull from origin (might be up to date)"
}

# Get commit after pull
AFTER_COMMIT=$(git rev-parse HEAD)
echo "   Latest commit: ${AFTER_COMMIT:0:7}"

if [ "$BEFORE_COMMIT" = "$AFTER_COMMIT" ]; then
    echo "   ✅ Already up to date (no new changes)"
else
    echo "   ✅ Pulled new changes"
    echo ""
    echo "   📝 New commits:"
    git log --oneline "$BEFORE_COMMIT..$AFTER_COMMIT" | head -5
fi

echo ""

# Step 2: Run Python script to update data
echo "🐍 Step 2: Running fetch-dex-data.py..."
cd "$PROJECT_DIR"

# Check if Python script exists
if [ ! -f "$PYTHON_SCRIPT" ]; then
    echo "❌ Python script not found: $PYTHON_SCRIPT"
    exit 1
fi

# Source environment variables
if [ -f "$PROJECT_DIR/.env" ]; then
    echo "   Loading environment variables..."
    export $(cat "$PROJECT_DIR/.env" | grep -v '^#' | xargs)
fi

# Run the Python script
echo "   Executing Python script..."
cd "$PROJECT_DIR/public/temp"
python3 fetch-dex-data.py 2>&1 | tee /tmp/fetch-dex-data.log

PYTHON_EXIT_CODE=${PIPESTATUS[0]}

if [ $PYTHON_EXIT_CODE -ne 0 ]; then
    echo "❌ Python script failed with exit code $PYTHON_EXIT_CODE"
    echo "   Check log: /tmp/fetch-dex-data.log"
    exit 1
fi

echo "   ✅ Python script completed successfully"
echo ""

# Step 3: Commit changes (NO PUSH)
echo "💾 Step 3: Committing changes..."
cd "$PROJECT_DIR"

# Check if there are any changes
if git diff --quiet && git diff --cached --quiet; then
    echo "   ℹ️  No changes to commit"
    echo ""
    echo "======================================================================="
    echo "✅ AUTO-UPDATE COMPLETE (No changes detected)"
    echo "======================================================================="
    exit 0
fi

# Show what changed
echo "   📝 Changes detected:"
git status --short

# Add changes
git add "$DATA_DIR"/*.json "$CONFIG_DIR"/dex-*.json 2>/dev/null || true

# Check if there's anything to commit after adding
if git diff --cached --quiet; then
    echo "   ℹ️  No changes to commit after git add"
    echo ""
    echo "======================================================================="
    echo "✅ AUTO-UPDATE COMPLETE (No changes after staging)"
    echo "======================================================================="
    exit 0
fi

# Create commit message with timestamp and SQL repo commit
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
SQL_COMMIT_SHORT="${AFTER_COMMIT:0:7}"
COMMIT_MESSAGE="Auto-update DEX data from SQL changes

SQL repo commit: $SQL_COMMIT_SHORT
Updated at: $TIMESTAMP
Source: tl-reserach-tool-sqls

Changes:
$(git diff --cached --stat)
"

# Commit changes
git commit -m "$COMMIT_MESSAGE"

echo "   ✅ Changes committed locally"
echo ""
echo "   📊 Commit details:"
git log -1 --oneline
echo ""






# Step 4: Restart PM2
echo "🔄 Step 5: Restarting state-of-solana-dev..."
pm2 restart state-of-solana-dev

if [ $? -eq 0 ]; then
    echo "   ✅ PM2 restarted successfully"
else
    echo "   ⚠️  Failed to restart PM2"
fi

echo ""
echo "======================================================================="
echo "✅ AUTO-UPDATE COMPLETE"
echo "======================================================================="
echo ""
echo "📌 Summary:"
echo "   ✓ SQL changes pulled"
echo "   ✓ Data updated via Python script"

echo "   ✓ Application restarted"
echo ""
echo "======================================================================="
