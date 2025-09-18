import { NextRequest, NextResponse } from "next/server";
import { StockDataService } from "@/lib/services/stockDataService";

const stockDataService = new StockDataService();

// GET /api/stocks/[symbol]/details - Get detailed stock information with financial metrics from Yahoo Finance
export async function GET(
  request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  try {
    const { symbol } = params;
    const upperSymbol = symbol.toUpperCase();
    
    // Get enhanced stock data from Yahoo Finance
    const detailedData = await stockDataService.getDetailedStockData(upperSymbol);
    
    if (!detailedData) {
      return NextResponse.json(
        { message: "Stock details not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(detailedData);
  } catch (error) {
    console.error(`Error fetching detailed stock data for ${params.symbol}:`, error);
    return NextResponse.json(
      { message: "Failed to fetch stock details" },
      { status: 500 }
    );
  }
}
