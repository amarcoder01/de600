import { NextRequest, NextResponse } from 'next/server'
import { PaperTradingService } from '@/lib/paper-trading'
import { DatabaseService } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const account = await PaperTradingService.getAccount(params.id)
    
    if (!account) {
      return NextResponse.json(
        { success: false, error: 'Account not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: account,
    })
  } catch (error) {
    console.error('Error fetching paper trading account:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch paper trading account' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    // Delete the account
    await PaperTradingService.deleteAccount(params.id)
    
    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting paper trading account:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete account' },
      { status: 500 }
    )
  }
}
