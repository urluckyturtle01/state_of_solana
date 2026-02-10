import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check if AWS credentials are configured
    const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID;
    const AWS_SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY;
    const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
    const S3_BUCKET = process.env.S3_BUCKET_NAME;

    if (!AWS_ACCESS_KEY || !AWS_SECRET_KEY || !S3_BUCKET) {
      return NextResponse.json({
        articles: [],
        message: 'S3 credentials not configured',
        count: 0
      });
    }

    try {
      // Dynamic import to avoid errors if AWS SDK is not installed
      const { S3Client, ListObjectsV2Command, GetObjectCommand } = await import('@aws-sdk/client-s3');
      
      const s3Client = new S3Client({
        region: AWS_REGION,
        credentials: {
          accessKeyId: AWS_ACCESS_KEY,
          secretAccessKey: AWS_SECRET_KEY,
        },
      });

      // List all objects in the blog-articles folder
      const listCommand = new ListObjectsV2Command({
        Bucket: S3_BUCKET,
        Prefix: 'blog-articles/',
        MaxKeys: 100 // Adjust as needed
      });

      const listResult = await s3Client.send(listCommand);
      const objects = listResult.Contents || [];

      // Fetch each blog post metadata
      const articles = [];
      
      for (const object of objects) {
        if (object.Key && object.Key.endsWith('.json')) {
          try {
            const getCommand = new GetObjectCommand({
              Bucket: S3_BUCKET,
              Key: object.Key,
            });

            const getResult = await s3Client.send(getCommand);
            const body = await getResult.Body?.transformToString();
            
            if (body) {
              const articleData = JSON.parse(body);
              // Extract just the blog post metadata (not the full content)
              articles.push(articleData.blogPost);
            }
          } catch (fileError) {
            console.error(`Error reading ${object.Key}:`, fileError);
            // Continue with other files
          }
        }
      }

      // Sort by date (newest first)
      articles.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return NextResponse.json({
        articles,
        count: articles.length,
        message: `Found ${articles.length} articles in S3`
      });

    } catch (sdkError) {
      console.error('AWS SDK error:', sdkError);
      return NextResponse.json({
        articles: [],
        error: 'AWS SDK not available or failed',
        message: 'S3 listing requires AWS SDK installation',
        count: 0
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error listing S3 articles:', error);
    return NextResponse.json(
      { 
        error: 'Failed to list articles from S3', 
        details: (error as Error).message,
        articles: [],
        count: 0
      },
      { status: 500 }
    );
  }
} 