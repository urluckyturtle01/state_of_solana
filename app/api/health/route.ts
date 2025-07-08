import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const timestamp = new Date().toISOString();
    
    return NextResponse.json({
      status: 'healthy',
      timestamp,
      uptime: process.uptime ? `${Math.round(process.uptime())}s` : 'unknown',
      environment: process.env.NODE_ENV || 'unknown'
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 