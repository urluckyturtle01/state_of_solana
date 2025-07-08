import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    console.log('Manual temp data update triggered');
    
    // Run the fetch-chart-data.js script to update data
    const tempDir = path.join(process.cwd(), 'public', 'temp');
    const scriptPath = path.join(tempDir, 'fetch-chart-data.js');
    
    // Execute the script with a longer timeout since data fetching can take time
    const { stdout, stderr } = await execAsync(`node "${scriptPath}"`, {
      cwd: tempDir,
      timeout: 300000 // 5 minute timeout for data fetching
    });
    
    console.log('Data fetch script completed');
    if (stderr) {
      console.warn('Script warnings:', stderr);
    }
    
    // Parse the summary if available
    let summary = null;
    try {
      const summaryPath = path.join(tempDir, 'chart-data', '_summary.json');
      const fs = require('fs');
      if (fs.existsSync(summaryPath)) {
        summary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
      }
    } catch (summaryError) {
      console.warn('Could not read summary:', summaryError);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Chart data updated successfully',
      details: {
        timestamp: new Date().toISOString(),
        summary: summary,
        hasOutput: stdout.length > 0
      }
    });
    
  } catch (error) {
    console.error('Error updating temp data:', error);
    
    // Check if it's a timeout error
    const isTimeout = error instanceof Error && error.message.includes('timeout');
    
    return NextResponse.json({
      success: false,
      message: isTimeout ? 
        'Data update timed out (may still be running in background)' : 
        'Failed to update chart data',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 