import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(request: NextRequest) {
  try {
    const { slug } = await request.json();
    
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
      console.log('S3 credentials not configured, skipping S3 delete');
      return NextResponse.json({ 
        message: 'S3 credentials not configured',
        deleted: false 
      });
    }

    // Use AWS SDK v3 (if available)
    try {
      // Dynamic import to avoid errors if AWS SDK is not installed
      const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
      
      const s3Client = new S3Client({
        region: AWS_REGION,
        credentials: {
          accessKeyId: AWS_ACCESS_KEY,
          secretAccessKey: AWS_SECRET_KEY,
        },
      });

      const key = `blog-articles/${slug}.json`;

      const command = new DeleteObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      });

      await s3Client.send(command);

      return NextResponse.json({
        message: 'Blog article deleted from S3 successfully',
        key: key,
        bucket: S3_BUCKET,
        deleted: true
      });

    } catch (sdkError) {
      console.log('AWS SDK not available or failed for S3 delete');
      
      return NextResponse.json({
        message: 'S3 delete requires AWS SDK installation',
        deleted: false,
        error: 'AWS SDK not available'
      });
    }

  } catch (error) {
    console.error('Error deleting from S3:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete from S3', 
        details: (error as Error).message,
        deleted: false
      },
      { status: 500 }
    );
  }
} 