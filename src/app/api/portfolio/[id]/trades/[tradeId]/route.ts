import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { AuthService } from '@/lib/auth-service'

// DELETE - Delete a trade
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; tradeId: string } }
) {
  try {
    const { id: portfolioId, tradeId } = params
    console.log('🗑️ Trades API - Deleting trade:', { portfolioId, tradeId })

    // Verify user has access to this portfolio
    const token = request.cookies.get('token')?.value
    if (!token) {
      console.log('❌ Trades API - No token provided for trade deletion')
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    console.log('🔐 Trades API - Verifying token for trade deletion...')
    const user = await AuthService.getUserFromToken(token)
    if (!user) {
      console.log('❌ Trades API - Invalid authentication token for trade deletion')
      return NextResponse.json(
        { success: false, error: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    console.log('👤 Trades API - User verified for trade deletion:', { userId: user.id, userEmail: user.email })

    // Verify portfolio belongs to user
    console.log('📊 Trades API - Verifying portfolio ownership for trade deletion...')
    const portfolio = await prisma.portfolio.findFirst({
      where: { id: portfolioId, userId: user.id }
    })

    if (!portfolio) {
      console.log('❌ Trades API - Portfolio not found or access denied for trade deletion:', { portfolioId, userId: user.id })
      return NextResponse.json(
        { success: false, error: 'Portfolio not found' },
        { status: 404 }
      )
    }

    console.log('✅ Trades API - Portfolio access verified for trade deletion:', { portfolioId: portfolio.id, portfolioName: portfolio.name })

    // Verify trade exists and belongs to this portfolio
    console.log('📈 Trades API - Verifying trade ownership...')
    const trade = await prisma.trade.findFirst({
      where: { 
        id: tradeId,
        portfolioId: portfolioId
      }
    })

    if (!trade) {
      console.log('❌ Trades API - Trade not found:', { tradeId, portfolioId })
      return NextResponse.json(
        { success: false, error: 'Trade not found' },
        { status: 404 }
      )
    }

    console.log('✅ Trades API - Trade ownership verified:', { tradeId, symbol: trade.symbol, type: trade.type })

    // Delete the trade
    console.log('🗑️ Trades API - Deleting trade from database...')
    await prisma.trade.delete({
      where: { id: tradeId }
    })

    console.log('✅ Trades API - Trade deleted successfully:', { tradeId })

    return NextResponse.json({
      success: true,
      message: 'Trade deleted successfully'
    })

  } catch (error) {
    console.error('❌ Trades API - Error deleting trade:', error)
    
    let errorMessage = 'Failed to delete trade'
    let statusCode = 500
    
    if (error instanceof Error) {
      if (error.message.includes('database') || error.message.includes('connection')) {
        errorMessage = 'Database connection error. Please try again later.'
        statusCode = 503
      } else if (error.message.includes('authentication') || error.message.includes('token')) {
        errorMessage = 'Authentication error. Please log in again.'
        statusCode = 401
      } else if (error.message.includes('portfolio') || error.message.includes('not found')) {
        errorMessage = 'Portfolio not found.'
        statusCode = 404
      } else if (error.message.includes('trade') || error.message.includes('not found')) {
        errorMessage = 'Trade not found.'
        statusCode = 404
      } else {
        errorMessage = error.message
      }
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: statusCode })
  }
}
