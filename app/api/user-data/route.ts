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

// Helper function to check internal authentication
function checkInternalAuth(request: NextRequest): boolean {
  const cookies = request.cookies;
  const authCookie = cookies.get('solana_dashboard_session');
  return authCookie?.value === 'authenticated';
}

// Check if running in development mode and AWS credentials are missing
const isProduction = process.env.NODE_ENV === 'production';
const hasAWSCredentials = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;

// Remove development mode - fix S3 properly
const forceDevelopmentMode = false;

let s3Client: S3Client | null = null;

if (hasAWSCredentials && !forceDevelopmentMode) {
  console.log('Initializing S3 client with credentials...');
  try {
    const region = process.env.AWS_REGION || 'ap-southeast-2';
    const bucketName = process.env.S3_BUCKET_NAME || 'tl-state-of-solana';
    console.log('Using AWS region:', region);
    console.log('Using bucket name:', bucketName);
    
    s3Client = new S3Client({
      region: region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
      // Use path-style URLs to avoid regional redirect issues
      forcePathStyle: true,
      maxAttempts: 3,
    });
    console.log('S3 client initialized successfully for region:', region);
  } catch (error) {
    console.error('Failed to initialize S3 client:', error);
    s3Client = null; // Fallback to development mode
  }
} else {
  if (forceDevelopmentMode) {
    console.log('Development mode forced - using in-memory storage');
  } else {
    console.log('No AWS credentials found, will use development mode');
  }
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

// Smart router - redirects to appropriate specialized endpoint
export async function GET(request: NextRequest) {
  console.log('\n=== ROUTER: GET /api/user-data called ===');
  
  try {
    const session = await getServerSession(authOptions);
    const hasInternalAuth = checkInternalAuth(request);
    
    console.log('🔍 Router decision:', {
      hasGoogleSession: !!session?.user?.email,
      hasInternalAuth,
      userEmail: session?.user?.email
    });
    
    // Route to appropriate endpoint
    if (session?.user?.email) {
      console.log('🎯 Routing to Google endpoint');
      const googleResponse = await fetch(new URL('/api/user-data/google', request.url), {
        method: 'GET',
        headers: request.headers,
      });
      return googleResponse;
    } else if (hasInternalAuth) {
      console.log('🎯 Routing to Internal endpoint');
      const internalResponse = await fetch(new URL('/api/user-data/internal', request.url), {
        method: 'GET',
        headers: request.headers,
      });
      return internalResponse;
    } else {
      console.log('❌ No authentication found');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
  } catch (error) {
    console.error('❌ Router GET error:', error);
    return NextResponse.json({ 
      error: 'Routing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Smart router - redirects to appropriate specialized endpoint
export async function POST(request: NextRequest) {
  console.log('\n=== ROUTER: POST /api/user-data called ===');
  
  try {
    const session = await getServerSession(authOptions);
    const hasInternalAuth = checkInternalAuth(request);
    
    console.log('🔍 Router decision:', {
      hasGoogleSession: !!session?.user?.email,
      hasInternalAuth,
      userEmail: session?.user?.email
    });
    
    // Clone the request body since it can only be read once
    const body = await request.json();
    
    // Route to appropriate endpoint
    if (session?.user?.email) {
      console.log('🎯 Routing to Google endpoint');
      const googleResponse = await fetch(new URL('/api/user-data/google', request.url), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...Object.fromEntries(request.headers.entries())
        },
        body: JSON.stringify(body),
      });
      return googleResponse;
    } else if (hasInternalAuth) {
      console.log('🎯 Routing to Internal endpoint');
      const internalResponse = await fetch(new URL('/api/user-data/internal', request.url), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...Object.fromEntries(request.headers.entries())
        },
        body: JSON.stringify(body),
      });
      return internalResponse;
    } else {
      console.log('❌ No authentication found');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
  } catch (error) {
    console.error('❌ Router POST error:', error);
    return NextResponse.json({ 
      error: 'Routing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 