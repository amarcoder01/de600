import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth-service'
import { query, withTransaction } from '@/lib/pg'
import { randomUUID } from 'crypto'

// GET - Get all trades for a portfolio
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    console.log('🔍 Trades API - Loading trades for portfolio:', id)

    // Verify user has access to this portfolio
    const token = request.cookies.get('token')?.value
    if (!token) {
      console.log('❌ Trades API - No token provided')
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    console.log('🔐 Trades API - Verifying token...')
    const user = await AuthService.getUserFromToken(token)
    if (!user) {
      console.log('❌ Trades API - Invalid authentication token')
      return NextResponse.json(
        { success: false, error: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    console.log('👤 Trades API - User verified:', { userId: user.id, userEmail: user.email })

    // Verify portfolio belongs to user
    console.log('📊 Trades API - Verifying portfolio ownership...')
    const { rows: portfolioRows } = await query(
      'SELECT "id" FROM "Portfolio" WHERE "id" = $1 AND "userId" = $2 LIMIT 1',
      [id, user.id]
    )

    if (portfolioRows.length === 0) {
      console.log('❌ Trades API - Portfolio not found or access denied:', { portfolioId: id, userId: user.id })
      return NextResponse.json(
        { success: false, error: 'Portfolio not found' },
        { status: 404 }
      )
    }

    console.log('✅ Trades API - Portfolio access verified:', { portfolioId: id })

    // Fetch trades
    console.log('📈 Trades API - Fetching trades...')
    const { rows: trades } = await query(
      'SELECT * FROM "Trade" WHERE "portfolioId" = $1 ORDER BY "date" DESC',
      [id]
    )

    console.log('✅ Trades API - Trades fetched successfully:', { count: trades.length })

    return NextResponse.json({
      success: true,
      data: trades
    })

  } catch (error) {
    console.error('❌ Trades API - Error loading trades:', error)
    
    // Provide more specific error messages
    let errorMessage = 'Failed to load trades'
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
  } finally {
    // No explicit disconnect required; pool manages connections.
  }
}

// POST - Create a new trade
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    console.log('📝 Trades API - Creating new trade for portfolio:', id)
    
    const body = await request.json()
    const { symbol, type, quantity, price, notes } = body

    console.log('📊 Trades API - Trade data received:', { symbol, type, quantity, price, notes })

    // Validate required fields
    if (!symbol || !type || !quantity || !price) {
      console.log('❌ Trades API - Missing required fields:', { symbol, type, quantity, price })
      return NextResponse.json({
        success: false,
        error: 'Symbol, type, quantity, and price are required'
      }, { status: 400 })
    }

    if (!['buy', 'sell'].includes(type)) {
      console.log('❌ Trades API - Invalid trade type:', type)
      return NextResponse.json({
        success: false,
        error: 'Trade type must be either "buy" or "sell"'
      }, { status: 400 })
    }

    // Verify user has access to this portfolio
    const token = request.cookies.get('token')?.value
    if (!token) {
      console.log('❌ Trades API - No token provided for trade creation')
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    console.log('🔐 Trades API - Verifying token for trade creation...')
    const user = await AuthService.getUserFromToken(token)
    if (!user) {
      console.log('❌ Trades API - Invalid authentication token for trade creation')
      return NextResponse.json(
        { success: false, error: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    console.log('👤 Trades API - User verified for trade creation:', { userId: user.id, userEmail: user.email })

    // Verify portfolio belongs to user
    console.log('📊 Trades API - Verifying portfolio ownership for trade creation...')
    const { rows: portfolioRows } = await query(
      'SELECT "id" FROM "Portfolio" WHERE "id" = $1 AND "userId" = $2 LIMIT 1',
      [id, user.id]
    )

    if (portfolioRows.length === 0) {
      console.log('❌ Trades API - Portfolio not found or access denied for trade creation:', { portfolioId: id, userId: user.id })
      return NextResponse.json(
        { success: false, error: 'Portfolio not found' },
        { status: 404 }
      )
    }

    console.log('✅ Trades API - Portfolio access verified for trade creation:', { portfolioId: id })

    // For sell trades, pre-check if user has enough shares
    if (type === 'sell') {
      console.log('📉 Trades API - Checking position for sell trade...')
      const { rows: posRows } = await query(
        'SELECT "quantity" FROM "Position" WHERE "portfolioId" = $1 AND "symbol" = $2 LIMIT 1',
        [id, symbol.toUpperCase()]
      )

      const currentQty = posRows[0]?.quantity || 0
      if (currentQty < parseFloat(quantity)) {
        console.log('❌ Trades API - Insufficient shares for sell trade:', {
          symbol,
          requestedQuantity: quantity,
          availableQuantity: currentQty,
        })
        return NextResponse.json({
          success: false,
          error: `Insufficient shares. You only own ${currentQty} shares of ${symbol.toUpperCase()}`
        }, { status: 400 })
      }

      console.log('✅ Trades API - Position check passed for sell trade:', {
        symbol,
        availableQuantity: currentQty,
      })
    }

    console.log('📝 Trades API - Creating trade:', { symbol, type, quantity, price })

    // Execute trade and position updates in a transaction
    const trade = await withTransaction(async (client) => {
      const now = new Date()
      const qty = parseFloat(quantity)
      const prc = parseFloat(price)
      const amount = qty * prc
      // Insert trade with generated ID
      const tradeId = randomUUID()
      const tradeInsert = await client.query(
        'INSERT INTO "Trade" ("id", "portfolioId", "symbol", "type", "quantity", "price", "amount", "date", "notes") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING "id"',
        [tradeId, id, symbol.toUpperCase(), type, qty, prc, amount, now, notes || null]
      )

      // Fetch existing position
      const posRes = await client.query('SELECT "id", "quantity", "averagePrice" FROM "Position" WHERE "portfolioId" = $1 AND "symbol" = $2 LIMIT 1', [id, symbol.toUpperCase()])

      if (type === 'buy') {
        if (posRes.rows.length > 0) {
          const existing = posRes.rows[0]
          const totalQuantity = Number(existing.quantity) + qty
          const totalCost = Number(existing.quantity) * Number(existing["averagePrice"]) + qty * prc
          const newAveragePrice = totalCost / totalQuantity

          await client.query(
            'UPDATE "Position" SET "quantity" = $1, "averagePrice" = $2, "entryDate" = $3 WHERE "id" = $4',
            [totalQuantity, newAveragePrice, now, existing.id]
          )
        } else {
          // Insert new position with generated ID
          const positionId = randomUUID()
          await client.query(
            'INSERT INTO "Position" ("id", "portfolioId", "symbol", "quantity", "averagePrice", "entryDate", "notes") VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [positionId, id, symbol.toUpperCase(), qty, prc, now, notes || null]
          )
        }
      } else if (type === 'sell') {
        if (posRes.rows.length > 0) {
          const existing = posRes.rows[0]
          const remainingQuantity = Number(existing.quantity) - qty
          if (remainingQuantity <= 0) {
            await client.query('DELETE FROM "Position" WHERE "id" = $1', [existing.id])
          } else {
            await client.query('UPDATE "Position" SET "quantity" = $1 WHERE "id" = $2', [remainingQuantity, existing.id])
          }
        }
      }

      return { id: tradeInsert.rows[0].id, portfolioId: id, symbol: symbol.toUpperCase(), type, quantity: qty, price: prc, amount, date: now, notes: notes || null }
    })

    console.log('✅ Trades API - Trade and position processing completed successfully')

    return NextResponse.json({
      success: true,
      data: trade
    })

  } catch (error) {
    console.error('❌ Trades API - Error creating trade:', error)
    
    // Provide more specific error messages
    let errorMessage = 'Failed to create trade'
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
      } else if (error.message.includes('insufficient') || error.message.includes('shares')) {
        errorMessage = error.message
        statusCode = 400
      } else {
        errorMessage = error.message
      }
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: statusCode })
  } finally {
    // No explicit disconnect required; pool manages connections.
  }
}
