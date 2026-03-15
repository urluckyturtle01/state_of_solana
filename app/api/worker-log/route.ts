import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { verifySignedToken, COOKIE_NAME } from '@/lib/worker-log-auth';

export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!verifySignedToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const logPath = path.join(process.cwd(), 'trino_worker.log');
    
    // Check if file exists
    if (!fs.existsSync(logPath)) {
      return NextResponse.json({ error: 'Log file not found' }, { status: 404 });
    }

    // Read the log file
    const logContent = fs.readFileSync(logPath, 'utf-8');
    
    return new NextResponse(logContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error reading log file:', error);
    return NextResponse.json({ error: 'Failed to read log file' }, { status: 500 });
  }
}
