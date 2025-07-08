import { NextResponse } from 'next/server';

// Initialize the auto-updater by importing it
let autoUpdaterInitialized = false;

export async function POST() {
  try {
    if (!autoUpdaterInitialized) {
      // Import the auto-updater to trigger its initialization
      await import('../../../lib/auto-updater');
      autoUpdaterInitialized = true;
      
      return NextResponse.json({ 
        success: true, 
        message: 'Auto-updater initialized successfully' 
      });
    } else {
      return NextResponse.json({ 
        success: true, 
        message: 'Auto-updater already running' 
      });
    }
  } catch (error) {
    console.error('Failed to initialize auto-updater:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to initialize auto-updater',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    initialized: autoUpdaterInitialized,
    message: autoUpdaterInitialized ? 'Auto-updater is running' : 'Auto-updater not initialized'
  });
} 