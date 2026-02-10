import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// S3 Configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_SECRET_KEY || '',
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || process.env.S3_BUCKET || 'tl-state-of-solana';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

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
        error: 'S3 credentials not properly configured'
      }, { status: 500 });
    }

    // Use fixed filename to update the same file each time
    const key = 'admin/api-data/api-data.json';

    // Prepare the data to save
    const dataToSave = {
      ...data,
      savedAt: new Date().toISOString(),
      savedBy: 'admin-panel',
      version: '1.0'
    };

    console.log(`Saving API data to S3: ${BUCKET_NAME}/${key}`);

    // Create the put command
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: JSON.stringify(dataToSave, null, 2),
      ContentType: 'application/json',
      Metadata: {
        'data-type': 'api-management',
        'total-apis': String(data.apis?.length || 0),
        'saved-at': new Date().toISOString(),
        'saved-by': 'admin-panel'
      },
    });

    // Execute the save
    await s3Client.send(command);

    console.log(`Successfully saved API data to S3: ${key}`);

    return NextResponse.json({
      success: true,
      message: 'API data updated successfully in S3',
      key: key,
      bucket: BUCKET_NAME,
      timestamp: new Date().toISOString(),
      totalApis: data.apis?.length || 0
    });

  } catch (error) {
    console.error('Error saving API data to S3:', error);
    
    let errorMessage = 'Unknown error occurred';
    
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    // Provide more specific error information
    if (errorMessage.includes('SignatureDoesNotMatch')) {
      errorMessage = 'Invalid AWS credentials - signature does not match';
    } else if (errorMessage.includes('AccessDenied')) {
      errorMessage = 'Access denied - check S3 bucket permissions';
    } else if (errorMessage.includes('NoSuchBucket')) {
      errorMessage = `S3 bucket '${BUCKET_NAME}' does not exist`;
    } else if (errorMessage.includes('NetworkingError')) {
      errorMessage = 'Network error - check internet connection';
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      bucket: BUCKET_NAME,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
