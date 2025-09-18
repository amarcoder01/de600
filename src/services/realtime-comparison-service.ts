import { PolygonStockAPI } from '../lib/polygon-api';

export interface RealTimeStockUpdate {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: number;
  volume?: number;
}

// Export as StockUpdate for compatibility with hook
export type StockUpdate = RealTimeStockUpdate;

export interface ComparisonUpdateCallback {
  (updates: RealTimeStockUpdate[]): void;
}

// Single update callback for individual symbol updates
export interface SingleUpdateCallback {
  (symbol: string, update: StockUpdate): void;
}

// Connection change callback
export interface ConnectionChangeCallback {
  (connected: boolean): void;
}

export class RealTimeComparisonService {
  private static instance: RealTimeComparisonService;
  private polygonApi: PolygonStockAPI;
  private subscribers: Set<ComparisonUpdateCallback> = new Set();
  private singleUpdateSubscribers: Set<SingleUpdateCallback> = new Set();
  private connectionChangeSubscribers: Set<ConnectionChangeCallback> = new Set();
  private subscribedSymbols: Set<string> = new Set();
  private lastPrices: Map<string, number> = new Map();
  private baselinePrices = new Map<string, number>(); // Store previous close prices for accurate change calculations
  private updateInterval: NodeJS.Timeout | null = null;
  private isActive = false;
  private isConnected = false;

  private constructor() {
    this.polygonApi = PolygonStockAPI.getInstance();
  }

  static getInstance(): RealTimeComparisonService {
    if (!RealTimeComparisonService.instance) {
      RealTimeComparisonService.instance = new RealTimeComparisonService();
    }
    return RealTimeComparisonService.instance;
  }

  // Subscribe to real-time updates for comparison (batch updates)
  subscribe(callback: ComparisonUpdateCallback): () => void;
  // Subscribe to real-time updates for individual symbols
  subscribe(callback: SingleUpdateCallback): () => void;
  subscribe(callback: ComparisonUpdateCallback | SingleUpdateCallback): () => void {
    // Check if it's a single update callback by checking parameter count
    if (callback.length === 2) {
      this.singleUpdateSubscribers.add(callback as SingleUpdateCallback);
    } else {
      this.subscribers.add(callback as ComparisonUpdateCallback);
    }
    
    // Start the service if this is the first subscriber
    if ((this.subscribers.size + this.singleUpdateSubscribers.size) === 1 && this.subscribedSymbols.size > 0) {
      this.startRealTimeUpdates();
    }

    return () => {
      this.subscribers.delete(callback as ComparisonUpdateCallback);
      this.singleUpdateSubscribers.delete(callback as SingleUpdateCallback);
      // Stop the service if no more subscribers
      if (this.subscribers.size === 0 && this.singleUpdateSubscribers.size === 0) {
        this.stopRealTimeUpdates();
      }
    };
  }

  // Unsubscribe from updates
  unsubscribe(callback: ComparisonUpdateCallback | SingleUpdateCallback): void {
    this.subscribers.delete(callback as ComparisonUpdateCallback);
    this.singleUpdateSubscribers.delete(callback as SingleUpdateCallback);
    
    // Stop the service if no more subscribers
    if (this.subscribers.size === 0 && this.singleUpdateSubscribers.size === 0) {
      this.stopRealTimeUpdates();
    }
  }

  // Subscribe to connection status changes
  onConnectionChange(callback: ConnectionChangeCallback): () => void {
    this.connectionChangeSubscribers.add(callback);
    
    // Immediately notify of current connection status
    callback(this.isConnected);
    
    return () => {
      this.connectionChangeSubscribers.delete(callback);
    };
  }

  // Add a single symbol
  addSymbol(symbol: string): void {
    this.addSymbols([symbol]);
  }

  // Remove a single symbol
  removeSymbol(symbol: string): void {
    this.removeSymbols([symbol]);
  }

  // Start updates (public method)
  startUpdates(): void {
    if (this.subscribedSymbols.size > 0) {
      this.startRealTimeUpdates();
    }
  }

  // Stop updates (public method)
  stopUpdates(): void {
    this.stopRealTimeUpdates();
  }

  // Refresh a specific symbol
  async refreshSymbol(symbol: string): Promise<void> {
    if (!this.subscribedSymbols.has(symbol.toUpperCase())) return;
    
    try {
      const stockData = await this.polygonApi.getUSStockData(symbol);
      if (stockData && stockData.price) {
        const currentPrice = stockData.price;
        const lastPrice = this.lastPrices.get(symbol.toUpperCase()) || currentPrice;
        
        const change = currentPrice - lastPrice;
        const changePercent = lastPrice > 0 ? (change / lastPrice) * 100 : 0;
        
        const update: StockUpdate = {
          symbol: symbol.toUpperCase(),
          price: currentPrice,
          change,
          changePercent,
          timestamp: Date.now(),
          volume: stockData.volume
        };
        
        this.lastPrices.set(symbol.toUpperCase(), currentPrice);
        this.notifySubscribers([update]);
      }
    } catch (error) {
      console.error(`Error refreshing symbol ${symbol}:`, error);
    }
  }

  // Get list of subscribed symbols
  getSubscribedSymbols(): string[] {
    return Array.from(this.subscribedSymbols);
  }

  // Add symbols to track for real-time updates
  async addSymbols(symbols: string[]) {
    const newSymbols = symbols.filter(symbol => !this.subscribedSymbols.has(symbol));
    
    if (newSymbols.length === 0) return;

    newSymbols.forEach(symbol => {
      this.subscribedSymbols.add(symbol.toUpperCase());
    });

    // Get initial stock data to establish baseline prices (previous close)
    try {
      const stockDataPromises = newSymbols.map(async (symbol) => {
        const stockData = await this.polygonApi.getUSStockData(symbol);
        if (stockData) {
          // Calculate previous close from current price and change
          const previousClose = stockData.price - stockData.change;
          this.baselinePrices.set(symbol.toUpperCase(), previousClose);
          this.lastPrices.set(symbol.toUpperCase(), stockData.price);
          console.log(`📊 Set baseline for ${symbol}: Previous Close = $${previousClose.toFixed(2)}, Current = $${stockData.price.toFixed(2)}`);
        }
      });
      
      await Promise.all(stockDataPromises);
    } catch (error) {
      console.error('Error setting baseline prices:', error);
    }

    // Subscribe to Polygon WebSocket/polling for these symbols
    this.polygonApi.subscribeToSymbols(newSymbols);

    // Start real-time updates if we have subscribers
    if (this.subscribers.size > 0 && !this.isActive) {
      this.startRealTimeUpdates();
    }

    console.log(`📊 Added symbols for real-time comparison: ${newSymbols.join(', ')}`);
  }

  // Remove symbols from tracking
  removeSymbols(symbols: string[]) {
    const symbolsToRemove = symbols.filter(symbol => this.subscribedSymbols.has(symbol.toUpperCase()));
    
    if (symbolsToRemove.length === 0) return;

    symbolsToRemove.forEach(symbol => {
      const upperSymbol = symbol.toUpperCase();
      this.subscribedSymbols.delete(upperSymbol);
      this.lastPrices.delete(upperSymbol);
      this.baselinePrices.delete(upperSymbol);
    });

    // Unsubscribe from Polygon
    this.polygonApi.unsubscribeFromSymbols(symbolsToRemove);

    // Stop updates if no more symbols
    if (this.subscribedSymbols.size === 0) {
      this.stopRealTimeUpdates();
    }

    console.log(`📊 Removed symbols from real-time comparison: ${symbolsToRemove.join(', ')}`);
  }

  // Start real-time updates
  private startRealTimeUpdates() {
    if (this.isActive) return;

    this.isActive = true;
    this.notifyConnectionChange(true);
    console.log('🚀 Starting real-time comparison updates');

    // Listen to Polygon WebSocket events
    const removeListener = this.polygonApi.addEventListener((event) => {
      this.handlePolygonMessage(event);
    });

    // Set up periodic updates every 5 seconds as fallback
    this.updateInterval = setInterval(() => {
      this.fetchLatestPrices();
    }, 5000);

    // Store the listener cleanup function
    (this as any).removePolygonListener = removeListener;
  }

  // Stop real-time updates
  private stopRealTimeUpdates() {
    if (!this.isActive) return;

    this.isActive = false;
    this.notifyConnectionChange(false);
    console.log('⏹️ Stopping real-time comparison updates');

    // Clear update interval
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    // Remove Polygon listener
    if ((this as any).removePolygonListener) {
      (this as any).removePolygonListener();
      delete (this as any).removePolygonListener;
    }
  }

  // Handle Polygon WebSocket messages
  private handlePolygonMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);
      
      if (Array.isArray(data)) {
        const updates: RealTimeStockUpdate[] = [];
        
        data.forEach((item: any) => {
          if (item.ev === 'T' && item.sym && this.subscribedSymbols.has(item.sym)) {
            const symbol = item.sym;
            const currentPrice = item.p;
            const baselinePrice = this.baselinePrices.get(symbol) || currentPrice;
            
            const change = currentPrice - baselinePrice;
            const changePercent = baselinePrice > 0 ? (change / baselinePrice) * 100 : 0;
            
            updates.push({
              symbol,
              price: currentPrice,
              change,
              changePercent,
              timestamp: item.t || Date.now(),
              volume: item.s
            });
            
            this.lastPrices.set(symbol, currentPrice);
          }
        });
        
        if (updates.length > 0) {
          this.notifySubscribers(updates);
        }
      }
    } catch (error) {
      console.error('Error handling Polygon message:', error);
    }
  }

  // Fetch latest prices as fallback
  private async fetchLatestPrices() {
    if (this.subscribedSymbols.size === 0) return;

    try {
      const symbols = Array.from(this.subscribedSymbols);
      const updates: RealTimeStockUpdate[] = [];

      // Fetch prices for all symbols
      const pricePromises = symbols.map(async (symbol) => {
        try {
          const stockData = await this.polygonApi.getUSStockData(symbol);
          if (stockData && stockData.price) {
            const currentPrice = stockData.price;
            const baselinePrice = this.baselinePrices.get(symbol) || (stockData.price - stockData.change);
            
            // If we don't have a baseline price yet, calculate it from the stock data
            if (!this.baselinePrices.has(symbol)) {
              const previousClose = stockData.price - stockData.change;
              this.baselinePrices.set(symbol, previousClose);
            }
            
            const change = currentPrice - baselinePrice;
            const changePercent = baselinePrice > 0 ? (change / baselinePrice) * 100 : 0;
            
            updates.push({
              symbol,
              price: currentPrice,
              change,
              changePercent,
              timestamp: Date.now(),
              volume: stockData.volume
            });
            
            this.lastPrices.set(symbol, currentPrice);
          }
        } catch (error) {
          console.error(`Error fetching price for ${symbol}:`, error);
        }
      });

      await Promise.all(pricePromises);
      
      if (updates.length > 0) {
        this.notifySubscribers(updates);
      }
    } catch (error) {
      console.error('Error fetching latest prices:', error);
    }
  }

  // Notify all subscribers of updates
  private notifySubscribers(updates: RealTimeStockUpdate[]) {
    // Notify batch subscribers
    this.subscribers.forEach(callback => {
      try {
        callback(updates);
      } catch (error) {
        console.error('Error notifying batch subscriber:', error);
      }
    });
    
    // Notify single update subscribers
    updates.forEach(update => {
      this.singleUpdateSubscribers.forEach(callback => {
        try {
          callback(update.symbol, update);
        } catch (error) {
          console.error('Error notifying single update subscriber:', error);
        }
      });
    });
  }
  
  // Notify connection change subscribers
  private notifyConnectionChange(connected: boolean) {
    this.isConnected = connected;
    this.connectionChangeSubscribers.forEach(callback => {
      try {
        callback(connected);
      } catch (error) {
        console.error('Error notifying connection change subscriber:', error);
      }
    });
  }

  // Get current connection status
  getConnectionStatus() {
    const polygonInfo = this.polygonApi.getConnectionInfo();
    return {
      isActive: this.isActive,
      subscribedSymbols: Array.from(this.subscribedSymbols),
      subscriberCount: this.subscribers.size,
      polygonConnection: polygonInfo
    };
  }

  // Clean up all resources
  cleanup() {
    this.stopRealTimeUpdates();
    this.subscribers.clear();
    this.subscribedSymbols.clear();
    this.lastPrices.clear();
    this.baselinePrices.clear();
  }
}

// Export singleton instance
export const realTimeComparisonService = RealTimeComparisonService.getInstance();