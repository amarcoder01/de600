import { NextRequest, NextResponse } from 'next/server'
import { PaperTradingService } from '@/lib/paper-trading'
import { DatabaseService } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get demo user for now (in production, use real authentication)
    const user = await DatabaseService.getOrCreateDemoUser()
    
    // Check if account belongs to user
    const account = await PaperTradingService.getAccount(params.id)
    if (!account) {
      return NextResponse.json(
        { success: false, error: 'Account not found' },
        { status: 404 }
      )
    }

    if (account.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Get trading statistics
    const stats = await PaperTradingService.getTradingStats(params.id)
    
    return NextResponse.json({
      success: true,
      data: stats,
    })
  } catch (error) {
    console.error('Error fetching trading stats:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch trading stats' },
      { status: 500 }
    )
  }
}
