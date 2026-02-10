import { NextRequest, NextResponse } from 'next/server';
import { getFromS3, saveToS3 } from '@/lib/s3';

// Default password as fallback if S3 fails
const DEFAULT_PASSWORD = "solana2024";
const AUTH_FILE_KEY = 'config/admin-auth.json';

// Initial setup function to save the default password to S3 if it doesn't exist
async function ensurePasswordExists() {
  try {
    // Try to get the existing password file
    const existingAuth = await getFromS3<{ password: string }>(AUTH_FILE_KEY);
    
    // If it doesn't exist, create it with the default password
    if (!existingAuth) {
      console.log('Admin password not found in S3, creating default...');
      await saveToS3(AUTH_FILE_KEY, { 
        password: DEFAULT_PASSWORD,
        created: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      });
      console.log('Default admin password saved to S3');
    }
  } catch (error) {
    console.error('Error ensuring admin password exists:', error);
  }
}

// Ensure the password exists when the API is first loaded
ensurePasswordExists();

export async function POST(req: NextRequest) {
  try {
    // Parse the request body
    const { password } = await req.json();
    
    if (!password) {
      return NextResponse.json(
        { success: false, message: 'Password is required' },
        { status: 400 }
      );
    }
    
    // Try to get the auth configuration from S3
    let storedPassword = DEFAULT_PASSWORD;
    
    try {
      const authConfig = await getFromS3<{ password: string }>(AUTH_FILE_KEY);
      if (authConfig && authConfig.password) {
        storedPassword = authConfig.password;
      } else {
        // If no config found in S3, save the default one
        await ensurePasswordExists();
      }
    } catch (error) {
      console.error('Error retrieving admin password from S3:', error);
      // Continue using default password
    }
    
    // Check if the password matches
    const isValid = password === storedPassword;
    
    if (isValid) {
      return NextResponse.json({ 
        success: true, 
        message: 'Authentication successful'
      });
    } else {
      return NextResponse.json(
        { success: false, message: 'Invalid password' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json(
      { success: false, message: 'Authentication failed' },
      { status: 500 }
    );
  }
} 