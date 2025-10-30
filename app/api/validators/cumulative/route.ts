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

    // Call the TopLedger API for cumulative percentage data
    const response = await fetch(
      'https://analytics.topledger.xyz/tl/api/queries/14370/results?api_key=zI3JupYOw0UHi5O14RtONlKBMX8em6mD3YKq4Awf',
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
    
    // Extract the rows from the query result
    const rows = data?.query_result?.data?.rows || [];
    
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
