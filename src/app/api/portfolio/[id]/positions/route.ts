import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth-service'
import { query } from '@/lib/pg'
import { randomUUID } from 'crypto'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    console.log('🔍 Positions API - Loading positions for portfolio:', id)

    // Authentication: require token
    const token = request.cookies.get('token')?.value
    if (!token) {
      console.log('❌ Positions API - No token provided')
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Authorization: verify user and portfolio ownership
    const user = await AuthService.getUserFromToken(token)
    if (!user) {
      console.log('❌ Positions API - Invalid authentication token')
      return NextResponse.json(
        { success: false, error: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    console.log('👤 Positions API - User verified:', { userId: user.id, userEmail: user.email })

    const { rows: portfolioRows } = await query(
      'SELECT "id", "name" FROM "Portfolio" WHERE "id" = $1 AND "userId" = $2 LIMIT 1',
      [id, user.id]
    )
    
    if (portfolioRows.length === 0) {
      console.log('❌ Positions API - Portfolio not found or access denied:', { portfolioId: id, userId: user.id })
      return NextResponse.json(
        { success: false, error: 'Portfolio not found' },
        { status: 404 }
      )
    }

    const portfolio = portfolioRows[0]
    console.log('✅ Positions API - Portfolio access verified:', { portfolioId: portfolio.id, portfolioName: portfolio.name })

    const { rows: positions } = await query(
      'SELECT * FROM "Position" WHERE "portfolioId" = $1 ORDER BY "entryDate" DESC',
      [id]
    )

    console.log('✅ Positions API - Positions fetched successfully:', { count: positions.length })

    return NextResponse.json({
      success: true,
      data: positions
    })

  } catch (error) {
    console.error('❌ Positions API - Error loading positions:', error)
    
    let errorMessage = 'Failed to load positions'
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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { symbol, quantity, averagePrice, notes } = body

    if (!symbol || !quantity || !averagePrice) {
      return NextResponse.json({
        success: false,
        error: 'Symbol, quantity, and average price are required'
      }, { status: 400 })
    }

    console.log('📝 Positions API - Creating position:', { symbol, quantity, averagePrice })

    // Authentication: require token
    const token = request.cookies.get('token')?.value
    if (!token) {
      console.log('❌ Positions API - No token provided for position creation')
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Authorization: verify user and portfolio ownership
    const user = await AuthService.getUserFromToken(token)
    if (!user) {
      console.log('❌ Positions API - Invalid authentication token for position creation')
      return NextResponse.json(
        { success: false, error: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    console.log('👤 Positions API - User verified for position creation:', { userId: user.id, userEmail: user.email })

    const { rows: portfolioRows } = await query(
      'SELECT "id", "name" FROM "Portfolio" WHERE "id" = $1 AND "userId" = $2 LIMIT 1',
      [id, user.id]
    )
    
    if (portfolioRows.length === 0) {
      console.log('❌ Positions API - Portfolio not found or access denied for position creation:', { portfolioId: id, userId: user.id })
      return NextResponse.json(
        { success: false, error: 'Portfolio not found' },
        { status: 404 }
      )
    }

    const portfolio = portfolioRows[0]
    console.log('✅ Positions API - Portfolio access verified for position creation:', { portfolioId: portfolio.id, portfolioName: portfolio.name })

    const now = new Date()
    const qty = parseFloat(quantity)
    const avg = parseFloat(averagePrice)
    const positionId = randomUUID()
    const { rows: createdRows } = await query(
      'INSERT INTO "Position" ("id", "portfolioId", "symbol", "quantity", "averagePrice", "entryDate", "notes") VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [positionId, id, symbol.toUpperCase(), qty, avg, now, notes || null]
    )
    const position = createdRows[0]

    console.log('✅ Positions API - Position created successfully:', { positionId: position.id, symbol, quantity, averagePrice })

    return NextResponse.json({
      success: true,
      data: position
    })

  } catch (error) {
    console.error('❌ Positions API - Error creating position:', error)
    
    let errorMessage = 'Failed to create position'
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
