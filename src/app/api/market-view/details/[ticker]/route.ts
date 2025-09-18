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

function getETYMD(epochMs: number): { y: number; m: number; d: number; weekdayIndex: number } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  })
  const parts = fmt.formatToParts(new Date(epochMs))
  const get = (type: string) => parts.find(p => p.type === type)?.value
  const y = Number(get('year'))
  const m = Number(get('month'))
  const d = Number(get('day'))
  const weekdayStr = get('weekday') || 'Sun'
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  const weekdayIndex = map[weekdayStr] ?? 0
  return { y, m, d, weekdayIndex }
}

function toDateString(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function prevBusinessDayET(ymd: { y: number; m: number; d: number; weekdayIndex: number }): { y: number; m: number; d: number; weekdayIndex: number } {
  // Construct a UTC Date from Y-M-D, subtract days, then re-evaluate ET parts to get correct weekday
  const dt = new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d))
  
  // Calculate previous business day
  let delta = 1
  if (ymd.weekdayIndex === 1) { // Monday -> go back to Friday (3 days)
    delta = 3
  } else if (ymd.weekdayIndex === 0) { // Sunday -> go back to Friday (2 days)
    delta = 2
  }
  
  dt.setUTCDate(dt.getUTCDate() - delta)
  const result = getETYMD(dt.getTime())
  
  console.log(`📅 prevBusinessDayET: ${ymd.y}-${ymd.m}-${ymd.d} (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][ymd.weekdayIndex]}) -> ${result.y}-${result.m}-${result.d} (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][result.weekdayIndex]})`)
  
  return result
}

function toEpochMs(ts: number | undefined): number | undefined {
  if (!ts || ts <= 0) return undefined
  // Heuristic: ns ~ 1e18, us ~ 1e15, ms ~ 1e12 range
  if (ts > 1e17) return Math.floor(ts / 1e6) // ns -> ms
  if (ts > 1e14) return Math.floor(ts / 1e3) // us -> ms
  return ts // already ms
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

// Simple in-memory cache for 52-week stats (per server instance)
type CacheEntry = { high52w: number; low52w: number; ts: number }
const yearStatsCache = new Map<string, CacheEntry>()
const YEAR_STATS_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const { ticker } = params
  
  try {

    if (!POLYGON_API_KEY) {
      return NextResponse.json(
        { error: 'Polygon API key is not configured' },
        { status: 500 }
      )
    }

    // Fetch current price (v3 last trade), previous close (v2 prev adjusted), and market status in parallel
    console.log(`🔍 Fetching data for ${ticker}...`)
    const [lastTrade, marketStatus, snapshot] = await Promise.all([
      makePolygonRequest(`/v3/last_trade/${ticker}`) // { results: { p, t } }
        .catch((error) => {
          console.log(`⚠️ Failed to fetch last trade for ${ticker}:`, error.message)
          return null
        }),
      makePolygonRequest(`/v1/marketstatus/now`).catch((error) => {
        console.log(`⚠️ Failed to fetch market status:`, error.message)
        return null
      }),
      makePolygonRequest(`/v2/snapshot/locale/us/markets/stocks/tickers/${ticker}`).catch((error) => {
        console.log(`⚠️ Failed to fetch snapshot for ${ticker}:`, error.message)
        return null
      })
    ])
    
    console.log(`📊 API responses for ${ticker}:`, {
      lastTrade: lastTrade ? 'success' : 'failed',
      marketStatus: marketStatus ? 'success' : 'failed', 
      snapshot: snapshot ? 'success' : 'failed'
    })

    // Determine current price optimized for Starter plan: prefer snapshot lastTrade, then v3 last_trade, then snapshot day close
    let currentPrice = 0
    let lastTradeTs: number | undefined = undefined
    
    // Debug logging for price detection
    console.log(`🔍 Price detection for ${ticker}:`, {
      snapshotLastTrade: snapshot?.ticker?.lastTrade?.p,
      lastTradeResult: lastTrade?.results?.p,
      snapshotDayClose: snapshot?.ticker?.day?.c
    })
    
    if (snapshot?.ticker?.lastTrade?.p) {
      currentPrice = snapshot.ticker.lastTrade.p
      lastTradeTs = typeof snapshot?.ticker?.lastTrade?.t === 'number' ? toEpochMs(snapshot.ticker.lastTrade.t) : undefined
      console.log(`✅ Using snapshot lastTrade price: ${currentPrice}`)
    } else if (typeof lastTrade?.results?.p === 'number') {
      currentPrice = lastTrade.results.p
      lastTradeTs = typeof lastTrade?.results?.t === 'number' ? toEpochMs(lastTrade.results.t) : undefined
      console.log(`✅ Using v3 lastTrade price: ${currentPrice}`)
    } else if (snapshot?.ticker?.day?.c) {
      currentPrice = snapshot.ticker.day.c
      lastTradeTs = typeof snapshot?.ticker?.day?.t === 'number' ? toEpochMs(snapshot.ticker.day.t) : undefined
      console.log(`✅ Using snapshot day close price: ${currentPrice}`)
    } else {
      console.log(`❌ No current price found for ${ticker}`)
    }

    // If lastTradeTs is missing, we'll still compute prevClose via prev endpoint and proceed with best available data
    // Determine trading day from last trade timestamp (ET) when available
    if (!lastTradeTs) {
      const prevAgg = await (makePolygonRequest(`/v2/aggs/ticker/${ticker}/prev`, { adjusted: true }) as Promise<PrevAggResponse>).catch(() => null)
      const prevCloseFallback = prevAgg?.results?.[0]?.c || 0
      const prevCloseTsFallback = prevAgg?.results?.[0]?.t ? toEpochMs(prevAgg.results[0].t) : 0

      if (currentPrice && prevCloseFallback) {
        const change = currentPrice - prevCloseFallback
        const changePercent = prevCloseFallback > 0 ? (change / prevCloseFallback) * 100 : 0

        // Market status/session computation continues below; for now assemble metadata
        const nowMs = Date.now()
        const asOfIso = new Date(nowMs).toISOString()
        let previousCloseDate: string | undefined
        if (prevCloseTsFallback) {
          const parts = getETYMD(prevCloseTsFallback)
          previousCloseDate = toDateString(parts.y, parts.m, parts.d)
        }

        // Compute marketState/session
        const now = new Date()
        const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
        const minutes = et.getHours() * 60 + et.getMinutes()
        const weekday = et.getDay() >= 1 && et.getDay() <= 5
        const preOpen = 4 * 60
        const regularOpen = 9 * 60 + 30
        const regularClose = 16 * 60
        const postClose = 20 * 60
        let marketState: 'open' | 'closed' | 'extended' = 'closed'
        let session: 'pre' | 'regular' | 'post' | 'closed' = 'closed'
        let isMarketClosed = true
        let isExtendedHours = false
        if (marketStatus && typeof marketStatus.market === 'string') {
          if (marketStatus.market === 'open') { marketState = 'open'; isMarketClosed = false }
        }
        if (weekday) {
          if (minutes >= regularOpen && minutes < regularClose) { session = 'regular'; marketState = 'open'; isMarketClosed = false }
          else if (minutes >= preOpen && minutes < regularOpen) { session = 'pre'; marketState = 'extended'; isExtendedHours = true }
          else if (minutes >= regularClose && minutes < postClose) { session = 'post'; marketState = 'extended'; isExtendedHours = true }
        }

        const stockDetails: StockDetails = {
          ticker: ticker.toUpperCase(),
          name: ticker.toUpperCase(),
          price: currentPrice,
          change,
          changePercent,
          previousClose: prevCloseFallback,
          isMarketClosed,
          asOf: asOfIso,
          marketState,
          session,
          isExtendedHours,
          previousCloseDate
        }

        const res = NextResponse.json(stockDetails)
        res.headers.set('Cache-Control', 'no-store')
        return res
      }
      // otherwise continue; later guard will handle insufficient data
    }

    // Derive ET date components from last trade timestamp and compute previous business day in ET
    const ltParts = getETYMD(lastTradeTs ?? Date.now())
    const prevParts = prevBusinessDayET(ltParts)
    const prevDateStr = toDateString(prevParts.y, prevParts.m, prevParts.d)
    
    // Debug logging for date calculation
    console.log(`📅 Date calculation for ${ticker}:`, {
      lastTradeTs,
      lastTradeDate: ltParts,
      prevBusinessDay: prevParts,
      prevDateStr,
      currentET: new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }),
      currentUTC: new Date().toISOString(),
      lastTradeDateObj: lastTradeTs ? new Date(lastTradeTs).toLocaleString('en-US', { timeZone: 'America/New_York' }) : 'N/A'
    })

    // Prefer snapshot prevDay close if available (Starter plan)
    let prevClose = 0
    let prevCloseTs = 0
    if (snapshot?.ticker?.prevDay?.c) {
      prevClose = snapshot.ticker.prevDay.c
      // approximate timestamp as prevDate at 16:00 ET
      const repCloseEt = new Date(`${prevDateStr}T16:00:00-04:00`)
      prevCloseTs = repCloseEt.getTime()
    }

    // 2) Prefer v1 open-close if snapshot did not provide prevDay
    if (!prevClose) {
      const openClose = await makePolygonRequest(`/v1/open-close/${ticker}/${prevDateStr}`, { adjusted: true }).catch(() => null)
      if (openClose && typeof openClose.close === 'number') {
        prevClose = openClose.close
        const repCloseEt = new Date(`${prevDateStr}T16:00:00-04:00`)
        prevCloseTs = repCloseEt.getTime()
      }
    }

    // 2) Fallback to v2 daily bar (adjusted)
    if (!prevClose) {
      const daily = await makePolygonRequest(`/v2/aggs/ticker/${ticker}/range/1/day/${prevDateStr}/${prevDateStr}`, { adjusted: true }).catch(() => null)
      prevClose = daily?.results?.[0]?.c || 0
      prevCloseTs = daily?.results?.[0]?.t || 0
    }

    // 3) Fallback to prev endpoint as last resort
    if (!prevClose) {
      const prevAgg = await (makePolygonRequest(`/v2/aggs/ticker/${ticker}/prev`, { adjusted: true }) as Promise<PrevAggResponse>).catch(() => null)
      prevClose = prevAgg?.results?.[0]?.c || 0
      prevCloseTs = prevAgg?.results?.[0]?.t || 0
    }

    if (!currentPrice || !prevClose) {
      // Last resort fallbacks still must not force zero change by equating price and prevClose.
      // If price is missing but we have today's snapshot day close, use that; else respond with 502.
      if (!currentPrice && snapshot?.ticker?.day?.c) {
        currentPrice = snapshot.ticker.day.c
      }
      if (!currentPrice || !prevClose) {
        console.log(`⚠️ Insufficient data for ${ticker}, providing fallback data`)
        
        // Provide fallback data instead of failing
        const fallbackStockDetails: StockDetails = {
          ticker: ticker.toUpperCase(),
          name: ticker.toUpperCase(),
          price: currentPrice || 0,
          change: 0,
          changePercent: 0,
          previousClose: prevClose || 0,
          isMarketClosed: true,
          asOf: new Date().toISOString(),
          marketState: 'closed',
          session: 'closed',
          isExtendedHours: false,
          previousCloseDate: new Date().toISOString().split('T')[0]
        }
        
        const res = NextResponse.json(fallbackStockDetails)
        res.headers.set('Cache-Control', 'no-store')
        return res
      }
      const change = currentPrice - prevClose
      const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0
      const asOfIso = new Date(lastTradeTs ?? Date.now()).toISOString()

      // Market/session
      const now = new Date()
      const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
      const minutes = et.getHours() * 60 + et.getMinutes()
      const weekday = et.getDay() >= 1 && et.getDay() <= 5
      const preOpen = 4 * 60
      const regularOpen = 9 * 60 + 30
      const regularClose = 16 * 60
      const postClose = 20 * 60
      let marketState: 'open' | 'closed' | 'extended' = 'closed'
      let session: 'pre' | 'regular' | 'post' | 'closed' = 'closed'
      let isMarketClosed = true
      let isExtendedHours = false
      if (marketStatus && typeof marketStatus.market === 'string') {
        if (marketStatus.market === 'open') { marketState = 'open'; isMarketClosed = false }
      }
      if (weekday) {
        if (minutes >= regularOpen && minutes < regularClose) { session = 'regular'; marketState = 'open'; isMarketClosed = false }
        else if (minutes >= preOpen && minutes < regularOpen) { session = 'pre'; marketState = 'extended'; isExtendedHours = true }
        else if (minutes >= regularClose && minutes < postClose) { session = 'post'; marketState = 'extended'; isExtendedHours = true }
      }

      const stockDetails: StockDetails = {
        ticker: ticker.toUpperCase(),
        name: ticker.toUpperCase(),
        price: currentPrice,
        change,
        changePercent,
        previousClose: prevClose || 0,
        isMarketClosed,
        asOf: asOfIso,
        marketState,
        session,
        isExtendedHours,
        previousCloseDate: prevClose ? prevDateStr : undefined
      }

      const res = NextResponse.json(stockDetails)
      res.headers.set('Cache-Control', 'no-store')
      return res
    }

    const change = currentPrice - prevClose
    const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0
    
    // Debug logging for change calculation
    console.log(`💰 Change calculation for ${ticker}:`, {
      currentPrice,
      prevClose,
      change,
      changePercent: `${changePercent.toFixed(4)}%`,
      isValidChange: !isNaN(change) && !isNaN(changePercent),
      isZeroChange: change === 0 && changePercent === 0
    })
    
    // Validate change calculation
    if (isNaN(change) || isNaN(changePercent)) {
      console.error(`❌ Invalid change calculation for ${ticker}: change=${change}, changePercent=${changePercent}`)
    }
    
    // Check for suspicious zero change
    if (change === 0 && changePercent === 0 && currentPrice !== prevClose && currentPrice > 0 && prevClose > 0) {
      console.warn(`⚠️ Suspicious zero change for ${ticker}: currentPrice=${currentPrice}, prevClose=${prevClose}`)
    }

    // Market closed detection and session classification (ET)
    const now = new Date()
    const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
    const minutes = et.getHours() * 60 + et.getMinutes()
    const weekday = et.getDay() >= 1 && et.getDay() <= 5
    const preOpen = 4 * 60 // 4:00 AM
    const regularOpen = 9 * 60 + 30 // 9:30 AM
    const regularClose = 16 * 60 // 4:00 PM
    const postClose = 20 * 60 // 8:00 PM

    let marketState: 'open' | 'closed' | 'extended' = 'closed'
    let session: 'pre' | 'regular' | 'post' | 'closed' = 'closed'
    let isMarketClosed = true
    let isExtendedHours = false

    // Debug logging for market status
    console.log(`🕐 Market status check for ${ticker}:`, {
      etTime: et.toLocaleString(),
      minutes,
      weekday,
      marketStatusFromAPI: marketStatus?.market,
      preOpen,
      regularOpen,
      regularClose,
      postClose
    })

    // Use Polygon API market status as primary source, but validate with time-based logic
    if (marketStatus && typeof marketStatus.market === 'string') {
      console.log(`📊 Polygon API says market is: ${marketStatus.market}`)
      
      // For weekdays, validate the API response with time-based logic
      if (weekday) {
        if (marketStatus.market === 'open') {
          // Verify it's actually during trading hours
          if (minutes >= regularOpen && minutes < regularClose) {
            marketState = 'open'
            session = 'regular'
            isMarketClosed = false
            console.log(`✅ Market confirmed open during regular hours`)
          } else if (minutes >= preOpen && minutes < regularOpen) {
            marketState = 'extended'
            session = 'pre'
            isMarketClosed = false // Pre-market is still considered "open" for trading
            isExtendedHours = true
            console.log(`✅ Market open during pre-market`)
          } else if (minutes >= regularClose && minutes < postClose) {
            marketState = 'extended'
            session = 'post'
            isMarketClosed = false // After-hours is still considered "open" for trading
            isExtendedHours = true
            console.log(`✅ Market open during after-hours`)
          } else {
            // API says open but time suggests closed - trust the time
            marketState = 'closed'
            session = 'closed'
            isMarketClosed = true
            console.log(`⚠️ API says open but time suggests closed - using time-based logic`)
          }
        } else {
          // API says closed - validate with time
          if (weekday && minutes >= regularOpen && minutes < regularClose) {
            // Time suggests open but API says closed - this might be a data issue
            console.log(`⚠️ Time suggests market should be open but API says closed`)
          }
          marketState = 'closed'
          session = 'closed'
          isMarketClosed = true
        }
      } else {
        // Weekend - always closed
        marketState = 'closed'
        session = 'closed'
        isMarketClosed = true
        console.log(`📅 Weekend - market closed`)
      }
    } else {
      // No API status - use time-based logic only
      console.log(`📊 No API status - using time-based logic only`)
      
      if (weekday) {
        if (minutes >= regularOpen && minutes < regularClose) {
          session = 'regular'
          marketState = 'open'
          isMarketClosed = false
          console.log(`✅ Time-based: Market open during regular hours`)
        } else if (minutes >= preOpen && minutes < regularOpen) {
          session = 'pre'
          marketState = 'extended'
          isMarketClosed = false
          isExtendedHours = true
          console.log(`✅ Time-based: Market open during pre-market`)
        } else if (minutes >= regularClose && minutes < postClose) {
          session = 'post'
          marketState = 'extended'
          isMarketClosed = false
          isExtendedHours = true
          console.log(`✅ Time-based: Market open during after-hours`)
        } else {
          session = 'closed'
          marketState = 'closed'
          isMarketClosed = true
          console.log(`✅ Time-based: Market closed`)
        }
      } else {
        session = 'closed'
        marketState = 'closed'
        isMarketClosed = true
        console.log(`✅ Time-based: Weekend - market closed`)
      }
    }

    // Build metadata
    // asOf as ISO (UTC); UI renders ET from this ISO
    const asOfIso = new Date(lastTradeTs ?? Date.now()).toISOString()
    // Use the computed prevDateStr to avoid timezone ambiguity
    let previousCloseDate: string | undefined = prevDateStr
    
    // Fallback: if the calculated date seems wrong (future date), use a reasonable fallback
    const currentDate = new Date()
    const calculatedDate = new Date(prevDateStr)
    
    // Check if the calculated date is in the future or more than 7 days ago (likely wrong)
    const sevenDaysAgo = new Date(currentDate)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    if (calculatedDate > currentDate || calculatedDate < sevenDaysAgo) {
      // If calculated date is in the future or too old, use yesterday's date as fallback
      const yesterday = new Date(currentDate)
      yesterday.setDate(yesterday.getDate() - 1)
      previousCloseDate = yesterday.toISOString().split('T')[0]
      console.log(`⚠️ Calculated date ${prevDateStr} is invalid (future: ${calculatedDate > currentDate}, too old: ${calculatedDate < sevenDaysAgo}), using fallback: ${previousCloseDate}`)
    }

    // Enrich with snapshot-based stats (Starter plan)
    let todayOpen: number | undefined
    let todayHigh: number | undefined
    let todayLow: number | undefined
    let todayVolume: number | undefined
    let vwap: number | undefined
    let prevOpen: number | undefined
    let prevHigh: number | undefined
    let prevLow: number | undefined
    let prevVolume: number | undefined

    if (snapshot?.ticker?.day) {
      todayOpen = typeof snapshot.ticker.day.o === 'number' ? snapshot.ticker.day.o : undefined
      todayHigh = typeof snapshot.ticker.day.h === 'number' ? snapshot.ticker.day.h : undefined
      todayLow = typeof snapshot.ticker.day.l === 'number' ? snapshot.ticker.day.l : undefined
      todayVolume = typeof snapshot.ticker.day.v === 'number' ? snapshot.ticker.day.v : undefined
      vwap = typeof snapshot.ticker.day.vw === 'number' ? snapshot.ticker.day.vw : undefined
    }
    if (snapshot?.ticker?.prevDay) {
      prevOpen = typeof snapshot.ticker.prevDay.o === 'number' ? snapshot.ticker.prevDay.o : undefined
      prevHigh = typeof snapshot.ticker.prevDay.h === 'number' ? snapshot.ticker.prevDay.h : undefined
      prevLow = typeof snapshot.ticker.prevDay.l === 'number' ? snapshot.ticker.prevDay.l : undefined
      prevVolume = typeof snapshot.ticker.prevDay.v === 'number' ? snapshot.ticker.prevDay.v : undefined
    }

    // Compute 52-week high/low with caching (non-blocking best-effort)
    let high52w: number | undefined
    let low52w: number | undefined
    try {
      const cacheKey = ticker.toUpperCase()
      const cached = yearStatsCache.get(cacheKey)
      const nowMs = Date.now()
      if (cached && (nowMs - cached.ts) < YEAR_STATS_TTL_MS) {
        high52w = cached.high52w
        low52w = cached.low52w
      } else {
        // Determine a 365-day window ending at previous trading day
        const endParts = prevParts // previous business day parts already computed above
        const endStr = toDateString(endParts.y, endParts.m, endParts.d)
        // Start date approx 365 days earlier
        const endUtc = new Date(Date.UTC(endParts.y, endParts.m - 1, endParts.d))
        const startUtc = new Date(endUtc)
        startUtc.setUTCDate(startUtc.getUTCDate() - 365)
        const startParts = getETYMD(startUtc.getTime())
        const startStr = toDateString(startParts.y, startParts.m, startParts.d)

        const aggs = await makePolygonRequest(`/v2/aggs/ticker/${ticker}/range/1/day/${startStr}/${endStr}`, { adjusted: true }).catch(() => null)
        if (aggs?.results?.length) {
          let maxH = -Infinity
          let minL = Infinity
          for (const r of aggs.results) {
            if (typeof r.h === 'number') maxH = Math.max(maxH, r.h)
            if (typeof r.l === 'number') minL = Math.min(minL, r.l)
          }
          if (isFinite(maxH) && isFinite(minL)) {
            high52w = maxH
            low52w = minL
            yearStatsCache.set(cacheKey, { high52w, low52w, ts: nowMs })
          }
        }
      }
    } catch (_) {
      // Non-critical; ignore errors for 52w
    }

    // Final validation and fallback for zero changes
    let finalChange = change
    let finalChangePercent = changePercent
    
    // Production-ready validation for zero changes
    if (change === 0 && changePercent === 0) {
      // Check if this is a legitimate zero change (same prices)
      if (Math.abs(currentPrice - prevClose) < 0.01 && currentPrice > 0 && prevClose > 0) {
        console.log(`✅ Legitimate zero change for ${ticker}: currentPrice=${currentPrice}, prevClose=${prevClose}`)
        finalChange = 0
        finalChangePercent = 0
      } else if (currentPrice !== prevClose && currentPrice > 0 && prevClose > 0) {
        // Recalculate if prices are different but change is zero
        console.log(`🔄 Recalculating change for ${ticker}: currentPrice=${currentPrice}, prevClose=${prevClose}`)
        finalChange = currentPrice - prevClose
        finalChangePercent = (finalChange / prevClose) * 100
        console.log(`🔄 Recalculated: change=${finalChange}, changePercent=${finalChangePercent}%`)
      } else {
        // Try to get data from snapshot
        if (snapshot?.ticker) {
          const snapshotChange = snapshot.ticker.todaysChange
          const snapshotChangePercent = snapshot.ticker.todaysChangePerc
          
          if (snapshotChange !== undefined && snapshotChangePercent !== undefined) {
            console.log(`📊 Using snapshot change data: change=${snapshotChange}, changePercent=${snapshotChangePercent}%`)
            finalChange = snapshotChange
            finalChangePercent = snapshotChangePercent
          }
        }
      }
    }

    const stockDetails: StockDetails = {
      ticker: ticker.toUpperCase(),
      name: ticker.toUpperCase(), // UI replaces with list name when available
      price: currentPrice,
      change: finalChange,
      changePercent: finalChangePercent,
      previousClose: prevClose,
      isMarketClosed,
      asOf: asOfIso,
      marketState,
      session,
      isExtendedHours,
      previousCloseDate,
      todayOpen,
      todayHigh,
      todayLow,
      todayVolume,
      prevOpen,
      prevHigh,
      prevLow,
      prevVolume,
      vwap,
      high52w,
      low52w
    }
    
    console.log(`✅ Final stock details for ${ticker}:`, {
      price: stockDetails.price,
      change: stockDetails.change,
      changePercent: `${stockDetails.changePercent}%`,
      previousClose: stockDetails.previousClose,
      marketState: stockDetails.marketState,
      session: stockDetails.session,
      isMarketClosed: stockDetails.isMarketClosed
    })

    const res = NextResponse.json(stockDetails)
    // Reduce cache during validation to avoid stale responses
    res.headers.set('Cache-Control', 'no-store')
    return res
  } catch (error) {
    console.error(`❌ Error fetching stock details for ${ticker}:`, error)
    
    // Provide fallback data instead of failing completely
    const fallbackStockDetails: StockDetails = {
      ticker: ticker.toUpperCase(),
      name: ticker.toUpperCase(),
      price: 0,
      change: 0,
      changePercent: 0,
      previousClose: 0,
      isMarketClosed: true,
      asOf: new Date().toISOString(),
      marketState: 'closed',
      session: 'closed',
      isExtendedHours: false,
      previousCloseDate: new Date().toISOString().split('T')[0]
    }
    
    console.log(`🔄 Returning fallback data for ${ticker} due to error`)
    return NextResponse.json(fallbackStockDetails)
  }
}
