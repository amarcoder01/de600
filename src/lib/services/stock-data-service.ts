import { FilterCriteria, Stock } from '@/types/screener';
import { PolygonApiService } from '@/lib/screener/polygonApi';
import { ScreenerDataService } from '@/lib/screener/ScreenerDataService';

interface SearchResult {
  stocks: Stock[];
  total: number;
  hasMore: boolean;
  queryTime: number;
  noResults: boolean;
}

interface CacheEntry {
  data: SearchResult;
  timestamp: number;
  ttl: number;
}

export class StockDataService {
  private cache = new Map<string, CacheEntry>();
  private polygonService: PolygonApiService;
  private screenerService: ScreenerDataService;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.polygonService = new PolygonApiService();
    this.screenerService = new ScreenerDataService();
  }

  async searchStocks(filters: FilterCriteria, limit = 50, offset = 0): Promise<SearchResult> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(filters, limit, offset);
    
    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return {
        ...cached,
        queryTime: Date.now() - startTime
      };
    }

    try {
      let stocks: Stock[] = [];
      let total = 0;

      // Use intelligent search strategy based on filters
      if (this.hasSpecificFilters(filters)) {
        // Direct API search for specific criteria
        const result = await this.performDirectSearch(filters, limit, offset);
        stocks = result.stocks;
        total = result.total;
      } else {
        // Fallback to popular stocks for broad queries
        const result = await this.getPopularStocks(limit, offset);
        stocks = this.applyClientSideFilters(result.stocks, filters);
        total = stocks.length;
      }

      // Enrich stock data with real-time information
      const enrichedStocks = await this.enrichStockData(stocks);

      const searchResult: SearchResult = {
        stocks: enrichedStocks,
        total,
        hasMore: total > offset + limit,
        queryTime: Date.now() - startTime,
        noResults: enrichedStocks.length === 0
      };

      // Cache the result
      this.setCache(cacheKey, searchResult);

      return searchResult;
    } catch (error) {
      console.error('Error searching stocks:', error);
      return {
        stocks: [],
        total: 0,
        hasMore: false,
        queryTime: Date.now() - startTime,
        noResults: true
      };
    }
  }

  async getPopularStocks(limit = 50, offset = 0): Promise<{ stocks: Stock[]; total: number }> {
    try {
      // Get popular stocks from Polygon API
      const tickers = await this.polygonService.getPopularStocks();
      const selectedTickers = tickers.slice(offset, offset + limit);
      
      // Convert tickers to Stock objects
      const stocks: Stock[] = selectedTickers.map(ticker => ({
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
      
      return {
        stocks,
        total: tickers.length
      };
    } catch (error) {
      console.error('Error fetching popular stocks:', error);
      return { stocks: [], total: 0 };
    }
  }

  async getAlternativeStocks(originalQuery: string, failedFilters: FilterCriteria): Promise<Stock[]> {
    try {
      // Get a broader set of popular stocks
      const popularResult = await this.getPopularStocks(100);
      let stocks = popularResult.stocks;

      // Apply relaxed filters
      const relaxedFilters = this.relaxFilters(failedFilters);
      stocks = this.applyClientSideFilters(stocks, relaxedFilters);

      // If still no results, return top 20 popular stocks
      if (stocks.length === 0) {
        stocks = popularResult.stocks.slice(0, 20);
      }

      return await this.enrichStockData(stocks.slice(0, 20));
    } catch (error) {
      console.error('Error getting alternative stocks:', error);
      return [];
    }
  }

  private async performDirectSearch(filters: FilterCriteria, limit: number, offset: number): Promise<{ stocks: Stock[]; total: number }> {
    try {
      // Use Polygon's market snapshot for efficient filtering
      const snapshotResult = await this.polygonService.searchMarketSnapshot(filters, Math.min(limit * 3, 1000));

      if (!snapshotResult || !snapshotResult.stocks || snapshotResult.stocks.length === 0) {
        // Fallback to universal screener
        const universalResult = await this.polygonService.getUniversalScreenerResults(filters, limit, undefined);
        
        // Convert ScreenerStock to Stock objects
        const stocks: Stock[] = universalResult.stocks.map(screenerStock => ({
          ticker: screenerStock.ticker,
          name: screenerStock.name,
          market: 'stocks',
          locale: 'us',
          primary_exchange: screenerStock.exchange || 'NASDAQ',
          type: 'CS',
          active: true,
          currency_name: 'usd',
          last_updated_utc: screenerStock.last_updated || new Date().toISOString()
        }));
        
        return {
          stocks: stocks.slice(offset, offset + limit),
          total: universalResult.totalCount
        };
      }

      // Convert ScreenerStock to Stock objects
      const stocks: Stock[] = snapshotResult.stocks.map(screenerStock => ({
        ticker: screenerStock.ticker,
        name: screenerStock.name,
        market: 'stocks',
        locale: 'us',
        primary_exchange: screenerStock.exchange || 'NASDAQ',
        type: 'CS',
        active: true,
        currency_name: 'usd',
        last_updated_utc: screenerStock.last_updated || new Date().toISOString()
      }));
      
      return {
        stocks: stocks.slice(offset, offset + limit),
        total: snapshotResult.totalCount
      };
    } catch (error) {
      console.error('Error in direct search:', error);
      throw error;
    }
  }

  private async enrichStockData(stocks: Stock[]): Promise<Stock[]> {
    try {
      const tickers = stocks.map(stock => stock.ticker);
      const snapshots = await this.screenerService.getUnifiedSnapshots(tickers);
      
      // Create a map for quick lookup
      const snapshotMap = new Map<string, any>();
      snapshots.forEach(snapshot => {
        if (snapshot.ticker) {
          snapshotMap.set(snapshot.ticker, snapshot);
        }
      });
      
      return stocks.map(stock => {
        const snapshot = snapshotMap.get(stock.ticker);
        if (snapshot) {
          return {
            ...stock,
            price: snapshot.price || 0,
            change: snapshot.change || 0,
            changePercent: snapshot.change_percent || 0,
            volume: snapshot.volume || 0,
            marketCap: snapshot.market_cap || 0,
          };
        }
        return stock;
      });
    } catch (error) {
      console.error('Error enriching stock data:', error);
      return stocks;
    }
  }

  private applyClientSideFilters(stocks: Stock[], filters: FilterCriteria): Stock[] {
    return stocks.filter(stock => {
      // Cast to any to access enriched properties
      const enrichedStock = stock as any;
      
      // Price filters
      if (filters.priceMin && (!enrichedStock.price || enrichedStock.price < filters.priceMin)) return false;
      if (filters.priceMax && (!enrichedStock.price || enrichedStock.price > filters.priceMax)) return false;
      
      // Market cap filters (convert to billions)
      if (filters.marketCapMin && (!enrichedStock.marketCap || enrichedStock.marketCap < filters.marketCapMin * 1e9)) return false;
      if (filters.marketCapMax && (!enrichedStock.marketCap || enrichedStock.marketCap > filters.marketCapMax * 1e9)) return false;
      
      // Volume filter
      if (filters.volumeMin && (!enrichedStock.volume || enrichedStock.volume < filters.volumeMin)) return false;
      
      // Sector filter (basic name matching since Stock doesn't have sector)
      if (filters.sector && filters.sector !== 'all') {
        const stockName = stock.name.toLowerCase();
        const sectorKeywords = {
          'technology': ['tech', 'software', 'computer', 'internet', 'digital'],
          'healthcare': ['health', 'medical', 'pharma', 'bio', 'drug'],
          'financial': ['bank', 'financial', 'insurance', 'credit'],
          'energy': ['energy', 'oil', 'gas', 'petroleum']
        };
        
        const keywords = sectorKeywords[filters.sector.toLowerCase() as keyof typeof sectorKeywords];
        if (keywords && !keywords.some(keyword => stockName.includes(keyword))) {
          return false;
        }
      }
      
      // Exchange filter - use primary_exchange
      if (filters.exchange && filters.exchange !== 'all' && stock.primary_exchange !== filters.exchange) return false;
      
      return true;
    });
  }

  private relaxFilters(filters: FilterCriteria): FilterCriteria {
    return {
      ...filters,
      priceMin: filters.priceMin ? filters.priceMin * 0.5 : undefined,
      priceMax: filters.priceMax ? filters.priceMax * 2 : undefined,
      marketCapMin: filters.marketCapMin ? filters.marketCapMin * 0.1 : undefined,
      volumeMin: filters.volumeMin ? filters.volumeMin * 0.1 : undefined,
    };
  }

  private hasSpecificFilters(filters: FilterCriteria): boolean {
    return !!(filters.priceMin || filters.priceMax || filters.marketCapMin || 
             filters.marketCapMax || filters.volumeMin || 
             (filters.sector && filters.sector !== 'all') || 
             (filters.exchange && filters.exchange !== 'all'));
  }

  private snapshotToStock(snapshot: any): Stock {
    return {
      ticker: snapshot.ticker || '',
      name: snapshot.name || snapshot.ticker || '',
      market: 'stocks',
      locale: 'us',
      primary_exchange: snapshot.exchange || 'NASDAQ',
      type: 'CS',
      active: true,
      currency_name: 'usd',
      last_updated_utc: new Date().toISOString(),
    };
  }

  private generateCacheKey(filters: FilterCriteria, limit: number, offset: number): string {
    return `search_${JSON.stringify(filters)}_${limit}_${offset}`;
  }

  private getFromCache(key: string): SearchResult | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  private setCache(key: string, data: SearchResult): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: this.CACHE_TTL
    });
    
    // Clean up old entries
    if (this.cache.size > 100) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
  }
}

export const stockDataService = new StockDataService();