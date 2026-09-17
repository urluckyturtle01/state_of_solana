const http = require('http');
const crypto = require('crypto');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const PORT = 9000;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'your-webhook-secret-here'; // Set in .env
const PROJECT_DIR = __dirname;
const SQL_REPO_DIR = '/root/tl-reserach-tool-sqls';
const SYNC_SCRIPT = path.join(PROJECT_DIR, 'pipeline', 'sync-charts-to-db.py');
const SYNC_LOG = '/tmp/sync-charts-to-db.log';
const ALLOWED_REPO = 'Topledger/tl-reserach-tool-sqls'; // Only listen to this repo

// Load .env from project root (GITHUB_PAT, WEBHOOK_SECRET, etc.)
const envFile = path.join(PROJECT_DIR, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const eq = trimmed.indexOf('=');
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

const GITHUB_PAT = process.env.GITHUB_PAT || '';

function gitAuthUrl() {
  if (!GITHUB_PAT) return `https://github.com/${ALLOWED_REPO}.git`;
  return `https://x-access-token:${GITHUB_PAT}@github.com/${ALLOWED_REPO}.git`;
}

function runSync() {
  const authUrl = gitAuthUrl();
  const branchCmd = 'git rev-parse --abbrev-ref HEAD';
  const command = [
    `cd ${SQL_REPO_DIR}`,
    `git fetch ${authUrl} +refs/heads/master:refs/remotes/origin/master +refs/heads/main:refs/remotes/origin/main`,
    `BRANCH=$(${branchCmd})`,
    'git reset --hard "origin/${BRANCH}" 2>/dev/null || git reset --hard origin/master || git reset --hard origin/main',
    `cd ${PROJECT_DIR}`,
    `python3 ${SYNC_SCRIPT} 2>&1 | tee ${SYNC_LOG}`,
  ].join(' && ');


  console.log('\n🚀 Starting chart sync...');
  console.log(`📜 Sync script: ${SYNC_SCRIPT}`);
  console.log(`📝 Sync log: ${SYNC_LOG}`);

  exec(command, { maxBuffer: 20 * 1024 * 1024 }, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Chart sync error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`⚠️  stderr: ${stderr}`);
    }
    console.log(`\n📄 Output:\n${stdout}`);
    console.log('\n✅ Chart sync completed!');
  });
}

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
          
          runSync();
          
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
  console.log(`🔑 GitHub PAT: ${GITHUB_PAT ? '✅ Configured' : '⚠️  NOT SET (public fetch only)'}`);
  console.log(`📦 Allowed repository: ${ALLOWED_REPO}`);
  console.log(`📜 Sync script: ${SYNC_SCRIPT}`);
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
