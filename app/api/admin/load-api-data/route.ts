import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

// S3 Configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_SECRET_KEY || '',
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || process.env.S3_BUCKET || 'tl-state-of-solana';

export async function GET(request: NextRequest) {
  try {
    // Validate required environment variables
    const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY;
    const AWS_SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_SECRET_KEY;
    const AWS_REGION = process.env.AWS_REGION || process.env.S3_REGION || 'us-east-1';

    if (!AWS_ACCESS_KEY || !AWS_SECRET_KEY || !BUCKET_NAME) {
      console.error('Missing S3 configuration:', {
        hasAccessKey: !!AWS_ACCESS_KEY,
        hasSecretKey: !!AWS_SECRET_KEY,
        hasBucket: !!BUCKET_NAME,
        region: AWS_REGION
      });
      
      return NextResponse.json({
        success: false,
        error: 'S3 credentials not properly configured',
        hasData: false
      }, { 
        status: 500,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }

    // Try to load the saved data from S3
    const key = 'admin/api-data/api-data.json';
    
    console.log(`Loading API data from S3: ${BUCKET_NAME}/${key}`);

    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

      const response = await s3Client.send(command);
      
      if (!response.Body) {
        throw new Error('Empty response body from S3');
      }

      // Convert the stream to string
      const bodyContents = await response.Body.transformToString();
      const data = JSON.parse(bodyContents);

      console.log(`Successfully loaded API data from S3: ${data.apis?.length || 0} APIs`);

      return NextResponse.json({
        success: true,
        hasData: true,
        data: data,
        source: 's3',
        loadedAt: new Date().toISOString(),
        s3Key: key
      }, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

    } catch (s3Error: any) {
      console.log(`No saved data found in S3 (${s3Error.name}), this is normal for first-time usage`);
      
      return NextResponse.json({
        success: true,
        hasData: false,
        message: 'No saved data found in S3',
        source: 'none',
        error: s3Error.name === 'NoSuchKey' ? 'No previous save found' : s3Error.message
      }, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }

  } catch (error) {
    console.error('Error loading API data from S3:', error);
    
    return NextResponse.json({
      success: false,
      hasData: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      source: 'error'
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
}
