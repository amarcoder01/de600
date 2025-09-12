import { NextRequest, NextResponse } from 'next/server'

const POLYGON_API_KEY = process.env.NEXT_PUBLIC_POLYGON_API_KEY || process.env.POLYGON_API_KEY

interface MarketStatus {
  market: string
  serverTime: string
}

async function makePolygonRequest(endpoint: string): Promise<any> {
  if (!POLYGON_API_KEY) {
    throw new Error('Polygon API key is not configured')
  }

  const url = `https://api.polygon.io${endpoint}${endpoint.includes('?') ? '&' : '?'}apikey=${POLYGON_API_KEY}`
  
  try {
    const response = await fetch(url)
    
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
    if (!POLYGON_API_KEY) {
      // Fallback when API key is not available
      const now = new Date()
      const etTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }))
      const day = etTime.getDay()
      const minutes = etTime.getHours() * 60 + etTime.getMinutes()
      
      // Market is closed on weekends
      if (day === 0 || day === 6) {
        return NextResponse.json({
          market: 'closed',
          serverTime: etTime.toISOString()
        })
      }
      
      // Extended trading hours: 4:00 AM - 8:00 PM ET (Monday-Friday)
      const preMarketOpen = 4 * 60      // 4:00 AM
      const afterHoursClose = 20 * 60   // 8:00 PM
      const isOpen = minutes >= preMarketOpen && minutes < afterHoursClose
      
      return NextResponse.json({
        market: isOpen ? 'open' : 'closed',
        serverTime: etTime.toISOString()
      })
    }

    // Get market status from Polygon API
    const marketStatusResponse = await makePolygonRequest('/v1/marketstatus/now')
    
    // Use the actual market status from Polygon API
    const marketStatus: MarketStatus = {
      market: marketStatusResponse.market || 'closed',
      serverTime: marketStatusResponse.serverTime || new Date().toISOString()
    }

    return NextResponse.json(marketStatus)
  } catch (error) {
    console.error('Error fetching market status:', error)
    
    // Fallback when API fails
    const now = new Date()
    const etTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }))
    const day = etTime.getDay()
    const minutes = etTime.getHours() * 60 + etTime.getMinutes()
    
    // Market is closed on weekends
    if (day === 0 || day === 6) {
      return NextResponse.json({
        market: 'closed',
        serverTime: etTime.toISOString()
      })
    }
    
    // Extended trading hours: 4:00 AM - 8:00 PM ET (Monday-Friday)
    const preMarketOpen = 4 * 60      // 4:00 AM
    const afterHoursClose = 20 * 60   // 8:00 PM
    const isOpen = minutes >= preMarketOpen && minutes < afterHoursClose
    
    return NextResponse.json({
      market: isOpen ? 'open' : 'closed',
      serverTime: etTime.toISOString()
    })
  }
}
