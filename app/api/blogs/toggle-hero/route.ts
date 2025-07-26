import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { slug, isHero } = await request.json();

    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
    }

    // Check if AWS credentials are configured
    const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID;
    const AWS_SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY;
    const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
    const S3_BUCKET = process.env.S3_BUCKET_NAME;

    if (!AWS_ACCESS_KEY || !AWS_SECRET_KEY || !S3_BUCKET) {
      return NextResponse.json({ error: 'S3 credentials not configured' }, { status: 500 });
    }

    const { S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command } = await import('@aws-sdk/client-s3');
    
    const s3Client = new S3Client({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY,
        secretAccessKey: AWS_SECRET_KEY,
      },
    });

    // If setting as hero, first remove hero status from all other articles
    if (isHero) {
      const listCommand = new ListObjectsV2Command({
        Bucket: S3_BUCKET,
        Prefix: 'blog-articles/',
        MaxKeys: 100
      });

      const listResult = await s3Client.send(listCommand);
      const objects = listResult.Contents || [];

      for (const object of objects) {
        if (object.Key && object.Key.endsWith('.json') && !object.Key.includes(slug)) {
          try {
            const getCommand = new GetObjectCommand({
              Bucket: S3_BUCKET,
              Key: object.Key,
            });

            const getResult = await s3Client.send(getCommand);
            const body = await getResult.Body?.transformToString();
            
            if (body) {
              const articleData = JSON.parse(body);
              if (articleData.blogPost.isHero) {
                // Remove hero status
                articleData.blogPost.isHero = false;
                articleData.savedAt = new Date().toISOString();

                const putCommand = new PutObjectCommand({
                  Bucket: S3_BUCKET,
                  Key: object.Key,
                  Body: JSON.stringify(articleData, null, 2),
                  ContentType: 'application/json',
                });

                await s3Client.send(putCommand);
              }
            }
          } catch (fileError) {
            console.error(`Error updating ${object.Key}:`, fileError);
          }
        }
      }
    }

    // Now update the target article
    const key = `blog-articles/${slug}.json`;
    
    try {
      const getCommand = new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      });

      const getResult = await s3Client.send(getCommand);
      const body = await getResult.Body?.transformToString();
      
      if (!body) {
        return NextResponse.json({ error: 'Article not found' }, { status: 404 });
      }

      const articleData = JSON.parse(body);
      articleData.blogPost.isHero = isHero;
      articleData.savedAt = new Date().toISOString();

      const putCommand = new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: JSON.stringify(articleData, null, 2),
        ContentType: 'application/json',
        Metadata: {
          'article-title': articleData.blogPost.title || '',
          'article-author': articleData.blogPost.author || '',
          'article-category': articleData.blogPost.category || '',
          'is-hero': isHero.toString(),
          'updated-at': articleData.savedAt,
        },
      });

      await s3Client.send(putCommand);

      return NextResponse.json({
        message: isHero ? `"${articleData.blogPost.title}" is now the hero article` : `"${articleData.blogPost.title}" is no longer the hero article`,
        slug,
        isHero,
        updated: true
      });

    } catch (error: any) {
      if (error.name === 'NoSuchKey' || error.Code === 'NoSuchKey') {
        return NextResponse.json({ error: 'Article not found' }, { status: 404 });
      }
      throw error;
    }

  } catch (error) {
    console.error('Error toggling hero status:', error);
    return NextResponse.json(
      { 
        error: 'Failed to toggle hero status', 
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
} 