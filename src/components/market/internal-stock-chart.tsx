"use client"

import React, { useEffect, useMemo, useState } from "react"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  XAxis,
  YAxis,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"

interface CandlePoint {
  time: number | string
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

interface InternalStockChartProps {
  symbol: string
  data?: CandlePoint[]
  height?: number
  timeframe?: string
}

// Small formatter helpers
const formatPrice = (v?: number) => (v ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const formatTs = (t: number | string) => {
  const d = typeof t === "number" ? new Date(t) : new Date(t)
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString()
}

export function InternalStockRechartsChart({ symbol, data, height = 400, timeframe = "1mo" }: InternalStockChartProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [points, setPoints] = useState<CandlePoint[]>(data || [])

  // Fetch if no data passed in
  useEffect(() => {
    let mounted = true
    const fetchData = async () => {
      if (data && data.length > 0) return
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/chart/${encodeURIComponent(symbol)}?range=${encodeURIComponent(timeframe)}&interval=1m`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        const arr: CandlePoint[] = (json?.data || []).map((p: any) => ({
          time: p.time ?? p.timestamp ?? p.t ?? 0,
          open: Number(p.open ?? p.o ?? 0),
          high: Number(p.high ?? p.h ?? 0),
          low: Number(p.low ?? p.l ?? 0),
          close: Number(p.close ?? p.c ?? 0),
          volume: Number(p.volume ?? p.v ?? 0),
        }))
        if (mounted) setPoints(arr)
      } catch (e: any) {
        if (mounted) setError(e?.message || "Failed to load chart data")
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchData()
    return () => { mounted = false }
  }, [symbol, timeframe, data])

  const chartData = useMemo(() => {
    // Recharts expects objects per x axis step; we preserve fields
    return (points || []).map(p => ({
      x: typeof p.time === "number" ? new Date(p.time * (p.time < 2e10 ? 1000 : 1)).toISOString() : String(p.time),
      time: p.time,
      open: p.open,
      high: p.high,
      low: p.low,
      close: p.close,
      volume: p.volume ?? 0,
    }))
  }, [points])

  const latest = chartData.length > 0 ? chartData[chartData.length - 1] : undefined
  const perf = latest ? latest.close - (chartData[0]?.open ?? latest.close) : 0
  const perfColor = perf >= 0 ? "#10b981" : "#ef4444"

  if (loading) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center text-sm text-muted-foreground border rounded-md">
        Loading {symbol} chart…
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center text-sm text-destructive border rounded-md">
        {error}
      </div>
    )
  }

  if (!chartData.length) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center text-sm text-muted-foreground border rounded-md">
        No chart data available
      </div>
    )
  }

  const config = {
    close: { label: "Close", color: perfColor },
    volume: { label: "Volume", color: "#8b5cf6" },
  } as const

  return (
    <ChartContainer config={config} className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={chartData} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="x"
            tickFormatter={(v) => {
              const d = new Date(v)
              return isNaN(d.getTime()) ? "" : `${d.getMonth() + 1}/${d.getDate()}`
            }}
            minTickGap={24}
          />
          <YAxis yAxisId="price" tickFormatter={(v) => `$${formatPrice(v as number)}`} domain={["auto", "auto"]} width={60} />
          <YAxis yAxisId="vol" orientation="right" tickFormatter={(v) => `${Math.round((v as number)/1e6)}M`} width={40} />

          {/* Price as smooth area for readability */}
          <Area
            yAxisId="price"
            type="monotone"
            dataKey="close"
            stroke={perfColor}
            fill={perfColor + "33"}
            strokeWidth={2}
            dot={false}
            name="close"
          />

          {/* Volume bars */}
          <Bar yAxisId="vol" dataKey="volume" fill="var(--color-volume, #8b5cf6)" opacity={0.5} barSize={2} />

          <ReferenceLine yAxisId="price" y={latest?.close} stroke={perfColor} strokeDasharray="4 4" />

          <ChartTooltip cursor={{ stroke: "#6b7280", strokeDasharray: "3 3" }} content={<ChartTooltipContent />} />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
