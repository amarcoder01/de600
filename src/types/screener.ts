// Stock data interfaces based on Polygon.io API

export interface Stock {
  ticker: string;
  name: string;
  market: string;
  locale: string;
  primary_exchange: string;
  type: string;
  active: boolean;
  currency_name: string;
  cik?: string;
  composite_figi?: string;
  share_class_figi?: string;
  last_updated_utc: string;
  sic_code?: string;
  sic_description?: string;
}

export interface StockPrice {
  ticker: string;
  name?: string;
  price: number;
  change?: number;
  change_percent?: number;
  volume?: number;
  market_cap?: number;
  primary_exchange?: string;
  // Indicates that change/change_percent were reliably computed.
  // When false or absent, callers may treat change fields as unavailable.
  has_change?: boolean;
}

// Screener-specific stock interface
export interface ScreenerStock {
  ticker: string;
  name: string;
  price?: number;
  change?: number;
  change_percent?: number;
  volume?: number;
  market_cap?: number;
  sector?: string;
  exchange?: string;
  last_updated?: string;
}

// Filter criteria for the screener
export interface FilterCriteria {
  search: string;
  priceMin?: number;
  priceMax?: number;
  marketCapMin?: number;
  marketCapMax?: number;
  volumeMin?: number;
  sector: string;
  exchange: string;
}

// Sort configuration
export interface SortConfig {
  field: keyof ScreenerStock;
  direction: 'asc' | 'desc';
}

// Advanced Filter Criteria for Universal Screening
export interface AdvancedFilterCriteria {
  // Basic Filters
  search?: string;
  priceMin?: number;
  priceMax?: number;
  marketCapMin?: number;
  marketCapMax?: number;
  volumeMin?: number;
  sector?: string;
  exchange?: string;
  
  // Advanced Price Filters
  priceChangeMin?: number;
  priceChangeMax?: number;
  priceChangePercentMin?: number;
  priceChangePercentMax?: number;
  
  // Technical Indicators
  rsiMin?: number;
  rsiMax?: number;
  macdSignal?: 'bullish' | 'bearish' | 'neutral';
  movingAverageSignal?: 'above_20ma' | 'below_20ma' | 'above_50ma' | 'below_50ma' | 'above_200ma' | 'below_200ma';
  bollingerBandPosition?: 'upper' | 'middle' | 'lower' | 'outside';
  
  // Volume Analysis
  volumeChangeMin?: number;
  volumeChangeMax?: number;
  unusualVolume?: boolean;
  
  // Fundamental Filters
  peRatioMin?: number;
  peRatioMax?: number;
  pbRatioMin?: number;
  pbRatioMax?: number;
  debtToEquityMax?: number;
  currentRatioMin?: number;
  returnOnEquityMin?: number;
  profitMarginMin?: number;
  
  // Market Cap Categories
  marketCapCategory?: 'mega' | 'large' | 'mid' | 'small' | 'micro' | 'nano';
  
  // Performance Filters
  yearToDateReturnMin?: number;
  yearToDateReturnMax?: number;
  monthToDateReturnMin?: number;
  monthToDateReturnMax?: number;
  
  // Volatility Filters
  betaMin?: number;
  betaMax?: number;
  volatilityMin?: number;
  volatilityMax?: number;
  
  // Dividend Filters
  dividendYieldMin?: number;
  dividendYieldMax?: number;
  hasDividend?: boolean;
  
  // Growth Filters
  revenueGrowthMin?: number;
  earningsGrowthMin?: number;
  
  // Screening Mode
  screeningMode?: 'universal' | 'loaded' | 'hybrid';
  
  // Server-side filtering flags
  useServerSideFiltering?: boolean;
  forceUniversalSearch?: boolean;
}

// API Response interfaces
export interface PolygonTickerResponse {
  results: Stock[];
  status: string;
  request_id: string;
  count: number;
  next_url?: string;
}

// Polygon API price response format
export interface PolygonPriceResult {
  c: number; // close price
  h: number; // high price
  l: number; // low price
  n: number; // number of transactions
  o: number; // open price
  t: number; // timestamp
  v: number; // volume
  vw: number; // volume weighted average price
}

export interface PolygonPriceResponse {
  results: PolygonPriceResult[];
  status: string;
  request_id: string;
  count: number;
  next_url?: string;
}

export interface BatchProgressCallback {
  (current: number, total: number, message: string): void;
}

export interface FetchResult {
  stocks: ScreenerStock[];
  hasMore: boolean;
  nextCursor?: string;
}

// Market cap categories
export const MARKET_CAP_CATEGORIES = {
  mega: { min: 200000000000, label: 'Mega Cap (>$200B)' },
  large: { min: 10000000000, max: 200000000000, label: 'Large Cap ($10B-$200B)' },
  mid: { min: 2000000000, max: 10000000000, label: 'Mid Cap ($2B-$10B)' },
  small: { min: 300000000, max: 2000000000, label: 'Small Cap ($300M-$2B)' },
  micro: { min: 50000000, max: 300000000, label: 'Micro Cap ($50M-$300M)' },
  nano: { max: 50000000, label: 'Nano Cap (<$50M)' }
} as const;

// Popular sectors
export const POPULAR_SECTORS = [
  'Technology',
  'Healthcare',
  'Financial Services',
  'Consumer Cyclical',
  'Communication Services',
  'Industrials',
  'Consumer Defensive',
  'Energy',
  'Basic Materials',
  'Real Estate',
  'Utilities'
] as const;

// Popular exchanges
export const POPULAR_EXCHANGES = [
  'XNAS', // NASDAQ
  'XNYS', // NYSE
  'XASE', // AMEX
  'ARCX'  // ARCA
] as const;

// Screening results with metadata
export interface ScreeningResults {
  stocks: ScreenerStock[];
  totalCount: number;
  hasMore: boolean;
  nextCursor?: string;
  appliedFilters: AdvancedFilterCriteria;
  executionTime: number;
  dataQuality: {
    completeness: number; // 0-1 ratio of complete data
    freshness: number; // timestamp of data freshness
    accuracy: number; // 0-1 estimated accuracy
  };
}

// Sort direction type
export type SortDirection = 'asc' | 'desc';
