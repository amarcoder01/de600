import axios from 'axios';
import { 
  Stock, 
  StockPrice, 
  ScreenerStock, 
  FilterCriteria, 
  BatchProgressCallback,
  FetchResult,
  PolygonTickerResponse,
  PolygonPriceResponse,
  AdvancedFilterCriteria,
  ScreeningResults
} from '@/types/screener';

// Market cap tracking for comprehensive screening
class MarketCapTracker {
  private marketCapData: Map<string, number> = new Map();
  private lastUpdate: number = 0;
  private readonly UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes

  async getMarketCap(ticker: string): Promise<number | null> {
    if (this.marketCapData.has(ticker)) {
      return this.marketCapData.get(ticker) || null;
    }
    return null;
  }

  updateMarketCap(ticker: string, marketCap: number): void {
    this.marketCapData.set(ticker, marketCap);
    this.lastUpdate = Date.now();
  }

  shouldUpdate(): boolean {
    return Date.now() - this.lastUpdate > this.UPDATE_INTERVAL;
  }

  clear(): void {
    this.marketCapData.clear();
    this.lastUpdate = 0;
  }

  getTrackedCount(): number {
    return this.marketCapData.size;
  }
}

const POLYGON_BASE_URL = 'https://api.polygon.io';
// Use the same API key configuration as the main application
const API_KEY = process.env.NEXT_PUBLIC_POLYGON_API_KEY || process.env.POLYGON_API_KEY;

if (!API_KEY) {
  console.warn('Polygon.io API key not found. Please set NEXT_PUBLIC_POLYGON_API_KEY in your .env.local file.');
}

// Helper function to map SIC descriptions to sectors
function mapSicToSector(description: string): string {
  const desc = description.toLowerCase();
  
  // Technology
  if (desc.includes('software') || desc.includes('computer') || desc.includes('technology') ||
      desc.includes('internet') || desc.includes('semiconductor') || desc.includes('electronics')) {
    return 'Technology';
  }
  
  // Healthcare
  if (desc.includes('pharmaceutical') || desc.includes('medical') || desc.includes('healthcare') ||
      desc.includes('biotechnology') || desc.includes('health') || desc.includes('diagnostic') || desc.includes('research')) {
    return 'Healthcare';
  }
  
  // Financial Services
  if (desc.includes('bank') || desc.includes('financial') || desc.includes('insurance') ||
      desc.includes('investment') || desc.includes('credit') || desc.includes('securities')) {
    return 'Financial Services';
  }
  
  // Energy
  if (desc.includes('oil') || desc.includes('gas') || desc.includes('energy') ||
      desc.includes('petroleum') || desc.includes('coal') || desc.includes('renewable')) {
    return 'Energy';
  }
  
  // Consumer Cyclical
  if (desc.includes('retail') || desc.includes('consumer') || desc.includes('automotive') ||
      desc.includes('clothing') || desc.includes('household')) {
    return 'Consumer Cyclical';
  }
  
  // Industrials
  if (desc.includes('manufacturing') || desc.includes('industrial') || desc.includes('construction') ||
      desc.includes('machinery') || desc.includes('aerospace') || desc.includes('defense')) {
    return 'Industrials';
  }
  
  // Basic Materials
  if (desc.includes('mining') || desc.includes('chemical') || desc.includes('steel') ||
      desc.includes('metals') || desc.includes('paper') || desc.includes('forestry')) {
    return 'Basic Materials';
  }
  
  // Utilities
  if (desc.includes('utility') || desc.includes('electric') || desc.includes('water') ||
      desc.includes('waste management')) {
    return 'Utilities';
  }
  
  // Communication Services
  if (desc.includes('media') || desc.includes('entertainment') || desc.includes('broadcasting') ||
      desc.includes('publishing') || desc.includes('advertising')) {
    return 'Communication Services';
  }
  
  // Consumer Defensive
  if (desc.includes('food') || desc.includes('beverage') || desc.includes('tobacco') ||
      desc.includes('personal care')) {
    return 'Consumer Defensive';
  }
  
  // Real Estate
  if (desc.includes('real estate') || desc.includes('property') || desc.includes('reit')) {
    return 'Real Estate';
  }
  
  return 'Technology'; // Default fallback
}

// Exchange mapping function
function mapExchangeCode(exchangeCode?: string): string {
  if (!exchangeCode) return 'NASDAQ';
  
  const code = exchangeCode.toUpperCase();
  
  switch (code) {
    case 'XNAS':
    case 'NASDAQ':
      return 'NASDAQ';
    case 'XNYS':
    case 'NYSE':
      return 'NYSE';
    case 'ARCX':
    case 'NYSE ARCA':
      return 'NYSE Arca';
    case 'BATS':
    case 'BZX':
      return 'Cboe BZX';
    case 'IEX':
      return 'IEX';
    case 'OTC':
    case 'OTCM':
      return 'OTC Markets';
    case 'AMEX':
    case 'NYSEAMERICAN':
      return 'NYSE American';
    default:
      return exchangeCode;
  }
}

class PolygonApiService {
  private apiKey: string;
  private marketCapTracker: MarketCapTracker;
  private snapshotCache: Map<string, { builtAt: number; date: string; stocks: ScreenerStock[] }>;

  constructor() {
    this.apiKey = API_KEY || '';
    this.marketCapTracker = new MarketCapTracker();
    this.snapshotCache = new Map();
  }

  // Ensure Polygon pagination URLs always include the API key
  private withApiKey(url: string): string {
    try {
      const u = new URL(url);
      if (!u.searchParams.get('apikey')) {
        u.searchParams.set('apikey', this.apiKey);
      }
      return u.toString();
    } catch {
      // If parsing fails (shouldn't for Polygon next_url), return original
      return url;
    }
  }

  // Check if API key is available
  private hasValidApiKey(): boolean {
    return !!(this.apiKey && this.apiKey.trim() !== '' && this.apiKey !== 'your_polygon_api_key_here');
  }

  // Get stock tickers with optional filtering
  async getTickers(filters?: FilterCriteria, limit: number = 100): Promise<Stock[]> {
    if (!this.hasValidApiKey()) {
      console.warn('No valid API key available');
      throw new Error('Polygon.io API key is required for stock data');
    }

    try {
      const params: any = {
        apikey: this.apiKey,
        market: 'stocks',
        locale: 'us',
        active: true,
        limit: Math.min(limit, 1000),
        sort: 'ticker',
        order: 'asc'
      };

      if (filters?.search) {
        params.search = filters.search.trim();
      }

      if (filters?.exchange && filters.exchange !== 'all') {
        const exchangeMap: { [key: string]: string } = {
          'NASDAQ': 'XNAS',
          'NYSE': 'XNYS',
          'NYSE Arca': 'ARCX',
          'Cboe BZX': 'BATS',
          'IEX': 'IEX',
          'OTC Markets': 'OTC',
          'NYSE American': 'AMEX'
        };
        params.exchange = exchangeMap[filters.exchange] || filters.exchange;
      }

      const response = await axios.get<PolygonTickerResponse>(
        `${POLYGON_BASE_URL}/v3/reference/tickers`,
        { params }
      );

      if (!response.data.results || response.data.results.length === 0) {
        console.warn('No results returned from Polygon API');
        return [];
      }

      return response.data.results;
    } catch (error) {
      console.error('Error fetching tickers:', error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          console.error('Invalid API key. Please check your Polygon.io API configuration.');
        } else if (error.response?.status === 429) {
          console.error('API rate limit exceeded. Please try again later.');
        }
      }
      throw new Error('Failed to fetch stock tickers. Please check your API key and internet connection.');
    }
  }

  // Get current stock price for a single ticker
  async getStockPrice(ticker: string, includeFinancials: boolean = true): Promise<StockPrice> {
    if (!this.hasValidApiKey()) {
      throw new Error('Polygon.io API key is required for stock data');
    }

    try {
      // First try to get today's data if available
      const today = this.getTodayDateString();
      const isMarketOpen = await this.isUsMarketOpen();
      let price: number | undefined;
      let volume: number | undefined;
      let change: number | undefined;
      let changePercent: number | undefined;

      try {
        const todayResponse = await axios.get(
          `${POLYGON_BASE_URL}/v2/aggs/ticker/${ticker}/range/1/day/${today}/${today}`,
          {
            params: {
              adjusted: true,
              apikey: this.apiKey,
            },
            timeout: 8000
          }
        );

        if (todayResponse.data.results && todayResponse.data.results.length > 0) {
          const todayData = todayResponse.data.results[0];
          price = todayData.c; // Close price
          volume = todayData.v;
        }
      } catch (todayError) {
        console.warn(`Today's data not available for ${ticker}, using previous day`);
      }

      // If no today data, fall back to previous day
      if (price === undefined) {
        const response = await axios.get<PolygonPriceResponse>(
          `${POLYGON_BASE_URL}/v2/aggs/ticker/${ticker}/prev`,
          {
            params: {
              adjusted: true,
              apikey: this.apiKey,
            },
            timeout: 8000
          }
        );

        if (!response.data.results || response.data.results.length === 0) {
          throw new Error(`No price data available for ${ticker}`);
        }

        const result = response.data.results[0];
        price = result.c;
        volume = result.v;
        
        // For previous session data, compute session change (close - open)
        if (typeof result.o === 'number' && typeof result.c === 'number') {
          change = result.c - result.o;
          changePercent = result.o !== 0 ? (change / result.o) * 100 : 0;
        }
      }

      // Validate price data
      if (typeof price !== 'number' || isNaN(price) || price <= 0) {
        throw new Error(`Invalid price data for ${ticker}: ${price}`);
      }

      // Standardize change baseline
      try {
        if (isMarketOpen) {
          // Market open: change vs previous close
          const prevResp = await axios.get(
            `${POLYGON_BASE_URL}/v2/aggs/ticker/${ticker}/prev`,
            { params: { adjusted: true, apikey: this.apiKey }, timeout: 7000 }
          );
          const prevClose = prevResp?.data?.results?.[0]?.c;
          if (typeof prevClose === 'number' && prevClose > 0) {
            change = price - prevClose;
            changePercent = (change / prevClose) * 100;
          }
        } else {
          // Market closed: use last two daily closes (day-over-day)
          const from = this.getDateNDaysAgoString(10);
          const to = this.getTodayDateString();
          const twoDays = await axios.get(
            `${POLYGON_BASE_URL}/v2/aggs/ticker/${ticker}/range/1/day/${from}/${to}`,
            { params: { adjusted: true, apikey: this.apiKey, sort: 'desc', limit: 2 }, timeout: 8000 }
          );
          const r0 = twoDays?.data?.results?.[0]; // last completed session
          const r1 = twoDays?.data?.results?.[1]; // prior session
          const c2 = r0?.c;
          const c1 = r1?.c;
          if (typeof c2 === 'number' && c2 > 0 && typeof c1 === 'number' && c1 > 0) {
            // Ensure price reflects last completed session if not already
            if (price === undefined || price <= 0) price = c2;
            change = c2 - c1;
            changePercent = (change / c1) * 100;
          } else if (typeof c2 === 'number' && typeof c1 !== 'number') {
            // Fallback: change vs previous close if only one day available
            const prevResp = await axios.get(
              `${POLYGON_BASE_URL}/v2/aggs/ticker/${ticker}/prev`,
              { params: { adjusted: true, apikey: this.apiKey }, timeout: 7000 }
            );
            const prevClose = prevResp?.data?.results?.[0]?.c;
            if (typeof prevClose === 'number' && prevClose > 0) {
              if (price === undefined || price <= 0) price = c2;
              change = c2 - prevClose;
              changePercent = (change / prevClose) * 100;
            }
          }
        }
      } catch (baselineErr) {
        console.warn(`Baseline change computation failed for ${ticker}:`, baselineErr);
      }

      let market_cap: number | undefined = undefined;
      
      if (includeFinancials) {
        try {
          const financialData = await this.getTickerDetails(ticker, price);
          market_cap = financialData.market_cap;
        } catch (financialError) {
          console.warn(`Failed to fetch financial data for ${ticker}:`, financialError);
        }
      }

      return {
        ticker,
        price,
        change,
        change_percent: changePercent,
        volume: volume ?? 0,
        market_cap,
        has_change: typeof change === 'number' && typeof changePercent === 'number'
      };
    } catch (error) {
      console.error(`Error fetching price for ${ticker}:`, error);
      throw error;
    }
  }

  // Get intraday snapshot for accurate today's change, change %, and volume
  async getStockSnapshot(ticker: string, includeFinancials: boolean = true): Promise<StockPrice> {
    if (!this.hasValidApiKey()) {
      throw new Error('Polygon.io API key is required for stock data');
    }

    try {
      // Use the more reliable v2/aggs endpoint for current day data
      const today = new Date();
      const isWeekend = today.getDay() === 0 || today.getDay() === 6;
      const isMarketHours = await this.isUsMarketOpen();
      
      let price: number | undefined;
      let change: number | undefined;
      let change_percent: number | undefined;
      let volume: number | undefined;

      if (isMarketHours && !isWeekend) {
        // During market hours, get real-time data
        try {
          const realtimeResponse = await axios.get(
            `${POLYGON_BASE_URL}/v2/aggs/ticker/${ticker}/range/1/minute/${this.getTodayDateString()}/${this.getTodayDateString()}`,
            { 
              params: { 
                apikey: this.apiKey,
                adjusted: true,
                sort: 'desc',
                limit: 1
              }, 
              timeout: 10000 
            }
          );
          
          if (realtimeResponse.data.results && realtimeResponse.data.results.length > 0) {
            const latest = realtimeResponse.data.results[0];
            price = latest.c; // Close price of latest minute
            volume = latest.v;
          }
        } catch (realtimeError) {
          console.warn(`Real-time data failed for ${ticker}, falling back to daily data`);
        }
      }

      // If we don't have real-time data, get daily aggregated data
      if (price === undefined) {
        const dailyResponse = await axios.get(
          `${POLYGON_BASE_URL}/v2/aggs/ticker/${ticker}/range/1/day/${this.getTodayDateString()}/${this.getTodayDateString()}`,
          { 
            params: { 
              apikey: this.apiKey,
              adjusted: true
            }, 
            timeout: 10000 
          }
        );

        if (dailyResponse.data.results && dailyResponse.data.results.length > 0) {
          const todayData = dailyResponse.data.results[0];
          price = todayData.c; // Close price
          volume = todayData.v;
        }
      }

      // If still no data, get previous day data as fallback
      if (price === undefined) {
        const prevResponse = await axios.get(
          `${POLYGON_BASE_URL}/v2/aggs/ticker/${ticker}/prev`,
          {
            params: {
              adjusted: true,
              apikey: this.apiKey,
            },
            timeout: 10000
          }
        );

        if (prevResponse.data.results && prevResponse.data.results.length > 0) {
          const prevData = prevResponse.data.results[0];
          price = prevData.c;
          volume = prevData.v;
        }
      }

      // Validate we have essential data
      if (price === undefined) {
        throw new Error(`Unable to get price data for ${ticker}`);
      }

      // Standardize change baseline
      try {
        if (isMarketHours && !isWeekend) {
          // Market open: change vs previous close
          const prevCloseResponse = await axios.get(
            `${POLYGON_BASE_URL}/v2/aggs/ticker/${ticker}/prev`,
            {
              params: { adjusted: true, apikey: this.apiKey },
              timeout: 7000
            }
          );
          const prevClose = prevCloseResponse?.data?.results?.[0]?.c;
          if (typeof prevClose === 'number' && prevClose > 0) {
            change = price - prevClose;
            change_percent = (change / prevClose) * 100;
          }
        } else {
          // Market closed: use last two COMPLETED daily closes (exclude today's partial bar)
          const from = this.getDateNDaysAgoString(30);
          const to = this.getDateNDaysAgoString(1); // up to yesterday
          const twoDays = await axios.get(
            `${POLYGON_BASE_URL}/v2/aggs/ticker/${ticker}/range/1/day/${from}/${to}`,
            { params: { adjusted: true, apikey: this.apiKey, sort: 'desc', limit: 2 }, timeout: 8000 }
          );
          const r0 = twoDays?.data?.results?.[0];
          const r1 = twoDays?.data?.results?.[1];
          const c2 = r0?.c;
          const c1 = r1?.c;
          if (typeof c2 === 'number' && c2 > 0 && typeof c1 === 'number' && c1 > 0) {
            if (price === undefined || price <= 0) price = c2;
            change = c2 - c1;
            change_percent = (change / c1) * 100;
          } else if (typeof c2 === 'number') {
            const prevResp = await axios.get(
              `${POLYGON_BASE_URL}/v2/aggs/ticker/${ticker}/prev`,
              { params: { adjusted: true, apikey: this.apiKey }, timeout: 7000 }
            );
            const prevClose = prevResp?.data?.results?.[0]?.c;
            if (typeof prevClose === 'number' && prevClose > 0) {
              if (price === undefined || price <= 0) price = c2;
              change = c2 - prevClose;
              change_percent = (change / prevClose) * 100;
            }
          }
        }
      } catch (e) {
        console.warn(`Standardized change baseline failed for ${ticker}:`, e);
      }

      let market_cap: number | undefined = undefined;
      if (includeFinancials && typeof price === 'number') {
        try {
          const financialData = await this.getTickerDetails(ticker, price);
          market_cap = financialData.market_cap;
        } catch {}
      }

      return { 
        ticker, 
        price, 
        change, 
        change_percent, 
        volume, 
        market_cap,
        has_change: typeof change === 'number' && typeof change_percent === 'number'
      } as StockPrice;
    } catch (error) {
      console.error(`Error in getStockSnapshot for ${ticker}:`, error);
      // Fallback to previous session data (will include proper change vs open)
      const prev = await this.getStockPrice(ticker, includeFinancials);
      return prev as StockPrice;
    }
  }

  // Batch process stock snapshots with rate limiting
  async batchGetStockSnapshots(
    tickers: string[], 
    batchSize: number = 15, 
    delayMs: number = 1000, 
    onProgress?: (current: number, total: number, message: string) => void,
    includeFinancials: boolean = true
  ): Promise<StockPrice[]> {
    if (!this.hasValidApiKey()) {
      throw new Error('Polygon.io API key is required for stock data');
    }

    try {
      const allSnapshots: StockPrice[] = [];
      const totalBatches = Math.ceil(tickers.length / batchSize);
      
      for (let i = 0; i < tickers.length; i += batchSize) {
        const batch = tickers.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        
        if (onProgress) {
          onProgress(i, tickers.length, `Processing batch ${batchNumber}/${totalBatches}`);
        }
        
        try {
          const promises = batch.map(ticker => this.getStockSnapshot(ticker, includeFinancials));
          const results = await Promise.allSettled(promises);

          // Collect fulfilled
          const batchSnapshots: StockPrice[] = [];
          const rejectedTickers: string[] = [];
          results.forEach((res, idx) => {
            if (res.status === 'fulfilled') {
              batchSnapshots.push(res.value);
            } else {
              rejectedTickers.push(batch[idx]);
            }
          });

          // Attempt per-item fallback for rejected via previous-close API
          if (rejectedTickers.length > 0) {
            const fallbackResults = await Promise.allSettled(
              rejectedTickers.map(t => this.getStockPrice(t, includeFinancials))
            );
            fallbackResults.forEach(fr => {
              if (fr.status === 'fulfilled') batchSnapshots.push(fr.value);
            });
          }

          allSnapshots.push(...batchSnapshots);
          
          if (onProgress) {
            const completed = Math.min(i + batchSize, tickers.length);
            onProgress(completed, tickers.length, `Completed batch ${batchNumber}/${totalBatches}`);
          }
          
          if (i + batchSize < tickers.length) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        } catch (batchError) {
          console.error(`Error processing batch ${batchNumber}:`, batchError);
        }
      }
      
      return allSnapshots;
    } catch (error) {
      console.error('Error in batch snapshot fetching:', error);
      throw error;
    }
  }

  // Get ticker details for market cap calculation
  async getTickerDetails(ticker: string, currentPrice?: number): Promise<{ market_cap?: number; sic_description?: string; primary_exchange?: string }> {
    if (!this.hasValidApiKey()) {
      throw new Error('Polygon.io API key is required for stock data');
    }

    try {
      const response = await axios.get(
        `${POLYGON_BASE_URL}/v3/reference/tickers/${ticker}`,
        {
          params: {
            apikey: this.apiKey,
          },
          timeout: 10000,
        }
      );

      if (!response.data.results) {
        return {};
      }

      const result = response.data.results;
      
      // Strategy 1: Use direct market_cap if available
      if (result.market_cap && result.market_cap > 0) {
        return { 
          market_cap: result.market_cap,
          sic_description: result.sic_description,
          primary_exchange: result.primary_exchange
        };
      }
      
      // Strategy 2: Calculate using weighted_shares_outstanding * current_price
      if (result.weighted_shares_outstanding && currentPrice && currentPrice > 0) {
        const calculated_market_cap = result.weighted_shares_outstanding * currentPrice;
        return { 
          market_cap: calculated_market_cap,
          sic_description: result.sic_description,
          primary_exchange: result.primary_exchange
        };
      }
      
      // Strategy 3: Calculate using share_class_shares_outstanding * current_price
      if (result.share_class_shares_outstanding && currentPrice && currentPrice > 0) {
        const calculated_market_cap = result.share_class_shares_outstanding * currentPrice;
        return { 
          market_cap: calculated_market_cap,
          sic_description: result.sic_description,
          primary_exchange: result.primary_exchange
        };
      }
      
      return {
        sic_description: result.sic_description,
        primary_exchange: result.primary_exchange
      };
    } catch (error) {
      console.warn(`Failed to get ticker details for ${ticker}:`, error);
      return {};
    }
  }

  // Batch process stock prices with rate limiting
  async batchGetStockPrices(
    tickers: string[], 
    batchSize: number = 15, 
    delayMs: number = 1000, 
    onProgress?: (current: number, total: number, message: string) => void,
    includeFinancials: boolean = true
  ): Promise<StockPrice[]> {
    if (!this.hasValidApiKey()) {
      throw new Error('Polygon.io API key is required for stock data');
    }

    try {
      const allPrices: StockPrice[] = [];
      const totalBatches = Math.ceil(tickers.length / batchSize);
      
      for (let i = 0; i < tickers.length; i += batchSize) {
        const batch = tickers.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        
        if (onProgress) {
          onProgress(i, tickers.length, `Processing batch ${batchNumber}/${totalBatches}`);
        }
        
        try {
          const promises = batch.map(ticker => this.getStockPrice(ticker, includeFinancials));
          const results = await Promise.allSettled(promises);
          
          const batchPrices = results
            .filter((result): result is PromiseFulfilledResult<StockPrice> => result.status === 'fulfilled')
            .map(result => result.value);
          
          allPrices.push(...batchPrices);
          
          if (onProgress) {
            const completed = Math.min(i + batchSize, tickers.length);
            onProgress(completed, tickers.length, `Completed batch ${batchNumber}/${totalBatches}`);
          }
          
          if (i + batchSize < tickers.length) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        } catch (batchError) {
          console.error(`Error processing batch ${batchNumber}:`, batchError);
        }
      }
      
      return allPrices;
    } catch (error) {
      console.error('Error in batch price fetching:', error);
      throw error;
    }
  }

  // Search stocks by ticker or company name
  async searchStocks(query: string, limit: number = 50): Promise<Stock[]> {
    if (!this.hasValidApiKey()) {
      throw new Error('Polygon.io API key is required for stock data');
    }

    try {
      const params = {
        search: query.trim(),
        market: 'stocks',
        locale: 'us',
        active: true,
        limit: Math.min(limit, 1000),
        apikey: this.apiKey,
        sort: 'ticker',
        order: 'asc'
      };
      
      const response = await axios.get<PolygonTickerResponse>(
        `${POLYGON_BASE_URL}/v3/reference/tickers`,
        { params }
      );

      if (!response.data.results || response.data.results.length === 0) {
        return [];
      }

      return response.data.results;
    } catch (error) {
      console.error(`Error searching stocks for query "${query}":`, error);
      throw new Error('Failed to search stocks. Please check your API key and internet connection.');
    }
  }

  // Get all US stocks with pagination
  async getAllUSStocks(cursor?: string, limit: number = 100): Promise<{ stocks: Stock[], nextCursor?: string, hasMore: boolean }> {
    if (!this.hasValidApiKey()) {
      throw new Error('Polygon.io API key is required for stock data');
    }

    try {
      const params: any = {
        apikey: this.apiKey,
        market: 'stocks',
        locale: 'us',
        active: true,
        limit: Math.min(limit, 1000),
        sort: 'ticker',
        order: 'asc'
      };

      if (cursor) {
        params.cursor = cursor;
      }
      
      const response = await axios.get<PolygonTickerResponse>(
        `${POLYGON_BASE_URL}/v3/reference/tickers`,
        { params }
      );

      if (!response.data.results || response.data.results.length === 0) {
        return { stocks: [], hasMore: false };
      }

      let nextCursor: string | undefined;
      if (response.data.next_url) {
        const url = new URL(response.data.next_url);
        nextCursor = url.searchParams.get('cursor') || undefined;
      }

      return {
        stocks: response.data.results,
        nextCursor,
        hasMore: !!nextCursor
      };
    } catch (error) {
      console.error('Error fetching all US stocks:', error);
      throw new Error('Failed to fetch stock data. Please check your API key and internet connection.');
    }
  }

  // Universal screening method
  async getUniversalScreenerResults(
    filters: FilterCriteria,
    limit: number = 100,
    onProgress?: (current: number, total: number, message: string) => void
  ): Promise<{ stocks: ScreenerStock[], totalCount: number, hasMore: boolean }> {
    if (!this.hasValidApiKey()) {
      throw new Error('Polygon.io API key is required for stock data');
    }

    try {
      const serverParams: any = {
        apikey: this.apiKey,
        market: 'stocks',
        locale: 'us',
        active: true,
        limit: Math.min(limit, 1000),
        sort: 'ticker',
        order: 'asc'
      };

      if (filters.search?.trim()) {
        serverParams.search = filters.search.trim();
      }

      if (filters.exchange?.trim() && filters.exchange !== 'all') {
        const exchangeMap: { [key: string]: string } = {
          'NASDAQ': 'XNAS',
          'NYSE': 'XNYS',
          'NYSE Arca': 'ARCX',
          'Cboe BZX': 'BATS',
          'IEX': 'IEX',
          'OTC Markets': 'OTC',
          'NYSE American': 'AMEX'
        };
        serverParams.exchange = exchangeMap[filters.exchange] || filters.exchange;
      }

      const response = await axios.get<PolygonTickerResponse>(
        `${POLYGON_BASE_URL}/v3/reference/tickers`,
        { params: serverParams }
      );

      if (!response.data.results || response.data.results.length === 0) {
        return { stocks: [], totalCount: 0, hasMore: false };
      }

      const tickers = response.data.results;
      const tickerSymbols = tickers.map(t => t.ticker);
      
      if (onProgress) {
        onProgress(0, tickerSymbols.length, 'Fetching price data for screening results...');
      }

      const priceData = await this.batchGetStockPrices(
        tickerSymbols,
        15,
        1000,
        onProgress,
        true
      );

      const stocks: ScreenerStock[] = [];
      
      for (const ticker of tickers) {
        const priceInfo = priceData.find(p => p.ticker === ticker.ticker);
        if (!priceInfo) continue;

        const stock: ScreenerStock = {
          ticker: ticker.ticker,
          name: ticker.name,
          price: priceInfo.price,
          change: priceInfo.change,
          change_percent: priceInfo.change_percent,
          volume: priceInfo.volume,
          market_cap: priceInfo.market_cap,
          sector: ticker.sic_description ? mapSicToSector(ticker.sic_description) : undefined,
          exchange: mapExchangeCode(ticker.primary_exchange)
        };

        if (this.passesAllFilters(stock, filters)) {
          stocks.push(stock);
        }
      }

      return {
        stocks,
        totalCount: stocks.length,
        hasMore: response.data.next_url ? true : false
      };

    } catch (error) {
      console.error('Error in universal screener:', error);
      throw error;
    }
  }

  // Helper method to check if a stock passes all filters
  private passesAllFilters(stock: ScreenerStock, filters: FilterCriteria): boolean {
    if (filters.priceMin !== undefined && (stock.price === undefined || stock.price < filters.priceMin)) {
      return false;
    }
    if (filters.priceMax !== undefined && (stock.price === undefined || stock.price > filters.priceMax)) {
      return false;
    }
    if (filters.marketCapMin !== undefined && (stock.market_cap === undefined || stock.market_cap < filters.marketCapMin * 1000000)) {
      return false;
    }
    if (filters.marketCapMax !== undefined && (stock.market_cap === undefined || stock.market_cap > filters.marketCapMax * 1000000)) {
      return false;
    }
    if (filters.volumeMin !== undefined && (stock.volume === undefined || stock.volume < filters.volumeMin)) {
      return false;
    }
    if (filters.sector && filters.sector !== 'all' && stock.sector !== filters.sector) {
      return false;
    }
    if (filters.exchange && filters.exchange !== 'all' && stock.exchange !== filters.exchange) {
      return false;
    }
    return true;
  }

  // ===== NEW: Full-market utilities (non-breaking additions) =====
  async getAllActiveUSTickers(filters?: FilterCriteria): Promise<Stock[]> {
    const all: Stock[] = [];
    let nextUrl: string | undefined = undefined;
    let safetyPages = 0;
    const maxPages = 200;

    while (safetyPages++ < maxPages) {
      let response: any;
      if (nextUrl) {
        // Follow Polygon pagination while ensuring apikey is present
        response = await axios.get<PolygonTickerResponse>(this.withApiKey(nextUrl));
      } else {
        const params: any = {
          apikey: this.apiKey,
          market: 'stocks',
          locale: 'us',
          active: true,
          limit: 1000,
          sort: 'ticker',
          order: 'asc',
        };
        if (filters?.search?.trim()) params.search = filters.search.trim();
        if (filters?.exchange?.trim() && filters.exchange !== 'all') {
          const exchangeMap: { [key: string]: string } = {
            'NASDAQ': 'XNAS',
            'NYSE': 'XNYS',
            'NYSE Arca': 'ARCX',
            'Cboe BZX': 'BATS',
            'IEX': 'IEX',
            'OTC Markets': 'OTC',
            'NYSE American': 'AMEX'
          };
          params.exchange = exchangeMap[filters.exchange] || filters.exchange;
        }
        response = await axios.get<PolygonTickerResponse>(
          `${POLYGON_BASE_URL}/v3/reference/tickers`,
          { params }
        );
      }
      const results = response?.data?.results || [];
      if (!results.length) break;
      all.push(...results);
      nextUrl = response.data.next_url;
      if (!nextUrl) break;
    }
    return all;
  }

  async getGroupedAggsForDate(dateISO: string): Promise<Map<string, { c: number; o: number; v: number }>> {
    const out = new Map<string, { c: number; o: number; v: number }>();
    try {
      const resp = await axios.get(
        `${POLYGON_BASE_URL}/v2/aggs/grouped/locale/us/market/stocks/${dateISO}`,
        { params: { adjusted: true, apikey: this.apiKey } }
      );
      const results = resp?.data?.results || [];
      for (const r of results) {
        if (!r?.T) continue;
        out.set(r.T, { c: r.c, o: r.o, v: r.v });
      }
    } catch (err) {
      console.error('Grouped aggs fetch failed; will fallback to per-ticker when needed.', err);
    }
    return out;
  }

  async getOrBuildDailySnapshot(dateISO: string): Promise<ScreenerStock[]> {
    const cached = this.snapshotCache.get(dateISO);
    if (cached?.date === dateISO && Array.isArray(cached.stocks) && cached.stocks.length > 0) {
      return cached.stocks;
    }
    const tickers = await this.getAllActiveUSTickers();
    const grouped = await this.getGroupedAggsForDate(dateISO);
    const merged: ScreenerStock[] = [];
    for (const t of tickers) {
      const g = grouped.get(t.ticker);
      const price = g?.c;
      const change = g && typeof g.c === 'number' && typeof g.o === 'number' ? g.c - g.o : undefined;
      const change_percent = g && typeof g.c === 'number' && typeof g.o === 'number' && g.o !== 0 ? ((g.c - g.o) / g.o) * 100 : undefined;
      const volume = g?.v;
      merged.push({
        ticker: t.ticker,
        name: t.name,
        price,
        change,
        change_percent,
        volume,
        sector: t.sic_description ? mapSicToSector(t.sic_description) : undefined,
        exchange: mapExchangeCode(t.primary_exchange)
      } as ScreenerStock);
    }
    this.snapshotCache.set(dateISO, { builtAt: Date.now(), date: dateISO, stocks: merged });
    return merged;
  }

  async searchMarketSnapshot(
    filters: FilterCriteria,
    limit: number = 1000
  ): Promise<{ stocks: ScreenerStock[]; totalCount: number; hasMore: boolean; date: string }> {
    const dateISO = new Date().toISOString().split('T')[0];
    let snapshot = await this.getOrBuildDailySnapshot(dateISO);
    // First apply only non-price/volume/marketCap filters to avoid dropping symbols with missing fields
    const prefiltered = snapshot.filter(s => {
      if (filters.sector && filters.sector !== 'all' && s.sector !== filters.sector) return false;
      if (filters.exchange && filters.exchange !== 'all' && s.exchange !== filters.exchange) return false;
      if (filters.search && filters.search.trim()) {
        const q = filters.search.trim().toLowerCase();
        const inTicker = (s.ticker || '').toLowerCase().includes(q);
        const inName = (s.name || '').toLowerCase().includes(q);
        if (!inTicker && !inName) return false;
      }
      return true;
    });

    let candidates = prefiltered;

    // Ensure volume is hydrated for candidates if volumeMin requested
    const needsVolume = (filters.volumeMin !== undefined);
    if (needsVolume) {
      const missingVol = candidates.filter(s => typeof s.volume !== 'number');
      if (missingVol.length > 0) {
        const tickersVol = missingVol.map(s => s.ticker);
        const batchSizeVol = 25;
        for (let i = 0; i < tickersVol.length; i += batchSizeVol) {
          const batch = tickersVol.slice(i, i + batchSizeVol);
          try {
            const prices = await this.batchGetStockSnapshots(batch, 25, 200, undefined, false);
            const map = new Map(prices.map(p => [p.ticker, p]));
            for (const s of missingVol) {
              const p = map.get(s.ticker);
              if (p) {
                // hydrate volume (and price if helpful later)
                s.volume = p.volume;
                if (typeof s.price !== 'number') s.price = p.price;
                if (typeof s.change !== 'number') s.change = p.change;
                (s as any).change_percent = (s as any).change_percent ?? p.change_percent;
              }
            }
          } catch {}
        }
      }
      // Apply volume filter now
      candidates = candidates.filter(s => !(filters.volumeMin !== undefined && (s.volume === undefined || s.volume < filters.volumeMin)));
    }

    // Ensure price is hydrated for candidates if price range requested
    const needsPrice = (filters.priceMin !== undefined) || (filters.priceMax !== undefined);
    if (needsPrice) {
      const missing = candidates.filter(s => typeof s.price !== 'number');
      if (missing.length > 0) {
        const tickers = missing.map(s => s.ticker);
        const batchSize = 25;
        for (let i = 0; i < tickers.length; i += batchSize) {
          const batch = tickers.slice(i, i + batchSize);
          try {
            const prices = await this.batchGetStockSnapshots(batch, 25, 200, undefined, false);
            const map = new Map(prices.map(p => [p.ticker, p]));
            for (const s of missing) {
              const p = map.get(s.ticker);
              if (p) {
                s.price = p.price;
                s.change = p.change;
                (s as any).change_percent = p.change_percent;
                if (typeof s.volume !== 'number') s.volume = p.volume;
              }
            }
          } catch {}
        }
      }
      candidates = candidates.filter(s => {
        if (filters.priceMin !== undefined && (s.price === undefined || s.price < filters.priceMin)) return false;
        if (filters.priceMax !== undefined && (s.price === undefined || s.price > filters.priceMax)) return false;
        return true;
      });
    }

    // Hydrate market cap only if needed, then apply market cap filters
    const needsMarketCap = (filters.marketCapMin !== undefined) || (filters.marketCapMax !== undefined);
    let hydrated = candidates;
    if (needsMarketCap && candidates.length > 0) {
      // Ensure price present for market cap calculation if missing
      const missingPriceForMC = candidates.filter(s => typeof s.price !== 'number');
      if (missingPriceForMC.length > 0) {
        const tickersMP = missingPriceForMC.map(s => s.ticker);
        const batchSizeMP = 25;
        for (let i = 0; i < tickersMP.length; i += batchSizeMP) {
          const batch = tickersMP.slice(i, i + batchSizeMP);
          try {
            const prices = await this.batchGetStockSnapshots(batch, 25, 200, undefined, false);
            const map = new Map(prices.map(p => [p.ticker, p]));
            for (const s of missingPriceForMC) {
              const p = map.get(s.ticker);
              if (p) {
                s.price = p.price;
                if (typeof s.volume !== 'number') s.volume = p.volume;
              }
            }
          } catch {}
        }
      }
      const enhanced: ScreenerStock[] = [];
      const batchSize = 25;
      for (let i = 0; i < candidates.length; i += batchSize) {
        const batch = candidates.slice(i, i + batchSize);
        const details = await Promise.all(
          batch.map(async s => {
            if (s.market_cap !== undefined && s.market_cap !== null) return s;
            const d = await this.getTickerDetails(s.ticker, s.price);
            return { ...s, market_cap: d.market_cap } as ScreenerStock;
          })
        );
        enhanced.push(...details);
      }
      hydrated = enhanced.filter(s => {
        if (filters.marketCapMin !== undefined && (s.market_cap === undefined || s.market_cap < filters.marketCapMin * 1000000)) return false;
        if (filters.marketCapMax !== undefined && (s.market_cap === undefined || s.market_cap > filters.marketCapMax * 1000000)) return false;
        return true;
      });
    }

    const totalCount = hydrated.length;
    // Return full hydrated list; API route will sort and paginate using offset/limit
    return { stocks: hydrated, totalCount, hasMore: false, date: dateISO };
  }

  // Get popular stocks
  async getPopularStocks(): Promise<string[]> {
    return [
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA',
      'META', 'NVDA', 'NFLX', 'AMD', 'INTC',
      'ORCL', 'CRM', 'ADBE', 'PYPL', 'UBER',
      'SPOT', 'ZOOM', 'SQ', 'TWTR', 'SNAP'
    ];
  }

  // Helper method to check if US market is currently open using Polygon API
  private async isUsMarketOpen(): Promise<boolean> {
    try {
      const resp = await axios.get(`${POLYGON_BASE_URL}/v1/marketstatus/now`, {
        params: { apikey: this.apiKey },
        timeout: 5000,
      });
      // Polygon returns market: 'open' | 'closed'
      const market = resp?.data?.market;
      return market === 'open';
    } catch (e) {
      // Fallback: conservative static window if status unavailable
      const now = new Date();
      const utcHour = now.getUTCHours();
      const utcMinute = now.getUTCMinutes();
      const utcTime = utcHour * 100 + utcMinute;
      return utcTime >= 1430 && utcTime <= 2100;
    }
  }

  // Helper method to get today's date in YYYY-MM-DD format
  private getTodayDateString(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  // Helper: get date string for N days ago (YYYY-MM-DD)
  private getDateNDaysAgoString(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  }

  // Validate and clean stock data to ensure quality
  private validateStockData(stock: any): stock is ScreenerStock {
    // Basic validation
    if (!stock || typeof stock !== 'object') return false;
    if (!stock.ticker || typeof stock.ticker !== 'string') return false;
    if (!stock.name || typeof stock.name !== 'string') return false;
    
    // Price validation
    if (stock.price !== undefined && stock.price !== null) {
      if (typeof stock.price !== 'number' || isNaN(stock.price) || stock.price <= 0) {
        stock.price = undefined; // Reset invalid price
      }
    }
    
    // Volume validation
    if (stock.volume !== undefined && stock.volume !== null) {
      if (typeof stock.volume !== 'number' || isNaN(stock.volume) || stock.volume < 0) {
        stock.volume = undefined; // Reset invalid volume
      }
    }
    
    // Change validation
    if (stock.change !== undefined && stock.change !== null) {
      if (typeof stock.change !== 'number' || isNaN(stock.change)) {
        stock.change = undefined;
      }
    }
    
    // Change percent validation
    if (stock.change_percent !== undefined && stock.change_percent !== null) {
      if (typeof stock.change_percent !== 'number' || isNaN(stock.change_percent)) {
        stock.change_percent = undefined;
      }
    }
    
    // Market cap validation
    if (stock.market_cap !== undefined && stock.market_cap !== null) {
      if (typeof stock.market_cap !== 'number' || isNaN(stock.market_cap) || stock.market_cap < 0) {
        stock.market_cap = undefined;
      }
    }
    
    return true;
  }

  // Enhanced error handling for API calls
  private async makePolygonRequest(endpoint: string, params: any = {}, timeout: number = 60000): Promise<any> { // Increased default timeout to 60 seconds
    try {
      const response = await axios.get(`${POLYGON_BASE_URL}${endpoint}`, {
        params: { ...params, apikey: this.apiKey },
        timeout
      });
      
      // Validate response structure
      if (!response.data) {
        throw new Error('Empty response from Polygon API');
      }
      
      // Check for API error messages
      if (response.data.error) {
        throw new Error(`Polygon API error: ${response.data.error}`);
      }
      
      // Check for rate limiting
      if (response.status === 429) {
        throw new Error('API rate limit exceeded. Please try again later.');
      }
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Invalid Polygon.io API key. Please check your configuration.');
        } else if (error.response?.status === 429) {
          throw new Error('API rate limit exceeded. Please try again later.');
        } else if (error.response?.status === 404) {
          throw new Error(`Endpoint not found: ${endpoint}`);
        } else if (error.code === 'ECONNABORTED') {
          throw new Error('Request timeout. The API may be experiencing high load.');
        }
      }
      throw error;
    }
  }
}

const polygonApi = new PolygonApiService();

// Export individual functions for easier importing
export const fetchStockTickers = async (filters?: FilterCriteria, limit: number = 100): Promise<ScreenerStock[]> => {
  try {
    const tickers = await polygonApi.getTickers(filters, limit);
    
    if (!tickers || tickers.length === 0) {
      return [];
    }
    
    const tickerSymbols = tickers.map(t => t.ticker);
    const prices = await polygonApi.batchGetStockSnapshots(tickerSymbols, 15, 1000, undefined, true);
    // Fallback: fill any missing prices via prev-close API
    const missingPriceTickers = tickerSymbols.filter(t => !prices.find(p => p.ticker === t && typeof p.price === 'number'));
    if (missingPriceTickers.length > 0) {
      const fallbacks = await Promise.allSettled(missingPriceTickers.map(t => polygonApi.getStockPrice(t, true)));
      const fulfilled = fallbacks.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled').map(r => r.value);
      prices.push(...fulfilled);
    }
    
    const stocksWithPrices: ScreenerStock[] = await Promise.all(tickers.map(async ticker => {
      const priceData = prices.find(p => p.ticker === ticker.ticker);
      
      let enhancedSector = ticker.type || 'Technology';
      let enhancedExchange = ticker.primary_exchange || 'NASDAQ';
      
      try {
        const tickerDetails = await polygonApi.getTickerDetails(ticker.ticker, priceData?.price);
        if (tickerDetails.sic_description) {
          enhancedSector = mapSicToSector(tickerDetails.sic_description);
        }
        if (tickerDetails.primary_exchange) {
          enhancedExchange = mapExchangeCode(tickerDetails.primary_exchange);
        }
      } catch (error) {
        console.warn(`Failed to get enhanced details for ${ticker.ticker}:`, error);
      }
      
      return {
        ticker: ticker.ticker,
        name: ticker.name || `${ticker.ticker} Inc.`,
        price: priceData?.price ?? 0,
        change: priceData?.change,
        change_percent: priceData?.change_percent,
        volume: priceData?.volume ?? 0,
        market_cap: priceData?.market_cap,
        sector: enhancedSector,
        exchange: enhancedExchange,
      };
    }));
    
    return stocksWithPrices;
  } catch (error) {
    console.error('Error in fetchStockTickers:', error);
    throw error;
  }
};

export const fetchAllUSStocks = async (
  cursor?: string, 
  limit: number = 100, 
  onProgress?: (current: number, total: number, message: string) => void
): Promise<{ stocks: ScreenerStock[], nextCursor?: string, hasMore: boolean }> => {
  try {
    console.log('🚀 Fetching US stocks with API key:', API_KEY ? 'Present' : 'Missing');
    
    const result = await polygonApi.getAllUSStocks(cursor, limit);
    
    if (!result.stocks || result.stocks.length === 0) {
      console.log('⚠️ No stocks returned from API');
      return { stocks: [], hasMore: false };
    }
    
    console.log(`📊 Fetched ${result.stocks.length} stocks from API`);
    const tickerSymbols = result.stocks.map(t => t.ticker);
    
    if (onProgress) {
      onProgress(0, tickerSymbols.length, 'Fetching price data for stocks...');
    }
    
    const prices = await polygonApi.batchGetStockSnapshots(tickerSymbols, 15, 1000, onProgress, true);
    console.log(`💰 Fetched price data for ${prices.length} stocks`);
    // Fallback: fill any missing prices via prev-close API
    const missingPriceTickers = tickerSymbols.filter(t => !prices.find(p => p.ticker === t && typeof p.price === 'number'));
    if (missingPriceTickers.length > 0) {
      const fallbacks = await Promise.allSettled(missingPriceTickers.map(t => polygonApi.getStockPrice(t, true)));
      const fulfilled = fallbacks.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled').map(r => r.value);
      prices.push(...fulfilled);
    }
    
    const stocksWithPrices: ScreenerStock[] = await Promise.all(result.stocks.map(async ticker => {
      const priceData = prices.find(p => p.ticker === ticker.ticker);
      
      let enhancedSector = ticker.type || 'Technology';
      let enhancedExchange = ticker.primary_exchange || 'NASDAQ';
      
      try {
        const tickerDetails = await polygonApi.getTickerDetails(ticker.ticker, priceData?.price);
        if (tickerDetails.sic_description) {
          enhancedSector = mapSicToSector(tickerDetails.sic_description);
        }
        if (tickerDetails.primary_exchange) {
          enhancedExchange = mapExchangeCode(tickerDetails.primary_exchange);
        }
      } catch (error) {
        console.warn(`Failed to get enhanced details for ${ticker.ticker}:`, error);
      }
      
      return {
        ticker: ticker.ticker,
        name: ticker.name || `${ticker.ticker} Inc.`,
        price: priceData?.price ?? 0,
        change: priceData?.change,
        change_percent: priceData?.change_percent,
        volume: priceData?.volume ?? 0,
        market_cap: priceData?.market_cap,
        sector: enhancedSector,
        exchange: enhancedExchange,
      };
    }));
    
    console.log(`✅ Successfully processed ${stocksWithPrices.length} stocks with live data`);
    
    return {
      stocks: stocksWithPrices,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore
    };
  } catch (error) {
    console.error('❌ Error in fetchAllUSStocks:', error);
    throw error;
  }
};

export const searchStocks = async (query: string, limit: number = 100): Promise<ScreenerStock[]> => {
  try {
    if (!query || query.trim().length === 0) {
      const result = await fetchAllUSStocks(undefined, limit);
      return result.stocks;
    }

    const trimmedQuery = query.trim();
    
    if (trimmedQuery.length < 2) {
      return [];
    }

    const searchResults = await polygonApi.searchStocks(trimmedQuery, limit);
    
    if (searchResults && searchResults.length > 0) {
      const tickerSymbols = searchResults.map(s => s.ticker);
      const prices = await polygonApi.batchGetStockSnapshots(tickerSymbols, 15, 1000, undefined, true);
      // Fallback for missing price
      const missingPriceTickers = tickerSymbols.filter(t => !prices.find(p => p.ticker === t && typeof p.price === 'number'));
      if (missingPriceTickers.length > 0) {
        const fallbacks = await Promise.allSettled(missingPriceTickers.map(t => polygonApi.getStockPrice(t, true)));
        const fulfilled = fallbacks.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled').map(r => r.value);
        prices.push(...fulfilled);
      }
      
      const stocksWithPrices: ScreenerStock[] = await Promise.all(searchResults.map(async ticker => {
        const priceData = prices.find(p => p.ticker === ticker.ticker);
        
        let enhancedSector = ticker.type || 'Technology';
        let enhancedExchange = ticker.primary_exchange || 'NASDAQ';
        
        try {
          const tickerDetails = await polygonApi.getTickerDetails(ticker.ticker, priceData?.price);
          if (tickerDetails.sic_description) {
            enhancedSector = mapSicToSector(tickerDetails.sic_description);
          }
          if (tickerDetails.primary_exchange) {
            enhancedExchange = mapExchangeCode(tickerDetails.primary_exchange);
          }
        } catch (error) {
          console.warn(`Failed to get enhanced details for ${ticker.ticker}:`, error);
        }
        
        return {
          ticker: ticker.ticker,
          name: ticker.name || `${ticker.ticker} Inc.`,
          price: priceData?.price ?? 0,
          change: priceData?.change ?? 0,
          change_percent: priceData?.change_percent ?? 0,
          volume: priceData?.volume ?? 0,
          market_cap: priceData?.market_cap ?? 0,
          sector: enhancedSector,
          exchange: enhancedExchange,
        };
      }));
      
      return stocksWithPrices;
    }
    
    return [];
  } catch (error) {
    console.error('Error searching stocks:', error);
    throw error;
  }
};

export const getPopularStocks = async (): Promise<ScreenerStock[]> => {
  try {
    const popularTickers = await polygonApi.getPopularStocks();
    const tickers = popularTickers.map(ticker => ({
      ticker,
      name: `${ticker} Inc.`,
      market: 'stocks',
      locale: 'us',
      primary_exchange: 'NASDAQ',
      type: 'CS',
      active: true,
      currency_name: 'usd',
      last_updated_utc: new Date().toISOString()
    }));
    
    const prices = await polygonApi.batchGetStockSnapshots(popularTickers, 15, 1000, undefined, true);
    // Fallback for missing price
    const missingPriceTickers = popularTickers.filter(t => !prices.find(p => p.ticker === t && typeof p.price === 'number'));
    if (missingPriceTickers.length > 0) {
      const fallbacks = await Promise.allSettled(missingPriceTickers.map(t => polygonApi.getStockPrice(t, true)));
      const fulfilled = fallbacks.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled').map(r => r.value);
      prices.push(...fulfilled);
    }
    
    const stocksWithPrices: ScreenerStock[] = await Promise.all(tickers.map(async ticker => {
      const priceData = prices.find(p => p.ticker === ticker.ticker);
      
      let enhancedSector = ticker.type || 'Technology';
      let enhancedExchange = ticker.primary_exchange || 'NASDAQ';
      
      try {
        const tickerDetails = await polygonApi.getTickerDetails(ticker.ticker, priceData?.price);
        if (tickerDetails.sic_description) {
          enhancedSector = mapSicToSector(tickerDetails.sic_description);
        }
        if (tickerDetails.primary_exchange) {
          enhancedExchange = mapExchangeCode(tickerDetails.primary_exchange);
        }
      } catch (error) {
        console.warn(`Failed to get enhanced details for ${ticker.ticker}:`, error);
      }
      
      return {
        ticker: ticker.ticker,
        name: ticker.name,
        price: priceData?.price ?? 0,
        change: priceData?.change,
        change_percent: priceData?.change_percent,
        volume: priceData?.volume ?? 0,
        market_cap: priceData?.market_cap,
        sector: enhancedSector,
        exchange: enhancedExchange,
      };
    }));
    
    const validStocks = stocksWithPrices.filter(stock => stock.price && stock.price > 0);
    
    return validStocks;
  } catch (error) {
    console.error('Error loading popular stocks:', error);
    throw error;
  }
};

export const universalStockScreener = async (
  filters: FilterCriteria,
  limit: number = 100,
  onProgress?: (current: number, total: number, message: string) => void
): Promise<{ stocks: ScreenerStock[], totalCount: number, hasMore: boolean }> => {
  try {
    return await polygonApi.getUniversalScreenerResults(filters, limit, onProgress);
  } catch (error) {
    console.error('Error in universal stock screener:', error);
    throw error;
  }
};

// NEW: Universal screening via daily snapshot
export const snapshotStockScreener = async (
  filters: FilterCriteria,
  limit: number = 1000
): Promise<{ stocks: ScreenerStock[]; totalCount: number; hasMore: boolean; date: string }> => {
  try {
    return await polygonApi.searchMarketSnapshot(filters, limit);
  } catch (error) {
    console.error('Error in snapshot stock screener:', error);
    throw error;
  }
};

export default polygonApi;
export { PolygonApiService };
