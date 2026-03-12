#!/bin/bash
# setup.sh
# Recreates the trino_charts database from scratch.
# WARNING: This drops all existing data. Only run for disaster recovery.

set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$DIR")"

echo ""
echo "======================================================"
echo "  ⚠️  TRINO CHARTS DATABASE SETUP"
echo "======================================================"
echo ""
echo "This will DROP and recreate the 'trino_charts' database."
read -p "Are you sure? Type 'yes' to continue: " confirm
if [ "$confirm" != "yes" ]; then
  echo "Aborted."
  exit 1
fi

echo ""
echo "1️⃣  Dropping existing database..."
sudo -u postgres psql -c "DROP DATABASE IF EXISTS trino_charts;" 2>/dev/null || true

echo "2️⃣  Creating database..."
sudo -u postgres psql -c "CREATE DATABASE trino_charts OWNER root;"

echo "3️⃣  Applying schema (tables, triggers, functions)..."
sudo -u postgres psql -d trino_charts < "$DIR/schema.sql"

echo "4️⃣  Granting privileges to root user..."
sudo -u postgres psql -d trino_charts -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO root;"
sudo -u postgres psql -d trino_charts -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO root;"

echo "5️⃣  Syncing chart definitions from YAML files..."
cd "$APP_DIR" && python3 sync-charts-to-db.py

echo ""
echo "======================================================"
echo "✅ DATABASE SETUP COMPLETE"
echo "======================================================"
echo ""
echo "Now run the worker to fetch all data:"
echo "  cd $APP_DIR && nohup python3 -B -u trino_worker.py > trino_worker.log 2>&1 &"
echo ""
