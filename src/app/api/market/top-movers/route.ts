import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

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

function getPreviousBusinessDate(reference: Date = new Date()): string {
  const d = new Date(reference)
  // Move back one day at a time until Mon-Fri
  d.setDate(d.getDate() - 1)
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() - 1)
  }
  return d.toISOString().slice(0, 10)
}

async function fetchPrevCloseOpenClose(ticker: string): Promise<number | null> {
  try {
    const date = getPreviousBusinessDate(new Date())
    const endpoint = `/v1/open-close/${encodeURIComponent(ticker)}/${date}?adjusted=true`
    const data = await makePolygonRequest(endpoint)
    const close = typeof data?.close === 'number' ? data.close : (typeof data?.c === 'number' ? data.c : null)
    return close ?? null
  } catch {
    return null
  }
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

// Cache for prev close and last trade
const priceCache = new Map<string, { prevClose?: number; lastPrice?: number; ts: number }>()
const PRICE_TTL = 60 * 1000 // 60 seconds for last trade; prev close is static but we keep same TTL for simplicity

async function fetchPrevClose(ticker: string): Promise<number | null> {
  const now = Date.now()
  const cached = priceCache.get(`prev:${ticker}`)
  if (cached && now - cached.ts < PRICE_TTL && typeof cached.prevClose === 'number') {
    return cached.prevClose
  }
  try {
    const endpoint = `/v2/aggs/ticker/${encodeURIComponent(ticker)}/prev?adjusted=true`
    const data = await makePolygonRequest(endpoint)
    const result = Array.isArray(data?.results) && data.results.length > 0 ? data.results[0] : null
    const prev = typeof result?.c === 'number' ? result.c : null
    priceCache.set(`prev:${ticker}`, { prevClose: prev ?? undefined, ts: now })
    return prev
  } catch {
    return null
  }
}

async function fetchLastTradePrice(ticker: string): Promise<number | null> {
  const now = Date.now()
  const cached = priceCache.get(`last:${ticker}`)
  if (cached && now - cached.ts < PRICE_TTL && typeof cached.lastPrice === 'number') {
    return cached.lastPrice
  }
  try {
    const endpoint = `/v2/last/trade/${encodeURIComponent(ticker)}`
    const data = await makePolygonRequest(endpoint)
    // Support multiple shapes: {results:{p}} or {results:{price}} or {last:{price}}
    const price = typeof data?.results?.p === 'number'
      ? data.results.p
      : (typeof data?.results?.price === 'number'
        ? data.results.price
        : (typeof data?.last?.price === 'number' ? data.last.price : null))
    priceCache.set(`last:${ticker}`, { lastPrice: price ?? undefined, ts: now })
    return price
  } catch {
    return null
  }
}

// Fallback: fetch per-ticker snapshot and compute price/change vs prev close
async function fetchTickerSnapshotComputed(ticker: string): Promise<{ price: number | null; prevClose: number | null; todaysChange?: number | null; todaysChangePerc?: number | null; dayOpen?: number | null } | null> {
  try {
    const endpoint = `/v2/snapshot/locale/us/markets/stocks/tickers/${encodeURIComponent(ticker)}`
    const data = await makePolygonRequest(endpoint)
    const dayClose = typeof data?.ticker?.day?.c === 'number' ? data.ticker.day.c : null
    const prevClose = typeof data?.ticker?.prevDay?.c === 'number' ? data.ticker.prevDay.c : null
    const lastTrade = typeof data?.ticker?.lastTrade?.p === 'number' ? data.ticker.lastTrade.p : null
    const price = (typeof lastTrade === 'number' && lastTrade > 0) ? lastTrade : dayClose
    const todaysChange = typeof data?.ticker?.todaysChange === 'number' ? data.ticker.todaysChange : null
    const todaysChangePerc = typeof data?.ticker?.todaysChangePerc === 'number' ? data.ticker.todaysChangePerc : null
    const dayOpen = typeof data?.ticker?.day?.o === 'number' ? data.ticker.day.o : null
    return { price: price ?? null, prevClose: prevClose ?? null, todaysChange, todaysChangePerc, dayOpen }
  } catch {
    return null
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
  const previousClose = item?.prevDay?.c ?? 0
  // Calculate change values ourselves to avoid ambiguity of todaysChangePerc units
  const calculatedChange = previousClose > 0 ? currentPrice - previousClose : (item?.todaysChange ?? 0)
  const calculatedChangePercent = previousClose > 0
    ? (calculatedChange / previousClose) * 100
    : (typeof item?.todaysChangePerc === 'number' ? item.todaysChangePerc : 0)
  const volume = item?.day?.v ?? 0

  // Extra fallback: if we still have zero change and intraday open is available, compute from day open
  if ((calculatedChange === 0 || calculatedChangePercent === 0) && typeof item?.day?.o === 'number' && item.day.o > 0 && currentPrice > 0) {
    const altChange = currentPrice - item.day.o
    const altChangePerc = (altChange / item.day.o) * 100
    // Use alt values only if non-zero and realistic
    if (isFinite(altChangePerc) && Math.abs(altChangePerc) <= 500 && altChange !== 0) {
      // overwrite local vars by reassigning via stock object below
      // we'll pass these values into the stock payload
      const stock: StockData = {
        ticker,
        name: ticker,
        value: currentPrice,
        change: altChange,
        change_percent: altChangePerc,
        market_cap: 0,
      }
      return stock
    }
  }

  // Basic validation similar to previous implementation
  if (!currentPrice || currentPrice <= 0) return null
  // Allow low-priced tickers down to $0.01 to avoid undercounting losers
  if (currentPrice < 0.01) return null
  if (Math.abs(calculatedChangePercent) > 500) return null

  // Do not estimate market cap from volume; will enrich later if possible
  const marketCap = 0

  const stock: StockData = {
    ticker,
    name: ticker,
    value: currentPrice,
    change: calculatedChange,
    change_percent: calculatedChangePercent,
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
  
  // Do not estimate market cap from volume; will enrich later if possible
  const marketCap = 0

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

// Simple in-memory cache for ticker metadata enrichment
const tickerMetaCache = new Map<string, { name?: string; market_cap?: number; shares_outstanding?: number; type?: string; ts: number }>()
const TICKER_META_TTL = 24 * 60 * 60 * 1000 // 24 hours

async function fetchTickerMeta(ticker: string): Promise<{ name?: string; market_cap?: number; shares_outstanding?: number; type?: string } | null> {
  const now = Date.now()
  const cached = tickerMetaCache.get(ticker)
  if (cached && now - cached.ts < TICKER_META_TTL) {
    return { name: cached.name, market_cap: cached.market_cap, shares_outstanding: cached.shares_outstanding, type: cached.type }
  }

  try {
    // First try the Ticker Details endpoint (more reliable for market_cap)
    const detailsEndpoint = `/v3/reference/tickers/${encodeURIComponent(ticker)}`
    const details = await makePolygonRequest(detailsEndpoint)
    const d = details?.results || details // some clients wrap results
    let name: string | undefined = typeof d?.name === 'string' ? d.name : undefined
    let market_cap: number | undefined = typeof d?.market_cap === 'number' ? d.market_cap : undefined
    let type: string | undefined = typeof d?.type === 'string' ? d.type : undefined
    let shares_outstanding: number | undefined =
      typeof d?.weighted_shares_outstanding === 'number' ? d.weighted_shares_outstanding
      : (typeof d?.share_class_shares === 'number' ? d.share_class_shares : undefined)

    // Fallback: search endpoint if details did not include market cap or name
    if (!name || typeof market_cap !== 'number') {
      const searchEndpoint = `/v3/reference/tickers?ticker=${encodeURIComponent(ticker)}&active=true&limit=1`
      const data = await makePolygonRequest(searchEndpoint)
      const result = Array.isArray(data?.results) && data.results.length > 0 ? data.results[0] : null
      if (result) {
        if (!name && typeof result.name === 'string') name = result.name
        if (typeof result.market_cap === 'number') market_cap = result.market_cap
        if (!type && typeof result.type === 'string') type = result.type
        if (!shares_outstanding) {
          if (typeof result.weighted_shares_outstanding === 'number') shares_outstanding = result.weighted_shares_outstanding
          else if (typeof result.share_class_shares === 'number') shares_outstanding = result.share_class_shares
        }
      }
    }

    tickerMetaCache.set(ticker, { name, market_cap, shares_outstanding, type, ts: now })
    return { name, market_cap, shares_outstanding, type }
  } catch (e) {
    // Swallow enrichment errors silently
    return null
  }
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
    const limitedResults = sortedResults.slice(0, 20)

    // Enrich with company name, market cap, and recompute real-time change/percent using last trade and prev close
    const enriched = await Promise.allSettled(
      limitedResults.map(async (s) => {
        const [meta, prevClose, lastPrice] = await Promise.all([
          fetchTickerMeta(s.ticker),
          fetchPrevClose(s.ticker),
          fetchLastTradePrice(s.ticker),
        ])

        let price = typeof lastPrice === 'number' && lastPrice > 0 ? lastPrice : s.value
        let prev = typeof prevClose === 'number' && prevClose > 0 ? prevClose : null
        let priceIsReliable = price > 0

        // If we still can't compute change reliably, attempt a stronger prev close fallback and then snapshot
        if (!prev || !(price > 0)) {
          // Try open-close API for prev close if missing
          if (!prev) {
            const prevOC = await fetchPrevCloseOpenClose(s.ticker)
            if (typeof prevOC === 'number' && prevOC > 0) prev = prevOC
          }
          const snap = await fetchTickerSnapshotComputed(s.ticker)
          if (snap) {
            if (!prev && typeof snap.prevClose === 'number' && snap.prevClose > 0) prev = snap.prevClose
            if (!(price > 0) && typeof snap.price === 'number' && snap.price > 0) {
              price = snap.price
              priceIsReliable = true
            }
          }
        }

        // Only recompute if we have both a reliable prev close and a reliable current price
        const canRecompute = !!prev && priceIsReliable
        let change = canRecompute ? (price - (prev as number)) : s.change
        let change_percent = canRecompute ? ((change / (prev as number)) * 100) : s.change_percent

        // If we still don't have a meaningful change (zero or undefined), try to use snapshot's todaysChange fields
        if (!canRecompute) {
          const snap = await fetchTickerSnapshotComputed(s.ticker)
          if (snap) {
            if ((change === 0 || typeof change !== 'number') && typeof snap.todaysChange === 'number') {
              change = snap.todaysChange
            }
            if ((change_percent === 0 || typeof change_percent !== 'number') && typeof snap.todaysChangePerc === 'number') {
              change_percent = snap.todaysChangePerc
            }
            // As a final fallback, compute from day open if available
            if ((change === 0 || typeof change !== 'number') && typeof snap.dayOpen === 'number' && (snap.dayOpen as number) > 0 && price > 0) {
              change = price - (snap.dayOpen as number)
            }
            if ((change_percent === 0 || typeof change_percent !== 'number') && typeof snap.dayOpen === 'number' && (snap.dayOpen as number) > 0 && change !== 0) {
              change_percent = (change / (snap.dayOpen as number)) * 100
            }
            // Sanity filter: avoid extreme snapshot percent if we couldn't recompute
            if (typeof change_percent === 'number' && Math.abs(change_percent) > 100 && price > 1) {
              // If extreme and we have dayOpen, prefer dayOpen-based percent
              if (typeof snap.dayOpen === 'number' && snap.dayOpen > 0) {
                const altChange = price - snap.dayOpen
                const altPerc = (altChange / snap.dayOpen) * 100
                if (isFinite(altPerc)) {
                  change = altChange
                  change_percent = altPerc
                }
              }
            }
          }
        }
        const market_cap_final =
          (meta && typeof meta.market_cap === 'number') ? meta.market_cap
          : (meta && typeof meta.shares_outstanding === 'number' ? price * meta.shares_outstanding : s.market_cap)

        // Classify instrument type and mark derivatives
        const typeStr = meta?.type || undefined
        const nameForHeuristic = (meta?.name || s.name || '').toLowerCase()
        const tickerLower = s.ticker.toLowerCase()
        const looksLikeDerivative = (
          (typeStr && /(warrant|right|unit|preferred)/i.test(typeStr)) ||
          /\b(warrant|right|unit|preferred)\b/i.test(nameForHeuristic) ||
          /(ws|w|rt|u|pr)(\.|\b)/i.test(tickerLower)
        )

        return {
          ...s,
          value: price,
          change,
          change_percent,
          name: meta?.name || s.name,
          market_cap: market_cap_final,
          instrument_type: typeStr,
          is_derivative: looksLikeDerivative,
        }
      })
    )

    const finalResults = enriched.map((r, i) => r.status === 'fulfilled' ? r.value : limitedResults[i]).filter(Boolean) as StockData[]

    // Ensure correct classification: keep only positive movers for gainers and negative for losers
    let classified = finalResults.filter(s => type === 'gainers' ? (s.change_percent ?? 0) > 0 : (s.change_percent ?? 0) < 0)

    // If classification removes too many due to data quirks, fallback to using the pre-enrichment limitedResults signs
    if (classified.length < 10) {
      const fallbackBySign = limitedResults.filter(s => type === 'gainers' ? (s.change_percent ?? 0) > 0 : (s.change_percent ?? 0) < 0)
      // Merge unique tickers preserving enriched values where available
      const enrichedByTicker = new Map(finalResults.map(s => [s.ticker, s]))
      const merged: StockData[] = []
      for (const s of fallbackBySign) {
        merged.push(enrichedByTicker.get(s.ticker) || s)
      }
      // If still few, append remaining enriched items
      if (merged.length < 20) {
        for (const s of finalResults) {
          if (!merged.find(m => m.ticker === s.ticker)) merged.push(s)
          if (merged.length >= 20) break
        }
      }
      classified = merged
    }

    // Final sort based on recomputed change_percent
    classified.sort((a, b) => type === 'gainers' ? (b.change_percent - a.change_percent) : (a.change_percent - b.change_percent))

    // Limit to 20
    const responseResults = classified.slice(0, 20)

    if (process.env.NODE_ENV !== 'production') console.log(`✅ Successfully processed ${responseResults.length} ${type} (post-classification) from ${snapshotItems.length} snapshot items`)
    
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
      results: responseResults,
      count: responseResults.length
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
