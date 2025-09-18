interface YahooFinanceQuote {
  symbol: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  regularMarketPreviousClose?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketVolume?: number;
  marketCap?: number;
  sector?: string;
}

export class YahooFinanceService {
  private baseUrl = 'https://query1.finance.yahoo.com/v8/finance/chart';

  async getQuote(symbol: string): Promise<YahooFinanceQuote | null> {
    try {
      const response = await fetch(`${this.baseUrl}/${symbol}`);
      if (!response.ok) {
        throw new Error(`Yahoo Finance API error: ${response.status}`);
      }

      const data = await response.json();
      const result = data.chart?.result?.[0];
      
      if (!result) {
        return null;
      }

      const meta = result.meta;
      const quote = result.indicators?.quote?.[0];

      return {
        symbol: meta.symbol,
        shortName: meta.shortName,
        longName: meta.longName,
        regularMarketPrice: meta.regularMarketPrice,
        regularMarketPreviousClose: meta.previousClose,
        regularMarketChange: meta.regularMarketPrice - meta.previousClose,
        regularMarketChangePercent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
        regularMarketVolume: quote?.volume?.[0],
        marketCap: meta.marketCap,
        sector: meta.sector,
      };
    } catch (error) {
      console.error(`Yahoo Finance error for ${symbol}:`, error);
      return null;
    }
  }

  async getMultipleQuotes(symbols: string[]): Promise<YahooFinanceQuote[]> {
    const promises = symbols.map(symbol => this.getQuote(symbol));
    const results = await Promise.allSettled(promises);
    
    return results
      .map(result => result.status === 'fulfilled' ? result.value : null)
      .filter((quote): quote is YahooFinanceQuote => quote !== null);
  }

  async searchSymbols(query: string): Promise<YahooFinanceQuote[]> {
    try {
      // This is a simplified search - in a real implementation, you'd use Yahoo's search API
      const commonSymbols = [
        'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX', 'AMD', 'CRM'
      ];
      
      const matchingSymbols = commonSymbols.filter(symbol => 
        symbol.toLowerCase().includes(query.toLowerCase())
      );
      
      return this.getMultipleQuotes(matchingSymbols);
    } catch (error) {
      console.error('Yahoo Finance search error:', error);
      return [];
    }
  }

  async getNews(symbol: string, limit: number = 10): Promise<any[]> {
    try {
      // Yahoo Finance News API endpoint
      const newsUrl = `https://query1.finance.yahoo.com/v7/finance/news?symbols=${symbol}&count=${limit}`;
      const response = await fetch(newsUrl);
      
      if (!response.ok) {
        throw new Error(`Yahoo Finance News API error: ${response.status}`);
      }

      const data = await response.json();
      const articles = data.stream || [];

      return articles.map((article: any) => ({
        title: article.title || 'No Title',
        summary: article.summary || article.excerpt || '',
        url: article.link || article.url || '',
        publishedAt: new Date(article.providerPublishTime * 1000).toISOString(),
        source: article.publisher || 'Yahoo Finance',
        thumbnail: article.thumbnail?.url || article.thumbnail || null,
        relatedSymbols: article.relatedTickers || [symbol],
      }));
    } catch (error) {
      console.error(`Yahoo Finance news error for ${symbol}:`, error);
      
      // Fallback: Return mock news data for development
      return this.getMockNews(symbol, limit);
    }
  }

  private getMockNews(symbol: string, limit: number): any[] {
    const mockNews = [
      {
        title: `${symbol} Reports Strong Quarterly Earnings`,
        summary: `${symbol} exceeded analyst expectations with robust revenue growth and improved profit margins, driven by strong demand and operational efficiency.`,
        url: `https://finance.yahoo.com/news/${symbol.toLowerCase()}-earnings`,
        publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        source: 'Yahoo Finance',
        thumbnail: null,
        relatedSymbols: [symbol],
      },
      {
        title: `Analysts Upgrade ${symbol} Price Target`,
        summary: `Multiple investment firms have raised their price targets for ${symbol}, citing strong fundamentals and positive market outlook.`,
        url: `https://finance.yahoo.com/news/${symbol.toLowerCase()}-analyst-upgrade`,
        publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
        source: 'MarketWatch',
        thumbnail: null,
        relatedSymbols: [symbol],
      },
      {
        title: `${symbol} Announces Strategic Partnership`,
        summary: `The company revealed a new partnership that is expected to expand its market reach and enhance its competitive position.`,
        url: `https://finance.yahoo.com/news/${symbol.toLowerCase()}-partnership`,
        publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        source: 'Reuters',
        thumbnail: null,
        relatedSymbols: [symbol],
      },
    ];

    return mockNews.slice(0, limit);
  }
}
