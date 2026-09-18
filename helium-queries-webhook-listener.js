/**
 * GitHub webhook for Topledger/helium-queries only.
 * Updates state_of_solana/queries/ via scripts/sync-helium-queries-from-github.sh.
 * If queries/deploy.yml has "deploy on vercel: true", also pushes state_of_solana to GitHub (Vercel build).
 *
 * Configure on GitHub (helium-queries repo):
 *   Payload URL: http://<your-host>:9001/helium-queries-webhook
 *   Secret: HELIUM_WEBHOOK_SECRET (or WEBHOOK_SECRET) in .env
 *   Events: push
 *
 * Do not use webhook-listener.js (port 9000) — that is for other repos.
 */
const http = require('http');
const crypto = require('crypto');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.HELIUM_WEBHOOK_PORT || 9001);
const PROJECT_DIR = __dirname;
const SYNC_SCRIPT = path.join(PROJECT_DIR, 'scripts', 'sync-helium-queries-from-github.sh');
const SYNC_LOG = process.env.HELIUM_SYNC_LOG || '/tmp/sync-helium-queries.log';
const TARGET_REPO = (process.env.HELIUM_QUERIES_GITHUB_REPO || 'Topledger/helium-queries').toLowerCase();

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

const WEBHOOK_SECRET =
  process.env.HELIUM_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET || 'your-webhook-secret-here';

function verifySignature(payload, signature) {
  if (!signature) return false;
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  } catch {
    return false;
  }
}

function runSync() {
  const command = `bash ${SYNC_SCRIPT} 2>&1 | tee -a ${SYNC_LOG}`;
  console.log('\n🚀 Helium queries sync started');
  exec(command, { maxBuffer: 20 * 1024 * 1024, env: process.env }, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Sync error:', error.message);
      return;
    }
    if (stderr) console.error('⚠️  stderr:', stderr);
    if (stdout) console.log(stdout);
    console.log('✅ Helium queries sync finished\n');
  });
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, repo: TARGET_REPO }));
    return;
  }

  if (req.method !== 'POST' || req.url !== '/helium-queries-webhook') {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
    return;
  }

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
      const repoName = (payload.repository?.full_name || '').toLowerCase();

      console.log(`\n📨 GitHub event: ${event}`);
      console.log(`📦 Repository: ${repoName}`);

      if (repoName !== TARGET_REPO) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ignored', message: 'Wrong repository' }));
        return;
      }

      if (event === 'push' && (payload.ref === 'refs/heads/main' || payload.ref === 'refs/heads/master')) {
        console.log(`🌿 Ref: ${payload.ref}`);
        runSync();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', message: 'Sync started' }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ignored', message: 'Not a push to main/master' }));
    } catch (err) {
      console.error('❌ Webhook error:', err);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n🎣 Helium queries webhook on port ${PORT}`);
  console.log(`📍 POST http://0.0.0.0:${PORT}/helium-queries-webhook`);
  console.log(`📦 Repo: ${TARGET_REPO}`);
  console.log(`🔐 Secret: ${WEBHOOK_SECRET === 'your-webhook-secret-here' ? '⚠️  NOT SET' : '✅ configured'}`);
  console.log(`📝 Sync log: ${SYNC_LOG}\n`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
  } else {
    console.error('❌ Server error:', error);
  }
  process.exit(1);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));
