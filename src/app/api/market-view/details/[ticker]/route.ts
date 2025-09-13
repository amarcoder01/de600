import { NextRequest, NextResponse } from 'next/server'

const POLYGON_API_KEY = process.env.NEXT_PUBLIC_POLYGON_API_KEY || process.env.POLYGON_API_KEY

interface PrevAggResponse {
  ticker: string
  queryCount: number
  resultsCount: number
  adjusted: boolean
  results: {
    T: string // ticker
    v: number // volume
    vw: number // volume weighted average price
    o: number // open price (of previous session)
    c: number // close price (previous close)
    h: number // high price
    l: number // low price
    t: number // timestamp
    n: number // number of transactions
  }[]
  status: string
  request_id: string
  next_url?: string
}

interface StockDetails {
  ticker: string
  name: string
  price: number
  change: number
  changePercent: number
  previousClose: number
  isMarketClosed: boolean
}

async function makePolygonRequest(endpoint: string, params?: Record<string, string | number | boolean>): Promise<any> {
  if (!POLYGON_API_KEY) {
    throw new Error('Polygon API key is not configured')
  }
  const urlObj = new URL(`https://api.polygon.io${endpoint}`)
  urlObj.searchParams.append('apikey', POLYGON_API_KEY)
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) urlObj.searchParams.append(k, String(v))
    })
  }
  
  try {
    const response = await fetch(urlObj.toString(), { signal: AbortSignal.timeout(15000) })
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your Polygon.io API key configuration.')
      }
      if (response.status === 403) {
        throw new Error('Access forbidden. Please check your Polygon.io subscription plan.')
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

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  try {
    const { ticker } = params

    if (!POLYGON_API_KEY) {
      return NextResponse.json(
        { error: 'Polygon API key is not configured' },
        { status: 500 }
      )
    }

    // Fetch current price (v3 last trade), previous close (v2 prev adjusted), and market status in parallel
    const [lastTrade, prevAgg, marketStatus] = await Promise.all([
      makePolygonRequest(`/v3/last_trade/${ticker}`) // { results: { p } }
        .catch(() => null),
      (makePolygonRequest(`/v2/aggs/ticker/${ticker}/prev`, { adjusted: true }) as Promise<PrevAggResponse>)
        .catch(() => null),
      makePolygonRequest(`/v1/marketstatus/now`).catch(() => null)
    ])

    // Determine current price with fallbacks
    let currentPrice = typeof lastTrade?.results?.p === 'number' ? lastTrade.results.p : 0

    if (!currentPrice || currentPrice <= 0) {
      // Fallback to snapshot day close or last trade within snapshot
      const snapshot = await makePolygonRequest(`/v2/snapshot/locale/us/markets/stocks/tickers/${ticker}`).catch(() => null)
      currentPrice = snapshot?.ticker?.day?.c || snapshot?.ticker?.lastTrade?.p || 0
    }

    // Extract previous close (adjusted)
    const prevClose = prevAgg?.results?.[0]?.c || 0

    if (!currentPrice || !prevClose) {
      return NextResponse.json(
        { error: 'Insufficient data for this stock' },
        { status: 502 }
      )
    }

    const change = currentPrice - prevClose
    const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0

    // Market closed detection: prefer Polygon marketstatus, fallback to ET window
    let isMarketClosed = false
    if (marketStatus && typeof marketStatus.market === 'string') {
      isMarketClosed = marketStatus.market !== 'open'
    } else {
      const now = new Date()
      const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
      const minutes = et.getHours() * 60 + et.getMinutes()
      const regularOpen = 9 * 60 + 30
      const regularClose = 16 * 60
      isMarketClosed = !(minutes >= regularOpen && minutes < regularClose) || et.getDay() === 0 || et.getDay() === 6
    }

    const stockDetails: StockDetails = {
      ticker: ticker.toUpperCase(),
      name: ticker.toUpperCase(), // UI replaces with list name when available
      price: currentPrice,
      change,
      changePercent,
      previousClose: prevClose,
      isMarketClosed
    }

    return NextResponse.json(stockDetails)
  } catch (error) {
    console.error('Error fetching stock details:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch stock details' },
      { status: 500 }
    )
  }
}
