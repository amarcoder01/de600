import { NextRequest, NextResponse } from 'next/server'
import { PaperTradingService } from '@/lib/paper-trading'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await PaperTradingService.cancelOrder(params.id)
    
    return NextResponse.json({
      success: true,
      message: 'Order cancelled successfully',
    })
  } catch (error) {
    console.error('Error cancelling paper trading order:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to cancel order' },
      { status: 500 }
    )
  }
}
