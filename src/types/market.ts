export interface Stock {
  id: string;
  symbol: string;
  name: string;
  sector?: string | null;
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number | null;
  lastUpdated?: Date | null;
  isActive?: boolean | null;
}

export interface MarketIndex {
  id: string;
  name: string;
  symbol: string;
  value: number;
  change: number;
  changePercent: number;
  lastUpdated?: Date | null;
}

export interface StockApiResponse {
  stocks: Stock[];
  hasMore: boolean;
  page: number;
  total: number;
}

export interface MarketOverviewResponse {
  indices: MarketIndex[];
  lastUpdated: string;
}

export interface WatchlistItem {
  id: string;
  stockSymbol: string;
  userId?: string | null;
  addedAt?: Date | null;
}

export interface StockSearchResult {
  symbol: string;
  name: string;
  relevanceScore: number;
  matchReason: string;
}

export interface StockAnalysis {
  symbol: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  keyPoints: string[];
  riskLevel: 'low' | 'medium' | 'high';
  recommendation: 'buy' | 'hold' | 'sell';
  analysisTimestamp: string; // ISO timestamp when analysis was generated
  // Enhanced trader-focused fields
  tradingStrategy: string;
  entryPoints: {
    bullish: string;
    bearish: string;
  };
  priceTargets: {
    conservative: number;
    optimistic: number;
    stopLoss: number;
  };
  technicalAnalysis: {
    support: number;
    resistance: number;
    trend: 'uptrend' | 'downtrend' | 'sideways';
    momentum: string;
  };
  fundamentalInsights: string[];
  riskFactors: string[];
  marketContext: string;
  timeHorizon: {
    shortTerm: string; // 1-7 days
    mediumTerm: string; // 1-3 months
    longTerm: string; // 6+ months
  };
  competitorComparison: string;
  newsImpact: string;
  volumeAnalysis: string;
  reasoning: string;
}

export interface NewsArticle {
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
  source: string;
  thumbnail?: string;
  relatedSymbols: string[];
}

export interface StockNewsResponse {
  articles: NewsArticle[];
  symbol: string;
  total: number;
}

// Zod schemas for validation
import { z } from "zod";

export const insertStockSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  sector: z.string().optional(),
  currentPrice: z.number(),
  previousClose: z.number(),
  change: z.number(),
  changePercent: z.number(),
  volume: z.number(),
  marketCap: z.number().optional(),
  peRatio: z.number().optional(),
  fiftyTwoWeekHigh: z.number().optional(),
  fiftyTwoWeekLow: z.number().optional(),
  dayHigh: z.number().optional(),
  dayLow: z.number().optional(),
  isActive: z.boolean().optional().default(true),
});

export const insertMarketIndexSchema = z.object({
  name: z.string(),
  symbol: z.string(),
  value: z.number(),
  change: z.number(),
  changePercent: z.number(),
});

export const insertWatchlistSchema = z.object({
  stockSymbol: z.string(),
  userId: z.string().optional(),
});

export type InsertStock = z.infer<typeof insertStockSchema>;
export type InsertMarketIndex = z.infer<typeof insertMarketIndexSchema>;
export type InsertWatchlist = z.infer<typeof insertWatchlistSchema>;
export type Watchlist = WatchlistItem;
