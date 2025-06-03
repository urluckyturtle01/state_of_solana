import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

// Debug environment variables
console.log('=== USER-DATA API DEBUG ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Has AWS_ACCESS_KEY_ID:', !!process.env.AWS_ACCESS_KEY_ID);
console.log('Has AWS_SECRET_ACCESS_KEY:', !!process.env.AWS_SECRET_ACCESS_KEY);
console.log('AWS_REGION:', process.env.AWS_REGION);
console.log('S3_BUCKET_NAME:', process.env.S3_BUCKET_NAME);
console.log('Has NEXTAUTH_SECRET:', !!process.env.NEXTAUTH_SECRET);
console.log('============================');

// Check if running in development mode and AWS credentials are missing
const isProduction = process.env.NODE_ENV === 'production';
const hasAWSCredentials = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;

// Temporarily force development mode to test functionality
const forceDevelopmentMode = true; // TODO: Remove this after S3 is fixed

let s3Client: S3Client | null = null;

if (hasAWSCredentials && !forceDevelopmentMode) {
  console.log('Initializing S3 client with credentials...');
  try {
    const region = process.env.AWS_REGION || 'ap-southeast-2';
    console.log('Using AWS region:', region);
    s3Client = new S3Client({
      region: region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
      forcePathStyle: false, // Use virtual-hosted-style URLs
    });
    console.log('S3 client initialized successfully');
  } catch (error) {
    console.error('Failed to initialize S3 client:', error);
  }
} else {
  console.log('No AWS credentials found, will use development mode');
}

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'tl-state-of-solana';

interface UserData {
  userId: string;
  email: string;
  name: string;
  dashboards: any[];
  charts: any[];      // Separate normalized table
  textboxes: any[];   // Separate normalized table
  explorerData: {
    savedVisualizations: any[];
    selectedColumns: Record<string, string[]>;
    preferences: any;
  };
  createdAt: string;
  lastModified: string;
}

// In-memory storage for development mode
const devUserStorage = new Map<string, UserData>();

// GET - Retrieve user data
export async function GET(request: NextRequest) {
  console.log('\n=== GET /api/user-data called ===');
  
  try {
    console.log('Getting server session...');
    const session = await getServerSession(authOptions);
    console.log('Session result:', { 
      hasSession: !!session, 
      hasUser: !!session?.user, 
      hasEmail: !!session?.user?.email,
      email: session?.user?.email 
    });
    
    if (!session?.user?.email) {
      console.log('No valid session found, returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.email; // Use email as user ID
    console.log('Processing request for user:', userId);

    // Development mode fallback
    if (!hasAWSCredentials || forceDevelopmentMode) {
      console.log('Using development mode (in-memory storage)');
      
      let userData = devUserStorage.get(userId);
      
      if (!userData) {
        console.log('Creating new user data for development mode');
        // Create default user data for development
        userData = {
          userId,
          email: session.user.email,
          name: session.user.name || '',
          dashboards: [], // Start with empty dashboards - user will create their own
          charts: [], // Normalized charts table
          textboxes: [], // Normalized textboxes table
          explorerData: {
            savedVisualizations: [],
            selectedColumns: {},
            preferences: {}
          },
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString()
        };
        
        devUserStorage.set(userId, userData);
      } else {
        console.log('Retrieved existing user data from memory');
      }
      
      console.log('Returning development mode data');
      return NextResponse.json({ 
        success: true, 
        userData,
        isNewUser: !devUserStorage.has(userId),
        mode: 'development'
      });
    }

    // Production mode with S3
    console.log('Using production mode (S3 storage)');
    if (!s3Client) {
      throw new Error('S3 client not initialized');
    }

    const key = `user-data/${userId}.json`;
    console.log('S3 key:', key);

    try {
      console.log('Attempting to get user data from S3...');
      // Check if user data exists
      const getCommand = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

      const response = await s3Client.send(getCommand);
      const userData = JSON.parse(await response.Body!.transformToString());
      console.log('Successfully retrieved user data from S3');
      
      return NextResponse.json({ 
        success: true, 
        userData,
        isNewUser: false,
        mode: 'production'
      });
    } catch (error: any) {
      console.log('S3 error:', error.name, error.message);
      if (error.name === 'NoSuchKey') {
        console.log('User data not found in S3, creating default data');
        // User doesn't exist, return default structure
        const defaultUserData: UserData = {
          userId,
          email: session.user.email,
          name: session.user.name || '',
          dashboards: [], // Start with empty dashboards - user will create their own
          charts: [], // Normalized charts table
          textboxes: [], // Normalized textboxes table
          explorerData: {
            savedVisualizations: [],
            selectedColumns: {},
            preferences: {}
          },
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString()
        };

        return NextResponse.json({ 
          success: true, 
          userData: defaultUserData,
          isNewUser: true,
          mode: 'production'
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('=== ERROR in GET /api/user-data ===');
    console.error('Error details:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('=====================================');
    
    return NextResponse.json({ 
      error: 'Failed to retrieve user data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST - Save user data
export async function POST(request: NextRequest) {
  console.log('\n=== POST /api/user-data called ===');
  
  try {
    console.log('Getting server session...');
    const session = await getServerSession(authOptions);
    console.log('Session result:', { 
      hasSession: !!session, 
      hasUser: !!session?.user, 
      hasEmail: !!session?.user?.email,
      email: session?.user?.email 
    });
    
    if (!session?.user?.email) {
      console.log('No valid session found, returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Parsing request body...');
    const body = await request.json();
    const { dashboards, charts, textboxes, explorerData } = body;
    console.log('Request body parsed:', { 
      hasDashboards: !!dashboards, 
      hasCharts: !!charts,
      hasTextboxes: !!textboxes,
      hasExplorerData: !!explorerData,
      dashboardsCount: dashboards?.length || 0,
      chartsCount: charts?.length || 0,
      textboxesCount: textboxes?.length || 0,
      visualizationsCount: explorerData?.savedVisualizations?.length || 0
    });

    const userId = session.user.email;
    console.log('Processing save request for user:', userId);

    // Development mode fallback
    if (!hasAWSCredentials || forceDevelopmentMode) {
      console.log('Using development mode (in-memory storage)');
      
      let existingUserData = devUserStorage.get(userId);
      
      if (!existingUserData) {
        console.log('Creating new user data structure for development mode');
        existingUserData = {
          userId,
          email: session.user.email,
          name: session.user.name || '',
          dashboards: [],
          charts: [],
          textboxes: [],
          explorerData: {
            savedVisualizations: [],
            selectedColumns: {},
            preferences: {}
          },
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString()
        };
      } else {
        console.log('Retrieved existing user data from memory');
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

      devUserStorage.set(userId, updatedUserData);
      console.log('Successfully saved data to memory');

      return NextResponse.json({ 
        success: true, 
        message: 'User data saved successfully (development mode)'
      });
    }

    // Production mode with S3
    console.log('Using production mode (S3 storage)');
    if (!s3Client) {
      throw new Error('S3 client not initialized');
    }

    const key = `user-data/${userId}.json`;
    console.log('S3 key:', key);

    // Get existing data or create new
    let existingUserData: UserData;
    
    try {
      console.log('Attempting to get existing user data from S3...');
      const getCommand = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });
      const response = await s3Client.send(getCommand);
      existingUserData = JSON.parse(await response.Body!.transformToString());
      console.log('Successfully retrieved existing user data from S3');
    } catch (error: any) {
      console.log('S3 get error:', error.name, error.message);
      if (error.name === 'NoSuchKey') {
        console.log('No existing user data found, creating new structure');
        // Create new user data
        existingUserData = {
          userId,
          email: session.user.email,
          name: session.user.name || '',
          dashboards: [],
          charts: [],
          textboxes: [],
          explorerData: {
            savedVisualizations: [],
            selectedColumns: {},
            preferences: {}
          },
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

    console.log('Attempting to save updated data to S3...');
    // Save to S3
    const putCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: JSON.stringify(updatedUserData, null, 2),
      ContentType: 'application/json',
    });

    await s3Client.send(putCommand);
    console.log('Successfully saved user data to S3');

    return NextResponse.json({ 
      success: true, 
      message: 'User data saved successfully (production mode)' 
    });
  } catch (error) {
    console.error('=== ERROR in POST /api/user-data ===');
    console.error('Error details:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('======================================');
    
    return NextResponse.json({ 
      error: 'Failed to save user data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 