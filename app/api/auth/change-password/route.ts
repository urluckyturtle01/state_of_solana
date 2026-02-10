import { NextRequest, NextResponse } from 'next/server';
import { getFromS3, saveToS3 } from '@/lib/s3';

const AUTH_FILE_KEY = 'config/admin-auth.json';
const DEFAULT_PASSWORD = "solana2024";

export async function POST(req: NextRequest) {
  try {
    // Parse the request body
    const { currentPassword, newPassword } = await req.json();
    
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, message: 'Current password and new password are required' },
        { status: 400 }
      );
    }
    
    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, message: 'New password must be at least 8 characters long' },
        { status: 400 }
      );
    }
    
    // Get the current password from S3
    let storedPassword = DEFAULT_PASSWORD;
    let authConfig = await getFromS3<{ 
      password: string, 
      created?: string, 
      lastUpdated?: string 
    }>(AUTH_FILE_KEY);
    
    if (authConfig && authConfig.password) {
      storedPassword = authConfig.password;
    } else {
      // Create default auth config if not found
      authConfig = { 
        password: DEFAULT_PASSWORD,
        created: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };
    }
    
    // Verify current password
    if (currentPassword !== storedPassword) {
      return NextResponse.json(
        { success: false, message: 'Current password is incorrect' },
        { status: 401 }
      );
    }
    
    // Update with new password
    const updatedConfig = {
      ...authConfig,
      password: newPassword,
      lastUpdated: new Date().toISOString()
    };
    
    // Save to S3
    const saveResult = await saveToS3(AUTH_FILE_KEY, updatedConfig);
    
    if (!saveResult) {
      return NextResponse.json(
        { success: false, message: 'Failed to save new password to S3' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Password updated successfully' 
    });
  } catch (error) {
    console.error('Error changing admin password:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to change password' },
      { status: 500 }
    );
  }
} 