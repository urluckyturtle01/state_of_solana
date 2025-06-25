import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import * as path from 'path';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting chart configs update...');
    
    const tempDir = path.join(process.cwd(), 'temp');
    const scriptPath = path.join(tempDir, 'fetch-charts.js');
    
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
            const publicConfigsDir = path.join(process.cwd(), 'public', 'temp', 'chart-configs');
            const tempConfigsDir = path.join(process.cwd(), 'temp', 'chart-configs');
            
            if (fs.existsSync(tempConfigsDir)) {
              // Ensure public temp directory exists
              const publicTempDir = path.join(process.cwd(), 'public', 'temp');
              if (!fs.existsSync(publicTempDir)) {
                fs.mkdirSync(publicTempDir, { recursive: true });
              }
              
              // Copy files
              const { execSync } = require('child_process');
              execSync(`cp -r "${tempConfigsDir}" "${publicTempDir}/"`);
              
              console.log('✅ Updated configs copied to public directory');
            }
          } catch (copyError) {
            console.warn('Warning: Could not copy to public directory:', copyError);
          }
          
          resolve(NextResponse.json({ 
            success: true, 
            message: 'Chart configurations updated successfully and copied for deployment',
            output: output 
          }));
        } else {
          resolve(NextResponse.json({ 
            success: false, 
            message: 'Failed to update chart configurations',
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
    console.error('Error updating chart configs:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 