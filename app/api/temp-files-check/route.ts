import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const chartDataDir = path.join(process.cwd(), 'public', 'temp', 'chart-data');
    const chartConfigsDir = path.join(process.cwd(), 'public', 'temp', 'chart-configs');
    
    const result = {
      chartDataExists: fs.existsSync(chartDataDir),
      chartConfigsExists: fs.existsSync(chartConfigsDir),
      chartDataFiles: 0,
      chartConfigFiles: 0,
      totalSize: '0MB',
      environment: process.env.NODE_ENV,
      vercelRegion: process.env.VERCEL_REGION || 'local',
      timestamp: new Date().toISOString()
    };
    
    if (result.chartDataExists) {
      const files = fs.readdirSync(chartDataDir);
      result.chartDataFiles = files.length;
    }
    
    if (result.chartConfigsExists) {
      const files = fs.readdirSync(chartConfigsDir);
      result.chartConfigFiles = files.length;
    }
    
    // Calculate approximate total size
    if (result.chartDataExists && result.chartConfigsExists) {
      try {
        const { execSync } = require('child_process');
        const output = execSync(`du -sh "${chartDataDir}" "${chartConfigsDir}"`, { encoding: 'utf8' });
        const sizes = output.split('\n').filter((line: string) => line.trim());
        result.totalSize = sizes.join(', ');
      } catch (e) {
        result.totalSize = 'Unable to calculate';
      }
    }
    
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to check temp files',
      message: error instanceof Error ? error.message : String(error),
      environment: process.env.NODE_ENV,
      vercelRegion: process.env.VERCEL_REGION || 'local',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 