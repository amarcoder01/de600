import { z } from "zod";

export const stockDataSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  price: z.number(),
  change: z.number(),
  changePercent: z.number(),
  volume: z.number(),
  sector: z.string().optional(),
  marketCap: z.number().optional(),
});

export const marketIndexSchema = z.object({
  symbol: z.string(),
  price: z.number(),
  change: z.number(),
  changePercent: z.number(),
});

export const marketDataSchema = z.object({
  gainers: z.array(stockDataSchema),
  losers: z.array(stockDataSchema),
  indices: z.record(z.string(), marketIndexSchema),
  lastUpdated: z.string(),
});

export const marketStatusSchema = z.object({
  isOpen: z.boolean(),
  status: z.string(),
  nextOpen: z.string().optional(),
  nextClose: z.string().optional(),
});

export const stockSearchResultSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  type: z.string(),
  exchange: z.string().optional(),
});

export const stockSearchResponseSchema = z.object({
  results: z.array(stockSearchResultSchema),
  query: z.string(),
});

export const stockNewsSchema = z.object({
  title: z.string(),
  source: z.string(),
  publishedAt: z.string(),
  url: z.string(),
});

export const stockDetailsSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  price: z.number(),
  change: z.number(),
  changePercent: z.number(),
  volume: z.number(),
  marketCap: z.number().optional(),
  peRatio: z.number().optional(),
  dividendYield: z.number().optional(),
  high52Week: z.number().optional(),
  low52Week: z.number().optional(),
  averageVolume: z.number().optional(),
  beta: z.number().optional(),
  eps: z.number().optional(),
  sector: z.string().optional(),
  industry: z.string().optional(),
  description: z.string().optional(),
  employees: z.number().optional(),
  website: z.string().optional(),
  news: z.array(stockNewsSchema).optional(),
});

export type StockData = z.infer<typeof stockDataSchema>;
export type MarketIndex = z.infer<typeof marketIndexSchema>;
export type MarketData = z.infer<typeof marketDataSchema>;
export type MarketStatus = z.infer<typeof marketStatusSchema>;
export type StockSearchResult = z.infer<typeof stockSearchResultSchema>;
export type StockSearchResponse = z.infer<typeof stockSearchResponseSchema>;
export type StockNews = z.infer<typeof stockNewsSchema>;
export type StockDetails = z.infer<typeof stockDetailsSchema>;
