import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";

// GET /api/debug/storage - Debug storage contents
export async function GET(request: NextRequest) {
  try {
    const { stocks, total } = await storage.getStocks(1, 10);
    const indices = await storage.getMarketIndices();
    
    return NextResponse.json({
      totalStocks: total,
      sampleStocks: stocks.map(s => ({ symbol: s.symbol, name: s.name })),
      indices: indices.map(i => ({ symbol: i.symbol, name: i.name })),
      msftStock: await storage.getStock('MSFT'),
    });
  } catch (error) {
    console.error('Error debugging storage:', error);
    return NextResponse.json(
      { message: "Failed to debug storage", error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
