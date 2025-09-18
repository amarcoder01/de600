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
  change: number;
  change_percent: number;
  volume: number;
  market_cap?: number;
  primary_exchange?: string;
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

// Enhanced Stock Data with Technical and Fundamental Information
export interface AdvancedScreenerStock extends ScreenerStock {
  // Technical Indicators
  rsi?: number;
  macd?: number;
  macdSignal?: number;
  macdHistogram?: number;
  movingAverage20?: number;
  movingAverage50?: number;
  movingAverage200?: number;
  bollingerUpper?: number;
  bollingerMiddle?: number;
  bollingerLower?: number;
  
  // Volume Analysis
  volumeChange?: number;
  averageVolume?: number;
  volumeRatio?: number;
  
  // Fundamental Data
  peRatio?: number;
  pbRatio?: number;
  debtToEquity?: number;
  currentRatio?: number;
  returnOnEquity?: number;
  profitMargin?: number;
  revenueGrowth?: number;
  earningsGrowth?: number;
  
  // Performance Metrics
  yearToDateReturn?: number;
  monthToDateReturn?: number;
  beta?: number;
  volatility?: number;
  
  // Dividend Information
  dividendYield?: number;
  dividendAmount?: number;
  dividendFrequency?: string;
  
  // Additional Market Data
  sharesOutstanding?: number;
  float?: number;
  shortInterest?: number;
  shortInterestRatio?: number;
  
  // News and Sentiment
  newsCount?: number;
  sentimentScore?: number;
  
  // Insider Activity
  insiderBuying?: number;
  insiderSelling?: number;
  insiderNetActivity?: number;
}

export interface FilterCriteria {
  priceMin?: number;
  priceMax?: number;
  marketCapMin?: number;
  marketCapMax?: number;
  volumeMin?: number;
  sector?: string;
  exchange?: string;
  search?: string;
  // Server-side filtering flags
  useServerSideFiltering?: boolean;
  forceUniversalSearch?: boolean;
}

export interface PolygonTickerResponse {
  results: Stock[];
  status: string;
  request_id: string;
  count: number;
  next_url?: string;
}

export interface PolygonPriceResponse {
  ticker: string;
  queryCount: number;
  resultsCount: number;
  adjusted: boolean;
  results: {
    c: number; // close price
    h: number; // high
    l: number; // low
    n: number; // number of transactions
    o: number; // open
    t: number; // timestamp
    v: number; // volume
    vw: number; // volume weighted average price
  }[];
  status: string;
  request_id: string;
  count: number;
}

// Financial Data Interfaces
export interface FinancialData {
  ticker: string;
  period: string;
  calendarDate: string;
  reportPeriod: string;
  updated: string;
  link: string;
  finalLink: string;
  financials: {
    balanceSheet: BalanceSheetData;
    incomeStatement: IncomeStatementData;
    cashFlowStatement: CashFlowData;
  };
}

export interface BalanceSheetData {
  [key: string]: number;
  totalAssets?: number;
  totalLiabilities?: number;
  totalEquity?: number;
  currentAssets?: number;
  currentLiabilities?: number;
  totalDebt?: number;
  cashAndEquivalents?: number;
}

export interface IncomeStatementData {
  [key: string]: number;
  revenue?: number;
  grossProfit?: number;
  operatingIncome?: number;
  netIncome?: number;
  earningsPerShare?: number;
  totalExpenses?: number;
}

export interface CashFlowData {
  [key: string]: number;
  operatingCashFlow?: number;
  investingCashFlow?: number;
  financingCashFlow?: number;
  freeCashFlow?: number;
  capitalExpenditure?: number;
}

// Technical Indicators Response
export interface TechnicalIndicatorsResponse {
  ticker: string;
  queryCount: number;
  resultsCount: number;
  adjusted: boolean;
  results: {
    t: number; // timestamp
    v: number; // volume
    vw: number; // volume weighted average price
    o: number; // open
    c: number; // close
    h: number; // high
    l: number; // low
    n: number; // number of transactions
    rsi?: number;
    macd?: number;
    macd_signal?: number;
    macd_histogram?: number;
    sma_20?: number;
    sma_50?: number;
    sma_200?: number;
    bb_upper?: number;
    bb_middle?: number;
    bb_lower?: number;
  }[];
  status: string;
  request_id: string;
  count: number;
}

// News and Sentiment Data
export interface NewsArticle {
  id: string;
  publisher: {
    name: string;
    homepage_url: string;
    logo_url: string;
    favicon_url: string;
  };
  title: string;
  author: string;
  published_utc: string;
  article_url: string;
  tickers: string[];
  image_url: string;
  description: string;
  keywords: string[];
}

export interface NewsResponse {
  results: NewsArticle[];
  status: string;
  request_id: string;
  count: number;
  next_url?: string;
}

// Insider Trading Data
export interface InsiderTransaction {
  filing_date: string;
  ticker: string;
  company_name: string;
  insider_name: string;
  insider_title: string;
  owner_type: string;
  transaction_type: string;
  shares_traded: number;
  shares_owned: number;
  price_per_share: number;
  total_transaction_value: number;
}

export interface InsiderTradingResponse {
  results: InsiderTransaction[];
  status: string;
  request_id: string;
  count: number;
  next_url?: string;
}

// Analyst Ratings
export interface AnalystRating {
  ticker: string;
  company_name: string;
  analyst_name: string;
  analyst_company: string;
  rating: string;
  price_target: number;
  price_target_currency: string;
  rating_date: string;
  rating_change: string;
  price_target_change: number;
}

export interface AnalystRatingsResponse {
  results: AnalystRating[];
  status: string;
  request_id: string;
  count: number;
  next_url?: string;
}

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  key: keyof AdvancedScreenerStock;
  direction: SortDirection;
}

// Combined interface for stock screener display
export interface ScreenerStock {
  ticker: string;
  name: string;
  price?: number;
  change?: number;
  changePercent?: number;
  volume?: number;
  marketCap?: number;
  sector?: string;
  exchange?: string;
}

// Screening Results with Metadata
export interface ScreeningResults {
  stocks: AdvancedScreenerStock[];
  totalCount: number;
  hasMore: boolean;
  nextCursor?: string;
  screeningMode: 'universal' | 'loaded' | 'hybrid';
  appliedFilters: AdvancedFilterCriteria;
  executionTime: number;
  dataQuality: {
    completeData: number;
    partialData: number;
    missingData: number;
  };
}

// Market Overview Data
export interface MarketOverview {
  totalStocks: number;
  advancingStocks: number;
  decliningStocks: number;
  unchangedStocks: number;
  marketCapDistribution: {
    mega: number;
    large: number;
    mid: number;
    small: number;
    micro: number;
    nano: number;
  };
  sectorPerformance: {
    [sector: string]: {
      count: number;
      averageReturn: number;
      topPerformers: string[];
    };
  };
  volumeLeaders: string[];
  gainers: string[];
  losers: string[];
}