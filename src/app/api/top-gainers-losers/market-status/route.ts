import { NextRequest, NextResponse } from 'next/server';

function getMarketStatus() {
  const now = new Date();
  const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
  const hour = easternTime.getHours();
  const day = easternTime.getDay();
  
  // Market is open Monday-Friday 9:30 AM - 4:00 PM ET
  const isWeekday = day >= 1 && day <= 5;
  const isMarketHours = hour >= 9 && hour < 16;
  const isOpen = isWeekday && isMarketHours;
  
  return {
    isOpen,
    status: isOpen ? "Market Open" : "Market Closed",
  };
}

export async function GET(request: NextRequest) {
  try {
    const status = getMarketStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error('Error in /api/top-gainers-losers/market-status:', error);
    return NextResponse.json({ 
      message: 'Failed to fetch market status',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
