import { NextRequest, NextResponse } from 'next/server'
import { PaperTradingService } from '@/lib/paper-trading'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accountId, symbol, type, side, quantity, price, stopPrice, notes } = body

    // Validate required fields
    if (!accountId || !symbol || !type || !side || !quantity) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const order = await PaperTradingService.placeOrder(
      accountId,
      symbol,
      type,
      side,
      quantity,
      price,
      stopPrice,
      notes
    )
    
    return NextResponse.json({
      success: true,
      data: order,
    })
  } catch (error) {
    console.error('Error placing paper trading order:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to place order' },
      { status: 500 }
    )
  }
}
