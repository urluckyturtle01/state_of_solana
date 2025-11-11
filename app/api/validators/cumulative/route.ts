import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { epoch, vote_account } = body;

    if (!epoch || !vote_account) {
      return NextResponse.json(
        { error: 'Both epoch and vote_account parameters are required' },
        { status: 400 }
      );
    }

    // Call the external API for Lorenz curve (cumulative percentage) data
    const response = await fetch(
      'http://84.32.32.160:9080/validator_lorenz_curve',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parameters: {
            epoch: epoch,
            vote_account: vote_account
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract the rows from the response
    // Assuming the new API returns data directly or in a similar structure
    const rows = data?.data || data?.rows || data || [];
    
    return NextResponse.json({
      success: true,
      data: rows,
      count: rows.length
    });

  } catch (error) {
    console.error('Error fetching cumulative percentage data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cumulative percentage data' },
      { status: 500 }
    );
  }
}
