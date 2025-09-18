interface YahooQuote {
  symbol: string;
  longName?: string;
  shortName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketVolume?: number;
  marketCap?: number;
  sector?: string;
  industry?: string;
}

interface YahooMarketSummary {
  symbol: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
}

export class YahooFinanceService {
  private readonly baseUrl = 'https://query1.finance.yahoo.com/v8/finance/chart';
  private readonly quoteSummaryUrl = 'https://query1.finance.yahoo.com/v10/finance/quoteSummary';

  async getQuote(symbol: string): Promise<YahooQuote | null> {
    try {
      const response = await fetch(`${this.baseUrl}/${symbol}?metrics=high?&interval=1d&range=1d`);
      
      if (!response.ok) {
        throw new Error(`Yahoo Finance API error: ${response.status}`);
      }

      const data = await response.json();
      const result = data.chart?.result?.[0];
      
      if (!result) {
        return null;
      }

      const meta = result.meta;
      const currentPrice = meta.regularMarketPrice;
      const previousClose = meta.previousClose;
      const change = currentPrice - previousClose;
      const changePercent = (change / previousClose) * 100;

      return {
        symbol: symbol.toUpperCase(),
        longName: meta.longName || meta.shortName || symbol,
        shortName: meta.shortName,
        regularMarketPrice: currentPrice,
        regularMarketChange: change,
        regularMarketChangePercent: changePercent,
        regularMarketVolume: meta.regularMarketVolume,
        marketCap: meta.marketCap,
      };
    } catch (error) {
      console.error(`Error fetching Yahoo Finance data for ${symbol}:`, error);
      return null;
    }
  }

  async getQuoteSummary(symbol: string): Promise<any> {
    try {
      const modules = 'summaryDetail,price,defaultKeyStatistics,assetProfile';
      const response = await fetch(`${this.quoteSummaryUrl}/${symbol}?modules=${modules}`);
      
      if (!response.ok) {
        throw new Error(`Yahoo Finance Quote Summary API error: ${response.status}`);
      }

      const data = await response.json();
      return data.quoteSummary?.result?.[0] || null;
    } catch (error) {
      console.error(`Error fetching Yahoo Finance quote summary for ${symbol}:`, error);
      return null;
    }
  }

  async getMarketSummary(): Promise<YahooMarketSummary[]> {
    try {
      const indices = ['^GSPC', '^IXIC', '^DJI']; // S&P 500, NASDAQ, Dow Jones
      const promises = indices.map(async (symbol) => {
        const quote = await this.getQuote(symbol);
        if (quote) {
          return {
            symbol: symbol,
            regularMarketPrice: quote.regularMarketPrice,
            regularMarketChange: quote.regularMarketChange,
            regularMarketChangePercent: quote.regularMarketChangePercent,
          };
        }
        return null;
      });

      const results = await Promise.all(promises);
      return results.filter(Boolean) as YahooMarketSummary[];
    } catch (error) {
      console.error('Error fetching market summary:', error);
      return [];
    }
  }

  // Helper method to format volume
  formatVolume(volume: number): string {
    if (volume >= 1_000_000_000) {
      return `${(volume / 1_000_000_000).toFixed(1)}B`;
    } else if (volume >= 1_000_000) {
      return `${(volume / 1_000_000).toFixed(1)}M`;
    } else if (volume >= 1_000) {
      return `${(volume / 1_000).toFixed(1)}K`;
    }
    return volume.toString();
  }

  // Helper method to format market cap
  formatMarketCap(marketCap: number): string {
    if (marketCap >= 1_000_000_000_000) {
      return `${(marketCap / 1_000_000_000_000).toFixed(2)}T`;
    } else if (marketCap >= 1_000_000_000) {
      return `${(marketCap / 1_000_000_000).toFixed(2)}B`;
    } else if (marketCap >= 1_000_000) {
      return `${(marketCap / 1_000_000).toFixed(2)}M`;
    }
    return marketCap.toString();
  }
}

export const yahooFinanceService = new YahooFinanceService();
