export interface Stock {
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

export interface StockPrice {
  ticker: string
  queryCount: number
  resultsCount: number
  adjusted: boolean
  results: {
    T: string // ticker
    v: number // volume
    vw: number // volume weighted average price
    o: number // open price
    c: number // close price
    h: number // high price
    l: number // low price
    t: number // timestamp
    n: number // number of transactions
  }[]
  status: string
  request_id: string
  next_url?: string
}

export interface StockDetails {
  ticker: string
  name: string
  price: number
  change: number
  changePercent: number
  previousClose: number
  isMarketClosed: boolean
  // Production-ready metadata for clarity and accuracy
  asOf?: string // ISO timestamp of the price reference (server time in ET converted to ISO)
  marketState?: 'open' | 'closed' | 'extended'
  session?: 'pre' | 'regular' | 'post' | 'closed'
  isExtendedHours?: boolean
  priceSource?: 'last_trade' | 'snapshot_day_close' | 'snapshot_last_trade'
  previousCloseDate?: string // YYYY-MM-DD of the previous close in ET
  // Optional richer fields (Starter plan-compatible)
  todayOpen?: number
  todayHigh?: number
  todayLow?: number
  todayVolume?: number
  prevOpen?: number
  prevHigh?: number
  prevLow?: number
  prevVolume?: number
  vwap?: number
  high52w?: number
  low52w?: number
  bid?: number
  ask?: number
}

export interface ApiResponse<T> {
  results: T[]
  status: string
  request_id: string
  next_url?: string
  count?: number
}

export interface ApiError {
  status: string
  error: string
  message: string
  request_id: string
}

export interface AppError {
  type: 'API_ERROR' | 'NETWORK_ERROR' | 'MARKET_CLOSED'
  message: string
  details?: any
}
