import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { StockDataService } from "@/lib/services/stockDataService";

// Ensure this route runs in the Node.js runtime and is always dynamic
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const stockDataService = new StockDataService();

// GET /api/market/indices - Get market indices
export async function GET(request: NextRequest) {
  try {
    let indices = await storage.getMarketIndices();
    
    // If no indices exist, initialize them
    if (indices.length === 0) {
      console.log('Initializing market indices...');
      const fetchedIndices = await stockDataService.fetchMarketIndices();
      
      // Store each index
      for (const index of fetchedIndices) {
        await storage.createMarketIndex(index);
      }
      
      // Get the stored indices
      indices = await storage.getMarketIndices();
      console.log(`Initialized ${indices.length} market indices`);
    }
    
    return NextResponse.json({
      indices,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching market indices:', error);
    return NextResponse.json(
      { 
        message: "Failed to fetch market indices",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
