import { StockData, MarketData, MarketIndex, MarketStatus } from "@shared/schema";

export interface IStorage {
  getMarketData(): Promise<MarketData | undefined>;
  setMarketData(data: MarketData): Promise<void>;
  getMarketStatus(): Promise<MarketStatus | undefined>;
  setMarketStatus(status: MarketStatus): Promise<void>;
}

export class MemStorage implements IStorage {
  private marketData: MarketData | undefined;
  private marketStatus: MarketStatus | undefined;

  constructor() {
    // Initialize with market closed status
    this.marketStatus = {
      isOpen: false,
      status: "Market Closed",
    };
  }

  async getMarketData(): Promise<MarketData | undefined> {
    return this.marketData;
  }

  async setMarketData(data: MarketData): Promise<void> {
    this.marketData = data;
  }

  async getMarketStatus(): Promise<MarketStatus | undefined> {
    return this.marketStatus;
  }

  async setMarketStatus(status: MarketStatus): Promise<void> {
    this.marketStatus = status;
  }
}

export const storage = new MemStorage();
