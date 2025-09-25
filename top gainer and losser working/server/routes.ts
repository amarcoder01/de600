import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { marketDataSchema, marketStatusSchema, stockSearchResponseSchema, stockDetailsSchema } from "@shared/schema";

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

function getMarketStatus() {
  const now = new Date();
  const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
  const hour = easternTime.getHours();
  const day = easternTime.getDay();
  
  // Market is open Monday-Friday 9:30 AM - 4:00 PM ET
  const isWeekday = day >= 1 && day <= 5;
  const isMarketHours = hour >= 9 && hour < 16;
  const isOpen = isWeekday && isMarketHours;
  
  return {
    isOpen,
    status: isOpen ? "Market Open" : "Market Closed",
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Get current market data
  app.get("/api/market-data", async (req, res) => {
    try {
      const count = Math.min(parseInt(req.query.count as string) || 25, 100); // Max 100 stocks
      let marketData = await storage.getMarketData();
      
      // If no data or data is older than 1 minute, or count is different, fetch new data
      const shouldFetch = !marketData || 
        (Date.now() - new Date(marketData.lastUpdated).getTime()) > 60000 ||
        (marketData.gainers?.length !== count);
      
      if (shouldFetch) {
        const [{ gainers, losers }, indices] = await Promise.all([
          fetchTopGainersLosers(count),
          fetchMarketIndices()
        ]);
        
        marketData = {
          gainers,
          losers,
          indices,
          lastUpdated: new Date().toISOString(),
        };
        
        await storage.setMarketData(marketData);
      }
      
      res.json(marketData);
    } catch (error) {
      console.error('Error in /api/market-data:', error);
      res.status(500).json({ 
        message: 'Failed to fetch market data',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get market status
  app.get("/api/market-status", async (req, res) => {
    try {
      const status = getMarketStatus();
      await storage.setMarketStatus(status);
      res.json(status);
    } catch (error) {
      console.error('Error in /api/market-status:', error);
      res.status(500).json({ 
        message: 'Failed to fetch market status',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Force refresh market data
  app.post("/api/market-data/refresh", async (req, res) => {
    try {
      const count = Math.min(parseInt(req.body.count as string) || 25, 100); // Max 100 stocks
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
      
      await storage.setMarketData(marketData);
      res.json(marketData);
    } catch (error) {
      console.error('Error in /api/market-data/refresh:', error);
      res.status(500).json({ 
        message: 'Failed to refresh market data',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Search stocks
  app.get("/api/stocks/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      
      if (!query || query.trim().length < 1) {
        return res.status(400).json({
          message: 'Search query is required',
          error: 'Query parameter "q" must be provided'
        });
      }

      const searchResults = await searchStocks(query.trim());
      res.json(searchResults);
    } catch (error) {
      console.error('Error in /api/stocks/search:', error);
      res.status(500).json({
        message: 'Failed to search stocks',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get stock details
  app.get("/api/stocks/:symbol", async (req, res) => {
    try {
      const symbol = req.params.symbol?.toUpperCase();
      
      if (!symbol) {
        return res.status(400).json({
          message: 'Stock symbol is required',
          error: 'Symbol parameter must be provided'
        });
      }

      const stockDetails = await fetchStockDetails(symbol);
      res.json(stockDetails);
    } catch (error) {
      console.error(`Error in /api/stocks/${req.params.symbol}:`, error);
      if (error instanceof Error && error.message === 'Stock not found') {
        res.status(404).json({
          message: 'Stock not found',
          error: `No data available for symbol ${req.params.symbol}`
        });
      } else {
        res.status(500).json({
          message: 'Failed to fetch stock details',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
