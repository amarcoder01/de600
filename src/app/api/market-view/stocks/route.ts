import { NextRequest, NextResponse } from 'next/server'

// Ensure this route is always dynamic and uses Node.js runtime
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

const POLYGON_API_KEY = process.env.NEXT_PUBLIC_POLYGON_API_KEY || process.env.POLYGON_API_KEY

interface Stock {
  ticker: string
  name: string
  market: string
  locale: string
  primary_exchange: string
  type: string
  active: boolean
  currency_name: string
  cik?: string
  composite_figi?: string
  share_class_figi?: string
  last_updated_utc: string
}

interface ApiResponse<T> {
  results: T[]
  status: string
  request_id: string
  next_url?: string
  count?: number
}

interface ApiError {
  status: string
  error: string
  message: string
  request_id: string
}

async function makePolygonRequest(endpoint: string, params: Record<string, string | number | boolean> = {}): Promise<any> {
  if (!POLYGON_API_KEY) {
    throw new Error('Polygon API key is not configured')
  }

  const url = new URL(`https://api.polygon.io${endpoint}`)
  
  // Add API key
  url.searchParams.append('apikey', POLYGON_API_KEY)
  
  // Add other parameters
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value.toString())
    }
  })
  
  try {
    const response = await fetch(url.toString())
    
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const cursor = searchParams.get('cursor') || undefined
    const search = searchParams.get('search') || undefined

    if (!POLYGON_API_KEY) {
      return NextResponse.json(
        { error: 'Polygon API key is not configured' },
        { status: 500 }
      )
    }

    const params: Record<string, string | number | boolean> = {
      market: 'stocks',
      active: true,
      limit
    }
    
    if (cursor) {
      params.cursor = cursor
    }
    
    if (search) {
      params.search = search
    }

    const response: ApiResponse<Stock> = await makePolygonRequest('/v3/reference/tickers', params)
    
    return NextResponse.json({
      stocks: response.results || [],
      nextCursor: response.next_url ? extractCursorFromUrl(response.next_url) : undefined,
      status: response.status,
      count: response.count
    })
  } catch (error) {
    console.error('Error fetching stocks:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch stocks data' },
      { status: 500 }
    )
  }
}

function extractCursorFromUrl(url: string): string | undefined {
  try {
    const urlObj = new URL(url)
    return urlObj.searchParams.get('cursor') || undefined
  } catch {
    return undefined
  }
}
