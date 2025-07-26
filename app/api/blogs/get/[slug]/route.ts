import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const { slug } = params;

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug is required' },
        { status: 400 }
      );
    }

    // Check if AWS credentials are configured
    const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID;
    const AWS_SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY;
    const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
    const S3_BUCKET = process.env.S3_BUCKET_NAME;

    if (!AWS_ACCESS_KEY || !AWS_SECRET_KEY || !S3_BUCKET) {
      return NextResponse.json({
        error: 'S3 credentials not configured',
        article: null
      }, { status: 404 });
    }

    try {
      // Dynamic import to avoid errors if AWS SDK is not installed
      const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
      
      const s3Client = new S3Client({
        region: AWS_REGION,
        credentials: {
          accessKeyId: AWS_ACCESS_KEY,
          secretAccessKey: AWS_SECRET_KEY,
        },
      });

      const key = `blog-articles/${slug}.json`;

      const command = new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      });

      const result = await s3Client.send(command);
      const body = await result.Body?.transformToString();
      
      if (!body) {
        return NextResponse.json({
          error: 'Article not found',
          article: null
        }, { status: 404 });
      }

      const articleData = JSON.parse(body);

      return NextResponse.json({
        article: articleData,
        message: 'Article found',
        key: key
      });

    } catch (sdkError: any) {
      console.error('AWS SDK error:', sdkError);
      
      // Check if it's a NoSuchKey error
      if (sdkError.name === 'NoSuchKey' || sdkError.Code === 'NoSuchKey') {
        return NextResponse.json({
          error: 'Article not found',
          article: null
        }, { status: 404 });
      }
      
      return NextResponse.json({
        error: 'AWS SDK not available or failed',
        details: sdkError.message || 'Unknown AWS error',
        article: null
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error getting article from S3:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get article from S3', 
        details: (error as Error).message,
        article: null
      },
      { status: 500 }
    );
  }
} 