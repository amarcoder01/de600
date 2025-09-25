// Web Search Integration using Google Custom Search API
export class WebSearch {
  private apiKey: string
  private searchEngineId: string
  private baseUrl: string
  private defaultTimeoutMs = 8000
  private maxResultsPerRequest = 10

  constructor() {
    // Prefer GOOGLE_SEARCH_* but support GOOGLE_API_KEY and SEARCH_ENGINE_ID for compatibility
    this.apiKey = process.env.GOOGLE_SEARCH_API_KEY || process.env.GOOGLE_API_KEY || ''
    this.searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID || process.env.SEARCH_ENGINE_ID || ''
    this.baseUrl = 'https://www.googleapis.com/customsearch/v1'
  }

  // Retrieve multiple pages from Google CSE (uses `start` param)
  async searchWebPaginated(query: string, pages: number = 3, perPage: number = 10): Promise<WebSearchResult[]> {
    const cleanQuery = String(query || '').trim()
    if (!this.apiKey || !this.searchEngineId || !cleanQuery) return []
    const cappedPerPage = Math.max(1, Math.min(this.maxResultsPerRequest, Math.floor(perPage)))
    const cappedPages = Math.max(1, Math.min(5, Math.floor(pages))) // cap total pages to 5 for quotas

    const all: WebSearchResult[] = []
    for (let i = 0; i < cappedPages; i++) {
      const start = 1 + i * cappedPerPage
      const url = `${this.baseUrl}?key=${this.apiKey}&cx=${this.searchEngineId}&q=${encodeURIComponent(cleanQuery)}&num=${cappedPerPage}&start=${start}`
      const data = await this.fetchWithRetry(url, { timeoutMs: this.defaultTimeoutMs, retries: 2 })
      if (!data?.items || data.items.length === 0) break
      const results: WebSearchResult[] = data.items.map((item: any) => ({
        title: item.title || '',
        link: item.link || '',
        snippet: item.snippet || '',
        displayLink: item.displayLink || '',
        formattedUrl: item.formattedUrl || '',
        source: 'Google Custom Search'
      }))
      all.push(...results)
      // Respect quotas: small delay
      await this.sleep(120)
    }
    return all
  }

  // Fetch raw text content from a web page (lightweight crawler)
  async fetchPageText(url: string, opts: { timeoutMs?: number; maxBytes?: number } = {}): Promise<string> {
    const timeoutMs = opts.timeoutMs ?? 8000
    const maxBytes = opts.maxBytes ?? 250_000
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)
      const resp = await fetch(url, { signal: controller.signal, redirect: 'follow' as RequestRedirect })
      clearTimeout(timer)
      if (!resp.ok) return ''
      const reader = resp.body?.getReader()
      if (!reader) return ''
      let received = 0
      const chunks: Uint8Array[] = []
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) {
          received += value.byteLength
          chunks.push(value)
          if (received >= maxBytes) break
        }
      }
      const decoder = new TextDecoder()
      const text = decoder.decode(Buffer.concat(chunks as any))
      // Strip tags quickly
      return text.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')
    } catch {
      return ''
    }
  }

  async searchWeb(query: string, numResults: number = 5): Promise<WebSearchResult[]> {
    try {
      if (!this.apiKey || !this.searchEngineId) {
        console.log('⚠️ Web search API credentials not configured')
        return []
      }
      const cleanQuery = String(query || '').trim()
      if (!cleanQuery) return []
      const cappedResults = Math.max(1, Math.min(this.maxResultsPerRequest, Math.floor(numResults)))
      
      console.log(`🔍 Web searching for: "${cleanQuery}"`)
      
      const url = `${this.baseUrl}?key=${this.apiKey}&cx=${this.searchEngineId}&q=${encodeURIComponent(cleanQuery)}&num=${cappedResults}`

      const data = await this.fetchWithRetry(url, { timeoutMs: this.defaultTimeoutMs, retries: 2 })
      if (!data) return []

      if (!data.items || data.items.length === 0) {
        console.log(`❌ No web search results for: "${cleanQuery}"`)
        return []
      }

      const results: WebSearchResult[] = data.items.map((item: any) => ({
        title: item.title || '',
        link: item.link || '',
        snippet: item.snippet || '',
        displayLink: item.displayLink || '',
        formattedUrl: item.formattedUrl || '',
        source: 'Google Custom Search'
      }))

      console.log(`✅ Web search found ${results.length} results for: "${cleanQuery}"`)
      return results

    } catch (error) {
      console.error(`❌ Web search error:`, error)
      return []
    }
  }

  private async fetchWithRetry(url: string, opts: { timeoutMs: number; retries: number }): Promise<any | null> {
    let attempt = 0
    while (attempt <= opts.retries) {
      try {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), opts.timeoutMs)
        const resp = await fetch(url, { signal: controller.signal })
        clearTimeout(timer)

        const text = await resp.text()
        let json: any
        try { json = text ? JSON.parse(text) : {} } catch { json = { raw: text } }

        if (!resp.ok) {
          // Decode common Google CSE errors
          const status = resp.status
          const message = json?.error?.message || resp.statusText || 'Unknown error'
          console.error(`❌ Google CSE HTTP ${status}: ${message}`)
          if (status === 429) break // rate limit: do not retry aggressively
          if (status >= 400 && status < 500) break // client errors won't fix with retries
          // else retry on 5xx
          attempt++
          await this.sleep(300 * attempt)
          continue
        }

        return json
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          console.warn('⏱️ Google CSE request timed out')
        } else {
          console.warn('🔁 Transient web search error, retrying...', err?.message || err)
        }
        attempt++
        await this.sleep(300 * attempt)
      }
    }
    return null
  }

  private sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms))
  }

  async searchTradingInfo(query: string): Promise<WebSearchResult[]> {
    // Enhanced search for trading-related information
    const tradingQuery = `${query} trading analysis news market`
    return this.searchWeb(tradingQuery, 8)
  }

  async searchCompanyInfo(companyName: string): Promise<WebSearchResult[]> {
    // Enhanced search for company information
    const companyQuery = `${companyName} company profile financial news`
    return this.searchWeb(companyQuery, 6)
  }

  async searchMarketNews(): Promise<WebSearchResult[]> {
    // Search for latest market news
    const newsQuery = 'latest stock market news today financial markets'
    return this.searchWeb(newsQuery, 5)
  }
}

export interface WebSearchResult {
  title: string
  link: string
  snippet: string
  displayLink: string
  formattedUrl: string
  source: string
}

// Export singleton instance
export const webSearch = new WebSearch()
