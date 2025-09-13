import { NextRequest, NextResponse } from 'next/server'
import type { StockDetails } from '@/types/market-view'

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
    let priceSource: 'last_trade' | 'snapshot_day_close' | 'snapshot_last_trade' | undefined = currentPrice ? 'last_trade' : undefined

    if (!currentPrice || currentPrice <= 0) {
      // Fallback to snapshot day close or last trade within snapshot
      const snapshot = await makePolygonRequest(`/v2/snapshot/locale/us/markets/stocks/tickers/${ticker}`).catch(() => null)
      if (snapshot?.ticker?.day?.c) {
        currentPrice = snapshot.ticker.day.c
        priceSource = 'snapshot_day_close'
      } else if (snapshot?.ticker?.lastTrade?.p) {
        currentPrice = snapshot.ticker.lastTrade.p
        priceSource = 'snapshot_last_trade'
      } else {
        currentPrice = 0
      }
    }

    // Extract previous close (adjusted)
    const prevClose = prevAgg?.results?.[0]?.c || 0
    const prevCloseTs = prevAgg?.results?.[0]?.t

    if (!currentPrice || !prevClose) {
      return NextResponse.json(
        { error: 'Insufficient data for this stock' },
        { status: 502 }
      )
    }

    const change = currentPrice - prevClose
    const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0

    // Market closed detection and session classification (ET)
    const now = new Date()
    const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
    const minutes = et.getHours() * 60 + et.getMinutes()
    const weekday = et.getDay() >= 1 && et.getDay() <= 5
    const preOpen = 4 * 60 // 4:00
    const regularOpen = 9 * 60 + 30 // 9:30
    const regularClose = 16 * 60 // 16:00
    const postClose = 20 * 60 // 20:00

    let marketState: 'open' | 'closed' | 'extended' = 'closed'
    let session: 'pre' | 'regular' | 'post' | 'closed' = 'closed'
    let isMarketClosed = true
    let isExtendedHours = false

    if (marketStatus && typeof marketStatus.market === 'string') {
      // Use Polygon signal first
      if (marketStatus.market === 'open') {
        marketState = 'open'
        isMarketClosed = false
      } else {
        marketState = 'closed'
        isMarketClosed = true
      }
    }

    // Derive session and extended hours using ET time window as a reliable fallback/enhancement
    if (weekday) {
      if (minutes >= regularOpen && minutes < regularClose) {
        session = 'regular'
        marketState = 'open'
        isMarketClosed = false
      } else if (minutes >= preOpen && minutes < regularOpen) {
        session = 'pre'
        marketState = 'extended'
        isMarketClosed = true
        isExtendedHours = true
      } else if (minutes >= regularClose && minutes < postClose) {
        session = 'post'
        marketState = 'extended'
        isMarketClosed = true
        isExtendedHours = true
      } else {
        session = 'closed'
        // keep marketState as computed above
        isMarketClosed = true
      }
    }

    // Build metadata
    const asOfIso = new Date(et.getTime() - et.getTimezoneOffset() * 60000).toISOString()
    let previousCloseDate: string | undefined
    if (typeof prevCloseTs === 'number' && prevCloseTs > 0) {
      const prevEt = new Date(new Date(prevCloseTs).toLocaleString('en-US', { timeZone: 'America/New_York' }))
      const yyyy = prevEt.getFullYear()
      const mm = String(prevEt.getMonth() + 1).padStart(2, '0')
      const dd = String(prevEt.getDate()).padStart(2, '0')
      previousCloseDate = `${yyyy}-${mm}-${dd}`
    }

    const stockDetails: StockDetails = {
      ticker: ticker.toUpperCase(),
      name: ticker.toUpperCase(), // UI replaces with list name when available
      price: currentPrice,
      change,
      changePercent,
      previousClose: prevClose,
      isMarketClosed,
      asOf: asOfIso,
      marketState,
      session,
      isExtendedHours,
      priceSource: priceSource,
      previousCloseDate
    }

    const res = NextResponse.json(stockDetails)
    // Cache modestly at the edge and allow stale-while-revalidate to smooth bursts
    res.headers.set('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=60')
    return res
  } catch (error) {
    console.error('Error fetching stock details:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch stock details' },
      { status: 500 }
    )
  }
}
