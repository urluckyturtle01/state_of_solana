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

    // Call the TopLedger API for validator info (name, epoch, commission)
    const response = await fetch(
      'https://analytics.topledger.xyz/tl/api/queries/14432/results?api_key=qtWiZQDiTk6l8wieCeKx8DEnPyq3vcDNKdJLkeca',
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
    
    // Extract the rows from the query result
    const rows = data?.query_result?.data?.rows || [];
    
    // Return the first row if available, otherwise null
    const validatorInfo = rows.length > 0 ? rows[0] : null;
    
    return NextResponse.json({
      success: true,
      data: validatorInfo
    });

  } catch (error) {
    console.error('Error fetching validator info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch validator info' },
      { status: 500 }
    );
  }
}

