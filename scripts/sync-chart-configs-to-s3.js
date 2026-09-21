#!/usr/bin/env node
/** One-off: upload server/chart-configs/*.json charts → S3 charts/ + batches */
const fs = require('fs');
const path = require('path');
const { loadEnvConfig } = require('@next/env');
const {
  S3Client,
  PutObjectCommand,
} = require('@aws-sdk/client-s3');

loadEnvConfig(path.join(__dirname, '..'));

const ROOT = path.join(__dirname, '..');
const CONFIG_DIR = path.join(ROOT, 'server', 'chart-configs');
const BUCKET = process.env.S3_BUCKET_NAME || process.env.S3_BUCKET || 'tl-state-of-solana';

const s3 = new S3Client({
  region: process.env.AWS_REGION || process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_SECRET_KEY || '',
  },
});

async function put(key, body) {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: JSON.stringify(body),
      ContentType: 'application/json',
    })
  );
}

async function main() {
  if (!process.env.AWS_ACCESS_KEY_ID) {
    console.error('Missing AWS_ACCESS_KEY_ID (.env.local)');
    process.exit(1);
  }

  const files = fs.readdirSync(CONFIG_DIR).filter((f) => f.endsWith('.json') && !f.startsWith('_'));
  const byId = new Map();
  const byPage = new Map();

  for (const file of files) {
    const pageConfig = JSON.parse(fs.readFileSync(path.join(CONFIG_DIR, file), 'utf8'));
    const pageId = pageConfig.pageId || file.replace(/\.json$/, '');
    const charts = pageConfig.charts || [];
    if (!charts.length) continue;
    byPage.set(pageId, charts);
    for (const chart of charts) {
      if (chart?.id) byId.set(chart.id, chart);
    }
  }

  console.log(`Uploading ${byId.size} charts to s3://${BUCKET}/charts/ ...`);
  let n = 0;
  for (const [id, chart] of byId) {
    await put(`charts/${id}.json`, chart);
    n++;
    if (n % 50 === 0) console.log(`  ${n}/${byId.size}`);
  }

  console.log(`Uploading ${byPage.size} page batches...`);
  for (const [pageId, charts] of byPage) {
    await put(`charts/batches/page_${pageId}.json`, {
      pageId,
      charts,
      updatedAt: new Date().toISOString(),
    });
    const ids = charts.map((c) => c.id).filter(Boolean);
    await put(`charts/indexes/page_${pageId}.json`, {
      pageId,
      chartIds: ids,
      updatedAt: new Date().toISOString(),
    });
  }

  console.log(`✅ Done: ${byId.size} chart objects, ${byPage.size} batches`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
