import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

// S3 Configuration
const hasAWSCredentials = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;
const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'tl-state-of-solana';

let s3Client: S3Client | null = null;

if (hasAWSCredentials) {
  s3Client = new S3Client({
    region: process.env.AWS_REGION || 'ap-southeast-2',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
    forcePathStyle: true,
    maxAttempts: 3,
  });
}

interface UserData {
  userId: string;
  email: string;
  name: string;
  dashboards: any[];
  charts: any[];
  textboxes: any[];
  explorerData: {
    savedVisualizations: any[];
    selectedColumns: Record<string, string[]>;
    preferences: any;
  };
  createdAt: string;
  lastModified: string;
}

// GET - Retrieve Google user data only
export async function GET(request: NextRequest) {
  console.log('\n=== GET /api/user-data/google called ===');
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      console.log('❌ No Google session found');
      return NextResponse.json({ error: 'Google authentication required' }, { status: 401 });
    }

    const userId = session.user.email;
    const userEmail = session.user.email;
    const userName = session.user.name || '';
    
    console.log('✅ Google user authenticated:', userId);

    // Use S3 if available, otherwise local storage
    if (!s3Client) {
      console.log('⚠️ No S3 credentials, using local development storage');
      const defaultData: UserData = {
        userId,
        email: userEmail,
        name: userName,
        dashboards: [],
        charts: [],
        textboxes: [],
        explorerData: { savedVisualizations: [], selectedColumns: {}, preferences: {} },
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
      };
      
      return NextResponse.json({ 
        success: true, 
        userData: defaultData,
        isNewUser: true,
        mode: 'development'
      });
    }

    // S3 Production mode
    const key = `user-data/google/${userId}.json`;
    console.log('📡 S3 key:', key);

    try {
      const getCommand = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

      const response = await s3Client.send(getCommand);
      const userData = JSON.parse(await response.Body!.transformToString());
      console.log('✅ Retrieved Google user data from S3');
      
      return NextResponse.json({ 
        success: true, 
        userData,
        isNewUser: false,
        mode: 'production'
      });
    } catch (error: any) {
      if (error.name === 'NoSuchKey') {
        console.log('🆕 New Google user, creating default data');
        const defaultData: UserData = {
          userId,
          email: userEmail,
          name: userName,
          dashboards: [],
          charts: [],
          textboxes: [],
          explorerData: { savedVisualizations: [], selectedColumns: {}, preferences: {} },
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString()
        };

        return NextResponse.json({ 
          success: true, 
          userData: defaultData,
          isNewUser: true,
          mode: 'production'
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('❌ Google user data GET error:', error);
    return NextResponse.json({ 
      error: 'Failed to retrieve Google user data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST - Save Google user data only
export async function POST(request: NextRequest) {
  console.log('\n=== POST /api/user-data/google called ===');
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      console.log('❌ No Google session found');
      return NextResponse.json({ error: 'Google authentication required' }, { status: 401 });
    }

    const userId = session.user.email;
    const userEmail = session.user.email;
    const userName = session.user.name || '';
    
    const body = await request.json();
    const { dashboards, charts, textboxes, explorerData } = body;
    
    console.log('💾 Saving Google user data:', {
      userId,
      dashboards: dashboards?.length || 0,
      charts: charts?.length || 0,
      textboxes: textboxes?.length || 0
    });

    if (!s3Client) {
      console.log('⚠️ No S3 credentials, development mode');
      return NextResponse.json({ 
        success: true, 
        message: 'Data saved successfully (development mode)'
      });
    }

    // Get existing data or create new
    const key = `user-data/google/${userId}.json`;
    let existingUserData: UserData;
    
    try {
      const getCommand = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });
      const response = await s3Client.send(getCommand);
      existingUserData = JSON.parse(await response.Body!.transformToString());
    } catch (error: any) {
      if (error.name === 'NoSuchKey') {
        existingUserData = {
          userId,
          email: userEmail,
          name: userName,
          dashboards: [],
          charts: [],
          textboxes: [],
          explorerData: { savedVisualizations: [], selectedColumns: {}, preferences: {} },
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString()
        };
      } else {
        throw error;
      }
    }

    // Update user data
    const updatedUserData: UserData = {
      ...existingUserData,
      dashboards: dashboards || existingUserData.dashboards,
      charts: charts || existingUserData.charts,
      textboxes: textboxes || existingUserData.textboxes,
      explorerData: explorerData || existingUserData.explorerData,
      lastModified: new Date().toISOString()
    };

    // Save to S3
    const putCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: JSON.stringify(updatedUserData, null, 2),
      ContentType: 'application/json',
    });

    await s3Client.send(putCommand);
    console.log('✅ Google user data saved to S3');

    return NextResponse.json({ 
      success: true, 
      message: 'Google user data saved successfully'
    });
  } catch (error) {
    console.error('❌ Google user data POST error:', error);
    return NextResponse.json({ 
      error: 'Failed to save Google user data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 