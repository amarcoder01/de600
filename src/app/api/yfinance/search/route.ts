// yfinance Search API Route - Uses Python yfinance library
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
    const query = searchParams.get('q')

    if (!query) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 })
    }

    console.log('API: Searching stocks via yfinance for:', query)

    // Execute external Python script
    const { stdout, stderr } = await execAsync(`python scripts/yfinance_search.py "${query}"`)

    if (stderr) {
      console.error('Python stderr:', stderr)
    }

    const result = JSON.parse(stdout.trim())
    
    if (!result.success) {
      console.log(`API: yfinance search failed:`, result.error)
      return NextResponse.json({ error: `Failed to search for ${query}` }, { status: 404 })
    }

    console.log(`API: Successfully found ${result.stocks.length} stocks via yfinance`)
    return NextResponse.json({
      success: true,
      stocks: result.stocks
    })

  } catch (error) {
    console.error('API: yfinance search error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
