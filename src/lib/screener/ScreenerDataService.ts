import axios, { AxiosRequestConfig } from 'axios';
import { StockPrice } from '@/types/screener';

const POLYGON_BASE_URL = 'https://api.polygon.io';

export type MarketState = 'open' | 'closed' | 'extended' | 'unknown';

export interface UnifiedSnapshot extends StockPrice {
  basis?: 'prev_close' | 'day_over_day';
  has_price?: boolean;
  has_prev_close?: boolean;
  has_two_daily?: boolean;
  market_state?: MarketState;
}

// Simple in-memory cache (per server process)
class TTLCache<V> {
  private store = new Map<string, { v: V; exp: number }>();
  constructor(private ttlMs: number) {}
  get(key: string): V | undefined {
    const e = this.store.get(key);
    if (!e) return undefined;
    if (Date.now() > e.exp) {
      this.store.delete(key);
      return undefined;
    }
    return e.v;
    }
  set(key: string, value: V) {
    this.store.set(key, { v: value, exp: Date.now() + this.ttlMs });
  }
}

const prevCloseCache = new TTLCache<number>(5 * 60 * 1000); // 5 minutes
const dailyClosesCache = new TTLCache<{ c2: number; c1: number }>(5 * 60 * 1000);
const marketStatusCache = new TTLCache<MarketState>(30 * 1000); // 30 seconds

function getEnvApiKey(): string | undefined {
  return process.env.NEXT_PUBLIC_POLYGON_API_KEY || process.env.POLYGON_API_KEY;
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3, baseDelayMs = 300): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const jitter = Math.floor(Math.random() * 150);
      const sleep = baseDelayMs * (i + 1) + jitter;
      await new Promise(r => setTimeout(r, sleep));
    }
  }
  throw lastErr;
}

export class ScreenerDataService {
  private apiKey: string;
  constructor() {
    const k = getEnvApiKey();
    if (!k) throw new Error('Polygon.io API key is required');
    this.apiKey = k;
  }

  private async request<T = any>(url: string, cfg?: AxiosRequestConfig): Promise<T> {
    const res = await axios.get(url, {
      ...cfg,
      params: {
        ...(cfg?.params || {}),
        apikey: this.apiKey,
      },
      timeout: cfg?.timeout ?? 60000, // Increased to 60 seconds for longer filtering operations
    });
    return res.data as T;
  }

  async getMarketState(): Promise<MarketState> {
    const cached = marketStatusCache.get('state');
    if (cached) return cached;
    try {
      const data = await withRetry(() => this.request(`${POLYGON_BASE_URL}/v1/marketstatus/now`));
      const isOpen = !!data?.market?.isOpen || data?.market === 'open';
      const state: MarketState = isOpen ? 'open' : 'closed';
      marketStatusCache.set('state', state);
      return state;
    } catch (e) {
      return 'unknown';
    }
  }

  private getDateNDaysAgoString(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  }

  async getPrevClose(ticker: string): Promise<number | undefined> {
    const key = `prev:${ticker}`;
    const cached = prevCloseCache.get(key);
    if (typeof cached === 'number') return cached;
    try {
      const data = await withRetry(() => this.request(`${POLYGON_BASE_URL}/v2/aggs/ticker/${ticker}/prev`));
      const c = data?.results?.[0]?.c;
      if (typeof c === 'number' && c > 0) {
        prevCloseCache.set(key, c);
        return c;
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  async getLastTwoCompletedDailyCloses(ticker: string): Promise<{ c2?: number; c1?: number }> {
    const key = `d2:${ticker}`;
    const cached = dailyClosesCache.get(key);
    if (cached) return cached;
    try {
      const from = this.getDateNDaysAgoString(30);
      const to = this.getDateNDaysAgoString(1); // up to yesterday
      const data = await withRetry(() => this.request(`${POLYGON_BASE_URL}/v2/aggs/ticker/${ticker}/range/1/day/${from}/${to}`, {
        params: { adjusted: true, sort: 'desc', limit: 2 },
      }));
      const r0 = data?.results?.[0];
      const r1 = data?.results?.[1];
      const c2 = typeof r0?.c === 'number' ? r0.c : undefined;
      const c1 = typeof r1?.c === 'number' ? r1.c : undefined;
      dailyClosesCache.set(key, { c2: c2 as any, c1: c1 as any });
      return { c2, c1 };
    } catch {
      return {};
    }
  }

  async getLatestMinuteClose(ticker: string): Promise<{ price?: number; volume?: number }> {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const data = await withRetry(() => this.request(`${POLYGON_BASE_URL}/v2/aggs/ticker/${ticker}/range/1/minute/${today}/${today}`, {
        params: { adjusted: true, sort: 'desc', limit: 1 },
      }));
      const r = data?.results?.[0];
      const price = typeof r?.c === 'number' ? r.c : undefined;
      const volume = typeof r?.v === 'number' ? r.v : undefined;
      return { price, volume };
    } catch {
      return {};
    }
  }

  private computeChangeFromPrev(price?: number, prevClose?: number) {
    if (typeof price === 'number' && typeof prevClose === 'number' && prevClose > 0) {
      const change = price - prevClose;
      const change_percent = (change / prevClose) * 100;
      return { change, change_percent, basis: 'prev_close' as const };
    }
    return {} as any;
  }

  private computeChangeDayOverDay(c2?: number, c1?: number) {
    if (typeof c2 === 'number' && c2 > 0 && typeof c1 === 'number' && c1 > 0) {
      const change = c2 - c1;
      const change_percent = (change / c1) * 100;
      return { change, change_percent, basis: 'day_over_day' as const };
    }
    return {} as any;
  }

  async getUnifiedSnapshot(ticker: string, includeFinancials = true): Promise<UnifiedSnapshot> {
    const market_state = await this.getMarketState();

    let price: number | undefined;
    let volume: number | undefined;
    let change: number | undefined;
    let change_percent: number | undefined;
    let basis: 'prev_close' | 'day_over_day' | undefined;

    if (market_state === 'open') {
      const [{ price: p, volume: v }, prevClose] = await Promise.all([
        this.getLatestMinuteClose(ticker),
        this.getPrevClose(ticker),
      ]);
      price = p; volume = v;
      const r = this.computeChangeFromPrev(price, prevClose);
      change = r.change; change_percent = r.change_percent; basis = r.basis;
    } else {
      const { c2, c1 } = await this.getLastTwoCompletedDailyCloses(ticker);
      price = c2;
      const r = this.computeChangeDayOverDay(c2, c1);
      change = r.change; change_percent = r.change_percent; basis = r.basis;
      if (change === undefined) {
        // fallback to prev close if only one close available
        const prev = await this.getPrevClose(ticker);
        const r2 = this.computeChangeFromPrev(c2, prev);
        change = r2.change; change_percent = r2.change_percent; basis = r2.basis ?? basis;
      }
    }

    // Market cap enrichment via reference/tickers
    let market_cap: number | undefined;
    if (includeFinancials && typeof price === 'number') {
      try {
        const d = await withRetry(() => this.request(`${POLYGON_BASE_URL}/v3/reference/tickers/${ticker}`));
        const r = d?.results;
        if (r?.market_cap && r.market_cap > 0) {
          market_cap = r.market_cap;
        } else if (r?.weighted_shares_outstanding && price > 0) {
          market_cap = r.weighted_shares_outstanding * price;
        } else if (r?.share_class_shares_outstanding && price > 0) {
          market_cap = r.share_class_shares_outstanding * price;
        }
      } catch {}
    }

    const has_change = typeof change === 'number' && typeof change_percent === 'number';
    const has_price = typeof price === 'number';

    const snapshot: UnifiedSnapshot = {
      ticker,
      price: has_price ? price! : 0, // downstream expects a number; UI already handles 0 price rows as filtered in lists
      change,
      change_percent,
      volume,
      market_cap,
      has_change,
      market_state,
      basis,
    };
    return snapshot;
  }

  async getUnifiedSnapshots(tickers: string[], includeFinancials = true, batchSize = 10, delayMs = 500): Promise<UnifiedSnapshot[]> {
    const out: UnifiedSnapshot[] = [];
    for (let i = 0; i < tickers.length; i += batchSize) {
      const batch = tickers.slice(i, i + batchSize);
      const results = await Promise.all(batch.map(t => this.getUnifiedSnapshot(t, includeFinancials).catch(() => undefined)));
      results.forEach(r => { if (r) out.push(r); });
      if (i + batchSize < tickers.length) {
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
    return out;
  }
}
