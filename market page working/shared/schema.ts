import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, bigint, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const stocks = pgTable("stocks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: text("symbol").notNull().unique(),
  name: text("name").notNull(),
  sector: text("sector"),
  currentPrice: real("current_price").notNull(),
  previousClose: real("previous_close").notNull(),
  change: real("change").notNull(),
  changePercent: real("change_percent").notNull(),
  volume: bigint("volume", { mode: "number" }).notNull(),
  marketCap: bigint("market_cap", { mode: "number" }),
  // Additional financial metrics
  peRatio: real("pe_ratio"),
  fiftyTwoWeekHigh: real("fifty_two_week_high"),
  fiftyTwoWeekLow: real("fifty_two_week_low"),
  dayHigh: real("day_high"),
  dayLow: real("day_low"),
  lastUpdated: timestamp("last_updated").defaultNow(),
  isActive: boolean("is_active").default(true),
});

export const marketIndices = pgTable("market_indices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  symbol: text("symbol").notNull().unique(),
  value: real("value").notNull(),
  change: real("change").notNull(),
  changePercent: real("change_percent").notNull(),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const stockWatchlist = pgTable("stock_watchlist", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stockSymbol: text("stock_symbol").notNull(),
  userId: text("user_id"), // For future user system
  addedAt: timestamp("added_at").defaultNow(),
});

export const insertStockSchema = createInsertSchema(stocks).omit({
  id: true,
  lastUpdated: true,
});

export const insertMarketIndexSchema = createInsertSchema(marketIndices).omit({
  id: true,
  lastUpdated: true,
});

export const insertWatchlistSchema = createInsertSchema(stockWatchlist).omit({
  id: true,
  addedAt: true,
});

export type InsertStock = z.infer<typeof insertStockSchema>;
export type Stock = typeof stocks.$inferSelect;
export type InsertMarketIndex = z.infer<typeof insertMarketIndexSchema>;
export type MarketIndex = typeof marketIndices.$inferSelect;
export type InsertWatchlist = z.infer<typeof insertWatchlistSchema>;
export type Watchlist = typeof stockWatchlist.$inferSelect;

// API Response types
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
