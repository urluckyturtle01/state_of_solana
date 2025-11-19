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

    // Call the validator API - it returns both validator AND network data
    const response = await fetch(
      'http://84.32.32.160:9080/validator_stake_tier_distribution',
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
    const rows = data?.data || data?.rows || data || [];
    
    // Transform the data to extract only network fields and rename them
    const networkRows = rows.map((row: any) => ({
      epoch: row.epoch,
      tier_name: row.tier_name,
      network_staker_count: row.network_staker_count,
      network_total_stake_in_tier: row.network_total_stake_in_tier
    }));
    
    return NextResponse.json({
      success: true,
      data: networkRows,
      count: networkRows.length
    });

  } catch (error) {
    console.error('Error fetching network staker tier data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch network staker tier data' },
      { status: 500 }
    );
  }
}
