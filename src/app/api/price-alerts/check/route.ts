import { NextRequest, NextResponse } from 'next/server'
import { PriceAlertService } from '@/lib/price-alert-service'
import { withAuth } from '@/lib/auth-middleware'
import type { AuthenticatedRequest } from '@/lib/auth-middleware'

// POST /api/price-alerts/check - Manually trigger price alert check
export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    console.log('🔍 Manual price alert check triggered')
    
    // Check all active alerts
    await PriceAlertService.checkAllAlerts(request.user!.id)
    
    // Get statistics
    const stats = await PriceAlertService.getAlertStats(request.user!.id)
    
    return NextResponse.json({
      success: true,
      message: 'Price alert check completed successfully',
      stats
    })
  } catch (error) {
    console.error('❌ Error in manual price alert check:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to check price alerts' },
      { status: 500 }
    )
  }
})

// GET /api/price-alerts/check - Get price alert statistics
export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const stats = await PriceAlertService.getAlertStats(request.user!.id)
    
    return NextResponse.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('❌ Error getting price alert stats:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to get price alert statistics' },
      { status: 500 }
    )
  }
})
