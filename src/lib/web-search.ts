// Web Search Integration using Google Custom Search API
export class WebSearch {
  private apiKey: string
  private searchEngineId: string
  private baseUrl: string

  constructor() {
    this.apiKey = process.env.GOOGLE_SEARCH_API_KEY || ''
    this.searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID || ''
    this.baseUrl = 'https://www.googleapis.com/customsearch/v1'
  }

  async searchWeb(query: string, numResults: number = 5): Promise<WebSearchResult[]> {
    try {
      if (!this.apiKey || !this.searchEngineId) {
        console.log('⚠️ Web search API credentials not configured')
        return []
      }
      
      console.log(`🔍 Web searching for: "${query}"`)
      
      const url = `${this.baseUrl}?key=${this.apiKey}&cx=${this.searchEngineId}&q=${encodeURIComponent(query)}&num=${numResults}`
      
      const response = await fetch(url)
      
      if (!response.ok) {
        console.error(`❌ Web search failed: ${response.status} ${response.statusText}`)
        return []
      }

      const data = await response.json()
      
      if (!data.items || data.items.length === 0) {
        console.log(`❌ No web search results for: "${query}"`)
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

      console.log(`✅ Web search found ${results.length} results for: "${query}"`)
      return results

    } catch (error) {
      console.error(`❌ Web search error:`, error)
      return []
    }
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
