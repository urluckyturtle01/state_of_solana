#!/bin/bash
# Daily backup script

DATE=$(date +%Y-%m-%d)
echo "Starting backup: $DATE"

aws s3 sync s3://tl-state-of-solana s3://tl-state-of-solana-emergency-backup/daily/$DATE/ \
    --exclude "*.tmp" \
    --exclude "*/.DS_Store" \
    --delete

echo "✅ Backup completed: $DATE"
