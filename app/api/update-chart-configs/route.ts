import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(request: NextRequest): Promise<Response> {
  try {
    console.log('🔄 Starting chart config regeneration...');
    
    const { force } = await request.json().catch(() => ({}));
    
    // Path to the chart config generation script
    const scriptPath = path.join(process.cwd(), 'public', 'temp', 'fetch-charts.js');
    
    return new Promise<Response>((resolve) => {
      const childProcess = spawn('node', [scriptPath], {
        cwd: path.join(process.cwd(), 'public', 'temp'),
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let output = '';
      let errorOutput = '';
      
      childProcess.stdout.on('data', (data: Buffer) => {
        const text = data.toString();
        output += text;
        console.log('📊 Chart Config Script:', text.trim());
      });
      
      childProcess.stderr.on('data', (data: Buffer) => {
        const text = data.toString();
        errorOutput += text;
        console.error('❌ Chart Config Script Error:', text.trim());
      });
      
      childProcess.on('close', (code: number | null) => {
        if (code === 0) {
          console.log('✅ Chart config regeneration completed successfully');
          resolve(NextResponse.json({
            success: true,
            message: 'Chart config files regenerated successfully',
            output: output.trim()
          }));
        } else {
          console.error('❌ Chart config regeneration failed with code:', code);
          resolve(NextResponse.json({
            success: false,
            error: `Chart config script failed with exit code ${code}`,
            output: output.trim(),
            errorOutput: errorOutput.trim()
          }, { status: 500 }));
        }
      });
      
      childProcess.on('error', (error: Error) => {
        console.error('❌ Failed to start chart config script:', error);
        resolve(NextResponse.json({
          success: false,
          error: 'Failed to start chart config regeneration script',
          details: error.message
        }, { status: 500 }));
      });
    });
    
  } catch (error) {
    console.error('❌ Chart config update failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to regenerate chart configs',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 