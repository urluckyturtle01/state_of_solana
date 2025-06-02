import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

export async function GET(request: NextRequest) {
  console.log('\n=== DEBUG USER DATA ===');
  
  try {
    // Check session
    const session = await getServerSession(authOptions);
    console.log('Session check:', { 
      hasSession: !!session, 
      hasUser: !!session?.user, 
      hasEmail: !!session?.user?.email,
      email: session?.user?.email 
    });
    
    if (!session?.user?.email) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        debugInfo: {
          hasSession: !!session,
          hasUser: !!session?.user,
          hasEmail: !!session?.user?.email
        }
      }, { status: 401 });
    }

    const userId = session.user.email;
    
    // Check environment variables
    const envCheck = {
      hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
      awsRegion: process.env.AWS_REGION,
      s3BucketName: process.env.S3_BUCKET_NAME,
      nodeEnv: process.env.NODE_ENV
    };
    
    console.log('Environment check:', envCheck);
    
    if (!envCheck.hasAccessKey || !envCheck.hasSecretKey) {
      return NextResponse.json({
        status: 'no_aws_credentials',
        message: 'AWS credentials not configured - using development mode',
        userId,
        envCheck,
        debugInfo: {
          message: 'Your dashboards should be stored in memory during development',
          suggestion: 'Check if you have S3 credentials configured for production use'
        }
      });
    }

    // Try to connect to S3
    try {
      const s3Client = new S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        },
      });

      const bucketName = process.env.S3_BUCKET_NAME || 'tl-state-of-solana';
      const userKey = `user-data/${userId}.json`;
      
      // Check if user file exists
      try {
        console.log('Checking for user file:', userKey);
        const getCommand = new GetObjectCommand({
          Bucket: bucketName,
          Key: userKey,
        });
        
        const response = await s3Client.send(getCommand);
        const userData = JSON.parse(await response.Body!.transformToString());
        
        return NextResponse.json({
          status: 'user_data_found',
          message: 'User data found in S3',
          userId,
          envCheck,
          userData: {
            dashboardCount: userData.dashboards?.length || 0,
            dashboardNames: userData.dashboards?.map((d: any) => d.name) || [],
            chartsTotal: userData.dashboards?.reduce((total: number, d: any) => total + (d.charts?.length || 0), 0) || 0,
            lastModified: userData.lastModified,
            createdAt: userData.createdAt
          },
          s3Info: {
            bucket: bucketName,
            key: userKey,
            region: process.env.AWS_REGION
          }
        });
        
      } catch (getError: any) {
        console.log('User file not found or error:', getError.name, getError.message);
        
        // List files in user-data directory to see what exists
        try {
          const listCommand = new ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: 'user-data/',
            MaxKeys: 20
          });
          
          const listResponse = await s3Client.send(listCommand);
          const userFiles = listResponse.Contents?.map(obj => obj.Key) || [];
          
          return NextResponse.json({
            status: 'user_data_not_found',
            message: 'User data not found in S3',
            userId,
            envCheck,
            s3Info: {
              bucket: bucketName,
              key: userKey,
              region: process.env.AWS_REGION,
              error: getError.message,
              userFilesFound: userFiles
            },
            debugInfo: {
              message: 'Your user data file does not exist in S3',
              possibleReasons: [
                'This is your first time logging in',
                'Data was created under a different email/account',
                'S3 bucket or region configuration changed',
                'Data was accidentally deleted'
              ],
              suggestion: 'Check if you logged in with the same Google account before'
            }
          });
          
        } catch (listError) {
          console.error('Failed to list S3 objects:', listError);
          return NextResponse.json({
            status: 's3_connection_error',
            message: 'Cannot connect to S3 or list files',
            userId,
            envCheck,
            error: listError instanceof Error ? listError.message : 'Unknown error',
            debugInfo: {
              message: 'There\'s an issue connecting to S3',
              suggestion: 'Check S3 credentials and bucket configuration'
            }
          });
        }
      }
      
    } catch (s3Error) {
      console.error('S3 client error:', s3Error);
      return NextResponse.json({
        status: 's3_client_error',
        message: 'Failed to initialize S3 client',
        userId,
        envCheck,
        error: s3Error instanceof Error ? s3Error.message : 'Unknown error',
        debugInfo: {
          message: 'Cannot create S3 client',
          suggestion: 'Check AWS credentials and region configuration'
        }
      });
    }
    
  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({ 
      status: 'debug_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      debugInfo: {
        message: 'Error in debug endpoint',
        suggestion: 'Check server logs for more details'
      }
    }, { status: 500 });
  }
} 