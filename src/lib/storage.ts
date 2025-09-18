import { type Stock, type InsertStock, type MarketIndex, type InsertMarketIndex, type Watchlist, type InsertWatchlist } from "@/types/market";
import { randomUUID } from "crypto";

export interface IStorage {
  // Stock operations
  getStocks(page: number, limit: number, sortBy?: string): Promise<{ stocks: Stock[]; total: number }>;
  getStock(symbol: string): Promise<Stock | undefined>;
  createStock(stock: InsertStock): Promise<Stock>;
  updateStock(symbol: string, updates: Partial<InsertStock>): Promise<Stock | undefined>;
  searchStocks(query: string): Promise<Stock[]>;
  
  // Market index operations
  getMarketIndices(): Promise<MarketIndex[]>;
  createMarketIndex(index: InsertMarketIndex): Promise<MarketIndex>;
  updateMarketIndex(symbol: string, updates: Partial<InsertMarketIndex>): Promise<MarketIndex | undefined>;
  
  // Watchlist operations
  getWatchlist(userId?: string): Promise<Watchlist[]>;
  addToWatchlist(item: InsertWatchlist): Promise<Watchlist>;
  removeFromWatchlist(stockSymbol: string, userId?: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private stocks: Map<string, Stock>;
  private marketIndices: Map<string, MarketIndex>;
  private watchlist: Map<string, Watchlist>;

  constructor() {
    this.stocks = new Map();
    this.marketIndices = new Map();
    this.watchlist = new Map();
  }

  async getStocks(page: number = 1, limit: number = 10, sortBy: string = "marketCap"): Promise<{ stocks: Stock[]; total: number }> {
    const allStocks = Array.from(this.stocks.values())
      .filter(stock => stock.isActive)
      .sort((a, b) => {
        switch (sortBy) {
          case "price":
            return b.currentPrice - a.currentPrice;
          case "volume":
            return b.volume - a.volume;
          case "changePercent":
            return b.changePercent - a.changePercent;
          case "marketCap":
          default:
            return (b.marketCap || 0) - (a.marketCap || 0);
        }
      });
    
    const total = allStocks.length;
    const startIndex = (page - 1) * limit;
    const stocks = allStocks.slice(startIndex, startIndex + limit);
    
    return { stocks, total };
  }

  async getStock(symbol: string): Promise<Stock | undefined> {
    return this.stocks.get(symbol.toUpperCase());
  }

  async createStock(insertStock: InsertStock): Promise<Stock> {
    const id = randomUUID();
    const stock: Stock = {
      ...insertStock,
      id,
      symbol: insertStock.symbol.toUpperCase(),
      lastUpdated: new Date(),
      isActive: true,
      marketCap: insertStock.marketCap || null,
      sector: insertStock.sector || null,
    };
    this.stocks.set(stock.symbol, stock);
    return stock;
  }

  async updateStock(symbol: string, updates: Partial<InsertStock>): Promise<Stock | undefined> {
    const existing = this.stocks.get(symbol.toUpperCase());
    if (!existing) return undefined;

    const updated: Stock = {
      ...existing,
      ...updates,
      symbol: symbol.toUpperCase(),
      lastUpdated: new Date(),
    };
    this.stocks.set(symbol.toUpperCase(), updated);
    return updated;
  }

  async searchStocks(query: string): Promise<Stock[]> {
    const searchTerm = query.toLowerCase();
    return Array.from(this.stocks.values()).filter(stock =>
      stock.symbol.toLowerCase().includes(searchTerm) ||
      stock.name.toLowerCase().includes(searchTerm) ||
      (stock.sector && stock.sector.toLowerCase().includes(searchTerm))
    );
  }

  async getMarketIndices(): Promise<MarketIndex[]> {
    return Array.from(this.marketIndices.values());
  }

  async createMarketIndex(insertIndex: InsertMarketIndex): Promise<MarketIndex> {
    const id = randomUUID();
    const index: MarketIndex = {
      ...insertIndex,
      id,
      symbol: insertIndex.symbol.toUpperCase(),
      lastUpdated: new Date(),
    };
    this.marketIndices.set(index.symbol, index);
    return index;
  }

  async updateMarketIndex(symbol: string, updates: Partial<InsertMarketIndex>): Promise<MarketIndex | undefined> {
    const existing = this.marketIndices.get(symbol.toUpperCase());
    if (!existing) return undefined;

    const updated: MarketIndex = {
      ...existing,
      ...updates,
      symbol: symbol.toUpperCase(),
      lastUpdated: new Date(),
    };
    this.marketIndices.set(symbol.toUpperCase(), updated);
    return updated;
  }

  async getWatchlist(userId?: string): Promise<Watchlist[]> {
    return Array.from(this.watchlist.values()).filter(item =>
      !userId || item.userId === userId
    );
  }

  async addToWatchlist(insertItem: InsertWatchlist): Promise<Watchlist> {
    const id = randomUUID();
    const item: Watchlist = {
      ...insertItem,
      id,
      stockSymbol: insertItem.stockSymbol.toUpperCase(),
      addedAt: new Date(),
      userId: insertItem.userId || null,
    };
    this.watchlist.set(id, item);
    return item;
  }

  async removeFromWatchlist(stockSymbol: string, userId?: string): Promise<boolean> {
    const items = Array.from(this.watchlist.entries()).filter(([_, item]) =>
      item.stockSymbol.toUpperCase() === stockSymbol.toUpperCase() &&
      (!userId || item.userId === userId)
    );

    if (items.length === 0) return false;

    items.forEach(([id]) => this.watchlist.delete(id));
    return true;
  }
}

export const storage = new MemStorage();
