import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/auth-service";
import { DatabaseService } from "@/lib/db";

// GET /api/watchlist - Get all watchlists for authenticated user
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

    let user = null;
    if (token) {
      user = await AuthService.getUserFromToken(token);
    }

    // Fallback to demo user if not authenticated (non-critical paths)
    if (!user) {
      try {
        user = await DatabaseService.getOrCreateDemoUser();
      } catch (e) {
        return NextResponse.json(
          { success: false, message: "Authentication required" },
          { status: 401 }
        );
      }
    }

    const watchlists = await DatabaseService.getWatchlists(user.id);
    return NextResponse.json({ success: true, data: watchlists }, { status: 200 });
  } catch (error) {
    console.error("Error fetching watchlists:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch watchlists" },
      { status: 500 }
    );
  }
}

// POST /api/watchlist - Create a new watchlist for authenticated user
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const user = await AuthService.getUserFromToken(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const name = typeof body?.name === "string" ? body.name.trim() : "";

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Watchlist name is required" },
        { status: 400 }
      );
    }

    const watchlist = await DatabaseService.createWatchlist(user.id, name);
    return NextResponse.json({ success: true, data: watchlist }, { status: 201 });
  } catch (error) {
    console.error("Error creating watchlist:", error);
    const message = error instanceof Error ? error.message : "Failed to create watchlist";
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}