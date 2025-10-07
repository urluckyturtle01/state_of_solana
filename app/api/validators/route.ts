import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const voteAccount = searchParams.get('vote_account');
    
    if (!voteAccount) {
      return NextResponse.json(
        { error: 'vote_account parameter is required' },
        { status: 400 }
      );
    }

    // Make the API call to TopLedger
    const response = await fetch(
      'https://analytics.topledger.xyz/tl-research/api/queries/14256/results?api_key=64mV5lZ85LwLcVzjWNnfKz6gXB3qcISzwsuoPyt2',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parameters: {
            vote_account: voteAccount
          }
        }),
        cache: 'no-store'
      }
    );

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    
    // Extract the rows from the query result
    const validatorData = data.query_result?.data?.rows || [];
    
    // Sort by epoch (ascending order for chronological display)
    const sortedData = validatorData.sort((a: any, b: any) => a.epoch - b.epoch);
    
    return NextResponse.json({
      success: true,
      data: sortedData,
      count: sortedData.length
    });

  } catch (error) {
    console.error('Error fetching validator data:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch validator data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
