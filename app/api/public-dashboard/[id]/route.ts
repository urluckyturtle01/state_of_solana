import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

// Debug environment variables
console.log('=== PUBLIC DASHBOARD API DEBUG ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Has AWS_ACCESS_KEY_ID:', !!process.env.AWS_ACCESS_KEY_ID);
console.log('Has AWS_SECRET_ACCESS_KEY:', !!process.env.AWS_SECRET_ACCESS_KEY);
console.log('AWS_REGION:', process.env.AWS_REGION);
console.log('S3_BUCKET_NAME:', process.env.S3_BUCKET_NAME);
console.log('======================================');

const hasAWSCredentials = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;
let s3Client: S3Client | null = null;

if (hasAWSCredentials) {
  console.log('Initializing S3 client for public dashboard access...');
  try {
    const region = process.env.AWS_REGION || 'ap-southeast-2';
    console.log('Using AWS region:', region);
    
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
    console.log('S3 client initialized successfully for public dashboard access');
  } catch (error) {
    console.error('Failed to initialize S3 client for public dashboard:', error);
    s3Client = null;
  }
} else {
  console.log('No AWS credentials found for public dashboard API');
}

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'tl-state-of-solana';

interface Dashboard {
  id: string;
  name: string;
  description?: string;
  chartsCount: number;
  createdAt: string;
  lastModified: string;
  charts: any[];
  textboxes: any[];
  createdBy?: string;
  isPublic?: boolean;
}

interface UserData {
  userId: string;
  email: string;
  name: string;
  dashboards: Dashboard[];
  charts: any[];
  textboxes: any[];
  explorerData: any;
  createdAt: string;
  lastModified: string;
}

// Enable ISR for public dashboard with 2-minute revalidation
export const revalidate = 120;

// GET - Retrieve public dashboard
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  console.log('\n=== GET /api/public-dashboard/[id] called ===');
  
  try {
    const dashboardId = params.id;
    console.log('Looking for public dashboard with ID:', dashboardId);

    if (!hasAWSCredentials || !s3Client) {
      console.error('S3 not available for public dashboard access');
      return NextResponse.json({ 
        error: 'Dashboard service unavailable',
        details: 'Public dashboard access requires S3 configuration'
      }, { status: 503 });
    }

    // We need to search through all user data files to find the public dashboard
    // This is not ideal but necessary since we don't have a separate public dashboard index
    console.log('Searching for public dashboard across all users...');
    
    try {
      // List all user data files
      const listCommand = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: 'user-data/',
        MaxKeys: 1000 // Limit search to prevent timeout
      });
      
      const listResponse = await s3Client.send(listCommand);
      const userFiles = listResponse.Contents?.map(obj => obj.Key).filter(key => key && key.endsWith('.json')) || [];
      
      console.log(`Found ${userFiles.length} user data files to search`);
      
      // Search through user files for the public dashboard
      for (const userFile of userFiles) {
        try {
          console.log(`Checking file: ${userFile}`);
          
          const getCommand = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: userFile,
          });
          
          const response = await s3Client.send(getCommand);
          if (!response.Body) continue;
          
          const userData: UserData = JSON.parse(await response.Body.transformToString());
          
          // Look for the dashboard in this user's data
          const dashboard = userData.dashboards?.find(d => d.id === dashboardId);
          
          if (dashboard) {
            console.log('Found dashboard:', dashboard.name, 'by user:', userData.name || userData.email);
            
            // Check if dashboard is marked as public (if this field exists)
            // For now, we'll return any dashboard that exists, but in production you should add isPublic field
            if (dashboard.isPublic !== false) { // Allow access if isPublic is not explicitly false
              // Reconstruct the full dashboard with charts and textboxes
              const dashboardCharts = userData.charts?.filter(c => c.dashboardId === dashboardId) || [];
              const dashboardTextboxes = userData.textboxes?.filter(t => t.dashboardId === dashboardId) || [];
              
              const fullDashboard = {
                ...dashboard,
                charts: dashboardCharts.sort((a, b) => (a.order || 0) - (b.order || 0)),
                textboxes: dashboardTextboxes.sort((a, b) => (a.order || 0) - (b.order || 0)),
                createdBy: userData.name || userData.email || 'Anonymous'
              };
              
              console.log('Returning public dashboard with', dashboardCharts.length, 'charts and', dashboardTextboxes.length, 'textboxes');
              
              return NextResponse.json({
                success: true,
                dashboard: fullDashboard,
                message: 'Public dashboard found'
              });
            } else {
              console.log('Dashboard found but not marked as public');
              return NextResponse.json({
                error: 'Dashboard not found',
                details: 'The dashboard you\'re looking for doesn\'t exist or is not publicly accessible.'
              }, { status: 404 });
            }
          }
        } catch (fileError) {
          console.log(`Error reading file ${userFile}:`, fileError);
          // Continue to next file
          continue;
        }
      }
      
      // Dashboard not found in any user data
      console.log('Dashboard not found in any user data files');
      return NextResponse.json({
        error: 'Dashboard not found',
        details: 'The dashboard you\'re looking for doesn\'t exist or is not publicly accessible.'
      }, { status: 404 });
      
    } catch (searchError) {
      console.error('Error searching for public dashboard:', searchError);
      return NextResponse.json({
        error: 'Search failed',
        details: 'Failed to search for public dashboard'
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('=== ERROR in GET /api/public-dashboard ===');
    console.error('Error details:', error);
    console.error('===========================================');
    
    return NextResponse.json({ 
      error: 'Failed to retrieve public dashboard',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 