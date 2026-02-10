import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { password, section } = await request.json();
    
    // Get the correct password based on section
    let correctPassword: string | undefined;
    let passwordEnvVar: string;
    
    if (section === 'dflow') {
      correctPassword = process.env.DFLOW_AUTH_PASSWORD;
      passwordEnvVar = 'DFLOW_AUTH_PASSWORD';
    } else {
      // Default to sf-dashboards password for backward compatibility
      correctPassword = process.env.INTERNAL_AUTH_PASSWORD;
      passwordEnvVar = 'INTERNAL_AUTH_PASSWORD';
    }
    
    if (!correctPassword) {
      console.error(`${passwordEnvVar} environment variable not set`);
      console.error('Available env vars starting with INTERNAL or DFLOW:', Object.keys(process.env).filter(key => key.startsWith('INTERNAL') || key.startsWith('DFLOW')));
      return NextResponse.json(
        { success: false, error: 'Server configuration error - password not configured' },
        { status: 500 }
      );
    }
    
    console.log(`Password verification attempt for section: ${section || 'sf-dashboards'} - env var exists:`, !!correctPassword);
    
    // Verify the password
    const isValid = password === correctPassword;
    
    if (isValid) {
      console.log('Password verification successful');
      return NextResponse.json({ success: true, section: section || 'sf-dashboards' });
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