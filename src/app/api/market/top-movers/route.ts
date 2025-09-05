import { NextRequest, NextResponse } from 'next/server'

const POLYGON_API_KEY = process.env.NEXT_PUBLIC_POLYGON_API_KEY || process.env.POLYGON_API_KEY

interface PolygonTickerData {
  ticker: string
  day?: {
    c: number // close price
    h: number // high
    l: number // low
    o: number // open
    v: number // volume
    vw: number // volume weighted average price
  }
  min?: {
    av: number // accumulated volume
    t: number // timestamp
    n: number // number of transactions
    o: number // open price
    h: number // high price
    l: number // low price
    c: number // close price
    v: number // volume
    vw: number // volume weighted average price
  }
  prevDay?: {
    c: number // previous close
    h: number
    l: number
    o: number
    v: number
    vw: number
  }
  todaysChange?: number
  todaysChangePerc?: number
  updated?: number
  fmv?: number // fair market value
}

interface StockData {
  ticker: string
  name: string
  market_cap: number
  value: number
  change: number
  change_percent: number
}

interface ApiResponse {
  status: string
  results: StockData[]
  count?: number
}

// Get market status (open/closed)
async function fetchMarketStatus(): Promise<'open' | 'closed' | 'extended' | 'unknown'> {
  try {
    const data = await makePolygonRequest('/v1/marketstatus/now')
    const market = data?.market
    if (market === 'open') return 'open'
    if (market === 'closed') return 'closed'
    return 'unknown'
  } catch {
    return 'unknown'
  }
}

// Fallback using grouped aggregates for a given date
async function fetchGroupedMovers(type: 'gainers' | 'losers', dateISO: string): Promise<StockData[]> {
  // Reference: https://polygon.io/docs/stocks/get_v2_aggs_grouped_locale_us_market_stocks__date
  const endpoint = `/v2/aggs/grouped/locale/us/market/stocks/${dateISO}?adjusted=true`
  const data = await makePolygonRequest(endpoint)
  const results = Array.isArray(data?.results) ? data.results : []

  const transformed: StockData[] = results
    .map((r: any) => {
      const ticker = r?.T
      const c = r?.c
      const o = r?.o
      const v = r?.v
      if (!ticker || typeof c !== 'number' || typeof o !== 'number' || typeof v !== 'number') return null
      if (c <= 0 || o <= 0) return null
      // Relaxed floor to $0.5 similar to snapshot transform
      if (c < 0.5) return null
      const change = c - o
      const change_percent = o > 0 ? (change / o) * 100 : 0
      if (!isFinite(change_percent) || Math.abs(change_percent) > 500) return null
      if (v <= 0) return null
      const estimatedShares = Math.max(v * 10, 1_000_000)
      const market_cap = c * estimatedShares
      const stock: StockData = {
        ticker,
        name: ticker,
        market_cap,
        value: c,
        change,
        change_percent,
      }
      return stock
    })
    .filter((s: StockData | null): s is StockData => s !== null)

  // Sort by change_percent based on type
  transformed.sort((a, b) => (type === 'gainers' ? b.change_percent - a.change_percent : a.change_percent - b.change_percent))

  // Limit to top 20 similar to snapshot behavior
  return transformed.slice(0, 20)
}

// Transform snapshot item from Polygon Snapshot Gainers/Losers into our StockData
function transformSnapshotItem(item: any): StockData | null {
  // Snapshot schema references:
  // https://polygon.io/docs/stocks/get_v2_snapshot_locale_us_markets_stocks_gainers
  // Common fields we use: ticker, todaysChange, todaysChangePerc, updated, day.{c,h,l,o,v,vw}
  const ticker = item?.ticker
  if (!ticker) return null

  // Prefer day close as current price; fallback to lastTrade price if present
  const currentPrice = item?.day?.c ?? item?.lastTrade?.p ?? 0
  const change = item?.todaysChange ?? 0
  const changePercent = item?.todaysChangePerc ?? 0
  const volume = item?.day?.v ?? item?.lastQuote?.s ?? 0

  // Basic validation similar to previous implementation
  if (!currentPrice || currentPrice <= 0) return null
  // Slightly relaxed to $0.5 to avoid empty datasets for low-priced movers
  if (currentPrice < 0.5) return null
  if (Math.abs(changePercent) > 500) return null
  if (!volume || volume <= 0) return null

  // Estimate market cap (Polygon snapshot does not return market cap directly here)
  const estimatedShares = Math.max(volume * 10, 1_000_000)
  const marketCap = currentPrice * estimatedShares

  const stock: StockData = {
    ticker,
    name: ticker,
    value: currentPrice,
    change,
    change_percent: changePercent,
    market_cap: marketCap,
  }

  return stock
}

function transformPolygonData(ticker: PolygonTickerData): StockData | null {
  // Get current price from day data (most reliable)
  const currentPrice = ticker.day?.c || ticker.min?.c || 0
  const previousClose = ticker.prevDay?.c || 0
  
  // Use Polygon's pre-calculated change values when available
  let change = ticker.todaysChange || 0
  let changePercent = ticker.todaysChangePerc || 0
  
  // If Polygon's calculated values are not available, calculate manually
  if (change === 0 && changePercent === 0 && previousClose > 0) {
    change = currentPrice - previousClose
    changePercent = (change / previousClose) * 100
  }
  
  // Data validation
  if (currentPrice <= 0) {
    return null // Skip stocks with zero or negative prices
  }
  
  // Filter out penny stocks below $1.00 for better quality data
  if (currentPrice < 1.00) {
    return null
  }
  
  // Filter out unrealistic percentage changes (>500%)
  if (Math.abs(changePercent) > 500) {
    return null
  }
  
  // Filter out stocks with no volume
  const volume = ticker.day?.v || ticker.min?.v || 0
  if (volume <= 0) {
    return null
  }
  
  // Estimate market cap based on price and volume
  const estimatedShares = Math.max(volume * 10, 1000000) // Rough estimate
  const marketCap = currentPrice * estimatedShares

  return {
    ticker: ticker.ticker,
    name: ticker.ticker, // Polygon doesn't provide company name in this endpoint
    value: currentPrice,
    change,
    change_percent: changePercent,
    market_cap: marketCap,
  }
}

async function makePolygonRequest(endpoint: string): Promise<any> {
  if (!POLYGON_API_KEY) {
    throw new Error('Polygon API key is not configured')
  }

  const url = `https://api.polygon.io${endpoint}${endpoint.includes('?') ? '&' : '?'}apikey=${POLYGON_API_KEY}`
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(15000) // 15 second timeout
    })
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your Polygon.io API key configuration.')
      }
      if (response.status === 403) {
        throw new Error('Access forbidden. Please check your Polygon.io subscription plan.')
      }
      if (response.status === 429) {
        throw new Error('API rate limit exceeded. Please try again later.')
      }
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    
    if (data.status === 'ERROR') {
      throw new Error(data.error || 'API returned an error')
    }
    
    return data
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Network error occurred while fetching data')
  }
}

// Fetch snapshot gainers/losers from Polygon
async function fetchSnapshot(type: 'gainers' | 'losers'): Promise<any[]> {
  const endpoint = `/v2/snapshot/locale/us/markets/stocks/${type}`
  const data = await makePolygonRequest(endpoint)
  // Polygon returns { tickers: [...] }
  const items = data?.tickers ?? []
  return Array.isArray(items) ? items : []
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'gainers' // Default to gainers

    if (!POLYGON_API_KEY) {
      console.error('Polygon API key is not configured')
      return NextResponse.json(
        { error: 'Polygon API key is not configured', status: 'ERROR', results: [], count: 0 },
        { status: 500 }
      )
    }

    // Validate type parameter
    if (type !== 'gainers' && type !== 'losers') {
      console.error(`Invalid type parameter: ${type}`)
      return NextResponse.json(
        { error: 'Invalid type parameter. Must be "gainers" or "losers"', status: 'ERROR', results: [], count: 0 },
        { status: 400 }
      )
    }

    // Fetch real market-wide snapshot top movers from Polygon
    if (process.env.NODE_ENV !== 'production') console.log(`🔍 Fetching Polygon Snapshot ${type}...`)
    const snapshotItems = await fetchSnapshot(type as 'gainers' | 'losers')
    if (process.env.NODE_ENV !== 'production') console.log(`📊 Received ${snapshotItems.length} snapshot items from Polygon`)

    // Transform and filter
    const transformedResults = snapshotItems
      .map((item) => transformSnapshotItem(item))
      .filter((s): s is StockData => s !== null)

    if (process.env.NODE_ENV !== 'production') console.log(`🔄 Transformed ${snapshotItems.length} snapshot items into ${transformedResults.length} valid stocks`)

    let workingResults = transformedResults

    // If snapshot is empty or transforms to zero, attempt grouped fallback
    if (snapshotItems.length === 0 || transformedResults.length === 0) {
      if (process.env.NODE_ENV !== 'production') console.warn('Snapshot data insufficient; attempting grouped aggregates fallback')
      const marketState = await fetchMarketStatus()
      // Choose date: if market open, use today; else use yesterday
      const now = new Date()
      const dateForGrouped = new Date(now)
      if (marketState !== 'open') {
        dateForGrouped.setDate(dateForGrouped.getDate() - 1)
      }
      const iso = dateForGrouped.toISOString().slice(0, 10)
      try {
        const grouped = await fetchGroupedMovers(type as 'gainers' | 'losers', iso)
        if (grouped.length > 0) {
          workingResults = grouped
          if (process.env.NODE_ENV !== 'production') console.log(`✅ Fallback (grouped) produced ${grouped.length} results for ${type} on ${iso}`)
        }
      } catch (e) {
        if (process.env.NODE_ENV !== 'production') console.error('Grouped fallback failed:', e)
      }
    }

    // Snapshot already returns sorted by todaysChangePerc, but we sort defensively
    const sortedResults = workingResults.sort((a, b) => {
      return type === 'gainers'
        ? b.change_percent - a.change_percent
        : a.change_percent - b.change_percent
    })

    // Limit to top 20 for consistency with UI pagination
    const finalResults = sortedResults.slice(0, 20)

    if (process.env.NODE_ENV !== 'production') console.log(`✅ Successfully processed ${finalResults.length} ${type} from ${snapshotItems.length} snapshot items`)
    
    // Log sample data for verification
    if (process.env.NODE_ENV !== 'production' && finalResults.length > 0) {
      console.log(`📊 Sample ${type} data:`, finalResults.slice(0, 3).map(stock => ({
        ticker: stock.ticker,
        price: stock.value.toFixed(2),
        change: stock.change.toFixed(2),
        changePercent: stock.change_percent.toFixed(2) + '%'
      })))
    }
    
    const response: ApiResponse = {
      status: 'OK',
      results: finalResults,
      count: finalResults.length
    }

    return NextResponse.json(response)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('❌ Error fetching top movers:', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    })
    
    // Return structured error response
    return NextResponse.json({
      status: 'ERROR',
      results: [],
      count: 0,
      error: errorMessage
    }, { status: 500 })
  }
}
