import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";

// DELETE /api/watchlist/symbols/[symbol] - Remove from watchlist
export async function DELETE(
  request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  try {
    const { symbol } = params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    const removed = await storage.removeFromWatchlist(symbol, userId || undefined);
    
    if (!removed) {
      return NextResponse.json(
        { message: "Watchlist item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Removed from watchlist" });
  } catch (error) {
    console.error('Error removing from watchlist:', error);
    return NextResponse.json(
      { message: "Failed to remove from watchlist" },
      { status: 500 }
    );
  }
}
