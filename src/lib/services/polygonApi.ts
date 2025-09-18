interface PolygonTickerResponse {
  results?: Array<{
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
  }>;
  status: string;
  count: number;
  next_url?: string;
}

interface PolygonTickerDetailsResponse {
  results?: {
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
    // Additional details that might include industry/sector info
    description?: string;
    homepage_url?: string;
    total_employees?: number;
    list_date?: string;
    branding?: {
      logo_url?: string;
      icon_url?: string;
    };
    share_class_shares_outstanding?: number;
    weighted_shares_outstanding?: number;
    market_cap?: number;
    phone_number?: string;
    address?: {
      address1?: string;
      city?: string;
      state?: string;
      postal_code?: string;
    };
    sic_code?: string;
    sic_description?: string;
  };
  status: string;
}

interface PolygonQuoteResponse {
  results?: {
    c: number; // close
    h: number; // high
    l: number; // low
    o: number; // open
    v: number; // volume
    vw: number; // volume weighted average price
    t: number; // timestamp
  };
  status: string;
  ticker: string;
}

interface PolygonGroupedDailyResponse {
  results?: Array<{
    T: string; // ticker
    c: number; // close
    h: number; // high
    l: number; // low
    o: number; // open
    v: number; // volume
    vw: number; // volume weighted average price
    t: number; // timestamp
  }>;
  status: string;
  resultsCount: number;
}

export class PolygonApiService {
  private apiKey: string;
  private baseUrl = 'https://api.polygon.io';
  private lastRequestTime = 0;
  private readonly MIN_REQUEST_INTERVAL = 50; // Minimal delay for paid plan (unlimited requests)

  constructor() {
    this.apiKey = process.env.POLYGON_API_KEY || process.env.NEXT_PUBLIC_POLYGON_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('Polygon API key is required');
    }
  }

  private async makeRequest<T>(endpoint: string, retryCount = 0): Promise<T> {
    // Rate limiting: ensure minimum time between requests
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      await new Promise(resolve => setTimeout(resolve, this.MIN_REQUEST_INTERVAL - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();

    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      // Handle rate limiting (should not happen on paid plan, but handle gracefully)
      if (response.status === 429 && retryCount < 1) { 
        console.warn(`Unexpected rate limit on paid plan - checking after 1 second`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.makeRequest<T>(endpoint, retryCount + 1);
      }
      
      throw new Error(`Polygon API error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  async getStockTickers(limit: number = 100, cursor?: string): Promise<PolygonTickerResponse> {
    let endpoint = `/v3/reference/tickers?market=stocks&active=true&limit=${limit}&apikey=${this.apiKey}`;
    if (cursor) {
      endpoint += `&cursor=${cursor}`;
    }
    return this.makeRequest<PolygonTickerResponse>(endpoint);
  }

  async getStockQuote(symbol: string): Promise<PolygonQuoteResponse> {
    const endpoint = `/v2/aggs/ticker/${symbol}/prev?adjusted=true&apikey=${this.apiKey}`;
    return this.makeRequest<PolygonQuoteResponse>(endpoint);
  }

  async getGroupedDaily(date?: string): Promise<PolygonGroupedDailyResponse> {
    const targetDate = date || this.getPreviousBusinessDay();
    const endpoint = `/v2/aggs/grouped/locale/us/market/stocks/${targetDate}?adjusted=true&apikey=${this.apiKey}`;
    return this.makeRequest<PolygonGroupedDailyResponse>(endpoint);
  }

  async getMarketStatus(): Promise<any> {
    const endpoint = `/v1/marketstatus/now?apikey=${this.apiKey}`;
    return this.makeRequest(endpoint);
  }

  private getPreviousBusinessDay(): string {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    
    // If it's weekend, go to Friday
    while (date.getDay() === 0 || date.getDay() === 6) {
      date.setDate(date.getDate() - 1);
    }
    
    return date.toISOString().split('T')[0];
  }

  async searchTickers(search: string): Promise<PolygonTickerResponse> {
    const endpoint = `/v3/reference/tickers?search=${encodeURIComponent(search)}&market=stocks&active=true&limit=50&apikey=${this.apiKey}`;
    return this.makeRequest<PolygonTickerResponse>(endpoint);
  }

  async getTickerDetails(symbol: string): Promise<PolygonTickerDetailsResponse> {
    const endpoint = `/v3/reference/tickers/${symbol}?apikey=${this.apiKey}`;
    return this.makeRequest<PolygonTickerDetailsResponse>(endpoint);
  }
}
