import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/auth-middleware'
import type { AuthenticatedRequest } from '@/lib/auth-middleware'
import { RealTimePriceService } from '@/lib/real-time-price-service'

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
    if (!symbol || symbol.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'Asset symbol is required' },
        { status: 400 }
      )
    }

    if (!targetPrice) {
      return NextResponse.json(
        { success: false, message: 'Target price is required' },
        { status: 400 }
      )
    }

    if (!condition) {
      return NextResponse.json(
        { success: false, message: 'Condition is required' },
        { status: 400 }
      )
    }

    if (!userEmail || userEmail.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'Email address is required' },
        { status: 400 }
      )
    }

    // Validate symbol length
    if (symbol.length > 10) {
      return NextResponse.json(
        { success: false, message: 'Symbol must be 10 characters or less' },
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

    // Enhanced email validation - RFC 5322 compliant
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    const trimmedEmail = userEmail.trim()
    
    if (!emailRegex.test(trimmedEmail)) {
      return NextResponse.json(
        { success: false, message: 'Please enter a valid email address (e.g., user@example.com)' },
        { status: 400 }
      )
    }

    // Additional email validation checks
    const emailParts = trimmedEmail.split('@')
    if (emailParts.length !== 2) {
      return NextResponse.json(
        { success: false, message: 'Invalid email format' },
        { status: 400 }
      )
    }

    const [localPart, domain] = emailParts

    // Check local part length (max 64 characters per RFC 5321)
    if (localPart.length > 64 || localPart.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Email address format is invalid' },
        { status: 400 }
      )
    }

    // Check domain part
    if (domain.length > 255 || domain.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Email domain is invalid' },
        { status: 400 }
      )
    }

    // Check if domain has at least one dot
    if (!domain.includes('.')) {
      return NextResponse.json(
        { success: false, message: 'Email must include a valid domain (e.g., gmail.com)' },
        { status: 400 }
      )
    }

    // Check domain extension length (at least 2 characters)
    const domainParts = domain.split('.')
    const extension = domainParts[domainParts.length - 1].toLowerCase()
    
    if (extension.length < 2) {
      return NextResponse.json(
        { success: false, message: 'Email domain extension must be at least 2 characters' },
        { status: 400 }
      )
    }

    // Validate against common valid TLDs
    const validTLDs = new Set([
      'com', 'org', 'net', 'edu', 'gov', 'mil', 'int', 'info', 'biz', 'name', 'pro',
      'us', 'uk', 'ca', 'au', 'de', 'fr', 'it', 'es', 'nl', 'be', 'ch', 'at', 'se',
      'no', 'dk', 'fi', 'ie', 'pt', 'pl', 'cz', 'ru', 'ua', 'ro', 'gr', 'jp', 'cn',
      'kr', 'tw', 'hk', 'sg', 'my', 'th', 'vn', 'ph', 'id', 'in', 'pk', 'nz', 'mx',
      'br', 'ar', 'cl', 'co', 'pe', 've', 'io', 'ai', 'tv', 'me', 'cc', 'xyz', 'app',
      'dev', 'tech', 'online', 'site', 'store', 'shop', 'blog', 'cloud', 'email'
    ])

    if (!validTLDs.has(extension)) {
      return NextResponse.json(
        { success: false, message: `Invalid domain extension '.${extension}'. Please use a valid email domain (e.g., gmail.com, outlook.com)` },
        { status: 400 }
      )
    }

    // Validate target price
    if (isNaN(targetPrice) || targetPrice <= 0) {
      return NextResponse.json(
        { success: false, message: 'Target price must be greater than 0' },
        { status: 400 }
      )
    }

    // Validate that the symbol exists by checking real-time price
    const normalizedSymbol = symbol.toUpperCase().trim()
    const priceData = await RealTimePriceService.getRealTimePrice(normalizedSymbol)
    if (!priceData || !priceData.price || priceData.price <= 0) {
      return NextResponse.json(
        { success: false, message: `Invalid or unsupported asset symbol '${symbol}'. Please enter a valid symbol.` },
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
