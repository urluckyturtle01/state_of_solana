import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
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
