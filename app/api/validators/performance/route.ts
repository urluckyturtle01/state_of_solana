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
      'https://analytics.topledger.xyz/tl/api/queries/14301/results?api_key=dxIa4PiUQscDl1hLqS5s8A6s1nnyR6gHXgj9PfNg',
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
    console.error('Error fetching validator performance data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch validator performance data' },
      { status: 500 }
    );
  }
}
