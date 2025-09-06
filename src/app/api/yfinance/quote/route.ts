// yfinance Quote API Route - Uses Python yfinance library
import { NextRequest, NextResponse } from 'next/server'
import { Stock } from '@/types'
import { exec } from 'child_process'
import { promisify } from 'util'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

const execAsync = promisify(exec)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol parameter is required' }, { status: 400 })
    }

    console.log('API: Fetching yfinance quote for symbol:', symbol)

    // Execute external Python script
    const { stdout, stderr } = await execAsync(`python scripts/yfinance_quote.py "${symbol}"`)

    if (stderr) {
      console.error('Python stderr:', stderr)
    }

    const result = JSON.parse(stdout.trim())
    
    if (!result.success) {
      console.log(`API: yfinance failed for ${symbol}:`, result.error)
      return NextResponse.json({ error: `Failed to fetch data for ${symbol}` }, { status: 404 })
    }

    console.log(`API: Successfully fetched yfinance quote for ${symbol}`)
    return NextResponse.json({
      success: true,
      stock: result.stock
    })

  } catch (error) {
    console.error('API: yfinance quote error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
