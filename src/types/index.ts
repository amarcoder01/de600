// Trading Data Types - Stocks Only (US Markets)
export interface Stock {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  volume: number
  marketCap: number
  pe: number
  dividend: number
  sector: string
  industry: string
  exchange: 'NYSE' | 'NASDAQ' | 'OTC'
  dayHigh: number
  dayLow: number
  fiftyTwoWeekHigh: number
  fiftyTwoWeekLow: number
  avgVolume: number
  dividendYield: number
  beta: number
  eps: number
  lastUpdated: string
}

// Authentication Types
export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  avatar?: string
  isEmailVerified: boolean
  createdAt: string
  updatedAt: string
  lastLoginAt?: string
  preferences: {
    theme: 'light' | 'dark' | 'system'
    currency: string
    timezone: string
    notifications: {
      email: boolean
      push: boolean
      sms: boolean
    }
  }
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  token: string | null
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  email: string
  password: string
  firstName: string
  lastName: string
  privacyPolicyAccepted: boolean
}

export interface AuthResponse {
  user: User
  token: string
}

// Trading Data Types - Forex
export interface Forex {
  symbol: string
  baseCurrency: string
  quoteCurrency: string
  price: number
  change: number
  changePercent: number
  volume: number
  lastUpdated: string
}

// Trading Data Types - Cryptocurrencies
export interface Crypto {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  volume: number
  marketCap: number
  circulatingSupply: number
  totalSupply: number
  lastUpdated: string
}

// Trading Data Types - Commodities
export interface Commodity {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  volume: number
  lastUpdated: string
}

// Chart Data Types
export interface CandleData {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface OHLCVData {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface LineData {
  time: number
  value: number
}

export interface VolumeData {
  time: number
  value: number
  color: string
}

// Watchlist Types - Stocks Only
export interface WatchlistItem {
  id: string
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  type: 'stock'
  exchange: 'NYSE' | 'NASDAQ' | 'OTC'
  sector: string
  industry?: string
  volume: number
  marketCap: number
  addedAt: Date
}

export interface Watchlist {
  id: string
  name: string
  items: WatchlistItem[]
  createdAt: Date
  updatedAt: Date
}

// Portfolio Types
export interface Position {
  id: string
  symbol: string
  name: string
  quantity: number
  averagePrice: number
  currentPrice: number
  marketValue: number
  unrealizedPnL: number
  unrealizedPnLPercent: number
  type: 'stock'
  exchange: 'NYSE' | 'NASDAQ' | 'OTC'
  sector: string
}

export interface Portfolio {
  id: string
  name: string
  positions: Position[]
  totalValue: number
  totalPnL: number
  totalPnLPercent: number
  cash: number
  createdAt: Date
  updatedAt: Date
}

// Order Types
export interface Order {
  id: string
  symbol: string
  type: 'market' | 'limit' | 'stop' | 'stop-limit'
  side: 'buy' | 'sell'
  quantity: number
  price?: number
  stopPrice?: number
  status: 'pending' | 'filled' | 'cancelled' | 'rejected'
  filledQuantity: number
  averagePrice: number
  createdAt: Date
  updatedAt: Date
}

// News Types
export interface NewsItem {
  id: string
  title: string
  description: string
  content: string
  url: string
  imageUrl?: string
  source: string
  publishedAt: Date
  sentiment?: SentimentScore
  relevance: number
  category: string
}

export interface SentimentScore {
  score: number // -1 to 1 (negative to positive)
  label: 'positive' | 'negative' | 'neutral'
  confidence: number // 0 to 1
}

export interface EarningsEvent {
  id: string
  symbol: string
  companyName: string
  reportDate: Date
  estimate: number
  actual: number | null
  prediction: number
  sentiment: SentimentScore
}

export interface SocialMediaSentiment {
  platform: 'twitter' | 'reddit' | 'stocktwits'
  symbol: string
  sentiment: SentimentScore
  volume: number
  trending: boolean
  topMentions: string[]
}

export interface NewsFilter {
  category?: string
  sentiment?: 'positive' | 'negative' | 'neutral'
  timeRange?: '1h' | '24h' | '7d' | '30d'
  relevance?: number
}

// Chat Types
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  metadata?: {
    symbols?: string[]
    analysis?: any
  }
}

export interface AIChatMessage extends ChatMessage {
  toolCalls?: ToolCall[]
  toolResults?: ToolResult[]
  metadata?: {
    symbols?: string[]
    confidence?: number
    riskLevel?: 'low' | 'medium' | 'high'
    timeframe?: string
    analysisType?: string
    responseType?: 'text' | 'chart' | 'table' | 'code' | 'alert' | 'strategy'
  }
}

export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export interface ToolResult {
  toolCallId: string
  content: string
  error?: string
}

export interface ChatSession {
  id: string
  title: string
  messages: AIChatMessage[]
  createdAt: Date
  updatedAt: Date
  metadata?: {
    symbols?: string[]
    tradingFocus?: boolean
    lastActivity?: Date
  }
}

// Trading Strategy Types
export interface TradingStrategy {
  symbol: string
  strategy: 'long' | 'short' | 'options' | 'swing' | 'day_trade'
  entry: number
  stopLoss: number
  targets: number[]
  timeframe: string
  confidence: number
  reasoning: string
  riskLevel: 'low' | 'medium' | 'high'
  technicalIndicators?: {
    rsi?: number
    macd?: string
    support?: number[]
    resistance?: number[]
  }
  marketConditions?: {
    trend: 'bullish' | 'bearish' | 'sideways'
    volatility: 'low' | 'medium' | 'high'
    volume: 'above_average' | 'average' | 'below_average'
  }
}

// Rich Response Types
export interface RichResponse {
  type: 'text' | 'chart' | 'table' | 'code' | 'alert' | 'strategy'
  content: string
  metadata: {
    symbols?: string[]
    confidence?: number
    riskLevel?: 'low' | 'medium' | 'high'
    timeframe?: string
    analysisType?: string
    chartData?: any
    tableData?: any
  }
}

// AI Tool Types
export interface AITool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, any>
      required: string[]
    }
  }
}

// UI State Types
export interface UIState {
  sidebarCollapsed: boolean
  theme: 'light' | 'dark' | 'system'
  activeTab: string
  notifications: Notification[]
}

export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: Date
  read: boolean
}

// User Settings Types
export interface UserSettings {
  theme: 'light' | 'dark' | 'system'
  currency: string
  timezone: string
  notifications: {
    priceAlerts: boolean
    newsAlerts: boolean
    orderUpdates: boolean
  }
  chartSettings: {
    defaultTimeframe: string
    defaultIndicators: string[]
    colorScheme: 'light' | 'dark'
  }
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Real-time Data Types
export interface RealTimeData {
  symbol: string
  price: number
  change: number
  changePercent: number
  volume: number
  timestamp: Date
}

// WebSocket Types
export interface WebSocketMessage {
  type: 'price_update' | 'order_update' | 'news_update' | 'chat_message'
  data: any
  timestamp: Date
}

// Paper Trading Types
export interface PaperTradingAccount {
  id: string
  userId: string
  name: string
  initialBalance: number
  currentBalance: number
  availableCash: number
  totalValue: number
  totalPnL: number
  totalPnLPercent: number
  isActive: boolean
  positions: PaperPosition[]
  orders: PaperOrder[]
  transactions: PaperTransaction[]
  createdAt: Date
  updatedAt: Date
}

export interface PaperPosition {
  id: string
  accountId: string
  symbol: string
  name: string
  quantity: number
  averagePrice: number
  currentPrice: number
  marketValue: number
  unrealizedPnL: number
  unrealizedPnLPercent: number
  type: string
  exchange?: string
  sector?: string
  entryDate: Date
  lastUpdated: Date
}

export interface PaperOrder {
  id: string
  accountId: string
  symbol: string
  type: 'market' | 'limit' | 'stop' | 'stop-limit'
  side: 'buy' | 'sell'
  quantity: number
  price?: number
  stopPrice?: number
  status: 'pending' | 'filled' | 'cancelled' | 'rejected'
  filledQuantity: number
  averagePrice?: number
  commission: number
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface PaperTransaction {
  id: string
  accountId: string
  orderId?: string
  symbol: string
  type: 'buy' | 'sell' | 'dividend' | 'deposit' | 'withdrawal'
  quantity?: number
  price?: number
  amount: number
  commission: number
  description?: string
  timestamp: Date
}

export interface PaperTradingStats {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  winRate: number
  averageWin: number
  averageLoss: number
  profitFactor: number
  maxDrawdown: number
  sharpeRatio: number
  totalReturn: number
  annualizedReturn: number
}

export interface PaperTradingPerformance {
  dailyReturns: { date: string; return: number }[]
  monthlyReturns: { month: string; return: number }[]
  yearlyReturns: { year: string; return: number }[]
  drawdown: { date: string; drawdown: number }[]
  volatility: number
  beta: number
  alpha: number
}

// Price Alert Types
export interface PriceAlert {
  id: string
  userId: string
  symbol: string
  targetPrice: number
  condition: 'above' | 'below'
  userEmail: string
  status: 'active' | 'triggered' | 'cancelled'
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  triggeredAt?: Date
  lastChecked?: Date
  currentPrice?: number
  assetName?: string
}

export interface PriceAlertHistory {
  id: string
  alertId: string
  action: 'created' | 'triggered' | 'cancelled' | 'checked'
  price?: number
  message?: string
  timestamp: Date
}

export interface CreatePriceAlertRequest {
  symbol: string
  targetPrice: number
  condition: 'above' | 'below'
  userEmail: string
}

export interface PriceAlertNotification {
  alertId: string
  symbol: string
  targetPrice: number
  currentPrice: number
  condition: 'above' | 'below'
  message: string
  userEmail: string
}

// Top Movers Types
export * from './top-movers'

// Market View Types
export * from './market-view'