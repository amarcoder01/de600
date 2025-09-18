import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { AuthService } from '@/lib/auth-service'

// GET - Get user's portfolios
export async function GET(request: NextRequest) {
  try {
    // Get user from token
    const token = request.cookies.get('token')?.value
    
    console.log('🔍 Portfolio API - Token check:', {
      hasToken: !!token,
      tokenLength: token?.length,
      tokenPreview: token ? `${token.substring(0, 20)}...` : 'none'
    })
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify token and get user
    console.log('🔐 Portfolio API - Verifying token...')
    const user = await AuthService.getUserFromToken(token)
    console.log('👤 Portfolio API - User verification result:', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email
    })
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication token' },
        { status: 401 }
      )
    }
    
    // Get user's portfolios
    console.log('📊 Portfolio API - Fetching portfolios for user:', user.id)
    const portfolios = await prisma.portfolio.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    })
    console.log('✅ Portfolio API - Found portfolios:', portfolios.length)
    
    // If no portfolios exist, create a default one
    if (portfolios.length === 0) {
      console.log('📝 Portfolio API - No portfolios found, creating default')
      const defaultPortfolio = await prisma.portfolio.create({
        data: {
          name: 'My Portfolio',
          userId: user.id
        }
      })
      
      console.log('✅ Portfolio API - Default portfolio created:', defaultPortfolio.id)
      return NextResponse.json({
        success: true,
        data: [defaultPortfolio]
      })
    }
    
    console.log('✅ Portfolio API - Returning user portfolios')
    return NextResponse.json({
      success: true,
      data: portfolios
    })
  } catch (error) {
    console.error('❌ Portfolio API - Error fetching portfolios:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch portfolios' },
      { status: 500 }
    )
  }
}

// POST - Create a new portfolio
export async function POST(request: NextRequest) {
  try {
    // Get user from token
    const token = request.cookies.get('token')?.value
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify token and get user
    const user = await AuthService.getUserFromToken(token)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication token' },
        { status: 401 }
      )
    }
    
    const { name } = await request.json()
    
    // Create new portfolio
    const portfolio = await prisma.portfolio.create({
      data: {
        name,
        userId: user.id
      }
    })
    
    return NextResponse.json({
      success: true,
      data: portfolio
    })
  } catch (error) {
    console.error('Error creating portfolio:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create portfolio' },
      { status: 500 }
    )
  }
}
