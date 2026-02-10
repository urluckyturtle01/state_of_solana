import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Check if AWS credentials are configured
    const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID;
    const AWS_SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY;
    const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
    const S3_BUCKET = process.env.S3_BUCKET_NAME;

    if (!AWS_ACCESS_KEY || !AWS_SECRET_KEY || !S3_BUCKET) {
      console.log('S3 credentials not configured, skipping S3 save');
      return NextResponse.json({ 
        message: 'S3 credentials not configured',
        saved: false 
      });
    }

    // Use AWS SDK v3 (if available) or implement direct HTTP API call
    try {
      // Dynamic import to avoid errors if AWS SDK is not installed
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
      
      const s3Client = new S3Client({
        region: AWS_REGION,
        credentials: {
          accessKeyId: AWS_ACCESS_KEY,
          secretAccessKey: AWS_SECRET_KEY,
        },
      });

      const key = `blog-articles/${data.blogPost.slug}.json`;
      const body = JSON.stringify(data, null, 2);

      const command = new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: body,
        ContentType: 'application/json',
        Metadata: {
          'article-title': data.blogPost.title || '',
          'article-author': data.blogPost.author || '',
          'article-category': data.blogPost.category || '',
          'saved-at': data.savedAt || new Date().toISOString(),
        },
      });

      await s3Client.send(command);

      return NextResponse.json({
        message: 'Blog article saved to S3 successfully',
        key: key,
        bucket: S3_BUCKET,
        saved: true
      });

    } catch (sdkError) {
      console.log('AWS SDK not available or failed, implementing direct HTTP API call');
      
      // Fallback to direct HTTP API call to S3
      const key = `blog-articles/${data.blogPost.slug}.json`;
      const body = JSON.stringify(data, null, 2);
      
      // This would require implementing AWS Signature Version 4
      // For now, just log and return success=false
      console.warn('Direct S3 HTTP API not implemented, AWS SDK required');
      
      return NextResponse.json({
        message: 'S3 save requires AWS SDK installation',
        saved: false,
        error: 'AWS SDK not available'
      });
    }

  } catch (error) {
    console.error('Error saving to S3:', error);
    return NextResponse.json(
      { 
        error: 'Failed to save to S3', 
        details: (error as Error).message,
        saved: false
      },
      { status: 500 }
    );
  }
} 