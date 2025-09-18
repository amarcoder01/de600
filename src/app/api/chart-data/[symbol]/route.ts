import { NextRequest, NextResponse } from 'next/server'

const POLYGON_API_KEY = process.env.POLYGON_API_KEY

interface PolygonResponse {
  results: Array<{
    t: number // timestamp
    o: number // open
    h: number // high
    l: number // low
    c: number // close
    v: number // volume
    n: number // number of transactions
    vw: number // volume weighted average price
  }>
  status: string
  request_id: string
  count: number
}

export async function GET(
  request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '1mo'
    const symbol = params.symbol.toUpperCase()

    if (!POLYGON_API_KEY) {
      return NextResponse.json(
        { error: 'Polygon API key not configured' },
        { status: 500 }
      )
    }

    // Calculate date range based on period
    const now = new Date()
    const to = now.toISOString().split('T')[0]
    
    let from: string
    let multiplier = 1
    let timespan = 'day'

    switch (period) {
      case '1d':
        from = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        multiplier = 1
        timespan = 'hour'
        break
      case '5d':
        from = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        multiplier = 1
        timespan = 'day'
        break
      case '1mo':
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        multiplier = 1
        timespan = 'day'
        break
      case '3mo':
        from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        multiplier = 1
        timespan = 'day'
        break
      case '6mo':
        from = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        multiplier = 1
        timespan = 'day'
        break
      case '1y':
        from = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        multiplier = 1
        timespan = 'day'
        break
      default:
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        multiplier = 1
        timespan = 'day'
    }

    const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${from}/${to}?adjusted=true&sort=asc&limit=5000&apiKey=${POLYGON_API_KEY}`

    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`Polygon API error: ${response.status}`)
    }

    const data: PolygonResponse = await response.json()

    if (data.status !== 'OK' || !data.results) {
      throw new Error(`Polygon API returned error: ${data.status}`)
    }

    // Transform Polygon data to our format
    const transformedData = data.results.map(item => ({
      timestamp: new Date(item.t).toISOString(),
      open: item.o,
      high: item.h,
      low: item.l,
      close: item.c,
      volume: item.v
    }))

    return NextResponse.json({
      symbol,
      period,
      data: transformedData,
      count: data.count
    })

  } catch (error) {
    console.error('Error fetching chart data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chart data' },
      { status: 500 }
    )
  }
}
