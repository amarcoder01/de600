import { webSearch } from '@/lib/web-search'
import { OpenAIService } from '@/lib/services/openai-service'
import type { FilterCriteria } from '@/types/screener'
import { ScreenerDataService } from '@/lib/screener/ScreenerDataService'

export interface WebSmartSearchOptions {
  limit?: number
  maxTickersToEnrich?: number
  skipEnrichment?: boolean
}

export interface WebSmartSearchResult {
  stocks: Array<{
    ticker: string
    name?: string
    price?: number
    change?: number
    change_percent?: number
    volume?: number
    market_cap?: number
    source?: string
  }>
  totalCount: number
  hasMore: boolean
  parsedCriteria: FilterCriteria
  originalQuery: string
  usedWebSearch: boolean
}

export class WebSearchScreenerService {
  private openai = new OpenAIService()
  private screenerData = new ScreenerDataService()

  // Extract likely tickers from a string using patterns like AAPL, NASDAQ:AAPL, $AAPL
  private extractTickersFromText(text: string): string[] {
    const out = new Set<string>()
    if (!text) return []

    // Symbols like AAPL, MSFT, TSLA (1-5 uppercase letters)
    const symRegex = /\b[A-Z]{1,5}\b/g
    const prefixed = /\b(?:NYSE|NASDAQ|NYSEARCA|AMEX|BATS|OTC):\s*([A-Z]{1,5})\b/g
    const dollar = /\$([A-Z]{1,5})\b/g

    let m: RegExpExecArray | null
    while ((m = symRegex.exec(text)) !== null) out.add(m[0])
    while ((m = prefixed.exec(text)) !== null) out.add(m[1])
    while ((m = dollar.exec(text)) !== null) out.add(m[1])

    return Array.from(out)
  }

  private applyFiltersByPrice(
    items: WebSmartSearchResult['stocks'],
    filters: FilterCriteria
  ) {
    return items.filter((s) => {
      if (filters.priceMin !== undefined && (s.price === undefined || s.price < filters.priceMin)) return false
      if (filters.priceMax !== undefined && (s.price === undefined || s.price > filters.priceMax)) return false
      return true
    })
  }

  private buildSearchQueries(criteria: FilterCriteria, originalQuery: string): string[] {
    const parts: string[] = []
    // Primary: user query as-is
    parts.push(originalQuery)

    // Numeric price range query to find curated lists
    if (typeof criteria.priceMin === 'number' && typeof criteria.priceMax === 'number') {
      const lo = criteria.priceMin
      const hi = criteria.priceMax
      // General
      parts.push(`stocks price between ${lo} and ${hi} ticker list`)
      // Targeted domains that often contain lists (leveraging site: operator)
      parts.push(`site:finviz.com screener price ${lo}..${hi}`)
      parts.push(`site:investing.com stocks price between ${lo} and ${hi}`)
      parts.push(`site:seekingalpha.com stocks price between ${lo} and ${hi}`)
      parts.push(`site:marketwatch.com stocks between ${lo} and ${hi}`)
      parts.push(`site:themotleyfool.com stocks under ${hi}`)
      parts.push(`site:reddit.com/r/stocks under ${hi}`)
    } else {
      parts.push('us stocks list tickers site:finviz.com | site:investing.com | site:marketwatch.com')
    }

    return parts
  }

  async webSmartSearch(
    naturalQuery: string,
    opts: WebSmartSearchOptions = {}
  ): Promise<WebSmartSearchResult> {
    // Input validation and safe defaults
    const rawQuery = String(naturalQuery || '')
    const safeQuery = rawQuery.trim().slice(0, 500)
    const maxLimit = 200
    const maxEnrich = 100
    const { 
      limit = 100, 
      maxTickersToEnrich = 50, 
      skipEnrichment = false 
    } = opts
    const cappedLimit = Math.max(1, Math.min(maxLimit, Math.floor(limit)))
    const cappedEnrich = Math.max(1, Math.min(maxEnrich, Math.floor(maxTickersToEnrich)))

    // 1) Parse NL query into structured filters (with robust fallback)
    // Provide required defaults for FilterCriteria (search, sector, exchange)
    let filters: FilterCriteria = { search: '', sector: '', exchange: '' }
    try {
      const parsed = await this.openai.parseQuery(safeQuery)
      const pf = (parsed?.filters || {}) as Partial<FilterCriteria>
      filters = {
        search: pf.search ?? '',
        sector: pf.sector ?? '',
        exchange: pf.exchange ?? '',
        priceMin: pf.priceMin,
        priceMax: pf.priceMax,
        marketCapMin: pf.marketCapMin,
        marketCapMax: pf.marketCapMax,
        volumeMin: pf.volumeMin,
      }
    } catch (e) {
      // Fallback: naive price range detection  e.g., "between 100 and 1500"
      const m = safeQuery.match(/between\s+(\d+[\.]?\d*)\s+and\s+(\d+[\.]?\d*)/i)
      if (m) {
        const lo = Number(m[1])
        const hi = Number(m[2])
        if (isFinite(lo) && isFinite(hi)) {
          filters = {
            ...filters,
            priceMin: Math.min(lo, hi),
            priceMax: Math.max(lo, hi),
          }
        }
      }
    }

    // 2) Run targeted web searches (paginated) + lightweight crawling
    const queries = this.buildSearchQueries(filters, safeQuery)
    const seenTickers = new Set<string>()
    const candidateMeta = new Map<string, { price?: number }>()

    for (const q of queries) {
      // Use paginated search to improve recall
      const results = await webSearch.searchWebPaginated(q, 3, 8)
      for (const r of results) {
        // Extract from SERP first
        const serptickers = [
          ...this.extractTickersFromText(r.title),
          ...this.extractTickersFromText(r.snippet),
        ]
        for (const t of serptickers) {
          const normalized = t.toUpperCase()
          if (/^[A-Z]{1,5}$/.test(normalized)) seenTickers.add(normalized)
        }

        // Opportunistic page fetch for additional context
        if (seenTickers.size < cappedLimit) {
          const pageText = await webSearch.fetchPageText(r.link, { timeoutMs: 7000, maxBytes: 180_000 })
          if (pageText) {
            const inPageTickers = this.extractTickersFromText(pageText)
            for (const t of inPageTickers) {
              const normalized = t.toUpperCase()
              if (/^[A-Z]{1,5}$/.test(normalized)) {
                seenTickers.add(normalized)
                // Simple nearby price heuristic: $123.45 or 123.45 USD within 30 chars of ticker
                const pattern = new RegExp(`${normalized}[^\n]{0,30}?\$?(\d{1,4}(?:[\.,]\d{1,2})?)`, 'i')
                const m = pageText.match(pattern)
                if (m) {
                  const raw = m[1].replace(/,/g, '.')
                  const val = parseFloat(raw)
                  if (isFinite(val)) {
                    candidateMeta.set(normalized, { price: val })
                  }
                }
              }
            }
          }
        }

        if (seenTickers.size >= cappedLimit) break
      }
      if (seenTickers.size >= cappedLimit) break
    }

    const tickers = Array.from(seenTickers).slice(0, cappedLimit)

    // 3) Optional enrichment to get prices from our unified snapshot pipeline
    let enriched: WebSmartSearchResult['stocks'] = tickers.map((t) => {
      const meta = candidateMeta.get(t)
      return meta?.price ? { ticker: t, price: meta.price, source: 'web' } : { ticker: t }
    })

    if (!skipEnrichment && tickers.length > 0) {
      try {
        const subset = tickers.slice(0, cappedEnrich)
        const unified = await this.screenerData.getUnifiedSnapshots(subset, true, 12, 400)
        const byTicker = new Map(unified.map((u) => [u.ticker, u]))
        enriched = tickers.map((t) => {
          const u = byTicker.get(t)
          return {
            ticker: t,
            price: u?.price,
            change: u?.change,
            change_percent: u?.change_percent,
            volume: u?.volume,
            market_cap: u?.market_cap,
            source: u ? 'web+unified' : 'web'
          }
        })
      } catch (e) {
        // Fall back to bare tickers if enrichment fails
        enriched = tickers.map((t) => ({ ticker: t, source: 'web' }))
      }
    }

    // 4) Apply price filters if present
    const filtered = this.applyFiltersByPrice(enriched, filters)

    return {
      stocks: filtered,
      totalCount: filtered.length,
      hasMore: tickers.length > filtered.length,
      parsedCriteria: filters,
      originalQuery: safeQuery,
      usedWebSearch: true,
    }
  }
}
