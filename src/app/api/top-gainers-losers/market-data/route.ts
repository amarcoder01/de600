import { NextRequest, NextResponse } from 'next/server';
import { marketDataSchema } from '@/types/top-gainers-losers';

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

async function fetchTopGainersLosers(count: number = 25) {
  try {
    // Using Yahoo Finance's screener API for gainers and losers
    const gainersUrl = `https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=true&lang=en-US&region=US&scrIds=day_gainers&count=${count}`;
    const losersUrl = `https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=true&lang=en-US&region=US&scrIds=day_losers&count=${count}`;
    
    const [gainersResponse, losersResponse] = await Promise.all([
      fetchYahooFinanceData(gainersUrl),
      fetchYahooFinanceData(losersUrl)
    ]);

    const mapQuoteData = (quotes: any[]) => {
      return quotes.map((quote: any) => ({
        symbol: quote.symbol || '',
        name: quote.longName || quote.shortName || quote.symbol || '',
        price: quote.regularMarketPrice?.raw || quote.regularMarketPrice || 0,
        change: quote.regularMarketChange?.raw || quote.regularMarketChange || 0,
        changePercent: quote.regularMarketChangePercent?.raw || quote.regularMarketChangePercent || 0,
        volume: quote.regularMarketVolume?.raw || quote.regularMarketVolume || 0,
        sector: quote.sector || '',
        marketCap: quote.marketCap?.raw || quote.marketCap || 0,
      }));
    };

    const gainers = mapQuoteData(gainersResponse.finance?.result?.[0]?.quotes || []);
    const losers = mapQuoteData(losersResponse.finance?.result?.[0]?.quotes || []);

    return { gainers, losers };
  } catch (error) {
    console.error('Error fetching gainers/losers:', error);
    return { gainers: [], losers: [] };
  }
}

async function fetchMarketIndices() {
  try {
    const symbols = ['^GSPC', '^IXIC', '^DJI', '^VIX']; // S&P 500, NASDAQ, DOW, VIX
    const quotes = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
          const response = await fetchYahooFinanceData(url);
          const result = response.chart?.result?.[0];
          
          if (result) {
            const meta = result.meta;
            const price = meta.regularMarketPrice || 0;
            const previousClose = meta.previousClose || price;
            const change = price - previousClose;
            const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;
            
            return {
              symbol: symbol.replace('^', ''),
              price,
              change,
              changePercent,
            };
          }
          return null;
        } catch (error) {
          console.error(`Error fetching ${symbol}:`, error);
          return null;
        }
      })
    );

    const indices: Record<string, any> = {};
    const symbolMapping = {
      'GSPC': 'sp500',
      'IXIC': 'nasdaq', 
      'DJI': 'dow',
      'VIX': 'vix'
    };

    quotes.forEach((quote, index) => {
      if (quote) {
        const key = symbolMapping[quote.symbol as keyof typeof symbolMapping] || quote.symbol.toLowerCase();
        indices[key] = quote;
      }
    });

    return indices;
  } catch (error) {
    console.error('Error fetching market indices:', error);
    return {};
  }
}

// In-memory storage for caching
let cachedMarketData: any = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60000; // 1 minute

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const count = Math.min(parseInt(searchParams.get('count') || '25'), 100); // Max 100 stocks
    
    // Check if we need to fetch new data
    const now = Date.now();
    const shouldFetch = !cachedMarketData || 
      (now - lastFetchTime) > CACHE_DURATION ||
      (cachedMarketData.gainers?.length !== count);
    
    if (shouldFetch) {
      const [{ gainers, losers }, indices] = await Promise.all([
        fetchTopGainersLosers(count),
        fetchMarketIndices()
      ]);
      
      cachedMarketData = {
        gainers,
        losers,
        indices,
        lastUpdated: new Date().toISOString(),
      };
      
      lastFetchTime = now;
    }
    
    return NextResponse.json(cachedMarketData);
  } catch (error) {
    console.error('Error in /api/top-gainers-losers/market-data:', error);
    return NextResponse.json({ 
      message: 'Failed to fetch market data',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const count = Math.min(parseInt(body.count || '25'), 100); // Max 100 stocks
    
    const [{ gainers, losers }, indices] = await Promise.all([
      fetchTopGainersLosers(count),
      fetchMarketIndices()
    ]);
    
    const marketData = {
      gainers,
      losers,
      indices,
      lastUpdated: new Date().toISOString(),
    };
    
    // Update cache
    cachedMarketData = marketData;
    lastFetchTime = Date.now();
    
    return NextResponse.json(marketData);
  } catch (error) {
    console.error('Error in /api/top-gainers-losers/market-data refresh:', error);
    return NextResponse.json({ 
      message: 'Failed to refresh market data',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
