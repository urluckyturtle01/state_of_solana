import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

// Track last update time to avoid unnecessary updates
let lastUpdateTime = 0;
const UPDATE_INTERVAL = 10 * 60 * 1000; // 10 minutes
let isUpdating = false;

export async function POST(request: NextRequest) {
  try {
    const now = Date.now();
    
    // Check if we're already updating
    if (isUpdating) {
      return NextResponse.json({ 
        success: false, 
        message: 'Update already in progress',
        lastUpdate: new Date(lastUpdateTime).toISOString(),
        nextUpdate: new Date(lastUpdateTime + UPDATE_INTERVAL).toISOString()
      });
    }
    
    // Check if enough time has passed (unless force flag is set)
    const { force } = await request.json().catch(() => ({ force: false }));
    const timeSinceLastUpdate = now - lastUpdateTime;
    
    if (!force && timeSinceLastUpdate < UPDATE_INTERVAL) {
      const timeRemaining = UPDATE_INTERVAL - timeSinceLastUpdate;
      const minutesRemaining = Math.ceil(timeRemaining / (60 * 1000));
      
      return NextResponse.json({ 
        success: false, 
        message: `Too soon to update. Next update in ${minutesRemaining} minutes`,
        lastUpdate: new Date(lastUpdateTime).toISOString(),
        nextUpdate: new Date(lastUpdateTime + UPDATE_INTERVAL).toISOString(),
        timeRemainingMs: timeRemaining
      });
    }
    
    isUpdating = true;
    console.log('🔄 Starting automatic chart data update...');
    
    const tempDir = path.join(process.cwd(), 'public', 'temp');
    const scriptPath = path.join(tempDir, 'fetch-chart-data.js');
    
    return new Promise<NextResponse>((resolve) => {
      const child = spawn('node', [scriptPath], {
        cwd: tempDir,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let output = '';
      let errorOutput = '';
      
      child.stdout.on('data', (data) => {
        const message = data.toString();
        output += message;
        console.log(message);
      });
      
      child.stderr.on('data', (data) => {
        const message = data.toString();
        errorOutput += message;
        console.error(message);
      });
      
      child.on('close', (code) => {
        isUpdating = false;
        
        if (code === 0) {
          lastUpdateTime = Date.now();
          
          // Update the summary with auto-update info
          try {
            const summaryPath = path.join(tempDir, 'chart-data', '_summary.json');
            if (fs.existsSync(summaryPath)) {
              const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
              summary.autoUpdateEnabled = true;
              summary.lastAutoUpdate = new Date(lastUpdateTime).toISOString();
              summary.nextScheduledUpdate = new Date(lastUpdateTime + UPDATE_INTERVAL).toISOString();
              fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
            }
          } catch (error) {
            console.warn('Failed to update summary with auto-update info:', error);
          }
          
          resolve(NextResponse.json({ 
            success: true, 
            message: 'Chart data updated automatically',
            output: output,
            lastUpdate: new Date(lastUpdateTime).toISOString(),
            nextUpdate: new Date(lastUpdateTime + UPDATE_INTERVAL).toISOString()
          }));
        } else {
          resolve(NextResponse.json({ 
            success: false, 
            message: 'Failed to update chart data automatically',
            error: errorOutput,
            output: output 
          }, { status: 500 }));
        }
      });
      
      child.on('error', (error) => {
        isUpdating = false;
        resolve(NextResponse.json({ 
          success: false, 
          message: 'Error running automatic update',
          error: error.message 
        }, { status: 500 }));
      });
    });
    
  } catch (error) {
    isUpdating = false;
    console.error('Error in automatic chart data update:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// GET endpoint to check update status
export async function GET(request: NextRequest) {
  const now = Date.now();
  const timeSinceLastUpdate = now - lastUpdateTime;
  const timeUntilNext = Math.max(0, UPDATE_INTERVAL - timeSinceLastUpdate);
  
  return NextResponse.json({
    isUpdating,
    lastUpdate: lastUpdateTime > 0 ? new Date(lastUpdateTime).toISOString() : null,
    nextUpdate: lastUpdateTime > 0 ? new Date(lastUpdateTime + UPDATE_INTERVAL).toISOString() : null,
    timeUntilNextMs: timeUntilNext,
    timeUntilNextMinutes: Math.ceil(timeUntilNext / (60 * 1000)),
    updateIntervalMinutes: UPDATE_INTERVAL / (60 * 1000)
  });
} 