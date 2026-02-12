const http = require('http');
const crypto = require('crypto');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const PORT = 9011;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'your-webhook-secret-here'; // Set in .env
const AUTO_UPDATE_SCRIPT = path.join(__dirname, 'auto-update-dex.sh');
const ALLOWED_REPO = 'Topledger/tl-reserach-tool-sqls'; // Only listen to this repo

// Verify GitHub webhook signature
function verifySignature(payload, signature) {
  if (!signature) return false;
  
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

// Create HTTP server
const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/webhook') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const signature = req.headers['x-hub-signature-256'];
        
        // Verify signature if webhook secret is set
        if (WEBHOOK_SECRET !== 'your-webhook-secret-here') {
          if (!verifySignature(body, signature)) {
            console.error('❌ Invalid webhook signature');
            res.writeHead(401, { 'Content-Type': 'text/plain' });
            res.end('Unauthorized');
            return;
          }
        }
        
        const payload = JSON.parse(body);
        const event = req.headers['x-github-event'];
        const repoName = payload.repository?.full_name;
        
        console.log(`\n📨 Received GitHub event: ${event}`);
        console.log(`📦 Repository: ${repoName}`);
        console.log(`🌿 Ref: ${payload.ref}`);
        
        // Check if it's the allowed repository
        if (repoName !== ALLOWED_REPO) {
          console.log(`⚠️  Ignoring webhook - not from allowed repo (expected: ${ALLOWED_REPO})`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ignored', message: 'Not from allowed repository' }));
          return;
        }
        
        // Only process push events to main/master branch
        if (event === 'push' && (payload.ref === 'refs/heads/main' || payload.ref === 'refs/heads/master')) {
          console.log('✅ Valid push event to main/master branch');
          console.log(`👤 Pushed by: ${payload.pusher?.name}`);
          console.log(`📝 Commits: ${payload.commits?.length}`);
          
          // Execute auto-update script
          console.log('\n🚀 Starting auto-update process...');
          exec(`bash ${AUTO_UPDATE_SCRIPT}`, (error, stdout, stderr) => {
            if (error) {
              console.error(`❌ Auto-update error: ${error.message}`);
              return;
            }
            if (stderr) {
              console.error(`⚠️  stderr: ${stderr}`);
            }
            console.log(`\n📄 Output:\n${stdout}`);
            console.log('\n✅ Auto-update completed!');
          });
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'success', message: 'Webhook received and processing started' }));
        } else {
          console.log(`ℹ️  Ignoring event (not a push to main/master)`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ignored', message: 'Not a push to main/master branch' }));
        }
      } catch (error) {
        console.error('❌ Error processing webhook:', error);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
      }
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`\n🎣 Webhook listener running on port ${PORT}`);
  console.log(`📍 Endpoint: http://localhost:${PORT}/webhook`);
  console.log(`🔐 Webhook secret: ${WEBHOOK_SECRET === 'your-webhook-secret-here' ? '⚠️  NOT SET (using default)' : '✅ Configured'}`);
  console.log(`📦 Allowed repository: ${ALLOWED_REPO}`);
  console.log(`📜 Auto-update script: ${AUTO_UPDATE_SCRIPT}`);
  console.log('\n⏳ Waiting for GitHub webhook events...\n');
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
  } else {
    console.error('❌ Server error:', error);
  }
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down webhook listener...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down webhook listener...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
