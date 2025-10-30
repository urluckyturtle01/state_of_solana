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

    // Call the TopLedger API for network staker tier data with the same vote_account parameter
    const response = await fetch(
      'https://analytics.topledger.xyz/tl/api/queries/14375/results?api_key=q0dmkVVgNrRwuDtk1dJx0ctm5uxmg6sNA1mt571e',
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
    
    return NextResponse.json({
      success: true,
      data: rows,
      count: rows.length
    });

  } catch (error) {
    console.error('Error fetching network staker tier data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch network staker tier data' },
      { status: 500 }
    );
  }
}
