import { apiRequest } from "./queryClient";
import type { StockApiResponse, MarketOverviewResponse, Stock, WatchlistItem } from "../types/stock";

export const stockApi = {
  getStocks: async (page: number = 1, limit: number = 10, sortBy?: string): Promise<StockApiResponse> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    if (sortBy) {
      params.append('sortBy', sortBy);
    }
    
    const response = await fetch(`/api/stocks?${params.toString()}`, {
      credentials: "include",
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch stocks: ${response.statusText}`);
    }
    
    return response.json();
  },

  getStock: async (symbol: string): Promise<Stock> => {
    const response = await fetch(`/api/stocks/${symbol}`, {
      credentials: "include",
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch stock ${symbol}: ${response.statusText}`);
    }
    
    return response.json();
  },

  searchStocks: async (query: string): Promise<{ stocks: Stock[] }> => {
    console.log(`API: Searching for "${query}"`);
    
    const response = await fetch('/api/stocks/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: "include",
      body: JSON.stringify({ query }),
    });
    
    console.log('API: Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API: Error response:', errorText);
      throw new Error(`Failed to search stocks: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('API: Success result:', result);
    return result;
  },

  getMarketIndices: async (): Promise<MarketOverviewResponse> => {
    const response = await fetch("/api/market/indices", {
      credentials: "include",
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch market indices: ${response.statusText}`);
    }
    
    return response.json();
  },

  refreshStockData: async (symbols?: string[]): Promise<{ message: string; count: number }> => {
    const response = await apiRequest("POST", "/api/stocks/refresh", { symbols });
    return response.json();
  },

  getWatchlist: async (userId?: string): Promise<WatchlistItem[]> => {
    const url = userId ? `/api/watchlist?userId=${userId}` : "/api/watchlist";
    const response = await fetch(url, {
      credentials: "include",
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch watchlist: ${response.statusText}`);
    }
    
    return response.json();
  },

  addToWatchlist: async (stockSymbol: string, userId?: string): Promise<WatchlistItem> => {
    const response = await apiRequest("POST", "/api/watchlist", { stockSymbol, userId });
    return response.json();
  },

  removeFromWatchlist: async (symbol: string, userId?: string): Promise<{ message: string }> => {
    const url = userId ? `/api/watchlist/${symbol}?userId=${userId}` : `/api/watchlist/${symbol}`;
    const response = await apiRequest("DELETE", url);
    return response.json();
  },

  // Get detailed stock information with financial metrics
  getStockDetails: async (symbol: string): Promise<any> => {
    const response = await fetch(`/api/stocks/${symbol}/details`, {
      credentials: "include",
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch stock details for ${symbol}: ${response.statusText}`);
    }
    
    return response.json();
  },
};
