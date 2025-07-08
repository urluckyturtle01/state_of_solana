import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import * as path from 'path';

export async function POST(request: NextRequest) {
  try {
    // Parse request body for parameters
    const body = await request.json().catch(() => ({}));
    const { scheduled = false, force = false } = body;
    
    const updateType = scheduled ? 'scheduled' : 'manual';
    const forceText = force ? ' (forced)' : '';
    
    console.log(`📊 Starting ${updateType} chart data update${forceText}...`);
    console.log(`🕐 Timestamp: ${new Date().toISOString()}`);
    
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
        const timestamp = new Date().toISOString();
        
        if (code === 0) {
          console.log(`✅ ${updateType} update completed successfully at ${timestamp}`);
          resolve(NextResponse.json({ 
            success: true, 
            message: `Chart data updated successfully (${updateType})`,
            updateType,
            scheduled,
            force,
            timestamp,
            output: output 
          }));
        } else {
          console.error(`❌ ${updateType} update failed at ${timestamp}`);
          resolve(NextResponse.json({ 
            success: false, 
            message: `Failed to update chart data (${updateType})`,
            updateType,
            scheduled,
            force,
            timestamp,
            error: errorOutput,
            output: output 
          }, { status: 500 }));
        }
      });
      
      child.on('error', (error) => {
        const timestamp = new Date().toISOString();
        console.error(`❌ ${updateType} update process error at ${timestamp}:`, error.message);
        
        resolve(NextResponse.json({ 
          success: false, 
          message: `Error running ${updateType} update script`,
          updateType,
          scheduled,
          force,
          timestamp,
          error: error.message 
        }, { status: 500 }));
      });
    });
    
  } catch (error) {
    console.error('Error updating chart data:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 