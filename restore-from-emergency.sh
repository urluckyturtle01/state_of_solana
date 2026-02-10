#!/bin/bash
# Emergency restore script

RESTORE_DATE=${1:-$(date +%Y-%m-%d)}
echo "Restoring from backup date: $RESTORE_DATE"

if [ "$1" == "latest" ]; then
    # Restore from initial backup
    aws s3 sync s3://tl-state-of-solana-emergency-backup/initial-backup/ s3://tl-state-of-solana/
else
    # Restore from specific date
    aws s3 sync s3://tl-state-of-solana-emergency-backup/daily/$RESTORE_DATE/ s3://tl-state-of-solana/
fi

echo "✅ Restore completed"
