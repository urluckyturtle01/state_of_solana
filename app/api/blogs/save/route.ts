import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { blogPost, content } = await request.json();

    // Validate required fields based on status
    if (!blogPost.title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // For published articles, require all fields
    if (blogPost.status === 'published' && (!blogPost.excerpt || !blogPost.author || !blogPost.slug)) {
      return NextResponse.json(
        { error: 'Missing required fields for published article: excerpt, author, or slug' },
        { status: 400 }
      );
    }

    // Generate slug if not provided (for drafts)
    if (!blogPost.slug) {
      blogPost.slug = blogPost.title
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 50);
    }

    // Save directly to S3 (primary storage)
    const s3Data = {
      blogPost: {
        ...blogPost,
        id: blogPost.id,
        date: blogPost.date
      },
      content,
      savedAt: new Date().toISOString(),
      version: '1.0'
    };

    // Check if AWS credentials are configured
    const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID;
    const AWS_SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY;
    const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
    const S3_BUCKET = process.env.S3_BUCKET_NAME;

    if (!AWS_ACCESS_KEY || !AWS_SECRET_KEY || !S3_BUCKET) {
      throw new Error('S3 credentials not configured');
    }

    // Use AWS SDK directly
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
    
    const s3Client = new S3Client({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY,
        secretAccessKey: AWS_SECRET_KEY,
      },
    });

    const key = `blog-articles/${blogPost.slug}.json`;
    const body = JSON.stringify(s3Data, null, 2);

    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: 'application/json',
      Metadata: {
        'article-title': blogPost.title || '',
        'article-author': blogPost.author || '',
        'article-category': blogPost.category || '',
        'saved-at': s3Data.savedAt,
      },
    });

    await s3Client.send(command);
    
    return NextResponse.json({ 
      message: 'Blog post saved successfully to S3',
      slug: blogPost.slug,
      savedToS3: true,
      s3Key: key,
      bucket: S3_BUCKET
    });

  } catch (error) {
    console.error('Error saving blog post:', error);
    return NextResponse.json(
      { error: 'Failed to save blog post', details: (error as Error).message },
      { status: 500 }
    );
  }
} 