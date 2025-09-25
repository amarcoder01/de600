// Polygon News API client (modular, no UI coupling)
// Fetches raw Polygon news results and returns them along with pagination hints.

export interface PolygonNewsItemRaw {
  id?: string
  title?: string
  description?: string
  article_url?: string
  image_url?: string
  published_utc?: string
  tickers?: string[]
  publisher?: { name?: string }
}

export interface PolygonNewsResponseRaw {
  results?: PolygonNewsItemRaw[]
  status?: string
  count?: number
  next_url?: string
}

export interface FetchPolygonNewsParams {
  q?: string
  ticker?: string
  limit: number
  page: number
  daysBack?: number // defaults to 7
}

function getPolygonApiKey(): string {
  const key = process.env.POLYGON_API_KEY || process.env.NEXT_PUBLIC_POLYGON_API_KEY
  if (!key) throw new Error('POLYGON_API_KEY not configured')
  return key
}

export async function fetchPolygonNews(params: FetchPolygonNewsParams): Promise<{
  results: PolygonNewsItemRaw[]
  hasNext: boolean
}> {
  const { q, ticker, limit, page, daysBack = 7 } = params
  const apiKey = getPolygonApiKey()

  // Emulate page-number pagination by over-fetching up to N * limit and slicing at the caller.
  const requestLimit = Math.max(1, Math.min(1000, limit * Math.max(1, page)))

  const url = new URL('https://api.polygon.io/v2/reference/news')
  url.searchParams.set('apikey', apiKey)
  url.searchParams.set('limit', String(requestLimit))
  url.searchParams.set('order', 'desc')
  url.searchParams.set('sort', 'published_utc')

  if (ticker && ticker.trim()) {
    url.searchParams.set('ticker', ticker.trim().toUpperCase())
  } else if (q && q.trim()) {
    url.searchParams.set('q', q.trim())
  }

  // Filter recent items to reduce noise; default last 7 days
  if (daysBack > 0) {
    const from = new Date()
    from.setDate(from.getDate() - daysBack)
    // Polygon uses dot-notation keys for range filters
    url.searchParams.set('published_utc.gte', from.toISOString())
  }

  // 8s timeout with AbortController
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(url.toString(), { signal: controller.signal, headers: { 'Accept': 'application/json' } })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Polygon news HTTP ${res.status}: ${text.substring(0, 200)}`)
    }
    const data: PolygonNewsResponseRaw = await res.json()
    const results = Array.isArray(data.results) ? data.results : []
    return { results, hasNext: Boolean(data.next_url) }
  } finally {
    clearTimeout(timeout)
  }
}
