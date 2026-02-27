#!/bin/bash

# Setup cron job for daily DEX data updates at 5:00 AM IST (23:30 UTC previous day)

SCRIPT_PATH="/root/state_of_solana/auto-update-dex.sh"
CRON_TIME="30 23 * * *"  # 23:30 UTC = 5:00 AM IST

# Make sure the script is executable
chmod +x "$SCRIPT_PATH"

# Create cron job entry
CRON_JOB="$CRON_TIME $SCRIPT_PATH >> /var/log/dex-update.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "$SCRIPT_PATH"; then
    echo "⚠️  Cron job already exists. Removing old entry..."
    crontab -l 2>/dev/null | grep -v "$SCRIPT_PATH" | crontab -
fi

# Add new cron job
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo "✅ Cron job installed successfully!"
echo ""
echo "📋 Cron Schedule:"
echo "   Time: 5:00 AM IST (23:30 UTC)"
echo "   Frequency: Daily"
echo "   Script: $SCRIPT_PATH"
echo "   Log: /var/log/dex-update.log"
echo ""
echo "📊 To view current cron jobs:"
echo "   crontab -l"
echo ""
echo "📝 To view logs:"
echo "   tail -f /var/log/dex-update.log"
echo ""
echo "🗑️  To remove cron job:"
echo "   crontab -l | grep -v '$SCRIPT_PATH' | crontab -"
