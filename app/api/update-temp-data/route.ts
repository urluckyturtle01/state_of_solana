import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import * as path from 'path';

export async function POST(request: NextRequest) {
  try {
    console.log('📊 Starting chart data update...');
    
    const tempDir = path.join(process.cwd(), 'temp');
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
          // Copy updated files to public directory for deployment
          try {
            const fs = require('fs');
            const publicDataDir = path.join(process.cwd(), 'public', 'temp', 'chart-data');
            const tempDataDir = path.join(process.cwd(), 'temp', 'chart-data');
            
            if (fs.existsSync(tempDataDir)) {
              // Ensure public temp directory exists
              const publicTempDir = path.join(process.cwd(), 'public', 'temp');
              if (!fs.existsSync(publicTempDir)) {
                fs.mkdirSync(publicTempDir, { recursive: true });
              }
              
              // Copy files
              const { execSync } = require('child_process');
              execSync(`cp -r "${tempDataDir}" "${publicTempDir}/"`);
              
              console.log('✅ Updated data copied to public directory');
            }
          } catch (copyError) {
            console.warn('Warning: Could not copy to public directory:', copyError);
          }
          
          resolve(NextResponse.json({ 
            success: true, 
            message: 'Chart data updated successfully and copied for deployment',
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