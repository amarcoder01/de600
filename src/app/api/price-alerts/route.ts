import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/auth-middleware'
import type { AuthenticatedRequest } from '@/lib/auth-middleware'

// GET /api/price-alerts - Get all price alerts for the current user
export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const userId = request.user!.id

    const alerts = await prisma.priceAlert.findMany({
      where: {
        userId
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      data: alerts.map(alert => ({
        ...alert,
        createdAt: alert.createdAt.toISOString(),
        updatedAt: alert.updatedAt.toISOString(),
        triggeredAt: alert.triggeredAt?.toISOString(),
        lastChecked: alert.lastChecked?.toISOString()
      }))
    })
  } catch (error) {
    console.error('Error fetching price alerts:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch price alerts' },
      { status: 500 }
    )
  }
})

// POST /api/price-alerts - Create a new price alert
export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const body = await request.json()
    const { symbol, targetPrice, condition, userEmail } = body

    // Validate required fields
    if (!symbol || !targetPrice || !condition || !userEmail) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate condition
    if (!['above', 'below'].includes(condition)) {
      return NextResponse.json(
        { success: false, message: 'Invalid condition. Must be "above" or "below"' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(userEmail)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate target price
    if (targetPrice <= 0) {
      return NextResponse.json(
        { success: false, message: 'Target price must be greater than 0' },
        { status: 400 }
      )
    }

    const userId = request.user!.id

    // Check if user already has an active alert for this symbol and condition
    const existingAlert = await prisma.priceAlert.findFirst({
      where: {
        userId,
        symbol: symbol.toUpperCase(),
        condition,
        status: 'active',
        isActive: true
      }
    })

    if (existingAlert) {
      return NextResponse.json(
        { success: false, message: `You already have an active ${condition} alert for ${symbol}` },
        { status: 409 }
      )
    }

    // Create the price alert
    const alert = await prisma.priceAlert.create({
      data: {
        userId,
        symbol: symbol.toUpperCase(),
        targetPrice: parseFloat(targetPrice),
        condition,
        userEmail: userEmail.toLowerCase(),
        status: 'active',
        isActive: true
      }
    })

    // Create history entry
    await prisma.priceAlertHistory.create({
      data: {
        alertId: alert.id,
        action: 'created',
        message: `Price alert created for ${symbol.toUpperCase()} ${condition} $${targetPrice}`
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        ...alert,
        createdAt: alert.createdAt.toISOString(),
        updatedAt: alert.updatedAt.toISOString()
      }
    })
  } catch (error) {
    console.error('Error creating price alert:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to create price alert' },
      { status: 500 }
    )
  }
})
