#!/usr/bin/env node
/**
 * Upload a blog article JSON file to S3.
 * Usage: node scripts/publish-blog-article.js blog-articles/rwa-ai-data-engineering-agent.json
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node scripts/publish-blog-article.js <path-to-article.json>');
    process.exit(1);
  }

  const absPath = path.resolve(filePath);
  const data = JSON.parse(fs.readFileSync(absPath, 'utf8'));
  const slug = data.blogPost?.slug;

  if (!slug) {
    console.error('Article JSON must include blogPost.slug');
    process.exit(1);
  }

  const bucket = process.env.S3_BUCKET_NAME;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || 'us-east-1';

  if (!bucket || !accessKeyId || !secretAccessKey) {
    console.error('Missing AWS/S3 env vars (S3_BUCKET_NAME, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)');
    process.exit(1);
  }

  const client = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });

  const key = `blog-articles/${slug}.json`;
  const body = JSON.stringify(
    {
      ...data,
      savedAt: new Date().toISOString(),
      version: data.version || '1.0',
    },
    null,
    2
  );

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: 'application/json',
      Metadata: {
        'article-title': data.blogPost.title || '',
        'article-author': data.blogPost.author || '',
        'article-category': data.blogPost.category || '',
      },
    })
  );

  console.log(`Published: s3://${bucket}/${key}`);
  console.log(`URL: https://research.topledger.xyz/blogs/${slug}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
