import { MarketData, MarketStatus, StockSearchResponse, StockDetails } from '@/types/top-gainers-losers';

class TopGainersLosersApiService {
  private baseUrl = '';

  async fetchMarketData(count: number = 25): Promise<MarketData> {
    const response = await fetch(`/api/top-gainers-losers/market-data?count=${count}`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch market data: ${response.statusText}`);
    }
    
    return response.json();
  }

  async fetchMarketStatus(): Promise<MarketStatus> {
    const response = await fetch('/api/top-gainers-losers/market-status', {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch market status: ${response.statusText}`);
    }
    
    return response.json();
  }

  async refreshMarketData(): Promise<MarketData> {
    const response = await fetch('/api/top-gainers-losers/market-data', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to refresh market data: ${response.statusText}`);
    }
    
    return response.json();
  }

  async searchStocks(query: string): Promise<StockSearchResponse> {
    const response = await fetch(`/api/top-gainers-losers/stocks/search?q=${encodeURIComponent(query)}`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to search stocks: ${response.statusText}`);
    }
    
    return response.json();
  }

  async fetchStockDetails(symbol: string): Promise<StockDetails> {
    const response = await fetch(`/api/top-gainers-losers/stocks/${symbol.toUpperCase()}`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch stock details: ${response.statusText}`);
    }
    
    return response.json();
  }
}

export const topGainersLosersApiService = new TopGainersLosersApiService();
