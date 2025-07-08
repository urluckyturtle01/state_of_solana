# GitHub Actions Auto-Update Setup

This guide explains how to set up automatic chart data updates using GitHub Actions, perfect for Vercel Hobby deployments.

## 🚀 Quick Setup

### 1. Set up GitHub Secret

1. Go to your GitHub repository
2. Navigate to **Settings** > **Secrets and variables** > **Actions**
3. Click **New repository secret**
4. Add the following secret:
   - **Name**: `SITE_URL`
   - **Value**: Your deployed site URL (e.g., `https://your-app.vercel.app`)

### 2. Enable GitHub Actions

The workflow file is already created at `.github/workflows/update-temp-data.yml`. It will automatically:
- Run every 10 minutes
- Update chart data via API calls
- Log detailed results
- Perform health checks

### 3. Monitor the Workflow

1. Go to **Actions** tab in your GitHub repository
2. Look for "Auto Update Chart Data" workflow
3. View logs and execution history

## 📋 Workflow Features

### **Automatic Schedule**
- **Frequency**: Every 10 minutes (`*/10 * * * *`)
- **Timezone**: UTC (GitHub Actions default)
- **Runtime**: ~2-5 minutes per execution

### **Manual Triggers**
- Navigate to **Actions** > **Auto Update Chart Data**
- Click **Run workflow**
- Optional: Enable "Force update" to bypass timing constraints

### **Logging & Monitoring**
- ✅ Success/failure status
- 📊 API response details  
- 🔍 Health check results
- ⏱️ Execution timestamps

## 🛠️ Advanced Configuration

### Modify Update Frequency

Edit `.github/workflows/update-temp-data.yml`:

```yaml
schedule:
  # Every 5 minutes
  - cron: '*/5 * * * *'
  
  # Every hour at minute 0
  - cron: '0 * * * *'
  
  # Every day at 6:00 AM UTC
  - cron: '0 6 * * *'
```

### Add Email Notifications

Add to the workflow file:

```yaml
- name: Notify on Failure
  if: failure()
  uses: dawidd6/action-send-mail@v3
  with:
    server_address: smtp.gmail.com
    server_port: 465
    username: ${{ secrets.EMAIL_USERNAME }}
    password: ${{ secrets.EMAIL_PASSWORD }}
    subject: Chart Update Failed
    to: your-email@example.com
    from: GitHub Actions
    body: Chart data update failed. Check the logs.
```

## 🔧 Troubleshooting

### Common Issues

**❌ Error: `SITE_URL` secret not found**
- Ensure you've added the `SITE_URL` secret in GitHub Settings
- Check the secret name is exactly `SITE_URL`

**❌ Error: API endpoint not responding**
- Verify your site URL is correct and accessible
- Check if your Vercel deployment is active
- Test the endpoint manually: `curl https://your-site.com/api/health`

**❌ Workflow not running automatically**
- GitHub may delay cron jobs during high traffic
- Check if your repository is active (recent commits/activity)
- Manually trigger to test if workflow works

### API Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `/api/update-temp-data` | Updates chart data from APIs |
| `/api/health` | Health check for site responsiveness |

### Logs Analysis

**Successful Update Log:**
```
🚀 Starting chart data update...
📊 API Response Status: 200
✅ Chart data update completed successfully
🎉 Data updated successfully!
✅ Site health check passed
```

**Failed Update Log:**
```
❌ API request failed with status 500
📄 Response: {"success": false, "message": "..."}
❌ Health check failed - could not reach site
```

## 📊 Benefits vs Alternatives

### ✅ **GitHub Actions (Free)**
- Works with any hosting platform
- Generous free tier (2,000 minutes/month)
- Built-in logging and monitoring
- No additional setup required

### 💰 **Vercel Cron (Paid)**
- Requires Pro plan ($20/month)
- Tighter integration with deployment
- Lower latency (same region)

### 🔧 **External Services**
- Zapier, IFTTT (limited free tiers)
- Additional service to manage
- May have reliability issues

## 🚨 Important Notes

- **Free Tier Limits**: 2,000 minutes/month (sufficient for 10-min intervals)
- **Public Repos**: Unlimited minutes
- **Private Repos**: Limited minutes based on plan
- **Timeout**: Workflow has 15-minute timeout per execution

## 📈 Monitoring Success

### Check Update Status
1. Visit your admin panel
2. Look for "Last updated" timestamps on charts
3. Check GitHub Actions logs for execution history

### Manual Testing
```bash
# Test health endpoint
curl https://your-site.vercel.app/api/health

# Test update endpoint
curl -X POST https://your-site.vercel.app/api/update-temp-data \
  -H "Content-Type: application/json" \
  -d '{"scheduled": true}'
```

The GitHub Actions workflow is now your reliable, free auto-updater that works perfectly with Vercel Hobby! 🎉 