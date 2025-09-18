import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { PolygonApiService } from '@/lib/screener/polygonApi'
import { ScreenerDataService } from '@/lib/screener/ScreenerDataService'
import type { FilterCriteria } from '@/types/screener'

// Simple in-memory cache for the current process
// Keyed by `${tradingDate}::${normalizedFilters}`
const memoryCache = new Map<string, { data: any; timestamp: number }>()

function getTradingDateISO(): string {
	// Use today's date in ISO (YYYY-MM-DD). In production you may want to use last market day if pre-market
	const now = new Date()
	return now.toISOString().split('T')[0]
}

function normalizeFilters(filters: FilterCriteria): string {
	// Keep only relevant keys in stable order
	const {
		search,
		exchange,
		sector,
		priceMin,
		priceMax,
		marketCapMin,
		marketCapMax,
		volumeMin,
	} = filters || ({} as FilterCriteria)
	return JSON.stringify({
		search: search?.trim() || '',
		exchange: exchange || '',
		sector: sector || '',
		priceMin: priceMin ?? null,
		priceMax: priceMax ?? null,
		marketCapMin: marketCapMin ?? null,
		marketCapMax: marketCapMax ?? null,
		volumeMin: volumeMin ?? null,
	})
}

export async function POST(req: NextRequest) {
	try {
		const body = await req.json().catch(() => ({}))
		const filters: FilterCriteria = body?.filters || {}
		const limit: number = typeof body?.limit === 'number' ? body.limit : 200
		const offset: number = typeof body?.offset === 'number' && body.offset > 0 ? Math.floor(body.offset) : 0
		const sort = body?.sort as { field?: string; direction?: 'asc' | 'desc' } | undefined

		const tradingDate = getTradingDateISO()
		const cacheKey = `${tradingDate}::${normalizeFilters(filters)}::${limit}::${offset}`
		const cached = memoryCache.get(cacheKey)
		if (cached) {
			return NextResponse.json({
				...cached.data,
				cached: true,
				tradingDate,
			})
		}

		const service = new PolygonApiService()
		// Prefer full-market snapshot; fallback to universal screener if snapshot flow fails
		let result: { stocks: any[]; totalCount: number; hasMore: boolean }
		try {
			const snap = await service.searchMarketSnapshot(filters, limit)
			result = { stocks: snap.stocks, totalCount: snap.totalCount, hasMore: snap.hasMore }
		} catch (e) {
			const uni = await service.getUniversalScreenerResults(filters, limit)
			result = { stocks: uni.stocks, totalCount: uni.totalCount, hasMore: uni.hasMore }
		}

		// Production-grade enrichment: standardize price/change using ScreenerDataService
		// Non-invasive: merge computed fields into existing results by ticker
		try {
			const tickers: string[] = (result.stocks || []).map((s: any) => s?.ticker).filter(Boolean)
			if (tickers.length > 0) {
				const sds = new ScreenerDataService()
				const unified = await sds.getUnifiedSnapshots(tickers, true, 12, 400)
				const byTicker = new Map(unified.map(u => [u.ticker, u]))
				result.stocks = (result.stocks || []).map((s: any) => {
					const u = byTicker.get(s?.ticker)
					if (!u) return s
					return {
						...s,
						price: typeof u.price === 'number' ? u.price : s.price,
						change: u.change !== undefined ? u.change : s.change,
						change_percent: u.change_percent !== undefined ? u.change_percent : s.change_percent,
						volume: u.volume !== undefined ? u.volume : s.volume,
						market_cap: u.market_cap !== undefined ? u.market_cap : s.market_cap,
						has_change: u.has_change ?? s.has_change,
						basis: (u as any).basis ?? (s as any).basis,
						market_state: (u as any).market_state ?? (s as any).market_state,
					}
				})
			}
		} catch (e) {
			// Best-effort enrichment; if it fails, proceed with original result
			console.warn('Screener enrichment skipped due to error:', e)
		}

		// Sort the full set first
		let full = result.stocks || []
		if (sort?.field && (sort.direction === 'asc' || sort.direction === 'desc')) {
			const field = sort.field as keyof (typeof full)[number]
			full = [...full].sort((a, b) => {
				const av = a[field] as any
				const bv = b[field] as any
				if (av === undefined && bv === undefined) return 0
				if (av === undefined) return 1
				if (bv === undefined) return -1
				if (typeof av === 'string' && typeof bv === 'string') {
					const cmp = av.localeCompare(bv)
					return sort.direction === 'asc' ? cmp : -cmp
				}
				if (typeof av === 'number' && typeof bv === 'number') {
					const cmp = av - bv
					return sort.direction === 'asc' ? cmp : -cmp
				}
				return 0
			})
		}

		// Apply offset/limit slicing after sorting
		const start = Math.max(0, offset)
		const end = Math.min(start + limit, full.length)
		const stocks = full.slice(start, end)
		const hasMore = end < full.length

		const payload = {
			stocks,
			totalCount: result.totalCount ?? full.length,
			hasMore,
			tradingDate,
			offset: start,
			cached: false,
		}

		// Cache for the lifetime of the process (resets on deploy). Can be replaced by Redis later
		memoryCache.set(cacheKey, { data: payload, timestamp: Date.now() })

		return NextResponse.json(payload)
	} catch (error: any) {
		return NextResponse.json(
			{
				error: true,
				message: error?.message || 'Failed to screen market',
			},
			{ status: 500 }
		)
	}
}


