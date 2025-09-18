import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { AuthService } from '@/lib/auth-service'

// DELETE - Delete a position
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; positionId: string } }
) {
  try {
    const { id: portfolioId, positionId } = params
    console.log('🗑️ Positions API - Deleting position:', { portfolioId, positionId })

    // Verify user has access to this portfolio
    const token = request.cookies.get('token')?.value
    if (!token) {
      console.log('❌ Positions API - No token provided for position deletion')
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    console.log('🔐 Positions API - Verifying token for position deletion...')
    const user = await AuthService.getUserFromToken(token)
    if (!user) {
      console.log('❌ Positions API - Invalid authentication token for position deletion')
      return NextResponse.json(
        { success: false, error: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    console.log('👤 Positions API - User verified for position deletion:', { userId: user.id, userEmail: user.email })

    // Verify portfolio belongs to user
    console.log('📊 Positions API - Verifying portfolio ownership for position deletion...')
    const portfolio = await prisma.portfolio.findFirst({
      where: { id: portfolioId, userId: user.id }
    })

    if (!portfolio) {
      console.log('❌ Positions API - Portfolio not found or access denied for position deletion:', { portfolioId, userId: user.id })
      return NextResponse.json(
        { success: false, error: 'Portfolio not found' },
        { status: 404 }
      )
    }

    console.log('✅ Positions API - Portfolio access verified for position deletion:', { portfolioId: portfolio.id, portfolioName: portfolio.name })

    // Verify position exists and belongs to this portfolio
    console.log('📈 Positions API - Verifying position ownership...')
    const position = await prisma.position.findFirst({
      where: { 
        id: positionId,
        portfolioId: portfolioId
      }
    })

    if (!position) {
      console.log('❌ Positions API - Position not found:', { positionId, portfolioId })
      return NextResponse.json(
        { success: false, error: 'Position not found' },
        { status: 404 }
      )
    }

    console.log('✅ Positions API - Position ownership verified:', { positionId, symbol: position.symbol, quantity: position.quantity })

    // Delete the position
    console.log('🗑️ Positions API - Deleting position from database...')
    await prisma.position.delete({
      where: { id: positionId }
    })

    console.log('✅ Positions API - Position deleted successfully:', { positionId })

    return NextResponse.json({
      success: true,
      message: 'Position deleted successfully'
    })

  } catch (error) {
    console.error('❌ Positions API - Error deleting position:', error)
    
    let errorMessage = 'Failed to delete position'
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
      } else if (error.message.includes('position') || error.message.includes('not found')) {
        errorMessage = 'Position not found.'
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



