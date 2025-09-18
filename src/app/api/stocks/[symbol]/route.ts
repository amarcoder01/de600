import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";

// GET /api/stocks/[symbol] - Get single stock
export async function GET(
  request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  try {
    const { symbol } = params;
    const upperSymbol = symbol.toUpperCase();
    const stock = await storage.getStock(upperSymbol);
    
    if (!stock) {
      console.log(`Stock ${upperSymbol} not found in storage`);
      // Try to get all stocks to see what's available
      const { stocks } = await storage.getStocks(1, 5);
      console.log(`Available stocks (first 5):`, stocks.map(s => s.symbol));
      
      return NextResponse.json(
        { message: `Stock ${upperSymbol} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json(stock);
  } catch (error) {
    console.error('Error fetching stock:', error);
    return NextResponse.json(
      { message: "Failed to fetch stock" },
      { status: 500 }
    );
  }
}