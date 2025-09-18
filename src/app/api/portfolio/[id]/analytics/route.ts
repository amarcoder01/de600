import { NextRequest, NextResponse } from 'next/server'
import { withAuth, createAuthenticatedResponse, createErrorResponse } from '@/lib/auth-middleware'
import { ensureDatabaseReady } from '@/lib/db'

async function getPortfolioAnalyticsHandler(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // User is already authenticated by the middleware
    const user = (request as any).user
    
    if (!user || !user.id) {
      return createErrorResponse('User not found', 401)
    }

    const portfolioId = params.id
    
    if (!portfolioId) {
      return createErrorResponse('Portfolio ID is required', 400)
    }

    console.log('🔍 API: Loading analytics for portfolio:', portfolioId)
    
    // Ensure database is ready
    await ensureDatabaseReady()
    
    // For now, return a basic analytics structure
    // This can be expanded with actual portfolio analytics logic
    const analytics = {
      portfolioId,
      userId: user.id,
      summary: {
        totalValue: 0,
        totalGain: 0,
        totalGainPercent: 0,
        positions: 0,
        trades: 0
      },
      performance: {
        daily: [],
        weekly: [],
        monthly: [],
        yearly: []
      },
      positions: [],
      trades: [],
      riskMetrics: {
        volatility: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        beta: 0
      }
    }
    
    console.log('✅ API: Successfully loaded portfolio analytics')
    
    return createAuthenticatedResponse({
      success: true,
      data: analytics
    })
    
  } catch (error) {
    console.error('❌ API: Error loading portfolio analytics:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('Engine is not yet connected')) {
        return createErrorResponse(
          'Database service is starting up. Please try again in a moment.',
          503
        )
      }
      
      return createErrorResponse(error.message, 500)
    }
    
    return createErrorResponse('Failed to load portfolio analytics', 500)
  }
}

// Export the handler wrapped with authentication
export const GET = withAuth(getPortfolioAnalyticsHandler)
