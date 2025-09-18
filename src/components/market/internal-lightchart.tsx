"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { InternalStockRechartsChart } from "@/components/market/internal-stock-chart"
import { getCSSColorValue, CHART_COLORS } from "@/lib/chart-utils"

interface CandlePoint {
  time: number | string
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

interface InternalLightChartProps {
  symbol: string
  data?: CandlePoint[]
  height?: number
}

// Convert diverse timestamp shapes to lightweight-charts UTCTimestamp (seconds)
function toUtcSeconds(t: number | string): number {
  if (typeof t === "number") {
    // If value looks like seconds (< 2e10), keep; if ms, convert to seconds
    return t < 2e10 ? t : Math.floor(t / 1000)
  }
  const d = new Date(t)
  return Math.floor(d.getTime() / 1000)
}

export function InternalLightChart({ symbol, data, height = 420 }: InternalLightChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [lightReady, setLightReady] = useState(false)
  const [lightError, setLightError] = useState<string | null>(null)

  const points = useMemo(() => {
    const arr = (data || []) as CandlePoint[]
    return arr
      .filter(p => (p.close ?? 0) > 0 && (p.high ?? 0) > 0)
      .map(p => ({
        time: toUtcSeconds(p.time),
        open: Number(p.open ?? 0),
        high: Number(p.high ?? 0),
        low: Number(p.low ?? 0),
        close: Number(p.close ?? 0),
        volume: Number(p.volume ?? 0),
      }))
  }, [data])

  useEffect(() => {
    let disposeFn: (() => void) | null = null
    let mounted = true

    const init = async () => {
      if (!containerRef.current) return

      try {
        const mod = await import("lightweight-charts")
        if (!mounted) return
        const { createChart, CrosshairMode, ColorType } = mod

        const chart = createChart(containerRef.current!, {
          height,
          layout: {
            background: { type: ColorType.Solid, color: "transparent" },
            textColor: getCSSColorValue("--muted-foreground", CHART_COLORS.text.secondary),
          },
          rightPriceScale: { visible: true, borderVisible: false },
          timeScale: { borderVisible: false, timeVisible: true },
          grid: {
            vertLines: { color: "#e5e7eb", visible: true },
            horzLines: { color: "#e5e7eb", visible: true },
          },
          crosshair: { mode: CrosshairMode.Normal },
        })

        const candleSeries = chart.addCandlestickSeries({
          upColor: CHART_COLORS.chart.up,
          downColor: CHART_COLORS.chart.down,
          borderUpColor: CHART_COLORS.chart.up,
          borderDownColor: CHART_COLORS.chart.down,
          wickUpColor: CHART_COLORS.chart.up,
          wickDownColor: CHART_COLORS.chart.down,
        })

        const volumeSeries = chart.addHistogramSeries({
          priceScaleId: "",
          priceFormat: { type: "volume" },
          color: CHART_COLORS.chart.volume,
          base: 0,
        })

        if (points.length > 0) {
          candleSeries.setData(points.map(p => ({ time: p.time as any, open: p.open, high: p.high, low: p.low, close: p.close })))
          volumeSeries.setData(points.map(p => ({ time: p.time as any, value: p.volume || 0, color: p.close >= (p.open ?? p.close) ? `${CHART_COLORS.chart.up}88` : `${CHART_COLORS.chart.down}88` })))
          chart.timeScale().fitContent()
        }

        const ro = new ResizeObserver(() => {
          chart.applyOptions({ height: containerRef.current?.clientHeight || height })
          chart.timeScale().fitContent()
        })
        ro.observe(containerRef.current)

        disposeFn = () => {
          ro.disconnect()
          chart.remove()
        }

        setLightReady(true)
      } catch (e: any) {
        console.warn("lightweight-charts dynamic import failed, falling back to Recharts:", e?.message || e)
        if (mounted) setLightError(e?.message || "Module not available")
      }
    }

    init()

    return () => {
      mounted = false
      if (disposeFn) disposeFn()
    }
  }, [points, height])

  // If module failed or we lack points, render Recharts fallback but keep it internal-only
  if (lightError) {
    return <InternalStockRechartsChart symbol={symbol} data={data} height={height} />
  }

  // If no data, show a message
  if (!points || points.length === 0) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
        <div className="text-center">
          <div className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">No Chart Data</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Unable to load chart data for {symbol}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div ref={containerRef} style={{ width: "100%", height }} />
      {!lightReady && (
        <div className="mt-2 text-xs text-muted-foreground">Preparing interactive chart…</div>
      )}
    </div>
  )
}
