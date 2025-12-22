import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vote_account } = body;

    if (!vote_account) {
      return NextResponse.json(
        { error: 'vote_account parameter is required' },
        { status: 400 }
      );
    }

    // Call the external API
    const response = await fetch(
      'http://84.32.32.160:9080/validator-staker-metrics',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parameters: {
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
    console.error('Error fetching validator performance data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch validator performance data' },
      { status: 500 }
    );
  }
}
