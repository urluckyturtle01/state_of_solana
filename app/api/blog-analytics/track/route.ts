import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

interface AnalyticsData {
  slug: string;
  totalViews: number;
  totalReadTime: number; // in seconds
  sessions: Array<{
    sessionId: string;
    timestamp: string;
    readTime: number;
    isNewView: boolean;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    let slug: string;
    let readTime: number;
    let sessionId: string;

    // Handle both JSON and FormData (for sendBeacon)
    const contentType = request.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      const body = await request.json();
      slug = body.slug;
      readTime = body.readTime;
      sessionId = body.sessionId;
    } else {
      // Handle FormData from sendBeacon
      const formData = await request.formData();
      slug = formData.get('slug') as string;
      readTime = parseInt(formData.get('readTime') as string) || 0;
      sessionId = formData.get('sessionId') as string;
    }

    if (!slug || !sessionId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if AWS credentials are configured
    const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID;
    const AWS_SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY;
    const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
    const S3_BUCKET = process.env.S3_BUCKET_NAME;

    if (!AWS_ACCESS_KEY || !AWS_SECRET_KEY || !S3_BUCKET) {
      return NextResponse.json({ error: 'S3 credentials not configured' }, { status: 500 });
    }

    const s3Client = new S3Client({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY,
        secretAccessKey: AWS_SECRET_KEY,
      },
    });

    const analyticsKey = `blog-analytics/${slug}.json`;

    // Try to get existing analytics data
    let existingData: AnalyticsData = {
      slug,
      totalViews: 0,
      totalReadTime: 0,
      sessions: []
    };

    try {
      const getCommand = new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: analyticsKey,
      });

      const result = await s3Client.send(getCommand);
      const body = await result.Body?.transformToString();
      
      if (body) {
        existingData = JSON.parse(body);
      }
    } catch (error: any) {
      // File doesn't exist yet, that's okay
      if (error.name !== 'NoSuchKey' && error.Code !== 'NoSuchKey') {
        console.error('Error fetching existing analytics:', error);
      }
    }

    // Check if this session already exists
    const existingSession = existingData.sessions.find(session => session.sessionId === sessionId);
    const isNewView = !existingSession;

    if (isNewView) {
      // New view
      existingData.totalViews += 1;
      existingData.sessions.push({
        sessionId,
        timestamp: new Date().toISOString(),
        readTime: readTime || 0,
        isNewView: true
      });
    } else {
      // Update existing session read time
      const sessionIndex = existingData.sessions.findIndex(session => session.sessionId === sessionId);
      if (sessionIndex !== -1) {
        existingData.sessions[sessionIndex].readTime = readTime || 0;
      }
    }

    // Recalculate total read time
    existingData.totalReadTime = existingData.sessions.reduce((total, session) => total + session.readTime, 0);

    // Save updated analytics data
    const putCommand = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: analyticsKey,
      Body: JSON.stringify(existingData, null, 2),
      ContentType: 'application/json',
    });

    await s3Client.send(putCommand);

    return NextResponse.json({ 
      success: true, 
      totalViews: existingData.totalViews,
      totalReadTime: existingData.totalReadTime,
      averageReadTime: existingData.totalViews > 0 ? existingData.totalReadTime / existingData.totalViews : 0,
      isNewView
    });

  } catch (error) {
    console.error('Error tracking analytics:', error);
    return NextResponse.json({ error: 'Failed to track analytics' }, { status: 500 });
  }
} 