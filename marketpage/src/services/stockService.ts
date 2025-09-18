import { Stock, StockPrice, StockDetails, ApiResponse, ApiError, AppError } from '../types/stock';

const API_BASE_URL = 'https://api.polygon.io';
const API_KEY = process.env.POLYGON_API_KEY || '';

if (!API_KEY) {
  console.warn('POLYGON_API_KEY environment variable is not set');
}

class StockService {
  private async makeRequest<T>(url: string): Promise<T> {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new Error(`API Error: ${errorData.message || response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          throw this.createAppError('NETWORK_ERROR', 'Network connection failed. Please check your internet connection.');
        }
        throw this.createAppError('API_ERROR', error.message);
      }
      throw this.createAppError('API_ERROR', 'An unexpected error occurred');
    }
  }

  private createAppError(type: AppError['type'], message: string, details?: any): AppError {
    return { type, message, details };
  }

  private buildUrl(endpoint: string, params: Record<string, string | number | boolean>): string {
    const url = new URL(`${API_BASE_URL}${endpoint}`);
    
    // Add API key
    url.searchParams.append('apikey', API_KEY);
    
    // Add other parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString());
      }
    });
    
    return url.toString();
  }

  async getStocks(limit: number = 50, cursor?: string): Promise<{ stocks: Stock[]; nextCursor?: string }> {
    try {
      const params: Record<string, string | number | boolean> = {
        market: 'stocks',
        active: true,
        limit
      };
      
      if (cursor) {
        params.cursor = cursor;
      }
      
      const url = this.buildUrl('/v3/reference/tickers', params);
      const response: ApiResponse<Stock> = await this.makeRequest(url);
      
      return {
        stocks: response.results || [],
        nextCursor: response.next_url ? this.extractCursorFromUrl(response.next_url) : undefined
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('API Error')) {
        throw error;
      }
      throw this.createAppError('API_ERROR', 'Failed to fetch stock data');
    }
  }

  async searchStocks(query: string): Promise<Stock[]> {
    try {
      const params = {
        search: query,
        market: 'stocks',
        active: true,
        limit: 20
      };
      
      const url = this.buildUrl('/v3/reference/tickers', params);
      const response: ApiResponse<Stock> = await this.makeRequest(url);
      
      return response.results || [];
    } catch (error) {
      if (error instanceof Error && error.message.includes('API Error')) {
        throw error;
      }
      throw this.createAppError('API_ERROR', 'Failed to search stocks');
    }
  }

  async getStockDetails(ticker: string): Promise<StockDetails> {
    try {
      const url = this.buildUrl(`/v2/aggs/ticker/${ticker}/prev`, {});
      const response: StockPrice = await this.makeRequest(url);
      
      if (!response.results || response.results.length === 0) {
        throw this.createAppError('API_ERROR', 'No data available for this stock');
      }
      
      const result = response.results[0];
      const price = result.c; // close price
      const previousClose = result.o; // open price as previous close
      const change = price - previousClose;
      const changePercent = (change / previousClose) * 100;
      
      // Check if market is closed (this is a simplified check)
      const now = new Date();
      const marketCloseTime = new Date();
      marketCloseTime.setHours(16, 0, 0, 0); // 4 PM EST
      const isMarketClosed = now > marketCloseTime;
      
      return {
        ticker: result.T,
        name: ticker, // We'll need to get this from the stock list
        price,
        change,
        changePercent,
        previousClose,
        isMarketClosed
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('API Error')) {
        throw error;
      }
      throw this.createAppError('API_ERROR', `Failed to fetch details for ${ticker}`);
    }
  }

  private extractCursorFromUrl(url: string): string | undefined {
    try {
      const urlObj = new URL(url);
      return urlObj.searchParams.get('cursor') || undefined;
    } catch {
      return undefined;
    }
  }

  isMarketClosed(): boolean {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday
    const hour = now.getHours();
    
    // Weekend
    if (day === 0 || day === 6) {
      return true;
    }
    
    // Weekday but outside market hours (9:30 AM - 4:00 PM EST)
    if (hour < 9 || (hour === 9 && now.getMinutes() < 30) || hour >= 16) {
      return true;
    }
    
    return false;
  }
}

export const stockService = new StockService();