#!/bin/bash
# backup_schema.sh
# Run this after any database schema change to keep schema.sql up to date.

set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "📦 Dumping schema from trino_charts..."
sudo -u postgres pg_dump -d trino_charts --schema-only > "$DIR/schema.sql"
echo "✅ Schema saved to $DIR/schema.sql ($(wc -l < "$DIR/schema.sql") lines)"
