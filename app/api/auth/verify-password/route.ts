import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    
    // Get password from server-side environment variable (not exposed to browser)
    const correctPassword = process.env.INTERNAL_AUTH_PASSWORD;
    
    if (!correctPassword) {
      console.error('INTERNAL_AUTH_PASSWORD environment variable not set');
      console.error('Available env vars starting with INTERNAL:', Object.keys(process.env).filter(key => key.startsWith('INTERNAL')));
      return NextResponse.json(
        { success: false, error: 'Server configuration error - password not configured' },
        { status: 500 }
      );
    }
    
    console.log('Password verification attempt - env var exists:', !!correctPassword);
    
    // Verify the password
    const isValid = password === correctPassword;
    
    if (isValid) {
      console.log('Password verification successful');
      return NextResponse.json({ success: true });
    } else {
      console.log('Password verification failed - incorrect password');
      return NextResponse.json(
        { success: false, error: 'Invalid password' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Password verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error during verification' },
      { status: 500 }
    );
  }
} 