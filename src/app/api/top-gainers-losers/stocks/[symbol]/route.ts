import { NextRequest, NextResponse } from 'next/server';
import { stockDetailsSchema } from '@/types/top-gainers-losers';

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

async function fetchStockDetails(symbol: string) {
  try {
    // Fetch quote data (most reliable)
    const quoteResponse = await fetchYahooFinanceData(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`);
    
    // Try to fetch additional data with fallbacks
    const [profileResponse, newsResponse] = await Promise.allSettled([
      fetchYahooFinanceData(`https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=summaryProfile,defaultKeyStatistics,financialData,summaryDetail`),
      fetchYahooFinanceData(`https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&lang=en-US&region=US&quotesCount=0&newsCount=5`)
    ]);

    const chartResult = quoteResponse.chart?.result?.[0];
    
    // Extract data from Promise.allSettled results
    const quoteSummary = profileResponse.status === 'fulfilled' ? profileResponse.value?.quoteSummary?.result?.[0] : null;
    const newsData = newsResponse.status === 'fulfilled' ? newsResponse.value : { news: [] };

    if (!chartResult) {
      throw new Error('Stock not found');
    }

    const meta = chartResult.meta;
    const profile = quoteSummary?.summaryProfile || {};
    const keyStats = quoteSummary?.defaultKeyStatistics || {};
    const financialData = quoteSummary?.financialData || {};
    const summaryDetail = quoteSummary?.summaryDetail || {};

    // Process news data
    const newsItems = (newsData.news || []).slice(0, 5).map((item: any) => ({
      title: item.title || '',
      source: item.publisher || item.providerDisplayName || 'Unknown',
      publishedAt: item.providerPublishTime ? new Date(item.providerPublishTime * 1000).toISOString() : new Date().toISOString(),
      url: item.link || '',
    })).filter((item: any) => item.title && item.url);

    const price = meta.regularMarketPrice || 0;
    const previousClose = meta.previousClose || price;
    const change = price - previousClose;
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

    const stockDetails = {
      symbol: meta.symbol || symbol,
      name: meta.longName || meta.shortName || symbol,
      price,
      change,
      changePercent,
      volume: meta.regularMarketVolume || 0,
      marketCap: summaryDetail.marketCap?.raw || keyStats.marketCap?.raw,
      peRatio: summaryDetail.trailingPE?.raw || keyStats.trailingPE?.raw,
      dividendYield: summaryDetail.dividendYield?.raw || keyStats.dividendYield?.raw,
      high52Week: summaryDetail.fiftyTwoWeekHigh?.raw || keyStats.fiftyTwoWeekHigh?.raw,
      low52Week: summaryDetail.fiftyTwoWeekLow?.raw || keyStats.fiftyTwoWeekLow?.raw,
      averageVolume: keyStats.averageVolume?.raw || meta.averageVolume,
      beta: keyStats.beta?.raw || summaryDetail.beta?.raw,
      eps: keyStats.trailingEps?.raw || financialData.trailingEps?.raw,
      sector: profile.sector,
      industry: profile.industry,
      description: profile.longBusinessSummary,
      employees: profile.fullTimeEmployees,
      website: profile.website,
      news: newsItems.length > 0 ? newsItems : undefined,
    };

    // Validate the response
    return stockDetailsSchema.parse(stockDetails);
  } catch (error) {
    console.error(`Error fetching stock details for ${symbol}:`, error);
    throw error;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  try {
    const symbol = params.symbol?.toUpperCase();
    
    if (!symbol) {
      return NextResponse.json({
        message: 'Stock symbol is required',
        error: 'Symbol parameter must be provided'
      }, { status: 400 });
    }

    const stockDetails = await fetchStockDetails(symbol);
    return NextResponse.json(stockDetails);
  } catch (error) {
    console.error(`Error in /api/top-gainers-losers/stocks/${params.symbol}:`, error);
    if (error instanceof Error && error.message === 'Stock not found') {
      return NextResponse.json({
        message: 'Stock not found',
        error: `No data available for symbol ${params.symbol}`
      }, { status: 404 });
    } else {
      return NextResponse.json({
        message: 'Failed to fetch stock details',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  }
}
