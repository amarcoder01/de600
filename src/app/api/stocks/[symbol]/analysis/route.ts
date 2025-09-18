import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { OpenAIStockService } from "@/lib/services/openai";
import { StockDataService } from "@/lib/services/stockDataService";

const openAIService = new OpenAIStockService();
const stockDataService = new StockDataService();

// GET /api/stocks/[symbol]/analysis - Analyze stock with AI
export async function GET(
  request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  try {
    const { symbol } = params;
    const upperSymbol = symbol.toUpperCase();
    
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
          console.log(`Successfully fetched and stored ${upperSymbol} for analysis`);
        }
      } catch (fetchError) {
        console.error(`Failed to fetch stock data for ${upperSymbol}:`, fetchError);
      }
    }
    
    if (!stock) {
      console.log(`Stock ${upperSymbol} not found in storage or external APIs for analysis`);
      return NextResponse.json(
        { message: `Stock ${upperSymbol} not found` },
        { status: 404 }
      );
    }

    // Prepare stock data for analysis
    const stockData = {
      symbol: stock.symbol,
      name: stock.name,
      price: stock.currentPrice,
      change: stock.change,
      changePercent: stock.changePercent,
      volume: stock.volume,
      sector: stock.sector,
    };

    const analysis = await openAIService.analyzeStock(stockData);
    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Error analyzing stock:', error);
    return NextResponse.json(
      { message: "Failed to analyze stock" },
      { status: 500 }
    );
  }
}
