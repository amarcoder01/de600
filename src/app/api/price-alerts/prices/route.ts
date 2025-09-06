import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { PriceAlertService } from '@/lib/price-alert-service'
import { withAuth } from '@/lib/auth-middleware'
import type { AuthenticatedRequest } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

// GET /api/price-alerts/prices - Get current prices for all active alerts
export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const userId = request.user!.id
    
    // Get all active alerts for the authenticated user
    const activeAlerts = await prisma.priceAlert.findMany({
      where: {
        userId,
        status: 'active',
        isActive: true
      },
      select: {
        id: true,
        symbol: true,
        targetPrice: true,
        condition: true
      }
    })

    // Extract unique symbols
    const symbols = Array.from(new Set(activeAlerts.map(alert => alert.symbol)))
    
    // Get current prices for all symbols
    const currentPrices = await PriceAlertService.getCurrentPrices(symbols)

    // Combine alert data with current prices
    const alertsWithPrices = activeAlerts.map(alert => {
      const priceData = currentPrices[alert.symbol]
      return {
        id: alert.id,
        symbol: alert.symbol,
        targetPrice: alert.targetPrice,
        condition: alert.condition,
        currentPrice: priceData?.price || null,
        priceChange: priceData?.change || null,
        priceChangePercent: priceData?.changePercent || null,
        name: priceData?.name || null,
        lastUpdated: new Date().toISOString()
      }
    })

    return NextResponse.json({
      success: true,
      data: alertsWithPrices
    })
  } catch (error) {
    console.error('Error fetching current prices:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch current prices' },
      { status: 500 }
    )
  }
})
