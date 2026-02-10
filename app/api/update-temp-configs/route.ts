import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    console.log('Manual temp configs update triggered');
    
    // Run the fetch-charts.js script to update configurations
    const tempDir = path.join(process.cwd(), 'public', 'temp');
    const scriptPath = path.join(tempDir, 'fetch-charts.js');
    
    // Execute the script
    const { stdout, stderr } = await execAsync(`node "${scriptPath}"`, {
      cwd: tempDir,
      timeout: 60000 // 60 second timeout
    });
    
    console.log('Script output:', stdout);
    if (stderr) {
      console.warn('Script warnings:', stderr);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Chart configurations updated successfully',
      details: {
        output: stdout,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error updating temp configs:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to update configurations',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 