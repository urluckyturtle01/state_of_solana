import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

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

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;

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

    const s3Client = new S3Client({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY,
        secretAccessKey: AWS_SECRET_KEY,
      },
    });

    const analyticsKey = `blog-analytics/${slug}.json`;

    try {
      const getCommand = new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: analyticsKey,
      });

      const result = await s3Client.send(getCommand);
      const body = await result.Body?.transformToString();
      
      if (!body) {
        // No analytics data exists yet, return default values
        return NextResponse.json({
          totalViews: 0,
          totalReadTime: 0,
          averageReadTime: 0,
          formattedTotalReadTime: "0m",
          formattedAverageReadTime: "0m"
        });
      }

      const analyticsData: AnalyticsData = JSON.parse(body);
      
      // Calculate average read time
      const averageReadTime = analyticsData.totalViews > 0 
        ? analyticsData.totalReadTime / analyticsData.totalViews 
        : 0;

      // Format time in readable format
      const formatTime = (seconds: number): string => {
        if (seconds < 60) return `${Math.round(seconds)}s`;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.round(seconds % 60);
        if (minutes < 60) {
          return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
        }
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours}h ${remainingMinutes}m`;
      };

      return NextResponse.json({
        totalViews: analyticsData.totalViews,
        totalReadTime: analyticsData.totalReadTime,
        averageReadTime: averageReadTime,
        formattedTotalReadTime: formatTime(analyticsData.totalReadTime),
        formattedAverageReadTime: formatTime(averageReadTime)
      });

    } catch (error: any) {
      // File doesn't exist yet
      if (error.name === 'NoSuchKey' || error.Code === 'NoSuchKey') {
        return NextResponse.json({
          totalViews: 0,
          totalReadTime: 0,
          averageReadTime: 0,
          formattedTotalReadTime: "0m",
          formattedAverageReadTime: "0m"
        });
      }
      throw error;
    }

  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
} 