import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { verifySignedToken, COOKIE_NAME } from '@/lib/worker-log-auth';

/** Max bytes to read from log file (1MB). Read only tail for large files. */
const MAX_LOG_BYTES = 1024 * 1024;

function readLogTail(logPath: string): string {
  const stat = fs.statSync(logPath);
  if (stat.size <= MAX_LOG_BYTES) {
    return fs.readFileSync(logPath, 'utf-8');
  }
  const start = stat.size - MAX_LOG_BYTES;
  const fd = fs.openSync(logPath, 'r');
  const buffer = Buffer.alloc(MAX_LOG_BYTES);
  fs.readSync(fd, buffer, 0, MAX_LOG_BYTES, start);
  fs.closeSync(fd);
  let content = buffer.toString('utf-8');
  const firstNewline = content.indexOf('\n');
  if (firstNewline >= 0) {
    content = content.slice(firstNewline + 1);
  }
  return content;
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!verifySignedToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const logPath = path.join(process.cwd(), 'trino_worker.log');
    if (!fs.existsSync(logPath)) {
      return NextResponse.json({ error: 'Log file not found' }, { status: 404 });
    }
    const logContent = readLogTail(logPath);
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
