// Lightweight Yahoo Finance quote fetcher (no API key required)
// Uses the public quote endpoint to enrich tickers with exchange, price, change%, market cap, etc.

export interface YahooQuote {
  symbol: string
  longName?: string
  shortName?: string
  fullExchangeName?: string
  exchange?: string
  quoteType?: string
  currency?: string
  marketState?: string
  regularMarketPrice?: number
  regularMarketChange?: number
  regularMarketChangePercent?: number
  regularMarketPreviousClose?: number
  regularMarketOpen?: number
  regularMarketDayHigh?: number
  regularMarketDayLow?: number
  regularMarketVolume?: number
  marketCap?: number
}

export class YahooFinanceService {
  private endpoint = 'https://query1.finance.yahoo.com/v7/finance/quote'

  async getQuotes(tickers: string[], timeoutMs: number = 8000): Promise<Map<string, YahooQuote>> {
    const out = new Map<string, YahooQuote>()
    const clean = Array.from(new Set(tickers.map(t => t.trim().toUpperCase()).filter(Boolean)))
    if (clean.length === 0) return out

    const chunks: string[][] = []
    const size = 40 // conservative to keep URL short
    for (let i = 0; i < clean.length; i += size) chunks.push(clean.slice(i, i + size))

    for (const chunk of chunks) {
      const url = `${this.endpoint}?symbols=${encodeURIComponent(chunk.join(','))}`
      try {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), timeoutMs)
        const resp = await fetch(url, { signal: controller.signal })
        clearTimeout(timer)
        if (!resp.ok) continue
        const json = await resp.json().catch(() => null)
        const results: any[] = json?.quoteResponse?.result || []
        for (const r of results) {
          const q: YahooQuote = {
            symbol: r.symbol,
            longName: r.longName,
            shortName: r.shortName,
            fullExchangeName: r.fullExchangeName,
            exchange: r.exchange,
            quoteType: r.quoteType,
            currency: r.currency,
            marketState: r.marketState,
            regularMarketPrice: safeNum(r.regularMarketPrice),
            regularMarketChange: safeNum(r.regularMarketChange),
            regularMarketChangePercent: safeNum(r.regularMarketChangePercent),
            regularMarketPreviousClose: safeNum(r.regularMarketPreviousClose),
            regularMarketOpen: safeNum(r.regularMarketOpen),
            regularMarketDayHigh: safeNum(r.regularMarketDayHigh),
            regularMarketDayLow: safeNum(r.regularMarketDayLow),
            regularMarketVolume: safeNum(r.regularMarketVolume),
            marketCap: safeNum(r.marketCap),
          }
          if (q.symbol) out.set(q.symbol.toUpperCase(), q)
        }
      } catch {
        // ignore chunk on error
      }
    }

    return out
  }
}

function safeNum(v: any): number | undefined {
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return Number.isFinite(n) ? n : undefined
}
