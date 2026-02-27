# DEX Data Auto-Update Cron Setup

## Overview
The DEX data update process runs automatically every day at **5:00 AM IST** (23:30 UTC).

## Components

### 1. Main Script: `auto-update-dex.sh`
Located at: `/root/state_of_solana/auto-update-dex.sh`

**What it does:**
1. Pulls latest changes from `tl-reserach-tool-sqls` repo
2. Runs `fetch-dex-data.py` to update chart data
3. Compresses chart data (`.json.gz` files)
4. Generates HTML report with query results
5. Commits changes locally
6. Pushes to `origin updates` branch
7. Restarts PM2 application

### 2. Report Generator: `generate-report.py`
Located at: `/root/state_of_solana/generate-report.py`

**What it does:**
- Parses the Python script log output
- Extracts query names, statuses (success/skipped/failed), and error messages
- Generates a JSON report (`latest-report.json`) with:
  - Summary statistics (total, successful, skipped, failed queries)
  - Individual query details with status and error messages
  - Full log output for debugging

### 3. Web Report Page: `public/reports/index.html`
Located at: `/root/state_of_solana/public/reports/index.html`

**What it does:**
- Single static HTML page that loads the latest report data
- Auto-refreshes every 2 minutes
- Displays query results in a beautiful dashboard
- Accessible via: `http://your-domain/reports/`

### 4. Cron Job
**Schedule:** `30 23 * * *` (23:30 UTC = 5:00 AM IST)
**Command:** `/root/state_of_solana/auto-update-dex.sh >> /var/log/dex-update.log 2>&1`

## File Locations

- **Main log:** `/var/log/dex-update.log`
- **Python script log:** `/tmp/fetch-dex-data.log`
- **JSON report:** `/root/state_of_solana/public/reports/latest-report.json`
- **Web dashboard:** `/root/state_of_solana/public/reports/index.html`
- **Access URL:** `http://your-domain/reports/`

## Useful Commands

### View cron jobs
```bash
crontab -l
```

### View main log (live)
```bash
tail -f /var/log/dex-update.log
```

### View web dashboard
```bash
# Access via browser at: http://your-domain/reports/
# The page auto-refreshes every 2 minutes with the latest data
```

### View JSON report
```bash
cat /root/state_of_solana/public/reports/latest-report.json | jq
```

### Manually run the update
```bash
/root/state_of_solana/auto-update-dex.sh
```

### Remove cron job
```bash
crontab -l | grep -v '/root/state_of_solana/auto-update-dex.sh' | crontab -
```

### Reinstall cron job
```bash
bash /root/state_of_solana/setup-cron.sh
```

## Report Features

The HTML report includes:

1. **Summary Cards:**
   - Total queries processed
   - Successful fetches
   - Skipped (up-to-date) queries
   - Failed queries

2. **Query Details:**
   - Query name
   - Status badge (SUCCESS/SKIPPED/FAILED)
   - Details (rows fetched, skip reason, etc.)
   - Error messages for failed queries

3. **Full Log:**
   - Complete output from the Python script
   - Scrollable for easy debugging

## Troubleshooting

### Cron not running?
1. Check if cron service is running: `systemctl status cron`
2. Check cron logs: `grep CRON /var/log/syslog`
3. Verify script is executable: `ls -l /root/state_of_solana/auto-update-dex.sh`

### Script failing?
1. Check main log: `tail -100 /var/log/dex-update.log`
2. Check Python log: `cat /tmp/fetch-dex-data.log`
3. Run manually to see errors: `/root/state_of_solana/auto-update-dex.sh`

### Reports not generating?
1. Check if report directory exists: `ls -la /root/state_of_solana/public/reports/`
2. Run report generator manually: `python3 /root/state_of_solana/generate-report.py`
3. Check permissions: `ls -l /root/state_of_solana/generate-report.py`

## Time Zone Note

The cron job runs at **23:30 UTC** which equals **5:00 AM IST** (India Standard Time, UTC+5:30).

If you need to change the time:
1. Edit the cron job: `crontab -e`
2. Or re-run setup with different time in `setup-cron.sh`
