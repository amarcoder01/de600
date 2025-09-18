import { NextRequest, NextResponse } from 'next/server'

interface StockDetails {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  marketCap: number
  pe: number
  eps: number
  dividendYield: number
  dividendPayoutRatio: number
  beta: number
  high52Week: number
  low52Week: number
  volume: number
  avgVolume: number
  sector: string
  industry: string
  employees: number
  founded: number
  headquarters: string
  debtToEquity: number
  currentRatio: number
  institutionalOwnership: number
  analystRating: string
  revenueGrowth: number
  profitMargin: number
  roe: number
  movingAverage50: number
  movingAverage200: number
  rsi: number
  macd: {
    macd: number
    signal: number
    histogram: number
  }
  volumeTrend: number
  aiPrediction: {
    nextDayPrice: number
    nextWeekPrice: number
    probability: number
    confidence: number
    direction: 'bullish' | 'bearish' | 'neutral'
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  try {
    const { symbol } = params

    // Generate placeholder data for demonstration purposes
    const stockDetails: StockDetails = generatePlaceholderData(symbol.toUpperCase())

    return NextResponse.json(stockDetails)

  } catch (error) {
    console.error('Error generating stock details:', error)
    return NextResponse.json(
      { error: 'Failed to generate stock details' },
      { status: 500 }
    )
  }
}

function generatePlaceholderData(symbol: string): StockDetails {
  // Base values for demonstration
  const basePrice = 100 + Math.random() * 400
  const baseChange = (Math.random() - 0.5) * 10
  const baseChangePercent = (baseChange / basePrice) * 100
  const baseMarketCap = basePrice * (1000000 + Math.random() * 9000000)
  
  // Generate realistic placeholder data
  const stockDetails: StockDetails = {
    symbol: symbol,
    name: `${symbol} Corporation`,
    price: Math.round(basePrice * 100) / 100,
    change: Math.round(baseChange * 100) / 100,
    changePercent: Math.round(baseChangePercent * 100) / 100,
    marketCap: Math.round(baseMarketCap),
    pe: Math.round((15 + Math.random() * 25) * 100) / 100,
    eps: Math.round((1 + Math.random() * 5) * 100) / 100,
    dividendYield: Math.round((Math.random() * 3) * 100) / 100,
    dividendPayoutRatio: Math.round((20 + Math.random() * 40) * 100) / 100,
    beta: Math.round((0.8 + Math.random() * 0.4) * 100) / 100,
    high52Week: Math.round((basePrice * 1.2) * 100) / 100,
    low52Week: Math.round((basePrice * 0.8) * 100) / 100,
    volume: Math.round(1000000 + Math.random() * 9000000),
    avgVolume: Math.round(2000000 + Math.random() * 8000000),
    sector: 'Technology',
    industry: 'Software',
    employees: Math.round(1000 + Math.random() * 9000),
    founded: 1980 + Math.round(Math.random() * 40),
    headquarters: 'San Francisco, CA, USA',
    debtToEquity: Math.round((0.1 + Math.random() * 0.3) * 100) / 100,
    currentRatio: Math.round((1.5 + Math.random() * 1.5) * 100) / 100,
    institutionalOwnership: Math.round((60 + Math.random() * 30) * 100) / 100,
    analystRating: getRandomAnalystRating(),
    revenueGrowth: Math.round((5 + Math.random() * 15) * 100) / 100,
    profitMargin: Math.round((10 + Math.random() * 20) * 100) / 100,
    roe: Math.round((15 + Math.random() * 15) * 100) / 100,
    movingAverage50: Math.round((basePrice * 0.98) * 100) / 100,
    movingAverage200: Math.round((basePrice * 0.95) * 100) / 100,
    rsi: Math.round(30 + Math.random() * 40),
    macd: {
      macd: Math.round((Math.random() - 0.5) * 2 * 100) / 100,
      signal: Math.round((Math.random() - 0.5) * 2 * 100) / 100,
      histogram: Math.round((Math.random() - 0.5) * 1 * 100) / 100
    },
    volumeTrend: Math.round((Math.random() - 0.5) * 20),
    aiPrediction: {
      nextDayPrice: Math.round((basePrice * (1 + (baseChangePercent / 100))) * 100) / 100,
      nextWeekPrice: Math.round((basePrice * (1 + (baseChangePercent / 100) * 5)) * 100) / 100,
      probability: Math.round(40 + Math.random() * 30),
      confidence: Math.round(60 + Math.random() * 30),
      direction: baseChangePercent > 0 ? 'bullish' : baseChangePercent < 0 ? 'bearish' : 'neutral'
    }
  }

  return stockDetails
}

function getRandomAnalystRating(): string {
  const ratings = ['Strong Buy', 'Buy', 'Hold', 'Sell', 'Strong Sell']
  return ratings[Math.floor(Math.random() * ratings.length)]
}