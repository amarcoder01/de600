import { NextRequest, NextResponse } from "next/server";
import { marketStatusService } from "@/lib/market-status";

// GET /api/market/status - Get current market status
export async function GET(request: NextRequest) {
  try {
    const marketStatus = await marketStatusService.getMarketStatus();
    
    return NextResponse.json({
      success: true,
      data: marketStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching market status:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to fetch market status",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}