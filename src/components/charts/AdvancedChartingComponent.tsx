'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createChart, IChartApi, ISeriesApi, ColorType, CrosshairMode, LineStyle, Time } from 'lightweight-charts'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Activity, 
  Settings,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Maximize2,
  Minimize2,
  Download,
  Share2,
  Target,
  Ruler,
  Calculator,
  Brain,
  Crown
} from 'lucide-react'

interface OHLCVData {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface AdvancedChartingComponentProps {
  symbol: string
  timeframe: string
  chartType: 'candlestick' | 'line' | 'area' | 'bar' | 'renko' | 'heikin-ashi'
  theme: 'dark' | 'light' | 'professional'
  showVolume: boolean
  showGrid: boolean
  showLegend: boolean
  indicators: string[]
  drawingTools: string[]
}

interface TechnicalIndicator {
  id: string
  name: string
  data: Array<{ time: Time; value: number }>
  color: string
  lineWidth?: number
  lineStyle?: LineStyle
}

interface DrawingElement {
  id: string
  type: 'trendline' | 'fibonacci' | 'rectangle' | 'ellipse' | 'text'
  data: any
  color: string
  lineWidth?: number
}

export function AdvancedChartingComponent({
  symbol,
  timeframe,
  chartType,
  theme,
  showVolume,
  showGrid,
  showLegend,
  indicators,
  drawingTools
}: AdvancedChartingComponentProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const indicatorSeriesRefs = useRef<Map<string, ISeriesApi<'Line'> | ISeriesApi<'Area'> | null>>(new Map())
  const isInitializedRef = useRef(false)
  const cleanupRef = useRef<(() => void) | null>(null)
  
  const [chartData, setChartData] = useState<OHLCVData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [priceChange, setPriceChange] = useState<number>(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [technicalIndicators, setTechnicalIndicators] = useState<TechnicalIndicator[]>([])

  // Chart theme configurations
  const chartThemes = {
    dark: {
      backgroundColor: '#1a1a1a',
      textColor: '#ffffff',
      gridColor: '#2a2a2a',
      borderColor: '#3a3a3a',
      upColor: '#26a69a',
      downColor: '#ef5350',
      volumeColor: '#4caf50'
    },
    light: {
      backgroundColor: '#ffffff',
      textColor: '#000000',
      gridColor: '#e0e0e0',
      borderColor: '#cccccc',
      upColor: '#26a69a',
      downColor: '#ef5350',
      volumeColor: '#4caf50'
    },
    professional: {
      backgroundColor: '#0f1419',
      textColor: '#ffffff',
      gridColor: '#1e2328',
      borderColor: '#2a2e39',
      upColor: '#00c853',
      downColor: '#ff5252',
      volumeColor: '#2196f3'
    }
  }

  const currentTheme = chartThemes[theme]

  // Safe chart cleanup function
  const safeCleanup = useCallback(() => {
    if (cleanupRef.current) {
      try {
        cleanupRef.current()
      } catch (e) {
        console.warn('Error during cleanup:', e)
      }
      cleanupRef.current = null
    }

    if (chartRef.current) {
      try {
        // Remove all series first
        indicatorSeriesRefs.current.forEach((series) => {
          if (series && chartRef.current) {
            try {
              chartRef.current.removeSeries(series)
            } catch (e) {
              // Ignore errors when removing series
            }
          }
        })
        indicatorSeriesRefs.current.clear()
        
        // Remove the chart
        chartRef.current.remove()
      } catch (e) {
        console.warn('Error during chart cleanup:', e)
      } finally {
        chartRef.current = null
        candlestickSeriesRef.current = null
        volumeSeriesRef.current = null
        isInitializedRef.current = false
      }
    }
  }, [])

  // Initialize chart
  const initializeChart = useCallback(() => {
    if (!chartContainerRef.current || isInitializedRef.current) return

    // Clean up any existing chart
    safeCleanup()

    try {
      // Create new chart
      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: currentTheme.backgroundColor },
          textColor: currentTheme.textColor,
        },
        grid: {
          vertLines: { 
            color: currentTheme.gridColor,
            visible: showGrid 
          },
          horzLines: { 
            color: currentTheme.gridColor,
            visible: showGrid 
          },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: {
            color: currentTheme.textColor,
            width: 1,
            style: LineStyle.Solid,
          },
          horzLine: {
            color: currentTheme.textColor,
            width: 1,
            style: LineStyle.Solid,
          },
        },
        rightPriceScale: {
          borderColor: currentTheme.borderColor,
          visible: true,
        },
        timeScale: {
          borderColor: currentTheme.borderColor,
          visible: true,
          timeVisible: true,
          secondsVisible: false,
        },
        handleScroll: {
          mouseWheel: true,
          pressedMouseMove: true,
          horzTouchDrag: true,
          vertTouchDrag: true,
        },
        handleScale: {
          axisPressedMouseMove: true,
          mouseWheel: true,
          pinch: true,
        },
      })

      chartRef.current = chart
      isInitializedRef.current = true

      // Add candlestick series ONLY if chart type is candlestick
      if (chartType === 'candlestick') {
        const candlestickSeries = chart.addCandlestickSeries({
          upColor: currentTheme.upColor,
          downColor: currentTheme.downColor,
          borderVisible: false,
          wickUpColor: currentTheme.upColor,
          wickDownColor: currentTheme.downColor,
        })
        candlestickSeriesRef.current = candlestickSeries

        // Set candlestick data
        if (chartData.length > 0) {
          const formattedData = chartData.map(d => ({
            time: d.time as Time,
            open: Number(d.open),
            high: Number(d.high),
            low: Number(d.low),
            close: Number(d.close)
          }))
          
          const uniqueData = formattedData.filter((item, index, self) => 
            index === self.findIndex(t => t.time === item.time)
          )
          
          candlestickSeries.setData(uniqueData)
        }
      } else {
        // For other chart types, add line series
        const lineSeries = chart.addLineSeries({
          color: currentTheme.upColor,
          lineWidth: 2,
        })
        candlestickSeriesRef.current = lineSeries as any

        // Convert OHLCV data to line data
        if (chartData.length > 0) {
          const lineData = chartData.map(d => ({
            time: d.time as Time,
            value: Number(d.close)
          }))
          lineSeries.setData(lineData)
        }
      }

      // Add volume series if enabled (only for candlestick charts)
      if (showVolume && chartType === 'candlestick') {
        const volumeSeries = chart.addHistogramSeries({
          color: currentTheme.volumeColor,
          priceFormat: {
            type: 'volume',
          },
          priceScaleId: '',
        })
        volumeSeriesRef.current = volumeSeries

        // Set volume data
        if (chartData.length > 0) {
          const volumeData = chartData.map(d => ({
            time: d.time as Time,
            value: d.volume,
            color: d.close >= d.open ? currentTheme.upColor : currentTheme.downColor
          }))
          volumeSeries.setData(volumeData)
        }
      }

      // Add technical indicators (only for candlestick charts)
      if (chartType === 'candlestick') {
        technicalIndicators.forEach(indicator => {
          if (indicators.includes(indicator.id)) {
            try {
              const series = chart.addLineSeries({
                color: indicator.color,
                lineWidth: (indicator.lineWidth || 2) as any,
                lineStyle: indicator.lineStyle || LineStyle.Solid,
              })
              indicatorSeriesRefs.current.set(indicator.id, series)
              series.setData(indicator.data)
            } catch (e) {
              console.warn('Failed to add indicator series:', e)
            }
          }
        })
      }

      // Handle chart resize
      const handleResize = () => {
        if (chart && chartContainerRef.current) {
          try {
            chart.applyOptions({
              width: chartContainerRef.current.clientWidth || 800,
              height: chartContainerRef.current.clientHeight || 600,
            })
          } catch (e) {
            console.warn('Error resizing chart:', e)
          }
        }
      }

      window.addEventListener('resize', handleResize)
      handleResize()

      // Store cleanup function
      cleanupRef.current = () => {
        window.removeEventListener('resize', handleResize)
      }

    } catch (e) {
      console.error('Error initializing chart:', e)
      setError('Failed to initialize chart')
    }
  }, [chartData, currentTheme, showVolume, showGrid, indicators, technicalIndicators, chartType, safeCleanup])

  // Fetch chart data
  const fetchChartData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/chart/${symbol}?range=${timeframe}&interval=1m`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch chart data: ${response.status}`)
      }

      const result = await response.json()
      
      if (!result.success || !result.data) {
        throw new Error('No chart data available')
      }

      const data = result.data.map((item: any) => ({
        time: item.time,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume || 0
      }))

      const uniqueData = data.filter((item: any, index: number, self: any[]) => 
        index === self.findIndex(t => t.time === item.time)
      )

      setChartData(uniqueData)

      // Calculate current price and change
      if (data.length > 0) {
        const latest = data[data.length - 1]
        const previous = data[data.length - 2]
        
        setCurrentPrice(latest.close)
        if (previous) {
          setPriceChange(((latest.close - previous.close) / previous.close) * 100)
        }
      }

      // Calculate technical indicators
      calculateTechnicalIndicators(data)

    } catch (err) {
      console.error('Error fetching chart data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load chart data')
      
      // Generate fallback data
      const fallbackData = generateFallbackData(symbol, timeframe)
      setChartData(fallbackData)
    } finally {
      setIsLoading(false)
    }
  }, [symbol, timeframe])

  // Calculate technical indicators
  const calculateTechnicalIndicators = useCallback((data: OHLCVData[]) => {
    const newIndicators: TechnicalIndicator[] = []

    // SMA
    if (indicators.includes('sma')) {
      const smaData = calculateSMA(data, 20)
      newIndicators.push({
        id: 'sma',
        name: 'Simple Moving Average (20)',
        data: smaData,
        color: '#3b82f6'
      })
    }

    // EMA
    if (indicators.includes('ema')) {
      const emaData = calculateEMA(data, 12)
      newIndicators.push({
        id: 'ema',
        name: 'Exponential Moving Average (12)',
        data: emaData,
        color: '#ef4444'
      })
    }

    // RSI
    if (indicators.includes('rsi')) {
      const rsiData = calculateRSI(data, 14)
      newIndicators.push({
        id: 'rsi',
        name: 'Relative Strength Index (14)',
        data: rsiData,
        color: '#8b5cf6'
      })
    }

    // MACD
    if (indicators.includes('macd')) {
      const macdData = calculateMACD(data, 12, 26, 9)
      newIndicators.push({
        id: 'macd',
        name: 'MACD',
        data: macdData.macd,
        color: '#06b6d4'
      })
      newIndicators.push({
        id: 'macd_signal',
        name: 'MACD Signal',
        data: macdData.signal,
        color: '#f59e0b'
      })
    }

    // Bollinger Bands
    if (indicators.includes('bollinger')) {
      const bbData = calculateBollingerBands(data, 20, 2)
      newIndicators.push({
        id: 'bb_upper',
        name: 'Bollinger Upper',
        data: bbData.upper,
        color: '#f59e0b'
      })
      newIndicators.push({
        id: 'bb_lower',
        name: 'Bollinger Lower',
        data: bbData.lower,
        color: '#f59e0b'
      })
    }

    // Stochastic Oscillator
    if (indicators.includes('stochastic')) {
      const stochData = calculateStochastic(data, 14, 3)
      newIndicators.push({
        id: 'stoch_k',
        name: 'Stochastic %K',
        data: stochData.k,
        color: '#6366f1'
      })
      newIndicators.push({
        id: 'stoch_d',
        name: 'Stochastic %D',
        data: stochData.d,
        color: '#ec4899'
      })
    }

    // Williams %R
    if (indicators.includes('williams_r')) {
      const williamsData = calculateWilliamsR(data, 14)
      newIndicators.push({
        id: 'williams_r',
        name: 'Williams %R (14)',
        data: williamsData,
        color: '#10b981'
      })
    }

    // Average True Range (ATR)
    if (indicators.includes('atr')) {
      const atrData = calculateATR(data, 14)
      newIndicators.push({
        id: 'atr',
        name: 'Average True Range (14)',
        data: atrData,
        color: '#ec4899'
      })
    }

    // Ichimoku Cloud
    if (indicators.includes('ichimoku')) {
      const ichimokuData = calculateIchimoku(data)
      newIndicators.push({
        id: 'tenkan',
        name: 'Tenkan-sen',
        data: ichimokuData.tenkan,
        color: '#3b82f6'
      })
      newIndicators.push({
        id: 'kijun',
        name: 'Kijun-sen',
        data: ichimokuData.kijun,
        color: '#ef4444'
      })
      newIndicators.push({
        id: 'senkou_a',
        name: 'Senkou Span A',
        data: ichimokuData.senkouA,
        color: '#10b981'
      })
      newIndicators.push({
        id: 'senkou_b',
        name: 'Senkou Span B',
        data: ichimokuData.senkouB,
        color: '#f59e0b'
      })
    }

    // Parabolic SAR
    if (indicators.includes('parabolic_sar')) {
      const sarData = calculateParabolicSAR(data)
      newIndicators.push({
        id: 'parabolic_sar',
        name: 'Parabolic SAR',
        data: sarData,
        color: '#8b5cf6'
      })
    }

    // Commodity Channel Index (CCI)
    if (indicators.includes('cci')) {
      const cciData = calculateCCI(data, 20)
      newIndicators.push({
        id: 'cci',
        name: 'Commodity Channel Index (20)',
        data: cciData,
        color: '#06b6d4'
      })
    }

    // Money Flow Index (MFI)
    if (indicators.includes('mfi')) {
      const mfiData = calculateMFI(data, 14)
      newIndicators.push({
        id: 'mfi',
        name: 'Money Flow Index (14)',
        data: mfiData,
        color: '#f97316'
      })
    }

    setTechnicalIndicators(newIndicators)
  }, [indicators])

  // Technical indicator calculations
  const calculateSMA = (data: OHLCVData[], period: number) => {
    const smaData = []
    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1).reduce((acc, d) => acc + d.close, 0)
      smaData.push({
        time: data[i].time as Time,
        value: sum / period
      })
    }
    return smaData
  }

  const calculateEMA = (data: OHLCVData[], period: number) => {
    const emaData = []
    const multiplier = 2 / (period + 1)
    
    // First EMA is SMA
    let ema = data.slice(0, period).reduce((acc, d) => acc + d.close, 0) / period
    emaData.push({ time: data[period - 1].time as Time, value: ema })
    
    for (let i = period; i < data.length; i++) {
      ema = (data[i].close * multiplier) + (ema * (1 - multiplier))
      emaData.push({ time: data[i].time as Time, value: ema })
    }
    
    return emaData
  }

  const calculateEMAForLineData = (data: Array<{ time: Time; value: number }>, period: number) => {
    const emaData = []
    const multiplier = 2 / (period + 1)
    
    // First EMA is SMA
    let ema = data.slice(0, period).reduce((acc, d) => acc + d.value, 0) / period
    emaData.push({ time: data[period - 1].time, value: ema })
    
    for (let i = period; i < data.length; i++) {
      ema = (data[i].value * multiplier) + (ema * (1 - multiplier))
      emaData.push({ time: data[i].time, value: ema })
    }
    
    return emaData
  }

  const calculateRSI = (data: OHLCVData[], period: number) => {
    const rsiData = []
    const gains = []
    const losses = []
    
    // Calculate gains and losses
    for (let i = 1; i < data.length; i++) {
      const change = data[i].close - data[i - 1].close
      gains.push(change > 0 ? change : 0)
      losses.push(change < 0 ? Math.abs(change) : 0)
    }
    
    // Calculate RSI
    for (let i = period; i < data.length; i++) {
      const avgGain = gains.slice(i - period, i).reduce((acc, g) => acc + g, 0) / period
      const avgLoss = losses.slice(i - period, i).reduce((acc, l) => acc + l, 0) / period
      const rs = avgGain / avgLoss
      const rsi = 100 - (100 / (1 + rs))
      
      rsiData.push({ time: data[i].time as Time, value: rsi })
    }
    
    return rsiData
  }

  const calculateMACD = (data: OHLCVData[], fastPeriod: number, slowPeriod: number, signalPeriod: number) => {
    const fastEMA = calculateEMA(data, fastPeriod)
    const slowEMA = calculateEMA(data, slowPeriod)
    
    // Calculate MACD line
    const macdData = []
    for (let i = 0; i < fastEMA.length; i++) {
      const slowIndex = slowEMA.findIndex(d => d.time === fastEMA[i].time)
      if (slowIndex !== -1) {
        macdData.push({
          time: fastEMA[i].time as Time,
          value: fastEMA[i].value - slowEMA[slowIndex].value
        })
      }
    }
    
    // Calculate signal line
    const signalData = calculateEMAForLineData(macdData, signalPeriod)
    
    return { macd: macdData, signal: signalData }
  }

  const calculateBollingerBands = (data: OHLCVData[], period: number, stdDev: number) => {
    const smaData = calculateSMA(data, period)
    const upper = []
    const lower = []
    
    for (let i = period - 1; i < data.length; i++) {
      const slice = data.slice(i - period + 1, i + 1)
      const sma = smaData[i - period + 1].value
      const variance = slice.reduce((acc, d) => acc + Math.pow(d.close - sma, 2), 0) / period
      const standardDeviation = Math.sqrt(variance)
      
      upper.push({
        time: data[i].time as Time,
        value: sma + (standardDeviation * stdDev)
      })
      lower.push({
        time: data[i].time as Time,
        value: sma - (standardDeviation * stdDev)
      })
    }
    
    return { upper, lower }
  }

  // Stochastic Oscillator
  const calculateStochastic = (data: OHLCVData[], period: number, signalPeriod: number) => {
    const kData = []
    let dData = []

    for (let i = period - 1; i < data.length; i++) {
      const low = data.slice(i - period + 1, i + 1).reduce((min, d) => Math.min(min, d.low), data[i].low)
      const high = data.slice(i - period + 1, i + 1).reduce((max, d) => Math.max(max, d.high), data[i].high)
      const close = data[i].close

      const k = ((close - low) / (high - low)) * 100
      kData.push({ time: data[i].time as Time, value: k })
    }

    dData = calculateEMAForLineData(kData, signalPeriod)

    return { k: kData, d: dData }
  }

  // Williams %R
  const calculateWilliamsR = (data: OHLCVData[], period: number) => {
    const williamsData = []

    for (let i = period - 1; i < data.length; i++) {
      const low = data.slice(i - period + 1, i + 1).reduce((min, d) => Math.min(min, d.low), data[i].low)
      const high = data.slice(i - period + 1, i + 1).reduce((max, d) => Math.max(max, d.high), data[i].high)
      const close = data[i].close

      const williams = ((high - close) / (high - low)) * -100
      williamsData.push({ time: data[i].time as Time, value: williams })
    }

    return williamsData
  }

  // Average True Range (ATR)
  const calculateATR = (data: OHLCVData[], period: number) => {
    const atrData = []

    for (let i = 1; i < data.length; i++) {
      const highLow = data[i].high - data[i].low
      const highClose = Math.abs(data[i].high - data[i - 1].close)
      const lowClose = Math.abs(data[i].low - data[i - 1].close)

      const tr = Math.max(highLow, Math.max(highClose, lowClose))
      atrData.push({ time: data[i].time as Time, value: tr })
    }

    const emaData = calculateEMAForLineData(atrData, period)
    return emaData
  }

  // Ichimoku Cloud
  const calculateIchimoku = (data: OHLCVData[]) => {
    const tenkan = []
    const kijun = []
    const senkouA = []
    const senkouB = []

    const tenkanPeriod = 9
    const kijunPeriod = 26
    const senkouPeriod = 52

    for (let i = tenkanPeriod - 1; i < data.length; i++) {
      const slice = data.slice(i - tenkanPeriod + 1, i + 1)
      const high = Math.max(...slice.map(d => d.high))
      const low = Math.min(...slice.map(d => d.low))

      tenkan.push({
        time: data[i].time as Time,
        value: (high + low) / 2
      })
    }

    for (let i = kijunPeriod - 1; i < data.length; i++) {
      const slice = data.slice(i - kijunPeriod + 1, i + 1)
      const high = Math.max(...slice.map(d => d.high))
      const low = Math.min(...slice.map(d => d.low))

      kijun.push({
        time: data[i].time as Time,
        value: (high + low) / 2
      })
    }

    for (let i = senkouPeriod - 1; i < data.length; i++) {
      const slice = data.slice(i - senkouPeriod + 1, i + 1)
      const high = Math.max(...slice.map(d => d.high))
      const low = Math.min(...slice.map(d => d.low))

      senkouB.push({
        time: data[i].time as Time,
        value: (high + low) / 2
      })
    }

    // Calculate Senkou Span A (Tenkan + Kijun) / 2, shifted forward by 26 periods
    for (let i = 0; i < Math.min(tenkan.length, kijun.length); i++) {
      const tenkanValue = tenkan[i]?.value || 0
      const kijunValue = kijun[i]?.value || 0
      
      senkouA.push({
        time: (data[i + 26]?.time || data[data.length - 1].time) as Time,
        value: (tenkanValue + kijunValue) / 2
      })
    }

    return { tenkan, kijun, senkouA, senkouB }
  }

  // Parabolic SAR
  const calculateParabolicSAR = (data: OHLCVData[]) => {
    const sarData = []
    let accelerationFactor = 0.02
    let extremePoint = data[0].high
    let isLong = true
    let sar = data[0].high

    for (let i = 1; i < data.length; i++) {
      const currentHigh = data[i].high
      const currentLow = data[i].low

      if (isLong) {
        if (currentLow < sar) {
          sar = extremePoint
          accelerationFactor = 0.02
          isLong = false
        } else {
          sar = sar + accelerationFactor * (extremePoint - sar)
          accelerationFactor = Math.min(accelerationFactor + 0.02, 0.2)
        }
      } else {
        if (currentHigh > sar) {
          sar = extremePoint
          accelerationFactor = 0.02
          isLong = true
        } else {
          sar = sar - accelerationFactor * (sar - extremePoint)
          accelerationFactor = Math.min(accelerationFactor + 0.02, 0.2)
        }
      }

      sarData.push({ time: data[i].time as Time, value: sar })
    }

    return sarData
  }

  // Commodity Channel Index (CCI)
  const calculateCCI = (data: OHLCVData[], period: number) => {
    const cciData = []

    for (let i = period - 1; i < data.length; i++) {
      const slice = data.slice(i - period + 1, i + 1)
      const typicalPrices = slice.map(d => (d.high + d.low + d.close) / 3)
      const sma = typicalPrices.reduce((sum, tp) => sum + tp, 0) / period
      const meanDeviation = typicalPrices.reduce((sum, tp) => sum + Math.abs(tp - sma), 0) / period

      const cci = meanDeviation === 0 ? 0 : (typicalPrices[typicalPrices.length - 1] - sma) / (0.015 * meanDeviation)
      cciData.push({ time: data[i].time as Time, value: cci })
    }

    return cciData
  }

  // Money Flow Index (MFI)
  const calculateMFI = (data: OHLCVData[], period: number) => {
    const mfiData = []

    for (let i = period; i < data.length; i++) {
      let positiveFlow = 0
      let negativeFlow = 0

      for (let j = i - period + 1; j <= i; j++) {
        const currentTypicalPrice = (data[j].high + data[j].low + data[j].close) / 3
        const prevTypicalPrice = (data[j - 1].high + data[j - 1].low + data[j - 1].close) / 3
        const moneyFlow = currentTypicalPrice * data[j].volume

        if (currentTypicalPrice > prevTypicalPrice) {
          positiveFlow += moneyFlow
        } else {
          negativeFlow += moneyFlow
        }
      }

      const moneyRatio = negativeFlow === 0 ? 100 : positiveFlow / negativeFlow
      const mfi = 100 - (100 / (1 + moneyRatio))
      mfiData.push({ time: data[i].time as Time, value: mfi })
    }

    return mfiData
  }

  // Generate fallback data
  const generateFallbackData = (symbol: string, timeframe: string): OHLCVData[] => {
    const data: OHLCVData[] = []
    const basePrice = 100 + Math.random() * 100
    const now = Date.now()
    const interval = timeframe === '1d' ? 24 * 60 * 60 * 1000 : 60 * 1000 // 1 day or 1 minute
    
    for (let i = 0; i < 100; i++) {
      const time = now - (100 - i) * interval
      const open = basePrice + (Math.random() - 0.5) * 10
      const close = open + (Math.random() - 0.5) * 5
      const high = Math.max(open, close) + Math.random() * 3
      const low = Math.min(open, close) - Math.random() * 3
      const volume = Math.floor(Math.random() * 1000000) + 100000
      
      data.push({ time, open, high, low, close, volume })
    }
    
    return data
  }

  // Initialize chart on mount
  useEffect(() => {
    fetchChartData()
  }, [fetchChartData])

  // Initialize chart when data is available
  useEffect(() => {
    if (chartData.length > 0 && !isInitializedRef.current) {
      initializeChart()
    }
  }, [chartData, initializeChart])

  // Update indicators when they change
  useEffect(() => {
    if (chartData.length > 0) {
      calculateTechnicalIndicators(chartData)
    }
  }, [calculateTechnicalIndicators, chartData])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      safeCleanup()
    }
  }, [safeCleanup])

  if (error) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Chart Error</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchChartData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="relative h-full w-full">
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div>
            <h3 className="text-lg font-semibold">{symbol}</h3>
            <p className="text-sm text-muted-foreground">{timeframe.toUpperCase()} Chart</p>
          </div>
          {currentPrice && (
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold">${currentPrice.toFixed(2)}</span>
              <Badge variant={priceChange >= 0 ? 'default' : 'destructive'} className="flex items-center gap-1">
                {priceChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
              </Badge>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {showLegend && technicalIndicators.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              {technicalIndicators.map(indicator => (
                <div key={indicator.id} className="flex items-center gap-1">
                  <div 
                    className="w-3 h-0.5 rounded" 
                    style={{ backgroundColor: indicator.color }}
                  />
                  <span className="text-muted-foreground">{indicator.name}</span>
                </div>
              ))}
            </div>
          )}
          
          <Button
            onClick={() => setIsFullscreen(!isFullscreen)}
            variant="outline"
            size="sm"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Chart Container */}
      <div 
        ref={chartContainerRef}
        className={`w-full ${isFullscreen ? 'h-[calc(100vh-200px)]' : 'h-[500px]'}`}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading chart data...</p>
            </div>
          </div>
        )}
      </div>

      {/* Chart Footer */}
      <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>Chart Type: {chartType}</span>
          <span>Theme: {theme}</span>
          {showVolume && <span>Volume: Enabled</span>}
          {showGrid && <span>Grid: Enabled</span>}
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Crown className="h-3 w-3" />
            PRO
          </Badge>
          <span>Powered by Lightweight Charts</span>
        </div>
      </div>
    </div>
  )
}
