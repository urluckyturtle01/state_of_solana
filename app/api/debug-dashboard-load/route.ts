import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

// Initialize S3 client
let s3Client: S3Client | null = null;
const hasAWSCredentials = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;

if (hasAWSCredentials) {
  try {
    s3Client = new S3Client({
      region: process.env.AWS_REGION || 'ap-southeast-2',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
      forcePathStyle: true,
      maxAttempts: 3,
    });
  } catch (error) {
    console.error('Failed to initialize S3 client:', error);
  }
}

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'tl-state-of-solana';

export async function GET(request: NextRequest) {
  console.log('\n=== DEBUG DASHBOARD LOAD ===');
  
  try {
    // Get current session
    const session = await getServerSession(authOptions);
    
    const debugInfo: any = {
      timestamp: new Date().toISOString(),
      sessionInfo: {
        hasSession: !!session,
        hasUser: !!session?.user,
        hasEmail: !!session?.user?.email,
        email: session?.user?.email,
        name: session?.user?.name
      },
      s3Info: {
        hasS3Client: !!s3Client,
        hasAWSCredentials: hasAWSCredentials,
        bucketName: BUCKET_NAME,
        region: process.env.AWS_REGION || 'ap-southeast-2'
      }
    };
    
    // If we have S3 access, check what files exist
    if (s3Client && hasAWSCredentials) {
      try {
        // List all user-data files
        const listCommand = new ListObjectsV2Command({
          Bucket: BUCKET_NAME,
          Prefix: 'user-data/',
          MaxKeys: 50
        });
        
        const listResponse = await s3Client.send(listCommand);
        debugInfo.s3Files = listResponse.Contents?.map(obj => ({
          key: obj.Key,
          size: obj.Size,
          lastModified: obj.LastModified
        })) || [];
        
        // If current user is authenticated, try to load their specific data
        if (session?.user?.email) {
          const userKey = `user-data/${session.user.email}.json`;
          debugInfo.currentUserKey = userKey;
          
          try {
            const getCommand = new GetObjectCommand({
              Bucket: BUCKET_NAME,
              Key: userKey,
            });
            
            const response = await s3Client.send(getCommand);
            const userData = JSON.parse(await response.Body!.transformToString());
            
            debugInfo.currentUserData = {
              hasData: true,
              dashboardsCount: userData.dashboards?.length || 0,
              chartsCount: userData.charts?.length || 0,
              textboxesCount: userData.textboxes?.length || 0,
              dashboardNames: userData.dashboards?.map((d: any) => d.name) || [],
              dataStructure: {
                hasDashboards: !!userData.dashboards,
                hasCharts: !!userData.charts,
                hasTextboxes: !!userData.textboxes,
                isChartsArray: Array.isArray(userData.charts),
                isDashboardsArray: Array.isArray(userData.dashboards)
              },
              sampleDashboard: userData.dashboards?.[0] ? {
                id: userData.dashboards[0].id,
                name: userData.dashboards[0].name,
                chartsCount: userData.dashboards[0].charts?.length || 0,
                hasChartsArray: Array.isArray(userData.dashboards[0].charts)
              } : null
            };
          } catch (userError: any) {
            debugInfo.currentUserData = {
              hasData: false,
              error: userError.name,
              message: userError.message
            };
          }
        }
        
        // Check for the specific user mentioned (ur.lucky.turtle@gmail.com)
        const specificUserKey = 'user-data/ur.lucky.turtle@gmail.com.json';
        try {
          const getCommand = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: specificUserKey,
          });
          
          const response = await s3Client.send(getCommand);
          const userData = JSON.parse(await response.Body!.transformToString());
          
          debugInfo.specificUserData = {
            email: 'ur.lucky.turtle@gmail.com',
            hasData: true,
            dashboardsCount: userData.dashboards?.length || 0,
            chartsCount: userData.charts?.length || 0,
            textboxesCount: userData.textboxes?.length || 0,
            dashboardNames: userData.dashboards?.map((d: any) => d.name) || [],
            dataStructure: {
              hasDashboards: !!userData.dashboards,
              hasCharts: !!userData.charts,
              hasTextboxes: !!userData.textboxes,
              isChartsArray: Array.isArray(userData.charts),
              isDashboardsArray: Array.isArray(userData.dashboards)
            },
            rawDashboards: userData.dashboards?.map((d: any) => ({
              id: d.id,
              name: d.name,
              chartsCount: d.charts?.length || 0,
              textboxesCount: d.textboxes?.length || 0,
              hasChartsArray: Array.isArray(d.charts),
              hasTextboxesArray: Array.isArray(d.textboxes)
            })) || []
          };
        } catch (specificUserError: any) {
          debugInfo.specificUserData = {
            email: 'ur.lucky.turtle@gmail.com',
            hasData: false,
            error: specificUserError.name,
            message: specificUserError.message
          };
        }
        
      } catch (s3Error: any) {
        debugInfo.s3Error = {
          name: s3Error.name,
          message: s3Error.message
        };
      }
    } else {
      debugInfo.s3Error = 'No S3 client or credentials available';
    }
    
    return NextResponse.json(debugInfo, { status: 200 });
    
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({ 
      error: 'Debug endpoint failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 