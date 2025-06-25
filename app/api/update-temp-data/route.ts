import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import * as path from 'path';

export async function POST(request: NextRequest) {
  try {
    console.log('📊 Starting chart data update...');
    
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
        if (code === 0) {
          resolve(NextResponse.json({ 
            success: true, 
            message: 'Chart data updated successfully',
            output: output 
          }));
        } else {
          resolve(NextResponse.json({ 
            success: false, 
            message: 'Failed to update chart data',
            error: errorOutput,
            output: output 
          }, { status: 500 }));
        }
      });
      
      child.on('error', (error) => {
        resolve(NextResponse.json({ 
          success: false, 
          message: 'Error running script',
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