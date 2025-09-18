import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { StockDataService } from "@/lib/services/stockDataService";

const stockDataService = new StockDataService();

// GET /api/stocks/[symbol]/news - Get news for a stock
export async function GET(
  request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  try {
    const { symbol } = params;
    const upperSymbol = symbol.toUpperCase();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    
    // Try to get stock from storage first
    let stock = await storage.getStock(upperSymbol);
    
    // If not found in storage, fetch from external APIs
    if (!stock) {
      console.log(`Stock ${upperSymbol} not found in storage, fetching from external APIs...`);
      try {
        const fetchedStocks = await stockDataService.fetchStockData([upperSymbol]);
        if (fetchedStocks && fetchedStocks.length > 0) {
          // Store the fetched stock in storage for future use
          stock = await storage.createStock(fetchedStocks[0]);
          console.log(`Successfully fetched and stored ${upperSymbol} for news`);
        }
      } catch (fetchError) {
        console.error(`Failed to fetch stock data for ${upperSymbol}:`, fetchError);
      }
    }
    
    // Even if stock is not in storage, we can still fetch news for the symbol
    // This allows news to work for any valid stock symbol
    const articles = await stockDataService.getNews(upperSymbol, limit);
    
    return NextResponse.json({
      articles,
      symbol: upperSymbol,
      total: articles.length,
    });
  } catch (error) {
    console.error('Error fetching news:', error);
    return NextResponse.json(
      { message: "Failed to fetch news" },
      { status: 500 }
    );
  }
}
