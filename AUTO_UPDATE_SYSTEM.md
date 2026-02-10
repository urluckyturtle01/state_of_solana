# Auto-Update System for Chart Data

This repository includes an automated system to keep chart data fresh by updating temp files every 10 minutes using GitHub Actions.

## 🚀 How It Works

### 1. **GitHub Actions Workflow**
- **File**: `.github/workflows/update-temp-files.yml`
- **Schedule**: Runs every 10 minutes (`*/10 * * * *`)
- **Trigger**: Also runs on manual dispatch or when the workflow/script is updated

### 2. **Data Fetching Process**
- Executes `public/temp/fetch-chart-data.js`
- Fetches data from all configured chart APIs
- Saves data to `public/temp/chart-data/*.json` files
- Creates a summary at `public/temp/chart-data/_summary.json`

### 3. **Auto-Deployment**
- When data changes, commits are automatically pushed to the repo
- Vercel detects the changes and triggers a new deployment
- **Works perfectly with Vercel Hobby plan** (no server-side cron needed)

## 📁 File Structure

```
public/temp/
├── chart-configs/          # Chart configuration files (by page)
├── chart-data/            # Generated data files (updated every 10 min)
│   ├── _summary.json      # Overall fetch summary
│   ├── dashboard.json     # Data for dashboard page
│   ├── volume.json        # Data for volume page
│   └── ...               # More page data files
├── fetch-chart-data.js    # Main data fetching script
└── IMPLEMENTATION_SUMMARY.md
```

## 🧪 Testing Locally

Before the GitHub Actions runs, you can test the system locally:

```bash
# Run the test script
node scripts/test-data-fetch.js

# Or run the fetch script directly
cd public/temp
node fetch-chart-data.js
```

## ⚙️ Configuration

### GitHub Actions Workflow Features:
- ✅ **Smart change detection** - Only commits when data actually changes
- ✅ **Rate limiting friendly** - Processes charts in small batches
- ✅ **Error handling** - Continues processing even if some APIs fail
- ✅ **Manual triggering** - Can be run manually from GitHub Actions tab
- ✅ **Node.js 18** - Uses built-in fetch API (no dependencies needed)

### Schedule Timing:
```yaml
schedule:
  - cron: '*/10 * * * *'  # Every 10 minutes
```

## 📊 Monitoring

### Check if it's working:
1. **GitHub Actions tab** - See workflow run history
2. **Commit history** - Look for auto-update commits
3. **Vercel deployments** - New deployments triggered by data updates
4. **Summary file** - Check `public/temp/chart-data/_summary.json` for fetch statistics

### Typical commit message:
```
🤖 Auto-update chart data temp files - 2024-01-15 14:30:00 UTC
```

## 🔧 Troubleshooting

### Common Issues:

1. **No commits appearing**
   - Check if data actually changed between runs
   - Verify APIs are responding correctly
   - Look at GitHub Actions logs

2. **Workflow failing**
   - Check Node.js version compatibility
   - Verify script paths are correct
   - Check API rate limits

3. **Vercel not deploying**
   - Ensure auto-deploy is enabled in Vercel settings
   - Check if changes are in tracked files

### Manual Override:
If you need to trigger an update manually:

1. Go to GitHub → Actions tab
2. Select "Update Chart Data Temp Files"
3. Click "Run workflow"

## 🌟 Benefits

- **Always Fresh Data**: Charts always show the latest data (max 10 minutes old)
- **Zero Server Cost**: No server-side cron jobs needed
- **Vercel Hobby Compatible**: Works perfectly with free Vercel plan
- **Reliable**: GitHub Actions provides reliable scheduled execution
- **Observable**: Easy to monitor and debug through GitHub interface
- **Automatic**: Set it and forget it - no manual intervention needed

## 🚨 Rate Limiting

The system is designed to be API-friendly:
- Processes charts in batches of 3
- 500ms delay between batches  
- 10-second timeout per API call
- Continues processing even if some APIs fail

This ensures we don't overwhelm any single API endpoint and stay within reasonable rate limits. 