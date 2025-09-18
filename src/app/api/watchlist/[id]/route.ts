import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/db'

// GET - Get specific watchlist
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const watchlist = await DatabaseService.getWatchlist(params.id)
    
    if (!watchlist) {
      return NextResponse.json(
        { success: false, message: 'Watchlist not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: watchlist
    })
  } catch (error) {
    console.error('Error fetching watchlist:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch watchlist' },
      { status: 500 }
    )
  }
}

// DELETE - Delete watchlist
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await DatabaseService.deleteWatchlistById(params.id)
    
    return NextResponse.json({
      success: true,
      message: 'Watchlist deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting watchlist:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to delete watchlist' },
      { status: 500 }
    )
  }
} 