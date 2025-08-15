# Data Freshness Monitor

A JavaScript script that monitors Solana data files for freshness and sends Telegram alerts when data becomes outdated.

## Features

- ✅ Scans all `.gz` data files in `/root/state_of_solana/public/temp/chart-data`
- ⏰ Checks if data is older than 24 hours (configurable)
- 📱 Sends Telegram notifications with detailed information
- 🔗 Includes chart API endpoints from configuration files
- 📊 Provides comprehensive logging and status reports

## Prerequisites

- Node.js (version 14 or higher)
- npm (Node Package Manager)
- Telegram Bot Token and Chat ID (for notifications)

## Installation

1. **Dependencies are already installed** (node-fetch has been added to the project)

2. **Make the script executable:**
   ```bash
   chmod +x monitor-data-freshness.js
   ```

## Setup Telegram Notifications

### Step 1: Create a Telegram Bot

1. Open Telegram and search for `@BotFather`
2. Send `/newbot` command
3. Follow the instructions to create your bot
4. Save the **Bot Token** provided by BotFather

### Step 2: Get Your Chat ID

1. Add your bot to the Telegram group where you want notifications
2. Send a message to the group mentioning your bot
3. Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. Look for the `chat.id` value in the response

### Step 3: Set Environment Variables

```bash
export TELEGRAM_BOT_TOKEN="your_bot_token_here"
export TELEGRAM_CHAT_ID="your_chat_id_here"
```

Or create a `.env` file (not recommended for production):
```bash
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
```

## Usage

### Run the Monitor

```bash
# Basic usage
node monitor-data-freshness.js

# Or using npm script
npm run monitor
```

### Example Output

```
🚀 Data Freshness Monitor v1.0
================================
🔍 Starting data freshness monitoring...
📊 Found 74 data files to check
📄 btc-tvl.json.gz: Last updated 2 hours ago
📄 dex-activity.json.gz: Last updated 1 hour ago
✅ All data files are up to date!
✅ Monitoring completed
```

### When Data is Outdated

If any file is older than 24 hours, you'll receive a Telegram notification like:

```
🚨 Data Freshness Alert

Found 2 file(s) with data older than 24 hours:

📊 btc-tvl.json.gz
⏰ Last updated: 2 days ago
🔗 Chart APIs:
1. Wrapped Btc TVL In DEX
   https://analytics.topledger.xyz/tl/api/queries/13431/results.json?api_key=...
2. Wrapped Btc TVL By DEX
   https://analytics.topledger.xyz/tl/api/queries/13432/results.json?api_key=...
```

## Configuration

You can modify the configuration in the script:

```javascript
const CONFIG = {
  chartDataDir: '/root/state_of_solana/public/temp/chart-data',
  chartConfigDir: '/root/state_of_solana/public/temp/chart-configs',
  maxAgeHours: 24, // Alert if data is older than 24 hours
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
  telegramChatId: process.env.TELEGRAM_CHAT_ID
};
```

## Automation

### Using Cron (Optional)

While the script is designed to be run manually, you can set up automated monitoring:

```bash
# Add to crontab (run every hour)
crontab -e

# Add this line:
0 * * * * cd /root/state_of_solana && node monitor-data-freshness.js >> data_monitor.log 2>&1
```

### Using systemd Timer (Alternative)

1. Create a service file:
   ```bash
   sudo nano /etc/systemd/system/data-monitor.service
   ```

2. Add content:
   ```ini
   [Unit]
   Description=Data Freshness Monitor
   
   [Service]
   Type=oneshot
   WorkingDirectory=/root/state_of_solana
   ExecStart=/usr/bin/node monitor-data-freshness.js
   Environment=TELEGRAM_BOT_TOKEN=your_token
   Environment=TELEGRAM_CHAT_ID=your_chat_id
   ```

3. Create a timer file:
   ```bash
   sudo nano /etc/systemd/system/data-monitor.timer
   ```

4. Add content:
   ```ini
   [Unit]
   Description=Run Data Monitor every hour
   
   [Timer]
   OnCalendar=hourly
   
   [Install]
   WantedBy=timers.target
   ```

5. Enable and start:
   ```bash
   sudo systemctl enable data-monitor.timer
   sudo systemctl start data-monitor.timer
   ```

## Troubleshooting

### Common Issues

1. **"No fetchedAt timestamp found"**
   - Some files might not have the expected JSON structure
   - The script will skip these files and continue

2. **"Failed to send Telegram notification"**
   - Check your bot token and chat ID
   - Ensure the bot is added to the chat/group
   - Verify internet connectivity

3. **Permission Denied**
   - Make sure the script is executable: `chmod +x monitor-data-freshness.js`
   - Check file permissions on the data directories

### Testing

To test notifications without waiting for old data:

1. Temporarily change `maxAgeHours` to a lower value (e.g., 1)
2. Run the script
3. Reset the value back to 24

## File Structure

```
/root/state_of_solana/
├── monitor-data-freshness.js     # Main monitoring script
├── package.json                  # Dependencies
├── public/temp/
│   ├── chart-data/              # Data files (*.gz)
│   └── chart-configs/           # Configuration files (*.json)
└── DATA_MONITOR_README.md       # This file
```

## Support

The script provides detailed console output for debugging. Check the logs if you encounter any issues.

For development or modifications, the script is well-commented and modular. 