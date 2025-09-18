export interface StockData {
  ticker: string
  name: string
  market_cap: number
  value: number
  change: number
  change_percent: number
  // Optional metadata for instrument classification
  instrument_type?: string // e.g., 'Common Stock', 'Warrant', 'Right', 'Unit', 'Preferred'
  is_derivative?: boolean // true for warrant/right/unit/preferred etc.
}

export interface MarketStatus {
  market: string
  serverTime: string
}

export interface AppState {
  gainers: StockData[]
  losers: StockData[]
  loading: boolean
  error: string | null
  marketStatus: MarketStatus | null
  gainersPage: number
  losersPage: number
}

export interface StockListProps {
  title: string
  stocks: StockData[]
  loading: boolean
  error: string | null
  onLoadMore: () => void
  hasMore: boolean
  type: 'gainers' | 'losers'
}

export interface StockCardProps {
  stock: StockData
  type?: 'gainers' | 'losers'
}

export interface MarketStatusProps {
  marketStatus: MarketStatus | null
  loading: boolean
}
