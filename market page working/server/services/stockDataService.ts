import { PolygonApiService } from './polygonApi';
import { YahooFinanceService } from './yahooFinanceApi';
import { type InsertStock, type InsertMarketIndex } from '@shared/schema';

export class StockDataService {
  private polygonApi: PolygonApiService;
  private yahooApi: YahooFinanceService;
  private sectorCache = new Map<string, { sector: string; timestamp: number }>();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.polygonApi = new PolygonApiService();
    this.yahooApi = new YahooFinanceService();
  }

  // Reliable sector mapping for major stocks (free alternative to unreliable APIs)
  private getMajorStockSectors(): Map<string, string> {
    const sectors = new Map([
      // Technology
      ['AAPL', 'Technology'], ['MSFT', 'Technology'], ['GOOGL', 'Technology'], 
      ['META', 'Technology'], ['NVDA', 'Technology'], ['NFLX', 'Technology'],
      ['AMD', 'Technology'], ['INTC', 'Technology'], ['CRM', 'Technology'],
      ['ORCL', 'Technology'], ['ADBE', 'Technology'], ['CSCO', 'Technology'],
      ['IBM', 'Technology'], ['QCOM', 'Technology'], ['TXN', 'Technology'],
      ['AVGO', 'Technology'], ['NOW', 'Technology'], ['INTU', 'Technology'],
      
      // E-commerce & Consumer
      ['AMZN', 'Consumer Discretionary'], ['TSLA', 'Automotive'], 
      ['SHOP', 'Technology'], ['PYPL', 'Financial Services'],
      
      // Financial Services
      ['JPM', 'Financial Services'], ['BAC', 'Financial Services'],
      ['WFC', 'Financial Services'], ['GS', 'Financial Services'],
      ['MS', 'Financial Services'], ['C', 'Financial Services'],
      ['V', 'Financial Services'], ['MA', 'Financial Services'],
      ['AXP', 'Financial Services'], ['BLK', 'Financial Services'],
      
      // Healthcare
      ['JNJ', 'Healthcare'], ['PFE', 'Healthcare'], ['UNH', 'Healthcare'],
      ['ABT', 'Healthcare'], ['TMO', 'Healthcare'], ['DHR', 'Healthcare'],
      ['CVS', 'Healthcare'], ['MRK', 'Healthcare'], ['LLY', 'Healthcare'],
      ['ABBV', 'Healthcare'], ['BMY', 'Healthcare'], ['AMGN', 'Healthcare'],
      
      // Consumer Goods
      ['KO', 'Consumer Staples'], ['PEP', 'Consumer Staples'],
      ['WMT', 'Consumer Staples'], ['PG', 'Consumer Staples'],
      ['COST', 'Consumer Staples'], ['MCD', 'Consumer Discretionary'],
      ['SBUX', 'Consumer Discretionary'], ['NKE', 'Consumer Discretionary'],
      ['DIS', 'Entertainment'], ['HD', 'Consumer Discretionary'],
      
      // Energy
      ['XOM', 'Energy'], ['CVX', 'Energy'], ['COP', 'Energy'],
      ['SLB', 'Energy'], ['EOG', 'Energy'], ['PXD', 'Energy'],
      
      // Industrials
      ['BA', 'Industrials'], ['CAT', 'Industrials'], ['GE', 'Industrials'],
      ['MMM', 'Industrials'], ['HON', 'Industrials'], ['UPS', 'Industrials'],
      ['RTX', 'Industrials'], ['LMT', 'Industrials'], ['DE', 'Industrials'],
      
      // Utilities
      ['NEE', 'Utilities'], ['DUK', 'Utilities'], ['SO', 'Utilities'],
      ['D', 'Utilities'], ['AEP', 'Utilities'], ['EXC', 'Utilities'],
      
      // Real Estate
      ['AMT', 'Real Estate'], ['PLD', 'Real Estate'], ['CCI', 'Real Estate'],
      ['EQIX', 'Real Estate'], ['SPG', 'Real Estate'], ['O', 'Real Estate'],
      
      // Materials
      ['LIN', 'Materials'], ['APD', 'Materials'], ['ECL', 'Materials'],
      ['SHW', 'Materials'], ['FCX', 'Materials'], ['NEM', 'Materials'],
      
      // Communication Services
      ['T', 'Communication Services'], ['VZ', 'Communication Services'],
      ['CMCSA', 'Communication Services'], ['TMUS', 'Communication Services'],
      
      // ETFs (Funds)
      ['SPY', 'Fund'], ['QQQ', 'Fund'], ['IWM', 'Fund'],
      ['VTI', 'Fund'], ['VOO', 'Fund'], ['IVV', 'Fund'],
      ['VEA', 'Fund'], ['IEFA', 'Fund'], ['VWO', 'Fund'],
      ['TLT', 'Fund'], ['GLD', 'Fund'], ['SLV', 'Fund'],
    ]);
    
    return sectors;
  }

  // Calculate approximate market cap based on price and volume
  private calculateMarketCap(price: number, volume: number): number | null {
    if (!price || !volume) return null;
    
    // This is a very rough approximation - real market cap needs shares outstanding
    // For now, we'll use a volume-based estimate for display purposes
    const approximateShares = volume * 100; // Very rough estimate
    const marketCap = price * approximateShares;
    
    // Return in millions for readability
    return Math.round(marketCap / 1000000);
  }

  async fetchStockData(symbols: string[] = []): Promise<InsertStock[]> {
    const stocks: InsertStock[] = [];

    // Try Polygon.io first
    try {
      // Get explicit dates for current and previous trading days
      const currentDate = this.getLastTradingDay();
      const previousDate = this.getLastTradingDay(2);
      
      const currentData = await this.polygonApi.getGroupedDaily(currentDate);
      const previousData = await this.polygonApi.getGroupedDaily(previousDate);
      
      if (currentData.results) {
        console.log(`Found ${currentData.results.length} stocks from Polygon API`);
        
        // Create map of previous day's closing prices
        const previousCloseMap = new Map<string, number>();
        if (previousData.results) {
          previousData.results.forEach(result => {
            if (result.c && result.c > 0) {
              previousCloseMap.set(result.T, result.c);
            }
          });
          console.log(`Loaded previous close data for ${previousCloseMap.size} stocks`);
        }
        
        // Get all tickers with company names and sectors (batch fetch for efficiency)
        const tickerMap = new Map<string, { name: string; type?: string }>();
        
        try {
          // Fetch ticker mappings in batches
          let cursor = '';
          let fetchMore = true;
          let tickerCount = 0;
          
          while (fetchMore && tickerCount < 5000) { // Limit to prevent excessive API calls
            const tickerResponse = await this.polygonApi.getStockTickers(1000, cursor || undefined);
            
            if (tickerResponse.results) {
              tickerResponse.results.forEach(ticker => {
                tickerMap.set(ticker.ticker, {
                  name: ticker.name,
                  type: ticker.type
                });
              });
              tickerCount += tickerResponse.results.length;
            }
            
            cursor = tickerResponse.next_url ? tickerResponse.next_url.split('cursor=')[1]?.split('&')[0] || '' : '';
            fetchMore = !!tickerResponse.next_url && !!cursor;
            
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          console.log(`Loaded ${tickerMap.size} ticker mappings`);
        } catch (error) {
          console.error('Error fetching ticker mappings:', error);
        }

        // Prepare valid symbols for bulk processing
        const validResults = [];
        for (const result of currentData.results) {
          const symbol = result.T;
          
          // If specific symbols are requested, filter to only those
          if (symbols.length > 0 && !symbols.includes(symbol)) {
            continue;
          }
          
          // Skip if essential data is missing or invalid
          if (!result.c || result.c <= 0) {
            continue;
          }
          
          const previousClose = previousCloseMap.get(symbol);
          
          // Skip stocks without valid previous close data to avoid incorrect calculations
          if (!previousClose || previousClose <= 0) {
            continue;
          }
          
          const change = result.c - previousClose;
          const changePercent = (change / previousClose) * 100;
          
          // Validate no NaN values before adding to results
          if (isNaN(change) || isNaN(changePercent)) {
            console.warn(`Skipping ${symbol}: invalid change calculation`);
            continue;
          }

          validResults.push({ result, change, changePercent });
        }

        // Sort by volume and take top symbols to reduce Yahoo API load
        const topSymbols = validResults
          .sort((a, b) => (b.result.v || 0) - (a.result.v || 0))
          .slice(0, 200) // Limit to top 200 by volume
          .map(item => item.result.T);

        // Use a simple free sector mapping for major stocks instead of relying on unreliable APIs
        const sectorMap = this.getMajorStockSectors();
        console.log(`Using pre-defined sector data for ${sectorMap.size} major stocks`);

        // Process all valid results with enhanced sector logic
        for (const { result, change, changePercent } of validResults) {
          const symbol = result.T;
          const tickerInfo = tickerMap.get(symbol);
          
          // Get sector using pre-defined mapping first, then fallback logic
          const predefinedSector = sectorMap.get(symbol);
          const sector = await this.getSectorForStock(symbol, predefinedSector, tickerInfo?.type, true);

          stocks.push({
            symbol,
            name: tickerInfo?.name ? this.cleanCompanyName(tickerInfo.name) : this.getReadableSymbolName(symbol),
            sector,
            currentPrice: result.c,
            previousClose: previousCloseMap.get(symbol)!,
            change,
            changePercent,
            volume: result.v || 0,
            marketCap: null, // Will be populated with real data from detailed endpoint
            isActive: true,
          });
        }
      }
    } catch (error) {
      console.error('Polygon API error, falling back to Yahoo Finance:', error);
      
      // Fallback to Yahoo Finance
      const targetSymbols = symbols.length > 0 ? symbols : [
        'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX', 'AMD', 'CRM'
      ];

      const yahooData = await this.yahooApi.getMultipleQuotes(targetSymbols);
      
      for (const quote of yahooData) {
        if (quote.regularMarketPrice && quote.regularMarketPreviousClose) {
          // Use enhanced sector logic for Yahoo fallback (skip Polygon during bulk init)
          const sector = await this.getSectorForStock(quote.symbol, quote.sector, undefined, true);

          stocks.push({
            symbol: quote.symbol,
            name: this.cleanCompanyName(quote.longName || quote.shortName || quote.symbol),
            sector,
            currentPrice: quote.regularMarketPrice,
            previousClose: quote.regularMarketPreviousClose,
            change: quote.regularMarketChange || 0,
            changePercent: quote.regularMarketChangePercent || 0,
            volume: quote.regularMarketVolume || 0,
            marketCap: quote.marketCap || null,
            isActive: true,
          });
        }
      }
    }

    return stocks;
  }

  async fetchMarketIndices(): Promise<InsertMarketIndex[]> {
    const indices: InsertMarketIndex[] = [];
    const indexSymbols = [
      { symbol: '^GSPC', name: 'S&P 500', displaySymbol: 'SPY' },
      { symbol: '^IXIC', name: 'NASDAQ', displaySymbol: 'QQQ' },
      { symbol: '^DJI', name: 'Dow Jones', displaySymbol: 'DIA' }
    ];

    try {
      // Try Yahoo Finance for indices
      for (const index of indexSymbols) {
        const quote = await this.yahooApi.getQuote(index.symbol);
        if (quote && quote.regularMarketPrice && quote.regularMarketPreviousClose) {
          indices.push({
            name: index.name,
            symbol: index.displaySymbol, // Use display symbol for frontend consistency
            value: quote.regularMarketPrice,
            change: quote.regularMarketChange || 0,
            changePercent: quote.regularMarketChangePercent || 0,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching market indices:', error);
    }

    return indices;
  }

  async searchStocks(query: string): Promise<InsertStock[]> {
    const stocks: InsertStock[] = [];

    try {
      // Try Polygon search first, but use Yahoo Finance for accurate price data
      const polygonResults = await this.polygonApi.searchTickers(query);
      
      if (polygonResults.results) {
        // Get symbols and fetch accurate quotes from Yahoo Finance
        const symbols = polygonResults.results.slice(0, 10).map(t => t.ticker);
        const yahooQuotes = await this.yahooApi.getMultipleQuotes(symbols);
        
        for (const quote of yahooQuotes) {
          if (quote.regularMarketPrice && quote.regularMarketPreviousClose) {
            const tickerInfo = polygonResults.results.find(t => t.ticker === quote.symbol);
            // Use enhanced sector logic for search results (allow Polygon for individual searches)
            const sector = await this.getSectorForStock(quote.symbol, quote.sector, tickerInfo?.type);

            stocks.push({
              symbol: quote.symbol,
              name: this.cleanCompanyName(quote.longName || quote.shortName || tickerInfo?.name || quote.symbol),
              sector,
              currentPrice: quote.regularMarketPrice,
              previousClose: quote.regularMarketPreviousClose,
              change: quote.regularMarketChange || 0,
              changePercent: quote.regularMarketChangePercent || 0,
              volume: quote.regularMarketVolume || 0,
              marketCap: quote.marketCap || null,
              isActive: tickerInfo?.active ?? true,
            });
          }
        }
      }
    } catch (error) {
      console.error('Polygon search error, falling back to Yahoo Finance:', error);
      
      // Fallback to Yahoo Finance search
      const yahooResults = await this.yahooApi.searchSymbols(query);
      for (const quote of yahooResults) {
        if (quote.regularMarketPrice && quote.regularMarketPreviousClose) {
          // Use enhanced sector logic for Yahoo fallback (allow Polygon for individual searches)
          const sector = await this.getSectorForStock(quote.symbol, quote.sector);

          stocks.push({
            symbol: quote.symbol,
            name: this.cleanCompanyName(quote.longName || quote.shortName || quote.symbol),
            sector,
            currentPrice: quote.regularMarketPrice,
            previousClose: quote.regularMarketPreviousClose,
            change: quote.regularMarketChange || 0,
            changePercent: quote.regularMarketChangePercent || 0,
            volume: quote.regularMarketVolume || 0,
            marketCap: quote.marketCap || null,
            isActive: true,
          });
        }
      }
    }

    return stocks;
  }

  private getSectorFromSIC(sicCode?: string): string {
    if (!sicCode) return 'Unknown';
    
    const sic = parseInt(sicCode);
    
    // SIC code to sector mapping based on major divisions
    if (sic >= 100 && sic <= 999) return 'Agriculture';
    if (sic >= 1000 && sic <= 1499) return 'Mining';
    if (sic >= 1500 && sic <= 1799) return 'Construction';
    if (sic >= 2000 && sic <= 2099) return 'Food Products';
    if (sic >= 2100 && sic <= 2199) return 'Tobacco Products';
    if (sic >= 2200 && sic <= 2299) return 'Textiles';
    if (sic >= 2300 && sic <= 2399) return 'Apparel';
    if (sic >= 2400 && sic <= 2499) return 'Wood Products';
    if (sic >= 2500 && sic <= 2599) return 'Furniture';
    if (sic >= 2600 && sic <= 2699) return 'Paper Products';
    if (sic >= 2700 && sic <= 2799) return 'Publishing';
    if (sic >= 2800 && sic <= 2899) return 'Chemicals';
    if (sic >= 2900 && sic <= 2999) return 'Petroleum';
    if (sic >= 3000 && sic <= 3099) return 'Rubber';
    if (sic >= 3100 && sic <= 3199) return 'Leather Products';
    if (sic >= 3200 && sic <= 3299) return 'Stone & Glass';
    if (sic >= 3300 && sic <= 3399) return 'Metals';
    if (sic >= 3400 && sic <= 3499) return 'Machinery';
    if (sic >= 3500 && sic <= 3599) return 'Industrial Equipment';
    if (sic >= 3600 && sic <= 3699) return 'Electronics';
    if (sic >= 3700 && sic <= 3799) return 'Transportation Equipment';
    if (sic >= 3800 && sic <= 3899) return 'Instruments';
    if (sic >= 3900 && sic <= 3999) return 'Manufacturing';
    if (sic >= 4000 && sic <= 4099) return 'Railroad Transportation';
    if (sic >= 4100 && sic <= 4199) return 'Transportation';
    if (sic >= 4200 && sic <= 4299) return 'Trucking';
    if (sic >= 4400 && sic <= 4499) return 'Water Transportation';
    if (sic >= 4500 && sic <= 4599) return 'Air Transportation';
    if (sic >= 4600 && sic <= 4699) return 'Transportation Services';
    if (sic >= 4700 && sic <= 4799) return 'Transportation Services';
    if (sic >= 4800 && sic <= 4899) return 'Communications';
    if (sic >= 4900 && sic <= 4999) return 'Utilities';
    if (sic >= 5000 && sic <= 5199) return 'Wholesale Trade';
    if (sic >= 5200 && sic <= 5999) return 'Retail Trade';
    if (sic >= 6000 && sic <= 6099) return 'Banking';
    if (sic >= 6100 && sic <= 6199) return 'Credit Agencies';
    if (sic >= 6200 && sic <= 6299) return 'Securities';
    if (sic >= 6300 && sic <= 6399) return 'Insurance';
    if (sic >= 6400 && sic <= 6499) return 'Insurance Agents';
    if (sic >= 6500 && sic <= 6599) return 'Real Estate';
    if (sic >= 6700 && sic <= 6799) return 'Investment Services';
    if (sic >= 7000 && sic <= 7099) return 'Hotels';
    if (sic >= 7200 && sic <= 7299) return 'Personal Services';
    if (sic >= 7300 && sic <= 7399) return 'Business Services';
    if (sic >= 7500 && sic <= 7599) return 'Automotive Services';
    if (sic >= 7600 && sic <= 7699) return 'Miscellaneous Repair';
    if (sic >= 7800 && sic <= 7899) return 'Entertainment';
    if (sic >= 7900 && sic <= 7999) return 'Recreation Services';
    if (sic >= 8000 && sic <= 8099) return 'Healthcare';
    if (sic >= 8100 && sic <= 8199) return 'Legal Services';
    if (sic >= 8200 && sic <= 8299) return 'Education';
    if (sic >= 8300 && sic <= 8399) return 'Social Services';
    if (sic >= 8400 && sic <= 8499) return 'Museums';
    if (sic >= 8600 && sic <= 8699) return 'Professional Services';
    if (sic >= 8700 && sic <= 8799) return 'Engineering Services';
    if (sic >= 8800 && sic <= 8899) return 'Private Households';
    if (sic >= 9100 && sic <= 9199) return 'Government';
    if (sic >= 9200 && sic <= 9299) return 'Justice & Safety';
    if (sic >= 9300 && sic <= 9399) return 'Public Finance';
    if (sic >= 9400 && sic <= 9499) return 'Administration';
    if (sic >= 9500 && sic <= 9699) return 'Government';
    if (sic >= 9700 && sic <= 9999) return 'Non-Classifiable';
    
    return 'Unknown';
  }

  private getSecurityTypeCategory(type?: string): string {
    if (!type) return 'Unknown';
    
    // Only use security type for actual security categories, not business sectors
    const typeMap: Record<string, string> = {
      'ETF': 'Fund',
      'FUND': 'Fund',
      'INDEX': 'Index',
      'WARRANT': 'Warrant',
      'RIGHT': 'Rights',
      'BOND': 'Bond',
      'NOTE': 'Bond',
      'UNIT': 'Unit',
    };

    return typeMap[type] || 'Stock';
  }

  // Enhanced sector identification with proper prioritization and caching
  private async getSectorForStock(symbol: string, yahooSector?: string, tickerType?: string, skipPolygonDetails = false): Promise<string> {
    // Check cache first
    const cached = this.sectorCache.get(symbol);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      return cached.sector;
    }

    let sector = 'Unknown';

    // Priority 1: Yahoo Finance sector data (most reliable for business sectors)
    if (yahooSector && yahooSector !== 'Unknown') {
      sector = yahooSector;
    } else if (!skipPolygonDetails) {
      // Priority 2: Try to get detailed Polygon data with SIC code (only if not rate limited)
      try {
        const details = await this.polygonApi.getTickerDetails(symbol);
        if (details.results?.sic_code) {
          const sicSector = this.getSectorFromSIC(details.results.sic_code);
          if (sicSector !== 'Unknown') {
            sector = sicSector;
          }
        }
      } catch (error) {
        // Polygon details failed, continue with fallback (don't log for rate limits)
        if (error instanceof Error && !error.message.includes('429')) {
          console.warn(`Failed to get Polygon details for ${symbol}:`, error);
        }
      }
    }

    // Priority 3: Check if it's a fund/index based on security type
    if (sector === 'Unknown') {
      const securityCategory = this.getSecurityTypeCategory(tickerType);
      if (securityCategory !== 'Stock') {
        sector = securityCategory;
      }
    }

    // Cache the result
    this.sectorCache.set(symbol, { sector, timestamp: Date.now() });
    return sector;
  }

  async getNews(symbol: string, limit: number = 10): Promise<any[]> {
    return this.yahooApi.getNews(symbol, limit);
  }

  private getReadableSymbolName(symbol: string): string {
    // Convert ticker symbol to a more readable name as fallback
    return symbol.replace(/[^A-Z]/g, '').toUpperCase();
  }

  // Clean up company names by removing corporate suffixes for professional display
  private cleanCompanyName(name: string): string {
    if (!name) return name;
    
    // List of corporate suffixes to remove (order matters - longer ones first)
    const suffixes = [
      ' Corporation',
      ' Incorporated',
      ' Company',
      ' Limited',
      ' Corp.',
      ' Corp',
      ' Inc.',
      ' Inc',
      ' Ltd.',
      ' Ltd',
      ' Co.',
      ' Co',
      ' LLC',
      ' L.P.',
      ' LP',
      ' PLC',
      ' Group',
      ' Holdings',
      ' International',
      ' Intl',
      ' Systems',
      ' Technologies',
      ' Tech',
      ' Solutions',
      ' Services',
      ' Enterprises'
    ];
    
    let cleanName = name.trim();
    
    // Remove suffixes (case-insensitive)
    for (const suffix of suffixes) {
      const regex = new RegExp(`${suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
      cleanName = cleanName.replace(regex, '').trim();
    }
    
    // Clean up extra spaces and commas
    cleanName = cleanName.replace(/\s*,\s*$/, '').trim();
    cleanName = cleanName.replace(/\s+/g, ' ');
    
    // If we ended up with an empty string or just punctuation, return original
    if (!cleanName || cleanName.match(/^[^a-zA-Z0-9]+$/)) {
      return name;
    }
    
    return cleanName;
  }

  private getPreviousBusinessDay(daysBack: number = 1): string {
    const date = new Date();
    let businessDaysBack = 0;
    
    while (businessDaysBack < daysBack) {
      date.setDate(date.getDate() - 1);
      // Skip weekends
      if (date.getDay() !== 0 && date.getDay() !== 6) {
        businessDaysBack++;
      }
    }
    
    return date.toISOString().split('T')[0];
  }

  private getLastTradingDay(daysBack: number = 1): string {
    // More robust trading day calculation that can handle holidays
    const date = new Date();
    let tradingDaysBack = 0;
    
    // Common market holidays (basic implementation)
    const holidays = [
      '2024-01-01', '2024-01-15', '2024-02-19', '2024-03-29', '2024-05-27',
      '2024-06-19', '2024-07-04', '2024-09-02', '2024-11-28', '2024-12-25',
      '2025-01-01', '2025-01-20', '2025-02-17', '2025-04-18', '2025-05-26',
      '2025-06-19', '2025-07-04', '2025-09-01', '2025-11-27', '2025-12-25'
    ];
    
    while (tradingDaysBack < daysBack) {
      date.setDate(date.getDate() - 1);
      const dateStr = date.toISOString().split('T')[0];
      
      // Skip weekends and holidays
      if (date.getDay() !== 0 && date.getDay() !== 6 && !holidays.includes(dateStr)) {
        tradingDaysBack++;
      }
    }
    
    return date.toISOString().split('T')[0];
  }

  // Get detailed stock information including financial metrics
  async getDetailedStockData(symbol: string): Promise<any> {
    console.log(`Fetching detailed data for ${symbol} using multiple Yahoo Finance sources`);
    
    // Try multiple Yahoo Finance endpoints for reliable data
    const endpoints = [
      // Primary endpoint - chart data with price ranges
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1y&includePrePost=false`,
      // QuoteSummary endpoint for financial data including market cap and P/E
      `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=summaryDetail,defaultKeyStatistics,financialData`,
      // Alternative endpoint for basic quote data including some financials
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}&crumb=ignore`,
      // Backup quoteSummary endpoint  
      `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=summaryDetail,defaultKeyStatistics,financialData`,
      // Backup endpoint with different structure
      `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}`
    ];

    // First, try to get Yahoo Finance data (don't return early - we'll enhance with Polygon)
    let yahooData: any = null;
    
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying endpoint: ${endpoint}`);
        const response = await fetch(endpoint, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
          }
        });

        if (!response.ok) {
          console.log(`Endpoint failed with status: ${response.status}`);
          continue;
        }

        const data = await response.json();
        console.log(`Successfully got data from: ${endpoint}`);

        // Handle chart endpoint (contains basic price data)
        if (endpoint.includes('chart')) {
          const chart = data?.chart?.result?.[0];
          if (chart?.meta) {
            const meta = chart.meta;
            yahooData = {
              symbol: symbol.toUpperCase(),
              name: this.cleanCompanyName(meta.longName || meta.shortName || symbol),
              sector: 'Unknown',
              exchange: meta.exchangeName || 'Unknown',
              currency: meta.currency || 'USD',
              
              currentPrice: meta.regularMarketPrice || 0,
              previousClose: meta.previousClose || 0,
              change: (meta.regularMarketPrice || 0) - (meta.previousClose || 0),
              changePercent: meta.regularMarketPrice && meta.previousClose ? 
                ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose * 100) : 0,
              
              dayHigh: meta.regularMarketDayHigh || null,
              dayLow: meta.regularMarketDayLow || null,
              fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh || null,
              fiftyTwoWeekLow: meta.fiftyTwoWeekLow || null,
              
              volume: meta.regularMarketVolume || 0,
              marketCap: null, // Will be enhanced with Polygon.io
              peRatio: null, // Will be enhanced with Polygon.io
              
              lastUpdated: new Date().toISOString(),
            };
            break; // Got Yahoo data, now enhance with Polygon
          }
        }
        
        // Handle quoteSummary endpoint (contains comprehensive financial data)
        if (endpoint.includes('quoteSummary')) {
          const quoteSummary = data?.quoteSummary?.result?.[0];
          if (quoteSummary) {
            const summaryDetail = quoteSummary.summaryDetail;
            const defaultKeyStatistics = quoteSummary.defaultKeyStatistics;
            const financialData = quoteSummary.financialData;
            
            if (summaryDetail || defaultKeyStatistics || financialData) {
              yahooData = {
                symbol: symbol.toUpperCase(),
                name: this.cleanCompanyName(summaryDetail?.longName?.fmt || defaultKeyStatistics?.longName?.fmt || symbol),
                sector: summaryDetail?.sector?.fmt || 'Unknown',
                exchange: 'NASDAQ', // QuoteSummary doesn't always include exchange
                currency: summaryDetail?.currency?.fmt || 'USD',
                
                // Price data from summaryDetail
                currentPrice: summaryDetail?.regularMarketPrice?.raw || financialData?.currentPrice?.raw || 0,
                previousClose: summaryDetail?.regularMarketPreviousClose?.raw || financialData?.regularMarketPreviousClose?.raw || 0,
                change: summaryDetail?.regularMarketChange?.raw || 0,
                changePercent: summaryDetail?.regularMarketChangePercent?.raw ? 
                  (summaryDetail.regularMarketChangePercent.raw * 100) : 0,
                
                // Price ranges from summaryDetail
                dayHigh: summaryDetail?.dayHigh?.raw || null,
                dayLow: summaryDetail?.dayLow?.raw || null,
                fiftyTwoWeekHigh: summaryDetail?.fiftyTwoWeekHigh?.raw || null,
                fiftyTwoWeekLow: summaryDetail?.fiftyTwoWeekLow?.raw || null,
                
                // Volume data
                volume: summaryDetail?.regularMarketVolume?.raw || 0,
                avgVolume: summaryDetail?.averageVolume?.raw || null,
                
                // REAL Market Cap and P/E from Yahoo Finance
                marketCap: summaryDetail?.marketCap?.raw || defaultKeyStatistics?.marketCap?.raw || null,
                peRatio: summaryDetail?.trailingPE?.raw || defaultKeyStatistics?.trailingPE?.raw || null,
                
                // Additional financial data
                beta: defaultKeyStatistics?.beta?.raw || null,
                eps: defaultKeyStatistics?.trailingEps?.raw || null,
                dividendYield: summaryDetail?.dividendYield?.raw ? 
                  (summaryDetail.dividendYield.raw * 100) : null,
                
                lastUpdated: new Date().toISOString(),
              };
              break; // Got comprehensive Yahoo data
            }
          }
        }
        
        // Handle v7 quote endpoint (may contain financial data)
        if (endpoint.includes('/v7/finance/quote')) {
          const quote = data?.quoteResponse?.result?.[0];
          if (quote) {
            yahooData = {
              symbol: symbol.toUpperCase(),
              name: this.cleanCompanyName(quote.longName || quote.shortName || quote.displayName || symbol),
              sector: quote.sector || 'Unknown',
              exchange: quote.fullExchangeName || quote.exchange || 'Unknown',
              currency: quote.currency || 'USD',
              
              currentPrice: quote.regularMarketPrice || 0,
              previousClose: quote.regularMarketPreviousClose || 0,
              change: quote.regularMarketChange || 0,
              changePercent: quote.regularMarketChangePercent || 0,
              
              dayHigh: quote.regularMarketDayHigh || null,
              dayLow: quote.regularMarketDayLow || null,
              fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh || null,
              fiftyTwoWeekLow: quote.fiftyTwoWeekLow || null,
              
              volume: quote.regularMarketVolume || 0,
              avgVolume: quote.averageVolume || null,
              marketCap: quote.marketCap || null, // Might have it, but enhance anyway
              
              peRatio: quote.trailingPE || null,
              beta: quote.beta || null,
              eps: quote.epsTrailingTwelveMonths || null,
              dividendYield: quote.trailingAnnualDividendYield || null,
              
              lastUpdated: new Date().toISOString(),
            };
            break; // Got Yahoo data, now enhance with Polygon
          }
        }
      } catch (error) {
        console.error(`Error with endpoint ${endpoint}:`, error);
        continue;
      }
    }

    // Now ALWAYS enhance with Polygon.io data for market cap and fundamentals
    console.log(`Enhancing ${symbol} data with Polygon.io market cap and fundamentals`);
    try {
      const polygonDetails = await this.polygonApi.getTickerDetails(symbol);
      const polygonData = polygonDetails.results;
      
      if (polygonData && yahooData) {
        console.log(`Got Polygon data for ${symbol}: Market Cap = ${polygonData.market_cap}`);
        
        // Calculate P/E ratio if we have market cap and shares outstanding  
        let peRatio = yahooData.peRatio; // Keep Yahoo P/E if available
        if (!peRatio && polygonData.market_cap && polygonData.weighted_shares_outstanding && yahooData.currentPrice) {
          // Simple P/E estimation: Market Cap / (Shares * Current Price) 
          const totalShares = polygonData.weighted_shares_outstanding;
          const currentPrice = yahooData.currentPrice;
          if (totalShares > 0 && currentPrice > 0) {
            const impliedEarnings = polygonData.market_cap / totalShares;
            peRatio = Math.round(currentPrice / (impliedEarnings / totalShares) * 100) / 100 || null;
          }
        }

        // Return COMBINED data from Yahoo Finance + Polygon.io
        return {
          ...yahooData, // Start with Yahoo data (prices, ranges)
          
          // Override with better Polygon.io data
          name: this.cleanCompanyName(polygonData.name || yahooData.name),
          sector: polygonData.sic_description || yahooData.sector,
          exchange: polygonData.primary_exchange || yahooData.exchange,
          currency: polygonData.currency_name?.toUpperCase() || yahooData.currency,
          
          // REAL Market Cap from Polygon.io
          marketCap: polygonData.market_cap || yahooData.marketCap,
          
          // Enhanced P/E ratio 
          peRatio: peRatio,
          
          // Additional Polygon.io data
          sharesOutstanding: polygonData.weighted_shares_outstanding || null,
          employees: polygonData.total_employees || null,
          description: polygonData.description || null,
          
          lastUpdated: new Date().toISOString(),
        };
      }
      
      // If only Polygon worked but not Yahoo
      if (polygonData && !yahooData) {
        console.log(`Only got Polygon data for ${symbol}, using as fallback`);
        return {
          symbol: symbol.toUpperCase(),
          name: this.cleanCompanyName(polygonData.name || symbol),
          sector: polygonData.sic_description || 'Unknown',
          exchange: polygonData.primary_exchange || 'Unknown',
          currency: polygonData.currency_name?.toUpperCase() || 'USD',
          marketCap: polygonData.market_cap || null,
          sharesOutstanding: polygonData.weighted_shares_outstanding || null,
          employees: polygonData.total_employees || null,
          description: polygonData.description || null,
          lastUpdated: new Date().toISOString(),
        };
      }
    } catch (polygonError) {
      console.error(`Polygon.io failed for ${symbol}:`, polygonError);
    }
    
    // If we got Yahoo data but Polygon failed, return Yahoo data
    if (yahooData) {
      console.log(`Returning Yahoo-only data for ${symbol}`);
      return yahooData;
    }

    // Final fallback to basic Yahoo API
    console.log(`All enhanced sources failed, trying basic fallback for ${symbol}`);
    try {
      const basicQuote = await this.yahooApi.getQuote(symbol);
      if (basicQuote) {
        return {
          symbol: symbol.toUpperCase(),
          name: this.cleanCompanyName(basicQuote.longName || basicQuote.shortName || symbol),
          currentPrice: basicQuote.regularMarketPrice || 0,
          previousClose: basicQuote.regularMarketPreviousClose || 0,
          volume: basicQuote.regularMarketVolume || 0,
          marketCap: basicQuote.marketCap || null,
          lastUpdated: new Date().toISOString(),
        };
      }
    } catch (fallbackError) {
      console.error(`Final fallback also failed for ${symbol}:`, fallbackError);
    }

    console.error(`All data sources completely failed for ${symbol}`);
    return null;
  }
}
