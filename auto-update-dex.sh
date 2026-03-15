#!/bin/bash

# Auto-update DEX data when SQL repo changes
# This script:
# 1. Pulls latest changes from tl-reserach-tool-sqls
# 2. Runs sync-charts-to-db.py to sync chart definitions to PostgreSQL
# 3. trino_worker.py automatically processes the queued jobs
# 4. Generates HTML report with sync results

set -e  # Exit on error

# Report file
REPORT_DIR="/root/state_of_solana/public/reports"
REPORT_FILE="$REPORT_DIR/dex-update-$(date +%Y-%m-%d).html"
mkdir -p "$REPORT_DIR"

echo "======================================================================="
echo "🔄 DEX DATA AUTO-UPDATE"
echo "======================================================================="
echo ""

# Directories
SQL_REPO_DIR="/root/tl-reserach-tool-sqls"
PROJECT_DIR="/root/state_of_solana"
PYTHON_SCRIPT="$PROJECT_DIR/pipeline/sync-charts-to-db.py"
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

# Pull latest changes (try current branch's upstream, then master, then main)
git fetch origin
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
git pull origin "$CURRENT_BRANCH" 2>&1 || git pull origin master 2>&1 || git pull origin main 2>&1 || {
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

# Step 2: Run sync-charts-to-db.py to sync chart definitions
echo "🐍 Step 2: Running sync-charts-to-db.py..."
cd "$PROJECT_DIR"

# Check if Python script exists
if [ ! -f "$PYTHON_SCRIPT" ]; then
    echo "❌ Python script not found: $PYTHON_SCRIPT"
    exit 1
fi

# Source environment variables (avoid xargs - it breaks on values with = or spaces)
if [ -f "$PROJECT_DIR/.env" ]; then
    echo "   Loading environment variables..."
    set -a
    # shellcheck disable=SC1090
    . "$PROJECT_DIR/.env" 2>/dev/null || true
    set +a
fi

# Run the Python script and capture detailed output
echo "   Executing sync-charts-to-db.py..."
python3 "$PYTHON_SCRIPT" 2>&1 | tee /tmp/sync-charts-to-db.log

PYTHON_EXIT_CODE=${PIPESTATUS[0]}

# Parse log to extract sync results
INSERTED_CHARTS=$(grep -c "✅ Inserted:" /tmp/sync-charts-to-db.log || echo "0")
UPDATED_CHARTS=$(grep -c "🔄 Updated:" /tmp/sync-charts-to-db.log || echo "0")
DELETED_CHARTS=$(grep -c "🗑️  Deleted" /tmp/sync-charts-to-db.log || echo "0")
TOTAL_CHARTS=$(grep -c "📋" /tmp/sync-charts-to-db.log || echo "0")

if [ $PYTHON_EXIT_CODE -ne 0 ]; then
    echo "❌ sync-charts-to-db.py failed with exit code $PYTHON_EXIT_CODE"
    echo "   Check log: /tmp/sync-charts-to-db.log"
    SCRIPT_STATUS="FAILED"
else
    echo "   ✅ sync-charts-to-db.py completed successfully"
    echo "   📊 Inserted: $INSERTED_CHARTS | Updated: $UPDATED_CHARTS | Deleted: $DELETED_CHARTS"
    SCRIPT_STATUS="SUCCESS"
fi
echo ""

# Step 3: Check trino_worker.py status
echo "🔍 Step 3: Checking trino_worker.py status..."
WORKER_PID=$(pgrep -f "python.*trino_worker.py" || echo "")
if [ -n "$WORKER_PID" ]; then
    echo "   ✅ trino_worker.py is running (PID: $WORKER_PID)"
    echo "   📝 Worker will automatically process queued jobs"
else
    echo "   ⚠️  trino_worker.py is NOT running"
    echo "   💡 Start it with: nohup python3 -u trino_worker.py > trino_worker.log 2>&1 &"
fi
echo ""

# Step 4: No git commit needed (data is in PostgreSQL now)
echo "ℹ️  Step 4: Chart definitions synced to PostgreSQL database"
echo "   No git commit needed - data is stored in database"
echo ""

# Final summary
echo "======================================================================="
echo "✅ AUTO-UPDATE COMPLETE"
echo "======================================================================="
echo ""
echo "📊 Summary:"
echo "   • SQL repo commit: ${AFTER_COMMIT:0:7}"
echo "   • Charts inserted: $INSERTED_CHARTS"
echo "   • Charts updated: $UPDATED_CHARTS"
echo "   • Charts deleted: $DELETED_CHARTS"
echo "   • Status: $SCRIPT_STATUS"
echo ""
echo "🔗 View logs:"
echo "   • Sync log: /tmp/sync-charts-to-db.log"
echo "   • Worker log: /root/state_of_solana/trino_worker.log"
echo ""
exit 0

# OLD CODE BELOW (keeping for reference but not executed)
if false; then
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

# Step 5: Push current branch to remote 'updates' branch
echo "📤 Step 5: Pushing to origin updates..."
git push origin HEAD:updates 2>&1 || {
    echo "⚠️  git push origin HEAD:updates failed"
    exit 1
}
echo "   ✅ Pushed to origin updates"
echo ""



# Step 6: Restart PM2
echo "🔄 Step 6: Restarting state-of-solana-dev..."
pm2 restart state-of-solana-dev

if [ $? -eq 0 ]; then
    echo "   ✅ PM2 restarted successfully"
else
    echo "   ⚠️  Failed to restart PM2"
fi

# Step 7: Generate HTML Report
echo "📊 Step 7: Generating HTML report..."
python3 "$PROJECT_DIR/generate-report.py"
echo "   ✅ Report generated"
echo ""

# Old bash-based report (keeping as backup)
if false; then
cat > "$REPORT_FILE.backup" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DEX Data Update Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0a0a0a;
            color: #e0e0e0;
            padding: 2rem;
            line-height: 1.6;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 {
            font-size: 2rem;
            margin-bottom: 0.5rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .timestamp {
            color: #888;
            font-size: 0.9rem;
            margin-bottom: 2rem;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }
        .stat-card {
            background: #1a1a1a;
            border: 1px solid #333;
            border-radius: 8px;
            padding: 1.5rem;
        }
        .stat-card.success { border-left: 4px solid #10b981; }
        .stat-card.skipped { border-left: 4px solid #f59e0b; }
        .stat-card.failed { border-left: 4px solid #ef4444; }
        .stat-card.total { border-left: 4px solid #3b82f6; }
        .stat-label {
            font-size: 0.85rem;
            color: #888;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .stat-value {
            font-size: 2.5rem;
            font-weight: bold;
            margin-top: 0.5rem;
        }
        .queries-section {
            background: #1a1a1a;
            border: 1px solid #333;
            border-radius: 8px;
            padding: 1.5rem;
            margin-bottom: 1rem;
        }
        .section-title {
            font-size: 1.25rem;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .query-item {
            background: #0f0f0f;
            border: 1px solid #2a2a2a;
            border-radius: 6px;
            padding: 1rem;
            margin-bottom: 0.75rem;
        }
        .query-item.success { border-left: 3px solid #10b981; }
        .query-item.skipped { border-left: 3px solid #f59e0b; }
        .query-item.failed { border-left: 3px solid #ef4444; }
        .query-name {
            font-weight: 600;
            font-size: 1rem;
            margin-bottom: 0.5rem;
        }
        .query-details {
            font-size: 0.85rem;
            color: #888;
            display: flex;
            gap: 1.5rem;
            flex-wrap: wrap;
        }
        .badge {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
        }
        .badge.success { background: #10b98120; color: #10b981; }
        .badge.skipped { background: #f59e0b20; color: #f59e0b; }
        .badge.failed { background: #ef444420; color: #ef4444; }
        .error-msg {
            background: #2a1a1a;
            border: 1px solid #4a2a2a;
            border-radius: 4px;
            padding: 0.75rem;
            margin-top: 0.5rem;
            font-family: 'Courier New', monospace;
            font-size: 0.85rem;
            color: #ff6b6b;
        }
        pre {
            background: #0a0a0a;
            border: 1px solid #2a2a2a;
            border-radius: 4px;
            padding: 1rem;
            overflow-x: auto;
            font-size: 0.85rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔄 DEX Data Update Report</h1>
        <div class="timestamp">Generated: TIMESTAMP_PLACEHOLDER</div>
        
        <div class="summary">
            <div class="stat-card total">
                <div class="stat-label">Total Queries</div>
                <div class="stat-value">TOTAL_QUERIES_PLACEHOLDER</div>
            </div>
            <div class="stat-card success">
                <div class="stat-label">Successful</div>
                <div class="stat-value">SUCCESS_PLACEHOLDER</div>
            </div>
            <div class="stat-card skipped">
                <div class="stat-label">Skipped</div>
                <div class="stat-value">SKIPPED_PLACEHOLDER</div>
            </div>
            <div class="stat-card failed">
                <div class="stat-label">Failed</div>
                <div class="stat-value">FAILED_PLACEHOLDER</div>
            </div>
        </div>

        <div class="queries-section">
            <div class="section-title">📋 Query Details</div>
            QUERIES_PLACEHOLDER
        </div>

        <div class="queries-section">
            <div class="section-title">📝 Full Log</div>
            <pre>FULL_LOG_PLACEHOLDER</pre>
        </div>
    </div>
</body>
</html>
EOF

# Parse log and build query details HTML
QUERIES_HTML=""
current_query=""
current_status=""
current_details=""

while IFS= read -r line; do
    if [[ $line =~ "📊 Processing: "(.+) ]]; then
        current_query="${BASH_REMATCH[1]}"
        current_status=""
        current_details=""
    elif [[ $line =~ "✅ Fetched "([0-9]+)" rows" ]]; then
        current_status="success"
        current_details="Fetched ${BASH_REMATCH[1]} rows"
        QUERIES_HTML+="<div class='query-item success'><div class='query-name'>$current_query</div><div class='query-details'><span class='badge success'>Success</span><span>$current_details</span></div></div>"
    elif [[ $line =~ "⏭️  Data is fresh" ]]; then
        current_status="skipped"
        current_details="Data is up-to-date"
        QUERIES_HTML+="<div class='query-item skipped'><div class='query-name'>$current_query</div><div class='query-details'><span class='badge skipped'>Skipped</span><span>$current_details</span></div></div>"
    elif [[ $line =~ "❌ Error: "(.+) ]]; then
        current_status="failed"
        current_details="${BASH_REMATCH[1]}"
        QUERIES_HTML+="<div class='query-item failed'><div class='query-name'>$current_query</div><div class='query-details'><span class='badge failed'>Failed</span></div><div class='error-msg'>$current_details</div></div>"
    fi
done < /tmp/fetch-dex-data.log

# Replace placeholders
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S %Z')
FULL_LOG=$(cat /tmp/fetch-dex-data.log | sed 's/</\&lt;/g' | sed 's/>/\&gt;/g')

sed -i "s|TIMESTAMP_PLACEHOLDER|$TIMESTAMP|g" "$REPORT_FILE"
sed -i "s|TOTAL_QUERIES_PLACEHOLDER|$TOTAL_QUERIES|g" "$REPORT_FILE"
sed -i "s|SUCCESS_PLACEHOLDER|$SUCCESSFUL_QUERIES|g" "$REPORT_FILE"
sed -i "s|SKIPPED_PLACEHOLDER|$SKIPPED_QUERIES|g" "$REPORT_FILE"
sed -i "s|FAILED_PLACEHOLDER|$FAILED_QUERIES|g" "$REPORT_FILE"
sed -i "s|QUERIES_PLACEHOLDER|$QUERIES_HTML|g" "$REPORT_FILE"
sed -i "s|FULL_LOG_PLACEHOLDER|$FULL_LOG|g" "$REPORT_FILE.backup"
fi
# End of backup section

echo ""
echo "======================================================================="
echo "✅ AUTO-UPDATE COMPLETE"
echo "======================================================================="
echo ""
echo "📌 Summary:"
echo "   ✓ SQL changes pulled"
echo "   ✓ Data updated via Python script ($SUCCESSFUL_QUERIES successful, $SKIPPED_QUERIES skipped, $FAILED_QUERIES failed)"
echo "   ✓ Chart data compressed"
echo "   ✓ Changes committed and pushed to origin updates"
echo "   ✓ Application restarted"
echo "   ✓ Report: /root/state_of_solana/public/reports/dex-update-$(date +%Y-%m-%d).html"
echo ""
echo "======================================================================="
fi  # End of if false block
