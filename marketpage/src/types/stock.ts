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
}

export interface StockPrice {
  ticker: string;
  queryCount: number;
  resultsCount: number;
  adjusted: boolean;
  results: {
    T: string; // ticker
    v: number; // volume
    vw: number; // volume weighted average price
    o: number; // open price
    c: number; // close price
    h: number; // high price
    l: number; // low price
    t: number; // timestamp
    n: number; // number of transactions
  }[];
  status: string;
  request_id: string;
  next_url?: string;
}

export interface StockDetails {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  isMarketClosed: boolean;
}

export interface ApiResponse<T> {
  results: T[];
  status: string;
  request_id: string;
  next_url?: string;
  count?: number;
}

export interface ApiError {
  status: string;
  error: string;
  message: string;
  request_id: string;
}

export interface AppError {
  type: 'API_ERROR' | 'NETWORK_ERROR' | 'MARKET_CLOSED';
  message: string;
  details?: any;
}

export interface EnvConfig {
  POLYGON_API_KEY: string;
  NEXT_PUBLIC_POLYGON_API_KEY?: string;
}