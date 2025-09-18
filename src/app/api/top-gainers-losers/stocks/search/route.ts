import { NextRequest, NextResponse } from 'next/server';

// Yahoo Finance API helper functions
async function fetchYahooFinanceData(url: string) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Yahoo Finance API error: ${response.status}`);
  }
  
  return response.json();
}

async function searchStocks(query: string) {
  try {
    // Using Yahoo Finance search API
    const searchUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&lang=en-US&region=US&quotesCount=10&newsCount=0`;
    const response = await fetchYahooFinanceData(searchUrl);
    
    const quotes = response.quotes || [];
    const results = quotes.map((quote: any) => ({
      symbol: quote.symbol || '',
      name: quote.longname || quote.shortname || quote.symbol || '',
      type: quote.typeDisp || 'Stock',
      exchange: quote.exchange || '',
    }));

    return {
      results,
      query,
    };
  } catch (error) {
    console.error('Error searching stocks:', error);
    return {
      results: [],
      query,
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    
    if (!query || query.trim().length < 1) {
      return NextResponse.json({
        message: 'Search query is required',
        error: 'Query parameter "q" must be provided'
      }, { status: 400 });
    }

    const searchResults = await searchStocks(query.trim());
    return NextResponse.json(searchResults);
  } catch (error) {
    console.error('Error in /api/top-gainers-losers/stocks/search:', error);
    return NextResponse.json({
      message: 'Failed to search stocks',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
