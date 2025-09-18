import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { StockDataService } from "@/lib/services/stockDataService";

const stockDataService = new StockDataService();

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
