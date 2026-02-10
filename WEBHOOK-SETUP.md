# GitHub Webhook Setup Guide

This guide explains how to set up automatic DEX data updates when SQL files are pushed to the `tl-reserach-tool-sqls` repository.

## 🏗️ Architecture

```
GitHub Push (tl-reserach-tool-sqls)
  ↓
Webhook → This Server (webhook-listener.js)
  ↓
Auto-update script (auto-update-dex.sh)
  ↓
1. Pull latest SQL changes
2. Run fetch-dex-data.py
3. Commit changes locally
4. Push to GitHub (current branch)
5. Restart PM2 (state-of-solana-dev)
  ↓
Application restarted with latest data
```

## 📋 Setup Steps

### 1. Start the Webhook Listener

```bash
cd /root/state_of_solana

# Start the webhook listener (keeps running in background)
node webhook-listener.js &

# Or use PM2 for production (recommended):
npm install -g pm2
pm2 start webhook-listener.js --name "dex-webhook"
pm2 save
pm2 startup  # Enable auto-start on reboot
```

**Check if running:**
```bash
pm2 list
# or
ps aux | grep webhook-listener
```

### 2. Configure GitHub Webhook

1. Go to your GitHub repository: `https://github.com/Topledger/tl-reserach-tool-sqls`

2. Click **Settings** → **Webhooks** → **Add webhook**

3. Configure:
   - **Payload URL**: `http://YOUR_SERVER_IP:9000/webhook`
   - **Content type**: `application/json`
   - **Secret**: Set a strong secret (optional but recommended)
   - **Which events**: Select "Just the push event"
   - **Active**: ✅ Check this

4. Click **Add webhook**

### 3. Set Webhook Secret (Optional but Recommended)

```bash
# Edit .env file
nano /root/state_of_solana/.env

# Add this line:
WEBHOOK_SECRET=your-super-secret-webhook-key-here

# Restart webhook listener
pm2 restart dex-webhook
```

**Important:** Use the SAME secret in both:
- GitHub webhook settings
- Your `.env` file

### 4. Configure Firewall (If needed)

Allow incoming connections on port 9000:

```bash
# UFW (Ubuntu)
sudo ufw allow 9000/tcp

# Or iptables
sudo iptables -A INPUT -p tcp --dport 9000 -j ACCEPT
```

## 🧪 Testing

### Test the webhook locally:

```bash
# Simulate a GitHub webhook push
curl -X POST http://localhost:9000/webhook \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: push" \
  -d '{
    "ref": "refs/heads/main",
    "repository": {"full_name": "Topledger/tl-reserach-tool-sqls"},
    "pusher": {"name": "test-user"},
    "commits": [{"id": "abc123"}]
  }'
```

### Test the auto-update script manually:

```bash
bash /root/state_of_solana/auto-update-dex.sh
```

### Check webhook listener logs:

```bash
# If using PM2:
pm2 logs dex-webhook

# If running in background:
tail -f /var/log/webhook-listener.log  # If you redirected output
```

## 📝 What Happens When SQL Changes

1. **Someone pushes to `tl-reserach-tool-sqls`**
   - GitHub sends webhook to your server

2. **Webhook listener receives it**
   - Verifies signature (if secret is set)
   - Checks if it's a push to `main`/`master`
   - Triggers `auto-update-dex.sh`

3. **Auto-update script runs**
   - Pulls latest SQL files
   - Runs `fetch-dex-data.py`
   - Updates `/temp/chart-data/` and `/server/chart-configs/`
   - Commits changes locally

4. **You test locally**
   - Check the dev server
   - Review changes: `git log -1 -p`
   - Make sure charts look good

5. **You push manually when ready**
   ```bash
   cd /root/state_of_solana
   git push origin main
   ```

6. **Vercel auto-deploys**
   - Production site updates automatically

## 🔧 Troubleshooting

### Webhook not triggering?

1. Check if webhook listener is running:
   ```bash
   pm2 list
   # or
   netstat -tlnp | grep 9000
   ```

2. Check webhook deliveries in GitHub:
   - Go to repo → Settings → Webhooks
   - Click on your webhook
   - Check "Recent Deliveries" tab
   - Look for errors

3. Check firewall:
   ```bash
   sudo ufw status
   ```

### Script errors?

1. Check logs:
   ```bash
   pm2 logs dex-webhook
   cat /tmp/fetch-dex-data.log
   ```

2. Run script manually to see errors:
   ```bash
   bash -x /root/state_of_solana/auto-update-dex.sh
   ```

3. Check file permissions:
   ```bash
   ls -la /root/state_of_solana/auto-update-dex.sh
   ls -la /root/state_of_solana/public/temp/fetch-dex-data.py
   ```

## 🛑 Stopping the Webhook Listener

```bash
# If using PM2:
pm2 stop dex-webhook
pm2 delete dex-webhook

# If running in background:
pkill -f webhook-listener.js
```

## 📊 Monitoring

```bash
# View real-time logs
pm2 logs dex-webhook --lines 100

# Monitor system resources
pm2 monit
```

## 🔐 Security Notes

1. **Always set WEBHOOK_SECRET** in production
2. **Use HTTPS** if your server supports it (change webhook URL to `https://`)
3. **Restrict port 9000** to GitHub's IP ranges if possible
4. **Review commits** before pushing to production

## 📚 Files Created

- `webhook-listener.js` - Node.js webhook receiver
- `auto-update-dex.sh` - Automation script
- `WEBHOOK-SETUP.md` - This guide (you're reading it!)

## ✅ Verification Checklist

- [ ] Webhook listener is running (`pm2 list`)
- [ ] Port 9000 is open and accessible
- [ ] GitHub webhook is configured with correct URL
- [ ] Webhook secret is set (optional but recommended)
- [ ] Test webhook delivery shows success in GitHub
- [ ] Manual script test works: `bash auto-update-dex.sh`
- [ ] Git can commit without errors
- [ ] You can manually push to GitHub

---

**Need help?** Check the logs and error messages! 🐛
