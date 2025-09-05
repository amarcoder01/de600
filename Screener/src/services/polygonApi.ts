import axios from 'axios';
import { Stock, StockPrice, PolygonTickerResponse, PolygonPriceResponse, FilterCriteria, ScreenerStock } from '../types/stock';

const POLYGON_BASE_URL = 'https://api.polygon.io';
const API_KEY = process.env.POLYGON_API_KEY;

if (!API_KEY) {
  console.warn('Polygon.io API key not found. Please set VITE_POLYGON_API_KEY in your environment variables.');
}

// Market Cap Statistics Tracker
interface MarketCapStats {
  totalRequests: number;
  successfulFetches: number;
  directMarketCap: number;
  calculatedFromWeighted: number;
  calculatedFromShareClass: number;
  failures: number;
  apiErrors: { [key: string]: number };
  tickersWithNoData: string[];
}

class MarketCapTracker {
  private stats: MarketCapStats = {
    totalRequests: 0,
    successfulFetches: 0,
    directMarketCap: 0,
    calculatedFromWeighted: 0,
    calculatedFromShareClass: 0,
    failures: 0,
    apiErrors: {},
    tickersWithNoData: []
  };
  
  private detailedStats = {
    successMethods: {
      direct: 0,
      weighted: 0,
      shareClass: 0
    },
    failureReasons: new Map<string, number>(),
    apiErrorCodes: new Map<number, number>(),
    processingTimes: [] as number[],
    lastProcessedBatch: 0
  };
  
  private startTime = Date.now();

  recordRequest(ticker: string) {
    this.stats.totalRequests++;
    console.log(`📊 Market Cap Request #${this.stats.totalRequests} for ${ticker}`);
  }

  recordSuccess(ticker: string, method: 'direct' | 'weighted' | 'shareClass', value: number) {
    this.stats.successfulFetches++;
    switch (method) {
      case 'direct':
        this.stats.directMarketCap++;
        this.detailedStats.successMethods.direct++;
        break;
      case 'weighted':
        this.stats.calculatedFromWeighted++;
        this.detailedStats.successMethods.weighted++;
        break;
      case 'shareClass':
        this.stats.calculatedFromShareClass++;
        this.detailedStats.successMethods.shareClass++;
        break;
    }
    console.log(`✅ Market Cap Success for ${ticker}: ${method} method, value: $${value.toLocaleString()}`);
    
    // Log real-time progress every 10 successful fetches
    if (this.stats.successfulFetches % 10 === 0) {
      this.printRealTimeStats();
    }
  }

  recordFailure(ticker: string, reason: string) {
    this.stats.failures++;
    this.stats.tickersWithNoData.push(ticker);
    const count = this.detailedStats.failureReasons.get(reason) || 0;
    this.detailedStats.failureReasons.set(reason, count + 1);
    console.log(`❌ Market Cap Failure for ${ticker}: ${reason}`);
  }

  recordApiError(ticker: string, errorCode: string) {
    this.stats.apiErrors[errorCode] = (this.stats.apiErrors[errorCode] || 0) + 1;
    const statusCode = parseInt(errorCode) || 0;
    const count = this.detailedStats.apiErrorCodes.get(statusCode) || 0;
    this.detailedStats.apiErrorCodes.set(statusCode, count + 1);
    console.log(`🚨 API Error for ${ticker}: ${errorCode}`);
  }
  
  recordBatchComplete(batchSize: number) {
    this.detailedStats.lastProcessedBatch = batchSize;
    const processingTime = Date.now() - this.startTime;
    this.detailedStats.processingTimes.push(processingTime);
    this.startTime = Date.now(); // Reset for next batch
  }
  
  printRealTimeStats() {
    const successRate = this.stats.totalRequests > 0 ? (this.stats.successfulFetches / this.stats.totalRequests * 100).toFixed(1) : '0';
    console.log(`📈 [MarketCap Real-time] Progress: ${this.stats.successfulFetches}/${this.stats.totalRequests} (${successRate}% success rate)`);
  }
  
  getSuccessRate(): number {
    return this.stats.totalRequests > 0 ? (this.stats.successfulFetches / this.stats.totalRequests) : 0;
  }

  getStats(): MarketCapStats {
    return { ...this.stats };
  }

  printSummary() {
    const successRate = this.stats.totalRequests > 0 ? (this.stats.successfulFetches / this.stats.totalRequests * 100).toFixed(2) : '0';
    const avgProcessingTime = this.detailedStats.processingTimes.length > 0 
      ? this.detailedStats.processingTimes.reduce((a, b) => a + b, 0) / this.detailedStats.processingTimes.length 
      : 0;
    
    console.log(`\n📊 [MarketCap Summary] MARKET CAP STATISTICS SUMMARY:`);
    console.log(`═══════════════════════════════════════════════════`);
    console.log(`📈 Overall Success Rate: ${successRate}% (${this.stats.successfulFetches}/${this.stats.totalRequests})`);
    console.log(`✅ Direct Market Cap: ${this.detailedStats.successMethods.direct}`);
    console.log(`🧮 Calculated (Weighted): ${this.detailedStats.successMethods.weighted}`);
    console.log(`🧮 Calculated (Share Class): ${this.detailedStats.successMethods.shareClass}`);
    console.log(`❌ Total Failures: ${this.stats.failures}`);
    console.log(`💥 API Errors:`, this.stats.apiErrors);
    
    if (this.detailedStats.failureReasons.size > 0) {
      console.log('\n🔍 Failure Breakdown:');
      this.detailedStats.failureReasons.forEach((count, reason) => {
        console.log(`  • ${reason}: ${count}`);
      });
    }
    
    if (this.detailedStats.apiErrorCodes.size > 0) {
      console.log('\n🚨 API Error Codes:');
      this.detailedStats.apiErrorCodes.forEach((count, code) => {
        console.log(`  • HTTP ${code}: ${count}`);
      });
    }
    
    if (avgProcessingTime > 0) {
      console.log(`\n⏱️ Average Processing Time: ${avgProcessingTime.toFixed(0)}ms`);
    }
    
    if (this.stats.tickersWithNoData.length > 0) {
      console.log(`\nTickers with no data (${this.stats.tickersWithNoData.length}):`, this.stats.tickersWithNoData.slice(0, 10).join(', ') + (this.stats.tickersWithNoData.length > 10 ? '...' : ''));
    }
    console.log(`═══════════════════════════════════════════════════\n`);
  }
  
  reset() {
    this.stats = {
      totalRequests: 0,
      successfulFetches: 0,
      directMarketCap: 0,
      calculatedFromWeighted: 0,
      calculatedFromShareClass: 0,
      failures: 0,
      apiErrors: {},
      tickersWithNoData: []
    };
    this.detailedStats = {
      successMethods: { direct: 0, weighted: 0, shareClass: 0 },
      failureReasons: new Map(),
      apiErrorCodes: new Map(),
      processingTimes: [],
      lastProcessedBatch: 0
    };
    this.startTime = Date.now();
  }
}

const marketCapTracker = new MarketCapTracker();

// Sector mapping function - converts SIC descriptions to standardized sector names
function mapSicToSector(sicDescription?: string): string {
  if (!sicDescription) return 'Technology'; // Default fallback
  
  const description = sicDescription.toLowerCase();
  
  // Technology
  if (description.includes('software') || description.includes('computer') || 
      description.includes('technology') || description.includes('internet') ||
      description.includes('semiconductor') || description.includes('electronic') ||
      description.includes('telecommunications') || description.includes('data processing')) {
    return 'Technology';
  }
  
  // Healthcare
  if (description.includes('pharmaceutical') || description.includes('medical') ||
      description.includes('healthcare') || description.includes('biotechnology') ||
      description.includes('drug') || description.includes('hospital') ||
      description.includes('health services')) {
    return 'Healthcare';
  }
  
  // Financial Services
  if (description.includes('bank') || description.includes('financial') ||
      description.includes('insurance') || description.includes('investment') ||
      description.includes('credit') || description.includes('securities') ||
      description.includes('real estate')) {
    return 'Financial Services';
  }
  
  // Energy
  if (description.includes('oil') || description.includes('gas') ||
      description.includes('energy') || description.includes('petroleum') ||
      description.includes('coal') || description.includes('renewable energy')) {
    return 'Energy';
  }
  
  // Consumer Goods
  if (description.includes('retail') || description.includes('consumer') ||
      description.includes('food') || description.includes('beverage') ||
      description.includes('clothing') || description.includes('automotive') ||
      description.includes('household')) {
    return 'Consumer Goods';
  }
  
  // Industrial
  if (description.includes('manufacturing') || description.includes('industrial') ||
      description.includes('construction') || description.includes('machinery') ||
      description.includes('aerospace') || description.includes('defense')) {
    return 'Industrial';
  }
  
  // Materials
  if (description.includes('mining') || description.includes('chemical') ||
      description.includes('steel') || description.includes('metals') ||
      description.includes('paper') || description.includes('forestry')) {
    return 'Materials';
  }
  
  // Utilities
  if (description.includes('utility') || description.includes('electric') ||
      description.includes('water') || description.includes('waste management')) {
    return 'Utilities';
  }
  
  // Communication Services
  if (description.includes('media') || description.includes('entertainment') ||
      description.includes('broadcasting') || description.includes('publishing') ||
      description.includes('advertising')) {
    return 'Communication Services';
  }
  
  // Default to Technology if no match found
  return 'Technology';
}

// Exchange mapping function - converts exchange codes to readable names
function mapExchangeCode(exchangeCode?: string): string {
  if (!exchangeCode) return 'NASDAQ'; // Default fallback
  
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
      // Return the original code if no mapping found
      return exchangeCode;
  }
}

// Debug function to display market cap statistics in browser console
function debugMarketCapStats() {
  console.log('🔍 [MarketCap Debug] Current Statistics:');
  marketCapTracker.printSummary();
  return marketCapTracker.getStats();
}

// Make debug function globally available
if (typeof window !== 'undefined') {
  (window as any).debugMarketCapStats = debugMarketCapStats;
  console.log('🔧 [MarketCap Debug] Debug function available: window.debugMarketCapStats()');
}

class PolygonApiService {
  private apiKey: string;

  constructor() {
    this.apiKey = API_KEY || '';
  }

  // Get ALL US stocks with pagination support
  async getAllUSStocks(cursor?: string, limit: number = 100): Promise<{ stocks: Stock[], nextCursor?: string, hasMore: boolean }> {
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

      console.log('Fetching all US stocks with params:', {
        ...params,
        apikey: params.apikey ? '[REDACTED]' : 'NOT_SET'
      });
      
      const response = await axios.get<PolygonTickerResponse>(
        `${POLYGON_BASE_URL}/v3/reference/tickers`,
        { params }
      );

      console.log('API Response:', {
        status: response.status,
        resultCount: response.data.results?.length || 0,
        hasNextUrl: !!response.data.next_url,
        requestId: response.data.request_id
      });
      
      if (!response.data.results || response.data.results.length === 0) {
        console.warn('No results returned from Polygon API');
        return { stocks: [], hasMore: false };
      }

      // Extract cursor from next_url if available
      let nextCursor: string | undefined;
      if (response.data.next_url) {
        const url = new URL(response.data.next_url);
        nextCursor = url.searchParams.get('cursor') || undefined;
      }

      console.log(`Successfully fetched ${response.data.results.length} stocks, hasMore: ${!!nextCursor}`);
      return {
        stocks: response.data.results,
        nextCursor,
        hasMore: !!nextCursor
      };
    } catch (error) {
      console.error('Error fetching all US stocks:', error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Invalid API key. Please check your Polygon.io API configuration.');
        } else if (error.response?.status === 429) {
          throw new Error('API rate limit exceeded. Please try again later.');
        } else if (error.response?.status === 403) {
          throw new Error('Access forbidden. Please check your API key permissions.');
        } else if (error.response?.status === 400) {
          throw new Error('Invalid request parameters. Please check your filters and try again.');
        } else if (error.response?.status >= 500) {
          throw new Error('Polygon.io service is temporarily unavailable. Please try again later.');
        }
      }
      throw new Error('Failed to fetch stock tickers. Please check your internet connection.');
    }
  }

  // Get stock tickers with optional filtering - focused on US stocks
  async getTickers(filters?: FilterCriteria, limit: number = 100): Promise<Stock[]> {
    try {
      const params: any = {
        apikey: this.apiKey,
        market: 'stocks',
        locale: 'us', // Focus on US stocks
        active: true,
        limit: Math.min(limit, 1000), // Polygon.io max limit is 1000
        sort: 'ticker',
        order: 'asc'
      };

      if (filters?.search) {
        const trimmedSearch = filters.search.trim();
        if (trimmedSearch.length > 0) {
          params.search = trimmedSearch;
          console.log(`Fetching tickers with search filter: "${trimmedSearch}"`);
        }
      }

      // Add exchange filtering if specified
      if (filters?.exchange && filters.exchange.trim()) {
        // Map exchange names to Polygon.io exchange codes
        const exchangeMap: { [key: string]: string } = {
          'NASDAQ': 'XNAS',
          'NYSE': 'XNYS',
          'NYSE Arca': 'ARCX',
          'Cboe BZX': 'BATS',
          'IEX': 'IEX',
          'OTC Markets': 'OTC',
          'NYSE American': 'AMEX'
        };
        const exchangeCode = exchangeMap[filters.exchange] || filters.exchange;
        params.exchange = exchangeCode;
        console.log(`Fetching tickers with exchange filter: "${filters.exchange}" (${exchangeCode})`);
      }

      console.log('Fetching tickers with params:', {
        ...params,
        apikey: params.apikey ? '[REDACTED]' : 'NOT_SET'
      });
      
      const response = await axios.get<PolygonTickerResponse>(
        `${POLYGON_BASE_URL}/v3/reference/tickers`,
        { params }
      );

      console.log('API Response:', {
        status: response.status,
        resultCount: response.data.results?.length || 0,
        hasNextUrl: !!response.data.next_url,
        requestId: response.data.request_id
      });
      
      if (!response.data.results || response.data.results.length === 0) {
        console.warn('No results returned from Polygon API');
        return [];
      }

      console.log(`Successfully fetched ${response.data.results.length} tickers`);
      return response.data.results;
    } catch (error) {
      console.error('Error fetching tickers:', error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Invalid API key. Please check your Polygon.io API configuration.');
        } else if (error.response?.status === 429) {
          throw new Error('API rate limit exceeded. Please try again later.');
        } else if (error.response?.status === 403) {
          throw new Error('Access forbidden. Please check your API key permissions.');
        } else if (error.response?.status === 400) {
          throw new Error('Invalid request parameters. Please check your filters and try again.');
        } else if (error.response?.status >= 500) {
          throw new Error('Polygon.io service is temporarily unavailable. Please try again later.');
        }
      }
      throw new Error('Failed to fetch stock tickers. Please check your internet connection.');
    }
  }

  // Universal stock filtering method - works across ALL US stocks with server-side filtering
  async getFilteredStocks(
    filters: FilterCriteria,
    onProgress?: (current: number, total: number, message: string) => void
  ): Promise<ScreenerStock[]> {
    try {
      console.log('🌍 Starting universal stock filtering with filters:', filters);
      
      // Step 1: Get all matching tickers using server-side filtering
      const tickers = await this.getTickers(filters, 1000);
      console.log(`🎯 Server-side filtering returned ${tickers.length} matching tickers`);
      
      if (tickers.length === 0) {
        console.warn('No tickers found matching server-side filters');
        return [];
      }

      // Step 2: Get price and financial data for all matching tickers
      const tickerSymbols = tickers.map(t => t.ticker);
      console.log(`💰 Fetching price data for ${tickerSymbols.length} tickers`);
      
      const priceData = await this.batchGetStockPrices(
        tickerSymbols,
        15, // batch size
        1000, // delay
        onProgress,
        true // include financials
      );
      
      console.log(`💰 Successfully fetched price data for ${priceData.length} stocks`);

      // Step 3: Combine ticker info with price data and apply client-side numerical filters
      const combinedStocks: ScreenerStock[] = [];
      
      for (const ticker of tickers) {
        const priceInfo = priceData.find(p => p.ticker === ticker.ticker);
        if (!priceInfo) continue;
        
        const stock: ScreenerStock = {
          ticker: ticker.ticker,
          name: ticker.name,
          price: priceInfo.price,
          change: priceInfo.change,
          changePercent: priceInfo.change_percent,
          volume: priceInfo.volume,
          marketCap: priceInfo.market_cap,
          sector: mapSicToSector(ticker.sic_description),
          exchange: mapExchangeCode(ticker.primary_exchange)
        };
        
        // Apply client-side numerical filters (since Polygon.io doesn't support these server-side)
        let includeStock = true;
        
        if (filters.priceMin !== undefined && (stock.price === undefined || stock.price < filters.priceMin)) {
          includeStock = false;
        }
        if (filters.priceMax !== undefined && (stock.price === undefined || stock.price > filters.priceMax)) {
          includeStock = false;
        }
        if (filters.marketCapMin !== undefined && (stock.marketCap === undefined || stock.marketCap < filters.marketCapMin * 1000000)) {
          includeStock = false;
        }
        if (filters.marketCapMax !== undefined && (stock.marketCap === undefined || stock.marketCap > filters.marketCapMax * 1000000)) {
          includeStock = false;
        }
        if (filters.volumeMin !== undefined && (stock.volume === undefined || stock.volume < filters.volumeMin)) {
          includeStock = false;
        }
        if (filters.sector && stock.sector !== filters.sector) {
          includeStock = false;
        }
        
        if (includeStock) {
          combinedStocks.push(stock);
        }
      }
      
      console.log(`✅ Universal filtering complete: ${tickers.length} → ${combinedStocks.length} stocks after all filters`);
      return combinedStocks;
      
    } catch (error) {
      console.error('❌ Error in universal stock filtering:', error);
      throw error;
    }
  }

  // Enterprise-grade screening method with optimized server-side filtering
  async getUniversalScreenerResults(
    filters: FilterCriteria,
    limit: number = 100,
    onProgress?: (current: number, total: number, message: string) => void
  ): Promise<{ stocks: ScreenerStock[], totalCount: number, hasMore: boolean }> {
    try {
      console.log('🏢 Starting professional screener with filters:', filters);
      
      // Build server-side filter parameters
      const serverParams: any = {
        apikey: this.apiKey,
        market: 'stocks',
        locale: 'us',
        active: true,
        limit: Math.min(limit, 1000),
        sort: 'ticker',
        order: 'asc'
      };

      // Add search filter if provided
      if (filters.search?.trim()) {
        serverParams.search = filters.search.trim();
      }

      // Add exchange filter if provided
      if (filters.exchange?.trim()) {
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

      // Add sector filtering using SIC codes if available
      if (filters.sector?.trim()) {
        // Note: Polygon.io doesn't directly support sector filtering via SIC codes
        // We'll handle this in client-side filtering
      }

      console.log('🔍 Fetching professional results with server params:', {
        ...serverParams,
        apikey: '[REDACTED]'
      });

      // Step 1: Get initial batch of tickers from server
      const response = await axios.get<PolygonTickerResponse>(
        `${POLYGON_BASE_URL}/v3/reference/tickers`,
        { params: serverParams }
      );

      if (!response.data.results || response.data.results.length === 0) {
        console.warn('No results from professional screener');
        return { stocks: [], totalCount: 0, hasMore: false };
      }

      const tickers = response.data.results;
      console.log(`📊 Professional screener returned ${tickers.length} initial results`);

      // Step 2: Get price data for all tickers
      const tickerSymbols = tickers.map(t => t.ticker);
      
      if (onProgress) {
        onProgress(0, tickerSymbols.length, 'Fetching price data for universal results...');
      }

      const priceData = await this.batchGetStockPrices(
        tickerSymbols,
        15,
        1000,
        onProgress,
        true
      );

      // Step 3: Combine and filter results
      const stocks: ScreenerStock[] = [];
      
      for (const ticker of tickers) {
        const priceInfo = priceData.find(p => p.ticker === ticker.ticker);
        if (!priceInfo) continue;

        const stock: ScreenerStock = {
          ticker: ticker.ticker,
          name: ticker.name,
          price: priceInfo.price,
          change: priceInfo.change,
          changePercent: priceInfo.change_percent,
          volume: priceInfo.volume,
          marketCap: priceInfo.market_cap,
          sector: mapSicToSector(ticker.sic_description),
          exchange: mapExchangeCode(ticker.primary_exchange)
        };

        // Apply all client-side filters
        if (this.passesAllFilters(stock, filters)) {
          stocks.push(stock);
        }
      }

      console.log(`✅ Professional screener complete: ${tickers.length} → ${stocks.length} stocks after filtering`);
      
      return {
        stocks,
        totalCount: stocks.length,
        hasMore: response.data.next_url ? true : false
      };

    } catch (error) {
      console.error('❌ Error in professional screener:', error);
      throw error;
    }
  }

  // Helper method to check if a stock passes all filters
  private passesAllFilters(stock: ScreenerStock, filters: FilterCriteria): boolean {
    // Price filters
    if (filters.priceMin !== undefined && (stock.price === undefined || stock.price < filters.priceMin)) {
      return false;
    }
    if (filters.priceMax !== undefined && (stock.price === undefined || stock.price > filters.priceMax)) {
      return false;
    }

    // Market cap filters (convert to millions for comparison)
    if (filters.marketCapMin !== undefined && (stock.marketCap === undefined || stock.marketCap < filters.marketCapMin * 1000000)) {
      return false;
    }
    if (filters.marketCapMax !== undefined && (stock.marketCap === undefined || stock.marketCap > filters.marketCapMax * 1000000)) {
      return false;
    }

    // Volume filter
    if (filters.volumeMin !== undefined && (stock.volume === undefined || stock.volume < filters.volumeMin)) {
      return false;
    }

    // Sector filter
    if (filters.sector && stock.sector !== filters.sector) {
      return false;
    }

    // Exchange filter
    if (filters.exchange && stock.exchange !== filters.exchange) {
      return false;
    }

    return true;
  }

  // Get current stock prices for multiple tickers with batch processing and rate limiting
  async getStockPrices(tickers: string[], includeFinancials: boolean = true): Promise<StockPrice[]> {
    try {
      if (!tickers || tickers.length === 0) {
        console.warn('No tickers provided for price fetching');
        return [];
      }

      console.log(`Fetching prices for ${tickers.length} tickers (includeFinancials: ${includeFinancials}):`, tickers.slice(0, 5).join(', ') + (tickers.length > 5 ? '...' : ''));
      
      const promises = tickers.map(ticker => this.getStockPrice(ticker, includeFinancials));
      const results = await Promise.allSettled(promises);
      
      const successfulPrices = results
        .filter((result): result is PromiseFulfilledResult<StockPrice> => result.status === 'fulfilled')
        .map(result => result.value);

      const failedCount = results.length - successfulPrices.length;
      if (failedCount > 0) {
        console.warn(`Failed to fetch prices for ${failedCount} out of ${tickers.length} tickers`);
      }

      const withFinancials = successfulPrices.filter(p => p.market_cap !== undefined).length;
      console.log(`Successfully fetched prices for ${successfulPrices.length} tickers, ${withFinancials} with financial data`);
      return successfulPrices;
    } catch (error) {
      console.error('Error fetching stock prices:', error);
      return [];
    }
  }

  // Batch process stock prices with rate limiting and optional financial data
  async batchGetStockPrices(
    tickers: string[], 
    batchSize: number = 15, 
    delayMs: number = 1000, 
    onProgress?: (current: number, total: number, message: string) => void,
    includeFinancials: boolean = true
  ): Promise<StockPrice[]> {
    try {
      if (!tickers || tickers.length === 0) {
        console.warn('No tickers provided for batch price fetching');
        return [];
      }

      console.log(`🔄 Starting batch processing for ${tickers.length} tickers (batch size: ${batchSize}, delay: ${delayMs}ms, includeFinancials: ${includeFinancials})`);
      
      const allPrices: StockPrice[] = [];
      const totalBatches = Math.ceil(tickers.length / batchSize);
      
      // Reduce batch size when including financials to respect rate limits
      const effectiveBatchSize = includeFinancials ? Math.max(1, Math.floor(batchSize / 2)) : batchSize;
      const effectiveDelay = includeFinancials ? Math.max(delayMs, 1500) : delayMs;
      
      console.log(`📊 Adjusted batch configuration for financial data: size=${effectiveBatchSize}, delay=${effectiveDelay}ms`);
      console.log(`📊 [MarketCap Debug] Starting batch processing: ${tickers.length} tickers, batch size: ${effectiveBatchSize}, includeFinancials: ${includeFinancials}`);
      
      for (let i = 0; i < tickers.length; i += effectiveBatchSize) {
        const batch = tickers.slice(i, i + effectiveBatchSize);
        const batchNumber = Math.floor(i / effectiveBatchSize) + 1;
        const adjustedTotalBatches = Math.ceil(tickers.length / effectiveBatchSize);
        
        console.log(`📦 Processing batch ${batchNumber}/${adjustedTotalBatches} (${batch.length} tickers)`);
        
        // Report progress
        if (onProgress) {
          onProgress(i, tickers.length, `Processing batch ${batchNumber}/${adjustedTotalBatches}`);
        }
        
        try {
          const batchStartTime = Date.now();
          // Process batch with Promise.allSettled to handle individual failures
          const promises = batch.map(ticker => this.getStockPrice(ticker, includeFinancials));
          const results = await Promise.allSettled(promises);
          
          const batchPrices = results
            .filter((result): result is PromiseFulfilledResult<StockPrice> => result.status === 'fulfilled')
            .map(result => result.value);
          
          allPrices.push(...batchPrices);
          
          // Record batch completion for tracking
          if (includeFinancials) {
            marketCapTracker.recordBatchComplete(batch.length);
          }
          
          const batchTime = Date.now() - batchStartTime;
          const failedInBatch = results.length - batchPrices.length;
          if (failedInBatch > 0) {
            console.warn(`⚠️ Batch ${batchNumber}: ${failedInBatch} failed out of ${batch.length}`);
          }
          
          const successfulWithFinancials = batchPrices.filter(p => p.market_cap !== undefined).length;
          console.log(`✅ Batch ${batchNumber} completed: ${batchPrices.length} prices fetched, ${successfulWithFinancials} with financial data | Batch time: ${batchTime}ms`);
          
          // Report progress after batch completion
          if (onProgress) {
            const completed = Math.min(i + effectiveBatchSize, tickers.length);
            onProgress(completed, tickers.length, `Completed batch ${batchNumber}/${adjustedTotalBatches}`);
          }
          
          // Add delay between batches to respect rate limits (except for last batch)
          if (i + effectiveBatchSize < tickers.length) {
            console.log(`⏳ Waiting ${effectiveDelay}ms before next batch...`);
            await new Promise(resolve => setTimeout(resolve, effectiveDelay));
          }
        } catch (batchError) {
          console.error(`❌ Error processing batch ${batchNumber}:`, batchError);
          // Continue with next batch even if current batch fails
        }
      }
      
      const withFinancials = allPrices.filter(p => p.market_cap !== undefined).length;
      console.log(`🎉 Batch processing completed: ${allPrices.length}/${tickers.length} prices fetched successfully, ${withFinancials} with financial data`);
      return allPrices;
    } catch (error) {
      console.error('Error in batch price fetching:', error);
      return [];
    }
  }

  // Enhanced ticker details fetching with multiple fallback strategies
  async getTickerDetails(ticker: string, currentPrice?: number): Promise<{ market_cap?: number; sic_description?: string; primary_exchange?: string }> {
    try {
      if (!ticker || ticker.trim().length === 0) {
        throw new Error('Ticker symbol is required');
      }

      const cleanTicker = ticker.trim().toUpperCase();
      
      // Record the market cap request
      marketCapTracker.recordRequest(cleanTicker);
      
      let retryCount = 0;
      const maxRetries = 2;
      
      while (retryCount <= maxRetries) {
        try {
          console.log(`🔍 [MarketCap Debug] Fetching ticker details for ${cleanTicker} (attempt ${retryCount + 1}/${maxRetries + 1})`);
          
          // Get ticker details from Polygon.io
          const response = await axios.get(
            `${POLYGON_BASE_URL}/v3/reference/tickers/${cleanTicker}`,
            {
              params: {
                apikey: this.apiKey,
              },
              timeout: 10000, // 10 second timeout
            }
          );

          console.log(`📊 [MarketCap Debug] API Response for ${cleanTicker}:`, {
            status: response.status,
            hasResults: !!response.data.results,
            resultsKeys: response.data.results ? Object.keys(response.data.results) : [],
            market_cap: response.data.results?.market_cap,
            weighted_shares_outstanding: response.data.results?.weighted_shares_outstanding,
            share_class_shares_outstanding: response.data.results?.share_class_shares_outstanding
          });

          if (!response.data.results) {
            const reason = 'No ticker details available from API';
            console.warn(`⚠️ [MarketCap Debug] ${reason} for ${cleanTicker}`);
            marketCapTracker.recordFailure(cleanTicker, reason);
            break;
          }

          const result = response.data.results;
          
          console.log(`📋 [MarketCap Debug] Raw API data for ${cleanTicker}:`, {
            market_cap: result.market_cap,
            weighted_shares_outstanding: result.weighted_shares_outstanding,
            share_class_shares_outstanding: result.share_class_shares_outstanding,
            current_price: currentPrice
          });
          
          // Strategy 1: Use direct market_cap if available
          if (result.market_cap && result.market_cap > 0) {
            console.log(`✅ [MarketCap Debug] Direct market cap found for ${cleanTicker}: $${result.market_cap.toLocaleString()}`);
            marketCapTracker.recordSuccess(cleanTicker, 'direct', result.market_cap);
            return { 
              market_cap: result.market_cap,
              sic_description: result.sic_description,
              primary_exchange: result.primary_exchange
            };
          }
          
          console.log(`⚠️ [MarketCap Debug] No direct market cap for ${cleanTicker}, attempting fallback calculation...`);
          
          // Strategy 2: Calculate using weighted_shares_outstanding * current_price
          if (result.weighted_shares_outstanding && currentPrice && currentPrice > 0) {
            const calculated_market_cap = result.weighted_shares_outstanding * currentPrice;
            console.log(`🧮 [MarketCap Debug] Calculated market cap for ${cleanTicker}: $${calculated_market_cap.toLocaleString()} (${currentPrice} × ${result.weighted_shares_outstanding.toLocaleString()})`);
            marketCapTracker.recordSuccess(cleanTicker, 'weighted', calculated_market_cap);
            return { 
              market_cap: calculated_market_cap,
              sic_description: result.sic_description,
              primary_exchange: result.primary_exchange
            };
          }
          
          // Strategy 3: Calculate using share_class_shares_outstanding * current_price
          if (result.share_class_shares_outstanding && currentPrice && currentPrice > 0) {
            const calculated_market_cap = result.share_class_shares_outstanding * currentPrice;
            console.log(`🧮 [MarketCap Debug] Calculated market cap for ${cleanTicker}: $${calculated_market_cap.toLocaleString()} (${currentPrice} × ${result.share_class_shares_outstanding.toLocaleString()})`);
            marketCapTracker.recordSuccess(cleanTicker, 'shareClass', calculated_market_cap);
            return { 
              market_cap: calculated_market_cap,
              sic_description: result.sic_description,
              primary_exchange: result.primary_exchange
            };
          }
          
          // If we reach here, no market cap data is available
          const reason = `No usable market cap data: market_cap=${!!result.market_cap}, weighted_shares=${!!result.weighted_shares_outstanding}, share_class_shares=${!!result.share_class_shares_outstanding}, current_price=${!!currentPrice}`;
          console.warn(`❌ [MarketCap Debug] No market cap data available for ${cleanTicker} - Missing data:`, {
            hasCurrentPrice: !!currentPrice,
            hasWeightedShares: !!result.weighted_shares_outstanding,
            hasShareClassShares: !!result.share_class_shares_outstanding,
            tickerDataKeys: result ? Object.keys(result) : 'No ticker data'
          });
          marketCapTracker.recordFailure(cleanTicker, reason);
          break;
          
        } catch (apiError) {
          retryCount++;
          console.error(`💥 [MarketCap Debug] Error fetching ticker details for ${cleanTicker}:`, {
            error: apiError.message,
            status: axios.isAxiosError(apiError) ? apiError.response?.status : 'Unknown',
            statusText: axios.isAxiosError(apiError) ? apiError.response?.statusText : 'Unknown'
          });
          
          if (axios.isAxiosError(apiError)) {
            const statusCode = apiError.response?.status?.toString() || 'unknown';
            marketCapTracker.recordApiError(cleanTicker, statusCode);
            
            if (apiError.response?.status === 429 && retryCount <= maxRetries) {
              // Rate limit hit, wait and retry
              const waitTime = Math.pow(2, retryCount) * 1000; // Exponential backoff
              console.log(`⏳ [MarketCap Debug] Rate limit hit for ${cleanTicker}, retrying in ${waitTime}ms (attempt ${retryCount}/${maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
              continue;
            } else if (apiError.response?.status === 404) {
              const reason = 'Ticker not found in Polygon.io';
              console.warn(`❌ [MarketCap Debug] ${reason}: ${cleanTicker}`);
              marketCapTracker.recordFailure(cleanTicker, reason);
              break;
            } else if (apiError.response?.status === 401 || apiError.response?.status === 403) {
              const reason = `API authentication error (${apiError.response.status})`;
              console.error(`❌ [MarketCap Debug] ${reason} for ${cleanTicker}`);
              marketCapTracker.recordFailure(cleanTicker, reason);
              break;
            }
          }
          
          if (retryCount > maxRetries) {
            const reason = `Failed after ${maxRetries} retries: ${apiError.message}`;
            console.error(`❌ [MarketCap Debug] ${reason} for ${cleanTicker}`);
            marketCapTracker.recordFailure(cleanTicker, reason);
            break;
          }
        }
      }
      
      return {};
    } catch (error) {
      const reason = `Unexpected error: ${error.message}`;
      console.error(`❌ [MarketCap Debug] ${reason} for ${ticker}`);
      marketCapTracker.recordFailure(ticker, reason);
      return {};
    }
  }

  // Get current stock price for a single ticker with optional financial data
  async getStockPrice(ticker: string, includeFinancials: boolean = true): Promise<StockPrice> {
    try {
      if (!ticker || ticker.trim().length === 0) {
        throw new Error('Ticker symbol is required');
      }

      const cleanTicker = ticker.trim().toUpperCase();
      
      // Get previous close data (most recent available)
      const response = await axios.get<PolygonPriceResponse>(
        `${POLYGON_BASE_URL}/v2/aggs/ticker/${cleanTicker}/prev`,
        {
          params: {
            adjusted: true,
            apikey: this.apiKey,
          },
        }
      );

      if (!response.data.results || response.data.results.length === 0) {
        throw new Error(`No price data available for ${cleanTicker}`);
      }

      const result = response.data.results[0];
      const price = result.c; // close price
      const volume = result.v;
      
      // Calculate change (simplified - using open vs close)
      const change = result.c - result.o;
      const changePercent = ((change / result.o) * 100);

      // Fetch financial data if requested
      let market_cap: number | undefined = undefined;
      
      if (includeFinancials) {
        try {
          // Pass current price to enable fallback market cap calculation
          const financialData = await this.getTickerDetails(cleanTicker, price);
          market_cap = financialData.market_cap;
        } catch (financialError) {
          console.warn(`Failed to fetch financial data for ${cleanTicker}:`, financialError);
          // Continue without financial data
        }
      }

      const stockPrice: StockPrice = {
        ticker: cleanTicker,
        price,
        change,
        change_percent: changePercent,
        volume,
        market_cap
      };

      console.log(`Successfully fetched price for ${cleanTicker}: $${result.c}`, {
        market_cap
      });
      return stockPrice;
    } catch (error) {
      console.error(`Error fetching price for ${ticker}:`, error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error(`Ticker ${ticker} not found`);
        } else if (error.response?.status === 401) {
          throw new Error('Invalid API key. Please check your Polygon.io API configuration.');
        } else if (error.response?.status === 403) {
          throw new Error('Access forbidden. Please check your API key permissions.');
        } else if (error.response?.status === 429) {
          throw new Error('API rate limit exceeded. Please try again later.');
        } else if (error.response?.status >= 500) {
          throw new Error('Polygon.io service is temporarily unavailable. Please try again later.');
        }
      }
      // Return default data if API call fails
      return {
        ticker,
        price: 0,
        change: 0,
        change_percent: 0,
        volume: 0,
      };
    }
  }

  // Search stocks by ticker or company name - focused on US stocks
  async searchStocks(query: string, limit: number = 50): Promise<Stock[]> {
    try {
      // Validate input
      if (!query || query.trim().length === 0) {
        console.warn('Empty search query provided');
        return [];
      }

      const trimmedQuery = query.trim();
      console.log(`Searching for stocks with query: "${trimmedQuery}"`);

      const params = {
        search: trimmedQuery, // Search parameter works for both ticker symbols and company names
        market: 'stocks',
        locale: 'us', // Focus on US stocks
        active: true,
        limit: Math.min(limit, 1000), // Polygon.io max limit is 1000
        apikey: this.apiKey,
        sort: 'ticker',
        order: 'asc'
      };
      
      console.log('Searching stocks with params:', params);
      
      const response = await axios.get<PolygonTickerResponse>(
        `${POLYGON_BASE_URL}/v3/reference/tickers`,
        { params }
      );

      console.log(`Search API Response for "${trimmedQuery}":`, {
        status: response.status,
        resultCount: response.data.results?.length || 0,
        hasNextUrl: !!response.data.next_url
      });
      
      if (!response.data.results || response.data.results.length === 0) {
        console.warn(`No search results found for query: "${trimmedQuery}"`);
        return [];
      }

      console.log(`Found ${response.data.results.length} results for "${trimmedQuery}"`);
      return response.data.results;
    } catch (error) {
      console.error(`Error searching stocks for query "${query}":`, error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Invalid API key. Please check your Polygon.io API configuration.');
        } else if (error.response?.status === 429) {
          throw new Error('API rate limit exceeded. Please try again later.');
        } else if (error.response?.status === 403) {
          throw new Error('Access forbidden. Please check your API key permissions.');
        } else if (error.response?.status >= 500) {
          throw new Error('Polygon.io service is temporarily unavailable. Please try again later.');
        } else if (error.response?.status === 400) {
          throw new Error('Invalid search query. Please check your input and try again.');
        }
      }
      throw new Error('Failed to search stocks. Please check your internet connection.');
    }
  }

  // Get popular/sample stocks for initial display
  async getPopularStocks(): Promise<string[]> {
    // Return a list of popular stock tickers for initial display
    return [
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA',
      'META', 'NVDA', 'NFLX', 'AMD', 'INTC',
      'ORCL', 'CRM', 'ADBE', 'PYPL', 'UBER',
      'SPOT', 'ZOOM', 'SQ', 'TWTR', 'SNAP'
    ];
  }
}

const polygonApi = new PolygonApiService();

// Export individual functions for easier importing
export const fetchStockTickers = async (filters?: FilterCriteria, limit: number = 100): Promise<ScreenerStock[]> => {
  try {
    console.log('Fetching stock tickers with filters:', filters);
    
    const tickers = await polygonApi.getTickers(filters, limit);
    
    if (!tickers || tickers.length === 0) {
      console.warn('No tickers returned from API');
      // Return fallback data if no results
      return getFallbackStocks();
    }
    
    // Get price data for ALL tickers using batch processing
    const tickerSymbols = tickers.map(t => t.ticker);
    console.log(`Fetching prices for ALL ${tickerSymbols.length} tickers using batch processing`);
    
    const prices = await polygonApi.batchGetStockPrices(tickerSymbols, 15, 1000, undefined, true);
    
    // If price fetching failed mostly (less than 10% success rate), use fallback data
    const successRate = prices.length / tickerSymbols.length;
    if (successRate < 0.1) {
      console.warn(`Price fetching mostly failed (${Math.round(successRate * 100)}% success rate), using fallback data`);
      return getFallbackStocks();
    }
    
    // Merge ticker info with price data and enhanced sector/exchange mapping
    const stocksWithPrices: ScreenerStock[] = await Promise.all(tickers.map(async ticker => {
      const priceData = prices.find(p => p.ticker === ticker.ticker);
      
      // Get enhanced ticker details for accurate sector and exchange data
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
        // Keep fallback values
      }
      
      return {
        ticker: ticker.ticker,
        name: ticker.name || `${ticker.ticker} Inc.`,
        price: priceData?.price,
        change: priceData?.change,
        changePercent: priceData?.change_percent,
        volume: priceData?.volume,
        marketCap: priceData?.market_cap,
        sector: enhancedSector,
        exchange: enhancedExchange,
      };
    }));
    
    console.log('Returning stocks with prices:', stocksWithPrices.length);
    return stocksWithPrices;
  } catch (error) {
    console.error('Error in fetchStockTickers:', error);
    // Return fallback data on error
    return getFallbackStocks();
  }
};

// New function to fetch all US stocks with pagination
export const fetchAllUSStocks = async (
  cursor?: string, 
  limit: number = 100, 
  onProgress?: (current: number, total: number, message: string) => void
): Promise<{ stocks: ScreenerStock[], nextCursor?: string, hasMore: boolean }> => {
  try {
    console.log('🚀🚀🚀 [MARKET CAP DEBUG] fetchAllUSStocks CALLED - Starting market cap debugging!');
    console.log('📊 [MARKET CAP DEBUG] Parameters:', { cursor, limit });
    console.log('📊 [MARKET CAP DEBUG] Market cap tracker stats before fetch:', marketCapTracker.getStats());
    
    const result = await polygonApi.getAllUSStocks(cursor, limit);
    
    if (!result.stocks || result.stocks.length === 0) {
      console.warn('No stocks returned from API');
      // Return fallback data if no results and no cursor (first load)
      if (!cursor) {
        return {
          stocks: getFallbackStocks(),
          hasMore: false
        };
      }
      return { stocks: [], hasMore: false };
    }
    
    // Get price data for ALL tickers using batch processing
    const tickerSymbols = result.stocks.map(t => t.ticker);
    console.log(`Fetching prices for ALL ${tickerSymbols.length} tickers using batch processing`);
    
    const prices = await polygonApi.batchGetStockPrices(tickerSymbols, 15, 1000, onProgress, true);
    
    // If price fetching failed mostly (less than 10% success rate) and this is the first load, use fallback data
    const successRate = prices.length / tickerSymbols.length;
    if (successRate < 0.1 && !cursor) {
      console.warn(`Price fetching mostly failed (${Math.round(successRate * 100)}% success rate), using fallback data`);
      return {
        stocks: getFallbackStocks(),
        hasMore: false
      };
    }
    
    // Merge ticker info with price data and enhanced sector/exchange mapping
    const stocksWithPrices: ScreenerStock[] = await Promise.all(result.stocks.map(async ticker => {
      const priceData = prices.find(p => p.ticker === ticker.ticker);
      
      // Get enhanced ticker details for accurate sector and exchange data
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
        // Keep fallback values
      }
      
      return {
        ticker: ticker.ticker,
        name: ticker.name || `${ticker.ticker} Inc.`,
        price: priceData?.price,
        change: priceData?.change,
        changePercent: priceData?.change_percent,
        volume: priceData?.volume,
        marketCap: priceData?.market_cap,
        sector: enhancedSector,
        exchange: enhancedExchange,
      };
    }));
    
    console.log(`Returning ${stocksWithPrices.length} stocks with prices, hasMore: ${result.hasMore}`);
    return {
      stocks: stocksWithPrices,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore
    };
  } catch (error) {
    console.error('Error in fetchAllUSStocks:', error);
    // Return fallback data on error (only for first load)
    if (!cursor) {
      return {
        stocks: getFallbackStocks(),
        hasMore: false
      };
    }
    throw error;
  }
};

// Fallback data for when API calls fail
const getFallbackStocks = (): ScreenerStock[] => {
  return [
    {
      ticker: 'AAPL',
      name: 'Apple Inc.',
      price: 150.00,
      change: 2.50,
      changePercent: 1.69,
      volume: 50000000,
      marketCap: 2500000000000,
      sector: 'Technology',
      exchange: 'NASDAQ'
    },
    {
      ticker: 'MSFT',
      name: 'Microsoft Corporation',
      price: 300.00,
      change: -1.25,
      changePercent: -0.41,
      volume: 30000000,
      marketCap: 2200000000000,
      sector: 'Technology',
      exchange: 'NASDAQ'
    },
    {
      ticker: 'GOOGL',
      name: 'Alphabet Inc.',
      price: 120.00,
      change: 0.75,
      changePercent: 0.63,
      volume: 25000000,
      marketCap: 1500000000000,
      sector: 'Technology',
      exchange: 'NASDAQ'
    },
    {
      ticker: 'AMZN',
      name: 'Amazon.com Inc.',
      price: 140.00,
      change: 3.20,
      changePercent: 2.34,
      volume: 40000000,
      marketCap: 1400000000000,
      sector: 'Consumer Discretionary',
      exchange: 'NASDAQ'
    },
    {
      ticker: 'TSLA',
      name: 'Tesla Inc.',
      price: 200.00,
      change: -5.50,
      changePercent: -2.68,
      volume: 60000000,
      marketCap: 650000000000,
      sector: 'Consumer Discretionary',
      exchange: 'NASDAQ'
    }
  ];
};

// Professional screening function that searches across the complete market
export const universalStockScreener = async (
  filters: FilterCriteria,
  limit: number = 100,
  onProgress?: (current: number, total: number, message: string) => void
): Promise<{ stocks: ScreenerStock[], totalCount: number, hasMore: boolean }> => {
  try {
    console.log('🏢 Starting professional stock screener with filters:', filters);
    
    const polygonService = new PolygonApiService();
    return await polygonService.getUniversalScreenerResults(filters, limit, onProgress);
  } catch (error) {
    console.error('Error in professional stock screener:', error);
    throw error;
  }
};

export const searchStocks = async (query: string, limit: number = 100): Promise<ScreenerStock[]> => {
  try {
    console.log('Searching stocks with query:', query);
    
    if (!query || query.trim().length === 0) {
      // If no query, return first batch of all US stocks
      const result = await fetchAllUSStocks(undefined, limit);
      return result.stocks;
    }

    const trimmedQuery = query.trim();
    
    // Handle very short queries (less than 2 characters)
    if (trimmedQuery.length < 2) {
      console.warn('Search query too short, minimum 2 characters required');
      return [];
    }

    // Normalize the search query
    const normalizedQuery = trimmedQuery.toUpperCase();
    console.log(`🔍 Searching for stocks with query: "${trimmedQuery}" (normalized: "${normalizedQuery}")`);
    
    // Check if query looks like a ticker symbol (all caps, short)
    const isLikelyTicker = /^[A-Z]{1,5}$/.test(normalizedQuery);
    console.log(`🔍 Query appears to be ${isLikelyTicker ? 'a ticker symbol' : 'a company name'}`);
    
    // Use the search parameter in the API call to search across all US stocks
    const searchResults = await polygonApi.searchStocks(trimmedQuery, limit);
    
    if (searchResults && searchResults.length > 0) {
      console.log(`Found ${searchResults.length} search results from API`);
      // Convert to ScreenerStock format using batch processing for ALL results
      const tickerSymbols = searchResults.map(s => s.ticker);
      console.log(`Fetching prices for ALL ${tickerSymbols.length} search results using batch processing`);
      const prices = await polygonApi.batchGetStockPrices(tickerSymbols, 15, 1000, undefined, true);
      
      const stocksWithPrices: ScreenerStock[] = await Promise.all(searchResults.map(async ticker => {
        const priceData = prices.find(p => p.ticker === ticker.ticker);
        
        // Get enhanced ticker details for accurate sector and exchange data
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
          // Keep fallback values
        }
        
        return {
          ticker: ticker.ticker,
          name: ticker.name || `${ticker.ticker} Inc.`,
          price: priceData?.price,
          change: priceData?.change,
          changePercent: priceData?.change_percent,
          volume: priceData?.volume,
          marketCap: priceData?.market_cap,
          sector: enhancedSector,
          exchange: enhancedExchange,
        };
      }));
      
      return stocksWithPrices;
    }
    
    const results = await fetchStockTickers({ search: trimmedQuery });
    
    console.log(`🔍 Search API returned ${results.length} results for query: "${trimmedQuery}"`);
    
    if (results.length === 0) {
      console.log('🔍 No results from API, checking fallback data...');
      // If no results from API, search in fallback data with fuzzy matching
      const fallbackStocks = getFallbackStocks();
      const searchResults = fallbackStocks.filter(stock => {
        const tickerMatch = stock.ticker.toLowerCase().includes(trimmedQuery.toLowerCase());
        const nameMatch = stock.name.toLowerCase().includes(trimmedQuery.toLowerCase());
        
        // For ticker-like queries, prioritize exact ticker matches
        if (isLikelyTicker) {
          return stock.ticker.toLowerCase().startsWith(trimmedQuery.toLowerCase()) || tickerMatch;
        }
        
        // For company name queries, search in both ticker and name
        return tickerMatch || nameMatch;
      });
      
      // Sort results to prioritize exact matches
      searchResults.sort((a, b) => {
        const aTickerExact = a.ticker.toLowerCase() === trimmedQuery.toLowerCase();
        const bTickerExact = b.ticker.toLowerCase() === trimmedQuery.toLowerCase();
        const aNameExact = a.name.toLowerCase() === trimmedQuery.toLowerCase();
        const bNameExact = b.name.toLowerCase() === trimmedQuery.toLowerCase();
        
        if (aTickerExact && !bTickerExact) return -1;
        if (!aTickerExact && bTickerExact) return 1;
        if (aNameExact && !bNameExact) return -1;
        if (!aNameExact && bNameExact) return 1;
        
        return a.ticker.localeCompare(b.ticker);
      });
      
      console.log(`🔍 Fallback search found ${searchResults.length} results`);
      return searchResults.slice(0, limit);
    }
    
    // Sort API results to prioritize exact matches
    results.sort((a, b) => {
      const aTickerExact = a.ticker.toLowerCase() === trimmedQuery.toLowerCase();
      const bTickerExact = b.ticker.toLowerCase() === trimmedQuery.toLowerCase();
      const aNameExact = a.name.toLowerCase() === trimmedQuery.toLowerCase();
      const bNameExact = b.name.toLowerCase() === trimmedQuery.toLowerCase();
      
      if (aTickerExact && !bTickerExact) return -1;
      if (!aTickerExact && bTickerExact) return 1;
      if (aNameExact && !bNameExact) return -1;
      if (!aNameExact && bNameExact) return 1;
      
      return a.ticker.localeCompare(b.ticker);
    });
    
    return results.slice(0, limit);
  } catch (error) {
    console.error('Error searching stocks:', error);
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 400) {
        throw new Error('Invalid search query. Please check your input and try again.');
      } else if (error.response?.status === 403) {
        throw new Error('Access forbidden. Please check your API key permissions.');
      } else if (error.response?.status >= 500) {
        throw new Error('Search service is temporarily unavailable. Please try again later.');
      }
    }
    
    console.log('🔍 Search failed, falling back to local data...');
    // Enhanced fallback search with better matching
    const fallbackStocks = getFallbackStocks();
    const normalizedQuery = query.trim().toLowerCase();
    const searchResults = fallbackStocks.filter(stock => {
      const tickerMatch = stock.ticker.toLowerCase().includes(normalizedQuery);
      const nameMatch = stock.name.toLowerCase().includes(normalizedQuery);
      return tickerMatch || nameMatch;
    });
    
    // Sort fallback results
    searchResults.sort((a, b) => {
      const aTickerExact = a.ticker.toLowerCase() === normalizedQuery;
      const bTickerExact = b.ticker.toLowerCase() === normalizedQuery;
      if (aTickerExact && !bTickerExact) return -1;
      if (!aTickerExact && bTickerExact) return 1;
      return a.ticker.localeCompare(b.ticker);
    });
    
    console.log(`🔍 Fallback search found ${searchResults.length} results`);
    return searchResults.slice(0, limit);
  }
};

export const getPopularStocks = async (): Promise<ScreenerStock[]> => {
  try {
    console.log('Loading popular stocks...');
    
    const popularTickers = await polygonApi.getPopularStocks();
    const tickers = popularTickers.map(ticker => ({
      ticker,
      name: `${ticker} Inc.`, // Placeholder name
      market: 'stocks',
      locale: 'us',
      primary_exchange: 'NASDAQ',
      type: 'CS',
      active: true,
      currency_name: 'usd',
      last_updated_utc: new Date().toISOString()
    }));
    
    // Get price data with financial information
    const prices = await polygonApi.getStockPrices(popularTickers, true);
    
    // If price fetching failed mostly (less than 10% success rate), use fallback data
    const successRate = prices.length / popularTickers.length;
    if (successRate < 0.1) {
      console.warn(`Price fetching mostly failed for popular stocks (${Math.round(successRate * 100)}% success rate), using fallback data`);
      return getFallbackStocks();
    }
    
    const stocksWithPrices: ScreenerStock[] = await Promise.all(tickers.map(async ticker => {
      const priceData = prices.find(p => p.ticker === ticker.ticker);
      
      // Get enhanced ticker details for accurate sector and exchange data
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
        // Keep fallback values
      }
      
      return {
        ticker: ticker.ticker,
        name: ticker.name,
        price: priceData?.price || 0,
        change: priceData?.change || 0,
        changePercent: priceData?.change_percent || 0,
        volume: priceData?.volume || 0,
        marketCap: priceData?.market_cap,
        sector: enhancedSector,
        exchange: enhancedExchange,
      };
    }));
    
    // Filter out stocks with no price data and return fallback if needed
    const validStocks = stocksWithPrices.filter(stock => stock.price && stock.price > 0);
    
    if (validStocks.length === 0) {
      console.warn('No valid popular stocks found, returning fallback data');
      return getFallbackStocks();
    }
    
    console.log('Returning popular stocks:', validStocks.length);
    return validStocks;
  } catch (error) {
    console.error('Error loading popular stocks:', error);
    return getFallbackStocks();
  }
};

export default polygonApi;
export { PolygonApiService };