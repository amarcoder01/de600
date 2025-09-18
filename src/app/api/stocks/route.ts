import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { StockDataService } from "@/lib/services/stockDataService";
import { insertStockSchema } from "@/types/market";
import { marketStatusService } from "@/lib/market-status";
import { z } from "zod";

// Ensure this route runs in the Node.js runtime and is always dynamic
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const stockDataService = new StockDataService();

// Initialize with some stock data on first load
let isInitialized = false;

const initializeData = async () => {
  if (isInitialized) return;
  
  try {
    console.log('Initializing stock data...');
    
    // Fetch market indices (fast operation)
    const indices = await stockDataService.fetchMarketIndices();
    for (const index of indices) {
      await storage.createMarketIndex(index);
    }

    // Fetch all US stock data from Polygon API (slower operation)
    const stocks = await stockDataService.fetchStockData(); // No symbols = fetch all
    
    // Batch insert stocks for better performance
    const batchSize = 100;
    for (let i = 0; i < stocks.length; i += batchSize) {
      const batch = stocks.slice(i, i + batchSize);
      await Promise.all(batch.map(stock => storage.createStock(stock)));
      
      // Small delay between batches to prevent overwhelming the system
      if (i + batchSize < stocks.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    console.log(`Initialized ${stocks.length} stocks and ${indices.length} market indices`);
    isInitialized = true;
  } catch (error) {
    console.error('Error initializing data:', error);
    
    // Add fallback test data in case API initialization fails
    const testStocks = [
      {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        sector: 'Technology',
        currentPrice: 175.25,
        previousClose: 170.10,
        change: 5.15,
        changePercent: 3.03,
        volume: 52431100,
        marketCap: 2780000000000,
        isActive: true,
      },
      {
        symbol: 'MSFT',
        name: 'Microsoft Corporation',
        sector: 'Technology',
        currentPrice: 412.80,
        previousClose: 408.15,
        change: 4.65,
        changePercent: 1.14,
        volume: 18654200,
        marketCap: 3080000000000,
        isActive: true,
      },
      {
        symbol: 'GOOGL',
        name: 'Alphabet Inc. Class A',
        sector: 'Technology',
        currentPrice: 140.85,
        previousClose: 138.40,
        change: 2.45,
        changePercent: 1.77,
        volume: 23145600,
        marketCap: 1780000000000,
        isActive: true,
      },
      {
        symbol: 'TSLA',
        name: 'Tesla, Inc.',
        sector: 'Consumer Cyclical',
        currentPrice: 245.60,
        previousClose: 240.15,
        change: 5.45,
        changePercent: 2.27,
        volume: 45789300,
        marketCap: 780000000000,
        isActive: true,
      },
      {
        symbol: 'NVDA',
        name: 'NVIDIA Corporation',
        sector: 'Technology',
        currentPrice: 875.30,
        previousClose: 862.15,
        change: 13.15,
        changePercent: 1.53,
        volume: 31205400,
        marketCap: 2150000000000,
        isActive: true,
      },
    ];

    for (const stock of testStocks) {
      await storage.createStock(stock);
    }
    console.log(`Added ${testStocks.length} fallback test stocks`);
    isInitialized = true;
  }
};

// GET /api/stocks - Get stocks with pagination and market status
export async function GET(request: NextRequest) {
  try {
    // Initialize data if needed
    await initializeData();

    // Get market status
    const marketStatus = await marketStatusService.getMarketStatus();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const sortBy = searchParams.get('sortBy') || 'marketCap';
    
    const { stocks, total } = await storage.getStocks(page, limit, sortBy);
    const hasMore = page * limit < total;

    return NextResponse.json({
      stocks,
      hasMore,
      page,
      total,
      marketStatus,
      lastUpdated: new Date().toISOString(),
      dataFreshness: {
        isMarketOpen: marketStatus.isOpen,
        status: marketStatus.status,
        cacheRecommendation: marketStatus.isOpen ? '30 seconds' : '5 minutes',
        nextUpdate: marketStatus.isOpen ? 
          new Date(Date.now() + 30000).toISOString() : 
          new Date(Date.now() + 300000).toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching stocks:', error);
    return NextResponse.json(
      { 
        message: "Failed to fetch stocks",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// POST /api/stocks/refresh - Refresh stock data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const symbols = body.symbols as string[] || [];
    const stocks = await stockDataService.fetchStockData(symbols);
    
    for (const stock of stocks) {
      const existing = await storage.getStock(stock.symbol);
      if (existing) {
        await storage.updateStock(stock.symbol, stock);
      } else {
        await storage.createStock(stock);
      }
    }

    return NextResponse.json({ 
      message: "Stock data refreshed", 
      count: stocks.length 
    });
  } catch (error) {
    console.error('Error refreshing stock data:', error);
    return NextResponse.json(
      { message: "Failed to refresh stock data" },
      { status: 500 }
    );
  }
}
