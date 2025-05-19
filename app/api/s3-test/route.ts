import { NextRequest, NextResponse } from 'next/server';
import AWS from 'aws-sdk';

// Enable server-side rendering for the API route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/s3-test - Test S3 connectivity
export async function GET(req: NextRequest) {
  try {
    // Check environment variables
    const envChecks = {
      AWS_REGION: !!process.env.AWS_REGION || !!process.env.S3_REGION,
      AWS_ACCESS_KEY_ID: !!process.env.AWS_ACCESS_KEY_ID || !!process.env.S3_ACCESS_KEY,
      AWS_SECRET_ACCESS_KEY: !!process.env.AWS_SECRET_ACCESS_KEY || !!process.env.S3_SECRET_KEY,
      S3_BUCKET_NAME: !!process.env.S3_BUCKET_NAME || !!process.env.S3_BUCKET
    };
    
    // Check if any environment variables are missing
    const missingVars = Object.entries(envChecks)
      .filter(([_, value]) => !value)
      .map(([key, _]) => key);
    
    // Configure AWS SDK
    const s3 = new AWS.S3({
      region: process.env.AWS_REGION || process.env.S3_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_SECRET_KEY || '',
      },
    });
    
    const bucketName = process.env.S3_BUCKET_NAME || process.env.S3_BUCKET || 'tl-state-of-solana';
    
    // Only attempt S3 operations if we have credentials
    let s3Status = 'Not tested - missing credentials';
    let listResult: string[] = [];
    
    if (envChecks.AWS_ACCESS_KEY_ID && envChecks.AWS_SECRET_ACCESS_KEY) {
      try {
        // Test listing objects from the bucket
        const params = {
          Bucket: bucketName,
          MaxKeys: 5
        };
        
        const data = await s3.listObjectsV2(params).promise();
        s3Status = 'Connected successfully';
        listResult = (data.Contents || []).map(item => item.Key || '').filter(key => key !== '');
      } catch (s3Error) {
        s3Status = `Connection failed: ${s3Error instanceof Error ? s3Error.message : String(s3Error)}`;
      }
    }
    
    return NextResponse.json({
      environment: {
        node_env: process.env.NODE_ENV,
        environment_variables: envChecks,
        missing_variables: missingVars,
      },
      s3: {
        bucket: bucketName,
        region: process.env.AWS_REGION || process.env.S3_REGION || 'us-east-1',
        status: s3Status,
        sample_keys: listResult
      }
    });
  } catch (error) {
    console.error('API: Error in S3 test:', error);
    return NextResponse.json(
      { error: 'S3 test failed', details: String(error) },
      { status: 500 }
    );
  }
} 