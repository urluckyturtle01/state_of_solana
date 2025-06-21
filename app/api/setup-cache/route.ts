import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Initial cache update
    const updateResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/update-api-cache`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!updateResponse.ok) {
      throw new Error('Failed to do initial cache update');
    }

    const initialResult = await updateResponse.json();

    return NextResponse.json({
      success: true,
      message: 'Cache initialized successfully',
      initialUpdate: initialResult,
      note: 'For production, set up a cron job to call /api/update-api-cache every hour',
      cronExample: '0 * * * * curl -X POST https://your-domain.com/api/update-api-cache'
    });
  } catch (error) {
    console.error('Cache setup failed:', error);
    return NextResponse.json(
      { error: 'Cache setup failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 