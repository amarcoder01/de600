import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/db'
import { AuthService } from '@/lib/auth-service'
import { getValidatedStockData } from '@/lib/multi-source-api'
import { validateSector } from '@/lib/sector-validation'

// POST - Add item to watchlist
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const stockData = await request.json()
    
    // Validate required fields
    if (!stockData.symbol || !stockData.name) {
      console.error('❌ Missing required fields:', { symbol: stockData.symbol, name: stockData.name, price: stockData.price })
      return NextResponse.json(
        { success: false, message: 'Missing required fields: symbol and name are required' },
        { status: 400 }
      )
    }
    
    // Normalize price field (handle both price and currentPrice)
    const price = stockData.price || stockData.currentPrice || 0
    
    console.log(`🔍 API: Adding ${stockData.symbol} to watchlist ${params.id}...`)
    console.log(`📊 Stock data:`, stockData)
    
    // Verify watchlist belongs to authenticated user
    const token = request.cookies.get('token')?.value
    let user

    if (token) {
      user = await AuthService.getUserFromToken(token)
    }

    if (!user) {
      user = await DatabaseService.getOrCreateDemoUser()
    }

    // Verify watchlist exists and belongs to user
    const watchlist = await DatabaseService.getWatchlist(params.id)
    if (!watchlist || watchlist.userId !== user.id) {
      return NextResponse.json(
        { success: false, message: 'Watchlist not found or access denied' },
        { status: 404 }
      )
    }

    // Get validated stock data to ensure accuracy
    console.log(`🔍 Fetching validated data for ${stockData.symbol}...`)
    const { stock: validatedStock, validation } = await getValidatedStockData(stockData.symbol)
    
    // Use validated data if available, otherwise use provided data with validation
    let finalStockData = stockData
    
    if (validatedStock && validation.overallScore >= 70) {
      console.log(`✅ Using validated data for ${stockData.symbol} (Quality: ${validation.overallScore}%)`)
      finalStockData = validatedStock
    } else {
      console.log(`⚠️ Using provided data for ${stockData.symbol} with validation`)
      // Validate and correct sector data
      const sectorValidation = validateSector(stockData.sector)
      if (sectorValidation.correctedData) {
        finalStockData.sector = sectorValidation.correctedData
        console.log(`🔧 Corrected sector for ${stockData.symbol}: ${sectorValidation.correctedData}`)
      }
    }

    const item = await DatabaseService.addToWatchlist(params.id, {
      symbol: finalStockData.symbol,
      name: finalStockData.name,
      type: finalStockData.type || 'stock',
      price: finalStockData.price || price,
      change: finalStockData.change,
      changePercent: finalStockData.changePercent,
      exchange: finalStockData.exchange,
      sector: finalStockData.sector,
      volume: finalStockData.volume,
      marketCap: finalStockData.marketCap,
    })
    
    console.log(`✅ Database: Successfully added ${stockData.symbol} to watchlist ${params.id}`)
    return NextResponse.json({
      success: true,
      data: item
    })
  } catch (error) {
    console.error('❌ Error adding item to watchlist:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to add item to watchlist' },
      { status: 500 }
    )
  }
}

// DELETE - Remove item from watchlist
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')
    
    if (!symbol) {
      console.error('❌ API: Missing symbol parameter in DELETE request')
      return NextResponse.json(
        { success: false, message: 'Symbol parameter is required' },
        { status: 400 }
      )
    }
    
    console.log(`🗑️ API: Removing ${symbol} from watchlist ${params.id}...`)
    
    // Verify watchlist belongs to authenticated user
    const token = request.cookies.get('token')?.value
    let user

    if (token) {
      user = await AuthService.getUserFromToken(token)
    }

    if (!user) {
      user = await DatabaseService.getOrCreateDemoUser()
    }

    console.log(`👤 API: User authenticated: ${user.id}`)

    // Verify watchlist exists and belongs to user
    const watchlist = await DatabaseService.getWatchlist(params.id)
    if (!watchlist || watchlist.userId !== user.id) {
      console.error(`❌ API: Watchlist ${params.id} not found or access denied for user ${user.id}`)
      return NextResponse.json(
        { success: false, message: 'Watchlist not found or access denied' },
        { status: 404 }
      )
    }

    console.log(`✅ API: Watchlist ${params.id} verified for user ${user.id}`)

    await DatabaseService.removeFromWatchlist(params.id, symbol)
    console.log(`✅ API: Successfully removed ${symbol} from watchlist ${params.id}`)
    
    return NextResponse.json({
      success: true,
      message: 'Item removed from watchlist successfully'
    })
  } catch (error) {
    console.error('❌ API: Error removing item from watchlist:', error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to remove item from watchlist' },
      { status: 500 }
    )
  }
}