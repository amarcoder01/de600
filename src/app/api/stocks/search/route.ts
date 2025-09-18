import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { StockDataService } from "@/lib/services/stockDataService";

const stockDataService = new StockDataService();

// GET /api/stocks/search - Search stocks (GET method for backward compatibility)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    
    if (!query || query.length < 1) {
      return NextResponse.json(
        { message: "Search query is required" },
        { status: 400 }
      );
    }

    // First search local storage
    let stocks = await storage.searchStocks(query);
    
    // If no local results, search APIs
    if (stocks.length === 0) {
      const apiStocks = await stockDataService.searchStocks(query);
      
      // Store new stocks in local storage
      for (const stock of apiStocks) {
        const existing = await storage.getStock(stock.symbol);
        if (!existing) {
          await storage.createStock(stock);
        }
        const savedStock = await storage.getStock(stock.symbol);
        if (savedStock) {
          stocks.push(savedStock);
        }
      }
    }

    return NextResponse.json({ 
      success: true,
      data: stocks,
      results: stocks,
      stocks: stocks 
    });
  } catch (error) {
    console.error('Error searching stocks:', error);
    return NextResponse.json(
      { message: "Failed to search stocks" },
      { status: 500 }
    );
  }
}

// POST /api/stocks/search - Search stocks (POST method - matches frontend expectation)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body;
    
    if (!query || query.length < 1) {
      return NextResponse.json(
        { message: "Search query is required" },
        { status: 400 }
      );
    }

    console.log(`Searching for stocks with query: "${query}"`);

    // First search local storage
    let stocks = await storage.searchStocks(query);
    console.log(`Found ${stocks.length} stocks in local storage`);
    
    // If no local results, search APIs
    if (stocks.length === 0) {
      console.log('No local results, searching external APIs...');
      const apiStocks = await stockDataService.searchStocks(query);
      console.log(`Found ${apiStocks.length} stocks from external APIs`);
      
      // Store new stocks in local storage
      for (const stock of apiStocks) {
        const existing = await storage.getStock(stock.symbol);
        if (!existing) {
          await storage.createStock(stock);
        }
        const savedStock = await storage.getStock(stock.symbol);
        if (savedStock) {
          stocks.push(savedStock);
        }
      }
    }

    console.log(`Returning ${stocks.length} search results`);
    return NextResponse.json({ 
      success: true,
      data: stocks,
      results: stocks,
      stocks: stocks 
    });
  } catch (error) {
    console.error('Error searching stocks:', error);
    return NextResponse.json(
      { message: "Failed to search stocks" },
      { status: 500 }
    );
  }
}