import { NextRequest, NextResponse } from 'next/server';

/**
 * API route to proxy requests to Limitless TCG
 * This avoids CORS issues when fetching from the client
 */

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const endpoint = searchParams.get('endpoint');
  
  if (!endpoint) {
    return NextResponse.json(
      { error: 'Missing endpoint parameter' },
      { status: 400 }
    );
  }

  // Validate endpoint to prevent abuse
  const allowedEndpoints = ['decks', 'deck'];
  const endpointType = endpoint.split('/')[0];
  
  if (!allowedEndpoints.includes(endpointType)) {
    return NextResponse.json(
      { error: 'Invalid endpoint' },
      { status: 400 }
    );
  }

  try {
    let url: string;
    
    if (endpoint === 'decks') {
      // Use the main limitlesstcg.com decks page which returns HTML table
      url = 'https://limitlesstcg.com/decks';
    } else if (endpoint.startsWith('decks/')) {
      // For individual deck pages - use /cards endpoint to get card list
      // Handle variant query parameter: decks/267?variant=5 -> decks/267/cards?variant=5
      const baseEndpoint = endpoint.split('?')[0];
      const queryString = endpoint.includes('?') ? '?' + endpoint.split('?')[1] : '';
      url = `https://limitlesstcg.com/${baseEndpoint}/cards${queryString}`;
    } else {
      url = `https://limitlesstcg.com/${endpoint}`;
    }

    // Add cache-busting for deck list to ensure fresh data
    const fetchUrl = endpoint === 'decks' ? `${url}?_=${Date.now()}` : url;
    console.log(`[API Limitless] Fetching: ${fetchUrl}`);
    
    const response = await fetch(fetchUrl, {
      headers: {
        'Accept': 'text/html',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.log(`[API Limitless] Request failed: ${response.status}`);
      return NextResponse.json(
        { error: `Failed to fetch: ${response.status}` },
        { status: response.status }
      );
    }

    const html = await response.text();
    console.log(`[API Limitless] Got HTML response, length: ${html.length}`);
    
    return NextResponse.json({ html, source: 'html' });
  } catch (error) {
    console.error('[API Limitless] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}
