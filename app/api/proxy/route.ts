import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');
    
    if (!url) {
      return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }

    console.log('Proxying GET request to:', url);
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('Proxy GET response status:', response.status);
    console.log('Proxy GET response data:', data);
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Proxy GET error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, parameters } = body;
    
    if (!url) {
      return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }

    console.log('Proxying POST request to:', url);
    console.log('POST parameters:', parameters);
    
    const requestBody = parameters ? { parameters } : {};
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    const data = await response.json();
    
    console.log('Proxy POST response status:', response.status);
    console.log('Proxy POST response data:', data);
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Proxy POST error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 