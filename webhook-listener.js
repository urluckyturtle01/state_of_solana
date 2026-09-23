const http = require('http');
const crypto = require('crypto');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 9000;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'your-webhook-secret-here';
const PROJECT_DIR = __dirname;
const SQL_REPO_DIR = '/root/tl-reserach-tool-sqls';
const CHART_SYNC_LOG = '/tmp/sync-charts-to-db.log';
const RESTART_BARE_METAL = path.join(PROJECT_DIR, 'scripts', 'restart-bare-metal-app.sh');
const CHART_PUSH_SCRIPT = path.join(PROJECT_DIR, 'scripts', 'push-chart-sync-to-github.sh');
const HELIUM_SYNC_SCRIPT = path.join(PROJECT_DIR, 'scripts', 'sync-helium-queries-from-github.sh');
const HELIUM_SYNC_LOG = '/tmp/sync-helium-queries.log';

const REPO_HANDLERS = {
  'Topledger/tl-reserach-tool-sqls': runChartSync,
  'Topledger/helium-queries': runHeliumQueriesSync,
};

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

function gitAuthUrl(repoFullName) {
  if (!GITHUB_PAT) return `https://github.com/${repoFullName}.git`;
  return `https://x-access-token:${GITHUB_PAT}@github.com/${repoFullName}.git`;
}

function runExec(label, command, logPath) {
  console.log(`\n🚀 ${label}`);
  if (logPath) console.log(`📝 Log: ${logPath}`);

  exec(command, { maxBuffer: 20 * 1024 * 1024, env: process.env }, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ ${label} error: ${error.message}`);
      return;
    }
    if (stderr) console.error(`⚠️  stderr: ${stderr}`);
    if (stdout) console.log(`\n📄 Output:\n${stdout}`);
    console.log(`\n✅ ${label} completed!`);
  });
}

function runChartSync() {
  const authUrl = gitAuthUrl('Topledger/tl-reserach-tool-sqls');
  const branchCmd = 'git rev-parse --abbrev-ref HEAD';
  const pipeline = path.join(PROJECT_DIR, 'pipeline');
  const command = [
    `cd ${SQL_REPO_DIR}`,
    `git fetch ${authUrl} +refs/heads/master:refs/remotes/origin/master +refs/heads/main:refs/remotes/origin/main`,
    `BRANCH=$(${branchCmd})`,
    'git reset --hard "origin/${BRANCH}" 2>/dev/null || git reset --hard origin/master || git reset --hard origin/main',
    `cd ${PROJECT_DIR}`,
    `python3 ${path.join(pipeline, 'update_chart_categories.py')}`,
    `python3 ${path.join(pipeline, 'scaffold_sections.py')}`,
    `python3 ${path.join(pipeline, 'sync-charts-to-db.py')}`,
    `bash ${RESTART_BARE_METAL}`,
    `bash ${CHART_PUSH_SCRIPT}`,
  ].join(' && ');

  runExec('Chart sync (tl-reserach-tool-sqls)', `${command} 2>&1 | tee ${CHART_SYNC_LOG}`, CHART_SYNC_LOG);
}

function runHeliumQueriesSync() {
  const command = `bash ${HELIUM_SYNC_SCRIPT} 2>&1 | tee ${HELIUM_SYNC_LOG}`;
  runExec('Helium queries sync (helium-queries → queries/)', command, HELIUM_SYNC_LOG);
}

function verifySignature(payload, signature) {
  if (!signature) return false;

  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/webhook') {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const signature = req.headers['x-hub-signature-256'];

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

        const handler = repoName ? REPO_HANDLERS[repoName] : null;
        if (!handler) {
          console.log(`⚠️  Ignoring webhook - no handler for ${repoName}`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ignored', message: 'Repository not configured' }));
          return;
        }

        if (event === 'push' && (payload.ref === 'refs/heads/main' || payload.ref === 'refs/heads/master')) {
          console.log('✅ Valid push event to main/master branch');
          console.log(`👤 Pushed by: ${payload.pusher?.name}`);
          console.log(`📝 Commits: ${payload.commits?.length}`);

          handler();

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'success', message: 'Webhook received and processing started' }));
        } else {
          console.log('ℹ️  Ignoring event (not a push to main/master)');
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

server.listen(PORT, () => {
  console.log(`\n🎣 Webhook listener running on port ${PORT}`);
  console.log(`📍 Endpoint: http://localhost:${PORT}/webhook`);
  console.log(`🔐 Webhook secret: ${WEBHOOK_SECRET === 'your-webhook-secret-here' ? '⚠️  NOT SET (using default)' : '✅ Configured'}`);
  console.log(`🔑 GitHub PAT: ${GITHUB_PAT ? '✅ Configured' : '⚠️  NOT SET (public fetch only)'}`);
  console.log('📦 Repositories:');
  for (const repo of Object.keys(REPO_HANDLERS)) {
    console.log(`   • ${repo}`);
  }
  console.log('\n⏳ Waiting for GitHub webhook events...\n');
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
  } else {
    console.error('❌ Server error:', error);
  }
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down webhook listener...');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down webhook listener...');
  server.close(() => process.exit(0));
});
