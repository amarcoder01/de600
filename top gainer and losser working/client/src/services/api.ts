import { MarketData, MarketStatus, StockSearchResponse, StockDetails } from '@shared/schema';

class ApiService {
  private baseUrl = '';

  async fetchMarketData(count: number = 25): Promise<MarketData> {
    const response = await fetch(`/api/market-data?count=${count}`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch market data: ${response.statusText}`);
    }
    
    return response.json();
  }

  async fetchMarketStatus(): Promise<MarketStatus> {
    const response = await fetch('/api/market-status', {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch market status: ${response.statusText}`);
    }
    
    return response.json();
  }

  async refreshMarketData(): Promise<MarketData> {
    const response = await fetch('/api/market-data/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to refresh market data: ${response.statusText}`);
    }
    
    return response.json();
  }

  async searchStocks(query: string): Promise<StockSearchResponse> {
    const response = await fetch(`/api/stocks/search?q=${encodeURIComponent(query)}`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to search stocks: ${response.statusText}`);
    }
    
    return response.json();
  }

  async fetchStockDetails(symbol: string): Promise<StockDetails> {
    const response = await fetch(`/api/stocks/${symbol.toUpperCase()}`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch stock details: ${response.statusText}`);
    }
    
    return response.json();
  }
}

export const apiService = new ApiService();
