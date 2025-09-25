"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { 
  BarChart3, 
  TrendingUp, 
  Brain, 
  Search, 
  Plus, 
  X, 
  Loader2, 
  Download,
  Share2,
  Target,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Activity,
  PieChart,
  LineChart,
  Zap,
  Globe,
  Building2,
  Users,
  ArrowUp,
  ArrowDown,
  Minus,
  Maximize2,
  Settings,
  Eye,
  RefreshCw,
  Wifi,
  WifiOff,
  Crown,
  Shield,
  Trash2
} from 'lucide-react'
import { AnalysisTableRenderer } from './AnalysisTableRenderer'
import { useRealTimeComparison, usePriceChangeIndicator } from '@/hooks/useRealTimeComparison'
import { RealTimePriceDisplay, RealTimeVolumeDisplay, RealTimeMarketCapDisplay } from './RealTimePriceDisplay'
import { useMultipleStockDetails } from '@/hooks/useStockDetails'
import { useMarketInsights } from '@/hooks/useMarketInsights'
import { FinancialMetricsDisplay } from './FinancialMetricsDisplay'
import { cn } from '@/lib/utils'
import { UserDataService } from '@/lib/user-data-service'

interface StockData {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  marketCap: number
  pe: number | null // Allow null for missing P/E data
  volume: number
  dividendYield: number
  beta: number | null // Allow null for missing Beta data
  high52Week: number
  low52Week: number
  sector: string
  industry: string
  historicalData?: ChartData[]
  technicalIndicators?: any
  sentiment?: any
  fundamentals?: any
  news?: any[]
}

interface ChartData {
  timestamp: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface ComparisonSession {
  id: string
  stocks: StockData[]
  analysis: string
  timestamp: string
  customPrompt?: string
}

interface AnalysisResult {
  fundamental: string
  technical: string
  risk: string
  competitive: string
  recommendation: string
  confidence: number
}

export default function StockComparisonAnalyzer() {
  const [selectedStocks, setSelectedStocks] = useState<StockData[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<StockData[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isLoadingEnhancedData, setIsLoadingEnhancedData] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [customPrompt, setCustomPrompt] = useState('')
  const [savedSessions, setSavedSessions] = useState<ComparisonSession[]>([])
  const [activeTab, setActiveTab] = useState('comparison')
  const [realTimeEnabled, setRealTimeEnabled] = useState(true)
  const [selectedStockForDetails, setSelectedStockForDetails] = useState<string | null>(null)
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
  const [isSavingSession, setIsSavingSession] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  // Ensure selectedStocks is always an array to prevent map errors
  const safeSelectedStocks = selectedStocks || []

  // Data integrity validation function
  const validateSessionData = (session: any): boolean => {
    if (!session) return false
    if (!session.id || !session.timestamp) return false
    if (!session.stocks || !Array.isArray(session.stocks)) return false
    
    // Validate each stock in the session
    return session.stocks.every((stock: any) => 
      stock && 
      typeof stock.symbol === 'string' && 
      typeof stock.name === 'string' &&
      typeof stock.price === 'number'
    )
  }

  // Fallback deletion when a session has no valid ID
  const deleteSessionSmart = async (session: any, index: number) => {
    if (session && typeof session.id !== 'undefined' && session.id !== null && session.id !== '') {
      return deleteSession(String(session.id))
    }

    // No valid ID: replace entire sessions array without this index
    const previous = savedSessions
    const filtered = savedSessions.filter((_, i) => i !== index)
    setSavedSessions(filtered)
    try {
      // Get authentication token from localStorage
      const token = localStorage.getItem('token')
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }
      
      // Add authorization header if token exists
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }
      
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers,
        body: JSON.stringify({ session: filtered })
      })
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setSavedSessions(data.sessions)
          localStorage.setItem('stockComparisonSessions', JSON.stringify(data.sessions))
        } else {
          throw new Error(data.error || 'Failed to update sessions')
        }
      } else {
        throw new Error(`HTTP ${response.status}: Failed to update sessions`)
      }
    } catch (error) {
      console.error('Error deleting session without ID:', error)
      setSavedSessions(previous)
      alert('Error deleting session')
    }
  }

  // Real-time comparison hook
  const {
    data: realTimeData,
    isConnected,
    lastUpdate: lastUpdateTime,
    getSymbolData,
    refreshAll
  } = useRealTimeComparison({
    symbols: safeSelectedStocks.map(stock => stock.symbol),
    enabled: realTimeEnabled && (activeTab === 'comparison' || activeTab === 'compare'),
    onUpdate: (symbol, data) => {
      // Update the selected stocks with real-time data while preserving all other fields
      setSelectedStocks(prevStocks => 
        (prevStocks || []).map(stock => 
          stock.symbol === symbol 
            ? {
                ...stock, // Preserve all existing fields (marketCap, pe, beta, etc.)
                price: data.price,
                change: data.change,
                changePercent: data.changePercent,
                volume: data.volume || stock.volume, // Use real-time volume if available, otherwise keep existing
                // Preserve all other fields like marketCap, pe, beta, dividendYield, etc.
              }
            : stock
        )
      )
    }
  })

  // Detailed stock data hook
  const { data: detailedStockData, loading: detailedDataLoading } = useMultipleStockDetails(
    safeSelectedStocks.map(stock => stock.symbol)
  )

  // Market insights hook
  const { insights: marketInsights, loading: insightsLoading, error: insightsError } = useMarketInsights()

  // Load saved sessions from database on component mount
  useEffect(() => {
    loadSavedSessions()
  }, [])

  const loadSavedSessions = async () => {
    setIsLoadingSessions(true)
    try {
      // Get authentication token from localStorage
      const token = localStorage.getItem('token')
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }
      
      // Add authorization header if token exists
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }
      
      const response = await fetch('/api/sessions', {
        headers
      })
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // Debug: Log all raw session data
          console.log('🔍 Raw sessions from API:', data.sessions)
          
          // Validate and repair sessions instead of filtering them out
          const repairedSessions = (data.sessions || []).map((session: any, index: number) => {
            console.log(`📊 Processing session ${index + 1}:`, {
              id: session.id,
              hasStocks: !!session.stocks,
              stocksType: typeof session.stocks,
              stocksLength: Array.isArray(session.stocks) ? session.stocks.length : 'N/A',
              stocksValue: session.stocks,
              hasAnalysis: !!session.analysis,
              timestamp: session.timestamp,
              allKeys: Object.keys(session)
            })
            
            // Log corrupted session for debugging
            if (!session.stocks || !Array.isArray(session.stocks)) {
              console.warn('⚠️ Found corrupted session, attempting repair:', {
                id: session.id,
                hasStocks: !!session.stocks,
                stocksType: typeof session.stocks,
                timestamp: session.timestamp,
                fullSession: session
              })
              
              // Attempt to repair the session
              return {
                ...session,
                stocks: session.stocks || [], // Default to empty array if missing
                // Preserve all other data
                analysis: session.analysis || '',
                timestamp: session.timestamp || new Date().toISOString(),
                customPrompt: session.customPrompt || ''
              }
            }
            return session
          }).filter((session: any) => 
            // Only filter out sessions that are completely invalid
            session && session.id && session.timestamp
          )
          
          setSavedSessions(repairedSessions)
          
          // Log repair statistics
          const originalCount = (data.sessions || []).length
          const repairedCount = repairedSessions.length
          const corruptedCount = originalCount - repairedSessions.length
          
          if (corruptedCount > 0) {
            console.warn(`📊 Session repair summary: ${originalCount} total, ${repairedCount} repaired, ${corruptedCount} discarded`)
          }
        } else {
          throw new Error(data.error || 'Failed to load sessions')
        }
      } else {
        throw new Error(`HTTP ${response.status}: Failed to load sessions`)
      }
    } catch (error) {
      console.error('Error loading saved sessions:', error)
      // Fallback to localStorage if database fails
    const saved = localStorage.getItem('stockComparisonSessions')
    if (saved) {
      try {
        const localSessions = JSON.parse(saved)
        // Apply same repair logic to localStorage data
        const repairedLocalSessions = (localSessions || []).map((session: any) => {
          if (!session.stocks || !Array.isArray(session.stocks)) {
            console.warn('⚠️ Repairing localStorage session:', session.id)
            return {
              ...session,
              stocks: session.stocks || []
            }
          }
          return session
        }).filter((session: any) => session && session.id && session.timestamp)
        
        setSavedSessions(repairedLocalSessions)
      } catch (parseError) {
        console.error('Error parsing localStorage sessions:', parseError)
        setSavedSessions([])
      }
    }
    } finally {
      setIsLoadingSessions(false)
    }
  }

  const saveSessionToDatabase = async (session: ComparisonSession) => {
    setIsSavingSession(true)
    try {
      console.log('🔄 Sending session to API:', JSON.stringify({ session }, null, 2))
      
      // Get authentication token from localStorage
      const token = localStorage.getItem('token')
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }
      
      // Add authorization header if token exists
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }
      
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers,
        body: JSON.stringify({ session }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log('📥 API response:', data)
        if (data.success) {
          console.log('✅ Sessions updated from API:', data.sessions)
          setSavedSessions(data.sessions)
        } else {
          throw new Error(data.error || 'Failed to save session')
        }
      } else {
        const errorText = await response.text()
        console.error('❌ API error response:', errorText)
        throw new Error(`HTTP ${response.status}: Failed to save session`)
      }
    } catch (error) {
      console.error('Error saving session to database:', error)
      // Fallback to localStorage if database fails
      console.log('💿 Falling back to localStorage...')
      const currentSessions = [...savedSessions, session]
      setSavedSessions(currentSessions)
      localStorage.setItem('stockComparisonSessions', JSON.stringify(currentSessions))
    } finally {
      setIsSavingSession(false)
    }
  }

  const deleteSession = async (sessionId: string) => {
    // Optimistic update: remove from UI immediately
    const previous = savedSessions
    setSavedSessions(prev => prev.filter(s => String(s.id) !== String(sessionId)))
    try {
      // Get authentication token from localStorage
      const token = localStorage.getItem('token')
      const headers: HeadersInit = {}
      
      // Add authorization header if token exists
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }
      
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
        headers
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setSavedSessions(data.sessions)
          // Also update localStorage as fallback
          localStorage.setItem('stockComparisonSessions', JSON.stringify(data.sessions))
        } else {
          throw new Error(data.error || 'Failed to delete session')
        }
      } else {
        throw new Error(`HTTP ${response.status}: Failed to delete session`)
      }
    } catch (error) {
      console.error('Error deleting session:', error)
      // Roll back optimistic update on failure
      setSavedSessions(previous)
      alert('Error deleting session')
    }
  }

  const searchStocks = async () => {
    if (!searchQuery.trim()) return
    
    setHasSearched(true)
    setIsSearching(true)
    try {
      const response = await fetch(`/api/stocks/quote?symbol=${encodeURIComponent(searchQuery)}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          const stockData: StockData = {
            symbol: data.data.symbol,
            name: data.data.name || data.data.symbol,
            price: data.data.price || 0,
            change: data.data.change || 0,
            changePercent: data.data.changePercent || 0,
            marketCap: data.data.marketCap || 0,
            pe: data.data.pe || null, // Use null for missing P/E data
            volume: data.data.volume || 0,
            dividendYield: data.data.dividendYield || 0,
            beta: data.data.beta || null, // Use null for missing Beta data
            high52Week: data.data.high52Week || 0,
            low52Week: data.data.low52Week || 0,
            sector: data.data.sector || 'Unknown',
            industry: data.data.industry || 'Unknown'
          }

          setSearchResults([stockData])
        } else {
          setSearchResults([])
        }
      } else {
        setSearchResults([])
      }
    } catch (error) {
      console.error('Error searching stocks:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const loadEnhancedData = async (symbol: string) => {
    setIsLoadingEnhancedData(true)
    try {
      const response = await fetch(`/api/market-data/enhanced?symbol=${encodeURIComponent(symbol)}&period=1mo`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          return {
            historicalData: data.data.historical,
            technicalIndicators: data.data.technical,
            sentiment: data.data.sentiment,
            fundamentals: data.data.fundamentals,
            news: data.data.news
          }
        }
      }
    } catch (error) {
      console.error('Error loading enhanced data:', error)
    } finally {
      setIsLoadingEnhancedData(false)
    }
    return null
  }

  const addStock = async (stock: StockData) => {
    if (safeSelectedStocks.length >= 5) {
      alert('Maximum 5 stocks can be compared at once')
      return
    }
    if (!safeSelectedStocks.find(s => s.symbol === stock.symbol)) {
      // Load enhanced data for the stock
      const enhancedData = await loadEnhancedData(stock.symbol)
      
      // Ensure consistent data structure with proper defaults
      const stockWithData: StockData = {
        symbol: stock.symbol,
        name: stock.name || stock.symbol,
        price: stock.price || 0,
        change: stock.change || 0,
        changePercent: stock.changePercent || 0,
        marketCap: stock.marketCap || 0,
        pe: stock.pe, // Keep null if not available
        volume: stock.volume || 0,
        dividendYield: stock.dividendYield || 0,
        beta: stock.beta, // Keep null if not available
        high52Week: stock.high52Week || 0,
        low52Week: stock.low52Week || 0,
        sector: stock.sector || 'Unknown',
        industry: stock.industry || 'Unknown',
        ...enhancedData // Add enhanced data (historical, technical, etc.)
      }

      setSelectedStocks([...safeSelectedStocks, stockWithData])
    }
    setSearchQuery('')
    setSearchResults([])
    setHasSearched(false)
  }

  const removeStock = (symbol: string) => {
    setSelectedStocks(safeSelectedStocks.filter(s => s.symbol !== symbol))
  }

  const exportAnalysis = () => {
    if (!analysisResult) return

    // Create a formatted text version for better readability
    const formattedText = `
STOCK COMPARISON ANALYSIS
${'='.repeat(50)}

Generated: ${new Date().toLocaleString()}
Stocks Analyzed: ${safeSelectedStocks.map(s => `${s.symbol} (${s.name})`).join(', ')}

${customPrompt ? `Custom Prompt: ${customPrompt}\n` : ''}

STOCK PRICES:
${safeSelectedStocks.map(s => `${s.symbol}: $${s.price} (${s.change >= 0 ? '+' : ''}${s.changePercent.toFixed(2)}%)`).join('\n')}

${'='.repeat(50)}

FUNDAMENTAL ANALYSIS:
${analysisResult.fundamental}

${'='.repeat(50)}

TECHNICAL ANALYSIS:
${analysisResult.technical}

${'='.repeat(50)}

RISK ASSESSMENT:
${analysisResult.risk}

${'='.repeat(50)}

COMPETITIVE ANALYSIS:
${analysisResult.competitive}

${'='.repeat(50)}

INVESTMENT RECOMMENDATION:
${analysisResult.recommendation}


${'='.repeat(50)}
    `.trim()

    // Create both JSON and text versions
    const analysisData = {
      timestamp: new Date().toISOString(),
      stocks: safeSelectedStocks.map(s => ({
        symbol: s.symbol,
        name: s.name,
        price: s.price,
        change: s.change,
        changePercent: s.changePercent
      })),
      analysis: analysisResult,
      customPrompt: customPrompt || 'No custom prompt'
    }

    // Export as text file (more readable)
    const textBlob = new Blob([formattedText], {
      type: 'text/plain'
    })
    
    const textUrl = URL.createObjectURL(textBlob)
    const textLink = document.createElement('a')
    textLink.href = textUrl
    textLink.download = `stock-analysis-${safeSelectedStocks.map(s => s.symbol).join('-')}-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(textLink)
    textLink.click()
    document.body.removeChild(textLink)
    URL.revokeObjectURL(textUrl)

    // Also export as JSON for programmatic use
    const jsonBlob = new Blob([JSON.stringify(analysisData, null, 2)], {
      type: 'application/json'
    })
    
    const jsonUrl = URL.createObjectURL(jsonBlob)
    const jsonLink = document.createElement('a')
    jsonLink.href = jsonUrl
    jsonLink.download = `stock-analysis-${safeSelectedStocks.map(s => s.symbol).join('-')}-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(jsonLink)
    jsonLink.click()
    document.body.removeChild(jsonLink)
    URL.revokeObjectURL(jsonUrl)
  }

  const shareAnalysis = async () => {
    if (!analysisResult) return

    const shareData = {
      title: 'Stock Comparison Analysis',
      text: `AI-powered analysis of ${safeSelectedStocks.map(s => s.symbol).join(', ')} stocks`,
      url: window.location.href
    }

    // Try to use native Web Share API if available
    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (error) {
        console.log('Share cancelled or failed:', error)
        // Fallback to clipboard if share is cancelled
        await copyToClipboard()
      }
    } else {
      // Fallback: copy to clipboard
      await copyToClipboard()
    }
  }

  const copyToClipboard = async () => {
    if (!analysisResult) return

    const analysisText = `
📊 STOCK COMPARISON ANALYSIS
${safeSelectedStocks.map(s => s.symbol).join(' vs ')}

📅 Generated: ${new Date().toLocaleString()}

💰 Stock Prices:
${safeSelectedStocks.map(s => `${s.symbol}: $${s.price} (${s.change >= 0 ? '+' : ''}${s.changePercent.toFixed(2)}%)`).join('\n')}

📈 FUNDAMENTAL ANALYSIS:
${analysisResult.fundamental}

📊 TECHNICAL ANALYSIS:
${analysisResult.technical}

⚠️ RISK ASSESSMENT:
${analysisResult.risk}

🎯 COMPETITIVE ANALYSIS:
${analysisResult.competitive}

💡 INVESTMENT RECOMMENDATION:
${analysisResult.recommendation}

🎯 
Generated by AI-Powered Stock Analysis Tool
    `.trim()

    try {
      await navigator.clipboard.writeText(analysisText)
      alert('✅ Analysis copied to clipboard! You can now paste it anywhere.')
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      
      // Fallback: create a temporary textarea
      const textarea = document.createElement('textarea')
      textarea.value = analysisText
      document.body.appendChild(textarea)
      textarea.select()
      
      try {
        document.execCommand('copy')
        alert('✅ Analysis copied to clipboard! You can now paste it anywhere.')
      } catch (fallbackError) {
        console.error('Fallback copy failed:', fallbackError)
        alert('❌ Failed to copy to clipboard. Please manually select and copy the analysis text.')
      }
      
      document.body.removeChild(textarea)
    }
  }

    const generateAIAnalysis = async () => {
    if (safeSelectedStocks.length === 0) {
      alert('Please select at least one stock to analyze')
      return
    }

    setIsAnalyzing(true)
    try {
      // Get the most up-to-date real-time data for analysis
      const realTimeStockData = safeSelectedStocks.map(stock => {
        const realtimeData = getSymbolData(stock.symbol)
        
        // Use real-time data if available, otherwise fall back to selected stock data
        return {
          symbol: stock.symbol,
          name: stock.name,
          price: realtimeData?.price || stock.price,
          change: realtimeData?.change || stock.change,
          changePercent: realtimeData?.changePercent || stock.changePercent,
          marketCap: stock.marketCap,
          pe: stock.pe,
          volume: realtimeData?.volume || stock.volume,
          dividendYield: stock.dividendYield,
          beta: stock.beta,
          sector: stock.sector,
          industry: stock.industry
        }
      })

      console.log('Using real-time data for AI analysis:', realTimeStockData)

      const response = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stocks: realTimeStockData,
          customPrompt
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setAnalysisResult(data.data)
          
          // Save session to database with data integrity validation
          const session: ComparisonSession = {
            id: Date.now().toString(),
            stocks: safeSelectedStocks,
            analysis: JSON.stringify(data.data),
            timestamp: new Date().toISOString(),
            customPrompt
          }
          
          // Debug: Log what we're trying to save
          console.log('💾 Attempting to save session:', {
            id: session.id,
            stocksCount: session.stocks.length,
            stocksData: session.stocks,
            hasAnalysis: !!session.analysis,
            analysisLength: session.analysis.length,
            timestamp: session.timestamp
          })
          
          // Validate session data before saving
          if (!validateSessionData(session)) {
            console.error('⚠️ Session validation failed, not saving corrupted data:', session)
            console.warn('Session will not be saved due to data integrity issues')
          } else {
            console.log('✅ Session validation passed, saving to database...')
            await saveSessionToDatabase(session)
          }
          
          console.log('Analysis completed successfully')
        } else {
          console.error('API returned error:', data.error)
          throw new Error(data.error || 'Failed to generate analysis')
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('HTTP error:', response.status, errorData)
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to generate analysis`)
      }
    } catch (error) {
      console.error('Error generating analysis:', error)
      
      let errorMessage = 'Failed to generate analysis. Please try again.'
      if (error instanceof Error) {
        errorMessage = error.message
      }
      
      alert(errorMessage)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getPerformanceColor = (change: number) => {
    return change >= 0 ? 'text-green-600' : 'text-red-600'
  }

  const getPerformanceIcon = (change: number) => {
    return change >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
  }

  const formatMarketCap = (marketCap: number) => {
    if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(2)}T`
    if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(2)}B`
    if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(2)}M`
    return `$${marketCap.toLocaleString()}`
  }

  const formatVolume = (volume: number) => {
    if (volume >= 1e9) return `$${(volume / 1e9).toFixed(2)}B`
    if (volume >= 1e6) return `$${(volume / 1e6).toFixed(2)}M`
    return `${volume.toLocaleString()}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Stock Comparison & AI Analysis
          </h2>
          <p className="text-muted-foreground">
            Compare multiple stocks with AI-powered comprehensive analysis
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Brain className="w-4 h-4" />
          AI-Powered
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
          <TabsTrigger value="compare">Compare</TabsTrigger>
          <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
          <TabsTrigger value="sessions">Saved Sessions</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        {/* Comparison Tab */}
        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Add Stocks to Compare
              </CardTitle>
              <CardDescription>
                Search and add up to 5 stocks for comprehensive comparison
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter stock symbol (e.g., AAPL, MSFT)"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value.toUpperCase())
                    setHasSearched(false)
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && searchStocks()}
                  disabled={isSearching}
                />
                <Button onClick={searchStocks} disabled={isSearching || !searchQuery.trim()}>
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Search Results:</h4>
                  {searchResults.map((stock) => (
                    <div key={stock.symbol} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{stock.symbol}</div>
                        <div className="text-sm text-muted-foreground">{stock.name}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className="font-medium">${stock.price}</div>
                          <div className={`text-sm ${getPerformanceColor(stock.change)}`}>
                            {getPerformanceIcon(stock.change)} {stock.changePercent}%
                          </div>
                        </div>
                        <Button size="sm" onClick={() => addStock(stock)}>
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* No Results State */}
              {hasSearched && searchQuery && searchResults.length === 0 && !isSearching && (
                <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground border rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <div>
                    No stocks found for "{searchQuery}". Try a different symbol or check your spelling.
                  </div>
                </div>
              )}

              {/* Selected Stocks */}
              {safeSelectedStocks.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Selected Stocks ({safeSelectedStocks.length}/5)</h4>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedStocks([])}
                    >
                      Clear All
                    </Button>
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {safeSelectedStocks.map((stock) => (
                      <Card key={stock.symbol} className="relative">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h5 className="font-semibold">{stock.symbol}</h5>
                                <Badge variant="outline" className="text-xs">
                                  {stock.sector}
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground mb-2">{stock.name}</div>
                              <div className="space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-sm">Price:</span>
                                  <span className="font-medium">${stock.price}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm">Change:</span>
                                  <span className={`font-medium ${getPerformanceColor(stock.change)}`}>
                                    {getPerformanceIcon(stock.change)} {stock.changePercent}%
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm">Market Cap:</span>
                                  <span className="font-medium">{formatMarketCap(stock.marketCap)}</span>
                                </div>
                                
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeStock(stock.symbol)}
                              className="absolute top-2 right-2"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Enhanced Compare Tab with Comprehensive Financial Metrics */}
        <TabsContent value="compare" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Comprehensive Stock Analysis
              </CardTitle>
              <CardDescription>
                Advanced financial metrics, technical indicators, and AI-powered insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              {safeSelectedStocks.length < 1 ? (
                <div className="text-center py-8">
                  <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Select Stocks First</h3>
                  <p className="text-muted-foreground mb-4">
                    Please select at least 1 stock in the Comparison tab to view detailed analysis
                  </p>
                  <Button onClick={() => setActiveTab('comparison')}>
                    Go to Comparison
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Stock Selection for Detailed View */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Select Stock for Detailed Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {safeSelectedStocks.map(stock => (
                    <Button 
                            key={stock.symbol}
                            variant={selectedStockForDetails === stock.symbol ? "default" : "outline"}
                            onClick={() => setSelectedStockForDetails(stock.symbol)}
                            className="flex items-center gap-2"
                          >
                            {stock.symbol}
                    </Button>
                        ))}
                  </div>
                    </CardContent>
                  </Card>

                  {/* Detailed Financial Metrics for Selected Stock */}
                  {selectedStockForDetails && detailedStockData[selectedStockForDetails] && (
                    <FinancialMetricsDisplay 
                      stock={detailedStockData[selectedStockForDetails]} 
                      loading={detailedDataLoading}
                    />
                  )}

                  {/* Quick Comparison Table */}
                  {safeSelectedStocks.length > 1 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <DollarSign className="w-5 h-5" />
                          Quick Comparison
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left p-2 font-medium">Metric</th>
                                {safeSelectedStocks.map(stock => (
                                  <th key={stock.symbol} className="text-center p-2 font-medium">
                                    {stock.symbol}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-b">
                                <td className="p-2 font-medium">Price</td>
                                {safeSelectedStocks.map(stock => {
                                  const realtimeData = getSymbolData(stock.symbol)
                                  const isUpdating = realtimeData && lastUpdateTime && Date.now() - lastUpdateTime.getTime() < 2000
                                  return (
                                    <td key={stock.symbol} className={cn(
                                      "text-center p-2 transition-all duration-300",
                                      isUpdating && "bg-blue-50 scale-105 font-semibold"
                                    )}>
                                      ${(stock.price || 0).toFixed(2)}
                                      {isUpdating && (
                                        <div className="w-1 h-1 bg-blue-500 rounded-full mx-auto mt-1 animate-pulse" />
                                      )}
                                    </td>
                                  )
                                })}
                              </tr>
                              <tr className="border-b">
                                <td className="p-2 font-medium">Change %</td>
                                {safeSelectedStocks.map(stock => {
                                  const realtimeData = getSymbolData(stock.symbol)
                                  const isUpdating = realtimeData && lastUpdateTime && Date.now() - lastUpdateTime.getTime() < 2000
                                  return (
                                    <td key={stock.symbol} className={cn(
                                      "text-center p-2 font-medium transition-all duration-300",
                                      (stock.changePercent || 0) >= 0 ? "text-green-600" : "text-red-600",
                                      isUpdating && "bg-blue-50 scale-105"
                                    )}>
                                      {(stock.changePercent || 0) >= 0 ? '+' : ''}{(stock.changePercent || 0).toFixed(2)}%
                                      {isUpdating && (
                                        <div className="w-1 h-1 bg-blue-500 rounded-full mx-auto mt-1 animate-pulse" />
                                      )}
                                    </td>
                                  )
                                })}
                              </tr>
                              <tr className="border-b">
                                <td className="p-2 font-medium">Market Cap</td>
                                {safeSelectedStocks.map(stock => (
                                  <td key={stock.symbol} className="text-center p-2">
                                    {formatMarketCap(stock.marketCap || 0)}
                                  </td>
                                ))}
                              </tr>
                              <tr className="border-b">
                                <td className="p-2 font-medium">P/E Ratio</td>
                                {safeSelectedStocks.map(stock => (
                                  <td key={stock.symbol} className="text-center p-2">
                                    {stock.pe ? stock.pe.toFixed(2) : 'N/A'}
                                  </td>
                                ))}
                              </tr>
                              <tr>
                                <td className="p-2 font-medium">Beta</td>
                                {safeSelectedStocks.map(stock => (
                                  <td key={stock.symbol} className="text-center p-2">
                                    {stock.beta ? stock.beta.toFixed(2) : 'N/A'}
                                  </td>
                                ))}
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Analysis Tab */}
        <TabsContent value="analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                AI-Powered Analysis
              </CardTitle>
              <CardDescription>
                Generate comprehensive analysis using advanced AI algorithms
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {safeSelectedStocks.length < 2 ? (
                <div className="text-center py-8">
                  <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Select Stocks First</h3>
                  <p className="text-muted-foreground mb-4">
                    Please select at least 2 stocks in the Comparison tab to generate analysis
                  </p>
                  <Button onClick={() => setActiveTab('comparison')}>
                    Go to Comparison
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Custom Analysis Prompt (Optional)</label>
                      <Textarea
                        placeholder="Ask specific questions about these stocks (e.g., 'Which stock is best for long-term growth?', 'Compare their risk profiles')"
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        rows={3}
                      />
                    </div>



                    <Button 
                      onClick={generateAIAnalysis} 
                      disabled={isAnalyzing || isSavingSession}
                      className="w-full"
                      size="lg"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Generating AI Analysis...
                        </>
                      ) : isSavingSession ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Saving Session...
                        </>
                      ) : (
                        <>
                          <Brain className="w-4 h-4 mr-2" />
                          Generate Comprehensive Analysis
                        </>
                      )}
                    </Button>
                  </div>

                  {analysisResult && (
                    <div className="space-y-8 mt-8">
                      {/* Analysis Header */}
                      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-lg">
                              <Brain className="w-6 h-6" />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold">AI Analysis Results</h3>
                              <p className="text-blue-100 text-sm">
                                Generated on {new Date().toLocaleString()}
                              </p>
                            </div>
                          </div>
                        <div className="flex gap-2">
                            <Button 
                              variant="secondary" 
                              size="sm" 
                              onClick={exportAnalysis}
                              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                            >
                            <Download className="w-4 h-4 mr-2" />
                            Export
                          </Button>
                            <Button 
                              variant="secondary" 
                              size="sm" 
                              onClick={shareAnalysis}
                              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                            >
                            <Share2 className="w-4 h-4 mr-2" />
                            Share
                          </Button>
                        </div>
                      </div>

                        {/* Stock Summary */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {safeSelectedStocks.map((stock, index) => {
                            const realtimeData = getSymbolData(stock.symbol)
                            const currentPrice = realtimeData?.price || stock.price
                            const currentChange = realtimeData?.change || stock.change
                            const currentChangePercent = realtimeData?.changePercent || stock.changePercent
                            const isUpdating = realtimeData && lastUpdateTime && Date.now() - lastUpdateTime.getTime() < 2000
                            
                            return (
                              <div key={stock.symbol} className={`bg-white/10 rounded-lg p-3 transition-all duration-300 ${
                                isUpdating ? 'ring-2 ring-blue-400/50' : ''
                              }`}>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-semibold text-lg">{stock.symbol}</span>
                                  <div className="flex items-center gap-1">
                                    <span className={`text-sm px-2 py-1 rounded-full ${
                                      currentChange >= 0 
                                        ? 'bg-green-500/20 text-green-200' 
                                        : 'bg-red-500/20 text-red-200'
                                    }`}>
                                      {currentChange >= 0 ? '+' : ''}{currentChangePercent.toFixed(2)}%
                                    </span>
                                    {isUpdating && (
                                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                                    )}
                                  </div>
                                </div>
                                <div className="text-2xl font-bold">${currentPrice.toFixed(2)}</div>
                                <div className="text-blue-200 text-sm">{stock.name}</div>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Analysis Sections */}
                      <div className="space-y-8">
                        {/* Fundamental Analysis */}
                        <Card className="border-l-4 border-l-blue-500 shadow-lg hover:shadow-xl transition-shadow">
                          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50">
                            <CardTitle className="flex items-center gap-3 text-blue-800">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <Building2 className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="text-lg font-bold">Fundamental Analysis</div>
                                <div className="text-sm font-normal text-blue-600">Company Health & Growth</div>
                              </div>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-6">
                            <div className="prose prose-sm max-w-none">
                              <AnalysisTableRenderer content={analysisResult.fundamental} />
                            </div>
                          </CardContent>
                        </Card>

                        {/* Technical Analysis */}
                        <Card className="border-l-4 border-l-purple-500 shadow-lg hover:shadow-xl transition-shadow">
                          <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100/50">
                            <CardTitle className="flex items-center gap-3 text-purple-800">
                              <div className="p-2 bg-purple-100 rounded-lg">
                                <TrendingUp className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="text-lg font-bold">Technical Analysis</div>
                                <div className="text-sm font-normal text-purple-600">Price Trends & Patterns</div>
                              </div>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-6">
                            <div className="prose prose-sm max-w-none">
                              <AnalysisTableRenderer content={analysisResult.technical} />
                            </div>
                          </CardContent>
                        </Card>

                        {/* Risk Assessment */}
                        <Card className="border-l-4 border-l-orange-500 shadow-lg hover:shadow-xl transition-shadow">
                          <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100/50">
                            <CardTitle className="flex items-center gap-3 text-orange-800">
                              <div className="p-2 bg-orange-100 rounded-lg">
                                <AlertTriangle className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="text-lg font-bold">Risk Assessment</div>
                                <div className="text-sm font-normal text-orange-600">Market & Company Risks</div>
                              </div>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-6">
                            <div className="prose prose-sm max-w-none">
                              <AnalysisTableRenderer content={analysisResult.risk} />
                            </div>
                          </CardContent>
                        </Card>

                        {/* Competitive Analysis */}
                        <Card className="border-l-4 border-l-teal-500 shadow-lg hover:shadow-xl transition-shadow">
                          <CardHeader className="bg-gradient-to-r from-teal-50 to-teal-100/50">
                            <CardTitle className="flex items-center gap-3 text-teal-800">
                              <div className="p-2 bg-teal-100 rounded-lg">
                                <Target className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="text-lg font-bold">Competitive Analysis</div>
                                <div className="text-sm font-normal text-teal-600">Market Position & Advantages</div>
                              </div>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-6">
                            <div className="prose prose-sm max-w-none">
                              <AnalysisTableRenderer content={analysisResult.competitive} />
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Investment Recommendation */}
                      <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 shadow-xl">
                        <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-t-lg">
                          <CardTitle className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-lg">
                              <CheckCircle className="w-6 h-6" />
                            </div>
                            <div>
                              <div className="text-xl font-bold">Investment Recommendation</div>
                              <div className="text-sm font-normal text-green-100">AI-Powered Decision Support</div>
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8">
                          <div className="prose prose-lg max-w-none">
                            <AnalysisTableRenderer content={analysisResult.recommendation} />
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Saved Sessions Tab */}
        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Saved Analysis Sessions
              </CardTitle>
              <CardDescription>
                View and manage your previous stock comparison analyses
              </CardDescription>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={loadSavedSessions}
                  disabled={isLoadingSessions}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingSessions ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingSessions ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Loading saved sessions...</p>
                </div>
              ) : savedSessions.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Saved Sessions</h3>
                  <p className="text-muted-foreground">
                    Your analysis sessions will appear here after you generate comparisons
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {savedSessions.map((session, index) => {
                    const hasValidStocks = session.stocks && Array.isArray(session.stocks) && session.stocks.length > 0
                    
                    return (
                    <Card key={session?.id ?? `session-${index}`} className={`relative ${!hasValidStocks ? 'opacity-75 border-orange-200' : ''}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h5 className="font-semibold">
                                {hasValidStocks 
                                  ? session.stocks.map(s => s.symbol).join(' vs ')
                                  : 'Corrupted Session'
                                }
                              </h5>
                              <Badge variant={hasValidStocks ? "outline" : "destructive"} className="text-xs">
                                {hasValidStocks 
                                  ? `${session.stocks.length} stocks`
                                  : 'No data'
                                }
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground mb-2">
                              {new Date(session.timestamp).toLocaleDateString()} at {new Date(session.timestamp).toLocaleTimeString()}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {hasValidStocks ? (
                                session.stocks.map((stock) => (
                                  <Badge key={stock.symbol} variant="secondary" className="text-xs">
                                    {stock.symbol}: ${stock.price}
                                  </Badge>
                                ))
                              ) : (
                                <Badge variant="outline" className="text-xs text-orange-600">
                                  Session data corrupted - stocks information missing
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              disabled={!hasValidStocks}
                              onClick={() => {
                                if (!hasValidStocks) {
                                  alert('Cannot load corrupted session - stock data is missing')
                                  return
                                }
                                try {
                                  const sessionData = JSON.parse(session.analysis)
                                  setAnalysisResult(sessionData)
                                  setSelectedStocks(session.stocks)
                                  setCustomPrompt(session.customPrompt || '')
                                  setActiveTab('analysis')
                                } catch (error) {
                                  console.error('Error loading session:', error)
                                  alert('Error loading saved session - analysis data may be corrupted')
                                }
                              }}
                              title={hasValidStocks ? "View Analysis" : "Session corrupted - cannot load"}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              disabled={!hasValidStocks}
                              onClick={() => {
                                if (!hasValidStocks) {
                                  alert('Cannot export corrupted session - stock data is missing')
                                  return
                                }
                                try {
                                  const sessionData = JSON.parse(session.analysis || '{}')
                                  const analysisData = {
                                    timestamp: session.timestamp,
                                    stocks: session.stocks.map(s => ({
                                      symbol: s.symbol,
                                      name: s.name,
                                      price: s.price,
                                      change: s.change,
                                      changePercent: s.changePercent
                                    })),
                                    analysis: sessionData,
                                    customPrompt: session.customPrompt || 'No custom prompt'
                                  }

                                  const blob = new Blob([JSON.stringify(analysisData, null, 2)], {
                                    type: 'application/json'
                                  })
                                  
                                  const url = URL.createObjectURL(blob)
                                  const a = document.createElement('a')
                                  a.href = url
                                  a.download = `stock-analysis-${session.stocks.map(s => s.symbol).join('-')}-${new Date(session.timestamp).toISOString().split('T')[0]}.json`
                                  document.body.appendChild(a)
                                  a.click()
                                  document.body.removeChild(a)
                                  URL.revokeObjectURL(url)
                                } catch (error) {
                                  console.error('Error exporting session:', error)
                                  alert('Error exporting saved session - data may be corrupted')
                                }
                              }}
                              title={hasValidStocks ? "Export Session" : "Session corrupted - cannot export"}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => deleteSessionSmart(session, index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Real-time Market Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <TrendingUp className="w-4 h-4" />
                  Market Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Portfolio Performance</span>
                    <span className={`text-sm font-medium ${
                      safeSelectedStocks.length > 0 
                        ? safeSelectedStocks.reduce((acc, stock) => acc + (stock.changePercent || 0), 0) / safeSelectedStocks.length > 0 
                          ? 'text-green-600' 
                          : 'text-red-600'
                        : 'text-gray-600'
                    }`}>
                      {safeSelectedStocks.length > 0 
                        ? `${(safeSelectedStocks.reduce((acc, stock) => acc + (stock.changePercent || 0), 0) / safeSelectedStocks.length).toFixed(2)}%`
                        : 'N/A'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Market Volatility</span>
                    <span className="text-sm font-medium">
                      {safeSelectedStocks.length > 0 
                        ? (() => {
                            const changes = safeSelectedStocks.map(s => Math.abs(s.changePercent || 0))
                            const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length
                            if (avgChange > 5) return 'High'
                            if (avgChange > 2) return 'Medium'
                            return 'Low'
                          })()
                        : 'N/A'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Volume Analysis</span>
                    <span className="text-sm font-medium">
                      {safeSelectedStocks.length > 0 
                        ? (() => {
                            const avgVolume = safeSelectedStocks.reduce((acc, stock) => acc + (stock.volume || 0), 0) / safeSelectedStocks.length
                            if (avgVolume > 10000000) return 'High'
                            if (avgVolume > 5000000) return 'Medium'
                            return 'Low'
                          })()
                        : 'N/A'
                      }
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Real-time Sector Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <PieChart className="w-4 h-4" />
                  Sector Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {safeSelectedStocks.length > 0 ? (
                    (() => {
                      const sectorCounts: { [key: string]: number } = {}
                      safeSelectedStocks.forEach(stock => {
                        const sector = stock.sector || 'Unknown'
                        sectorCounts[sector] = (sectorCounts[sector] || 0) + 1
                      })
                      
                      return Object.entries(sectorCounts).map(([sector, count]) => (
                        <div key={sector} className="flex justify-between">
                          <span className="text-sm">{sector}</span>
                          <span className="text-sm font-medium">
                            {((count / safeSelectedStocks.length) * 100).toFixed(0)}%
                          </span>
                      </div>
                    ))
                    })()
                  ) : (
                    <div className="text-center text-sm text-muted-foreground py-4">
                      Select stocks to see sector distribution
                      </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Real-time AI Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Zap className="w-4 h-4" />
                  AI Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {safeSelectedStocks.length > 0 ? (
                    <>
                      <div className="text-sm">
                        <strong>Top Pick:</strong> {
                          (() => {
                            const bestStock = safeSelectedStocks.reduce((best, current) => 
                              (current.changePercent || 0) > (best.changePercent || 0) ? current : best
                            )
                            return `${bestStock.symbol} - ${bestStock.changePercent > 0 ? 'Strong momentum' : 'Potential value'}`
                          })()
                        }
                      </div>
                      <div className="text-sm">
                        <strong>Risk Level:</strong> {
                          safeSelectedStocks.length > 2 ? 'Diversified' : 
                          safeSelectedStocks.some(s => Math.abs(s.changePercent || 0) > 5) ? 'High' : 'Moderate'
                        }
                      </div>
                      <div className="text-sm">
                        <strong>Timing:</strong> {
                          safeSelectedStocks.some(s => s.changePercent > 0) ? 'Mixed signals' : 'Consider entry points'
                        }
                      </div>
                    </>
                  ) : (
                    <div className="text-center text-sm text-muted-foreground py-4">
                      Select stocks for AI insights
                      </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Real-time Market Intelligence */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Market Intelligence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-medium mb-2">Portfolio Metrics</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Total Market Cap:</span>
                      <span className="font-medium">
                        {safeSelectedStocks.length > 0 
                          ? formatMarketCap(safeSelectedStocks.reduce((acc, stock) => acc + (stock.marketCap || 0), 0))
                          : 'N/A'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg P/E Ratio:</span>
                      <span className="font-medium">
                        {safeSelectedStocks.length > 0 
                          ? (() => {
                              const validPEs = safeSelectedStocks.filter(s => s.pe && s.pe > 0)
                              return validPEs.length > 0 
                                ? (validPEs.reduce((acc, s) => acc + (s.pe || 0), 0) / validPEs.length).toFixed(1)
                                : 'N/A'
                            })()
                          : 'N/A'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg Beta:</span>
                      <span className="font-medium">
                        {safeSelectedStocks.length > 0 
                          ? (() => {
                              const validBetas = safeSelectedStocks.filter(s => s.beta && s.beta > 0)
                              return validBetas.length > 0 
                                ? (validBetas.reduce((acc, s) => acc + (s.beta || 0), 0) / validBetas.length).toFixed(2)
                                : 'N/A'
                            })()
                          : 'N/A'
                        }
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Performance Analysis</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Best Performer:</span>
                      <span className="font-medium text-green-600">
                        {safeSelectedStocks.length > 0 
                          ? (() => {
                              const best = safeSelectedStocks.reduce((best, current) => 
                                (current.changePercent || 0) > (best.changePercent || 0) ? current : best
                              )
                              return `${best.symbol} (${best.changePercent > 0 ? '+' : ''}${best.changePercent?.toFixed(2)}%)`
                            })()
                          : 'N/A'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Worst Performer:</span>
                      <span className="font-medium text-red-600">
                        {safeSelectedStocks.length > 0 
                          ? (() => {
                              const worst = safeSelectedStocks.reduce((worst, current) => 
                                (current.changePercent || 0) < (worst.changePercent || 0) ? current : worst
                              )
                              return `${worst.symbol} (${worst.changePercent > 0 ? '+' : ''}${worst.changePercent?.toFixed(2)}%)`
                            })()
                          : 'N/A'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Volatility Score:</span>
                      <span className="font-medium">
                        {safeSelectedStocks.length > 0 
                          ? (() => {
                              const changes = safeSelectedStocks.map(s => Math.abs(s.changePercent || 0))
                              const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length
                              if (avgChange > 5) return 'High'
                              if (avgChange > 2) return 'Medium'
                              return 'Low'
                            })()
                          : 'N/A'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>



          {/* Real-time Enhanced Stock Data */}
          {safeSelectedStocks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Enhanced Stock Data
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {safeSelectedStocks.map((stock) => (
                    <div key={stock.symbol} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold">{stock.symbol}</h4>
                        <Badge variant={stock.changePercent > 0 ? "default" : "destructive"}>
                          {stock.changePercent > 0 ? '+' : ''}{stock.changePercent?.toFixed(2)}%
                        </Badge>
                      </div>
                      
                      {/* Real-time Price Data */}
                        <div className="mb-3">
                        <h5 className="text-sm font-medium mb-2">Price Data</h5>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                            <span>Current:</span>
                            <span className="font-medium">${stock.price?.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                            <span>Change:</span>
                            <span className={`font-medium ${stock.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {stock.change > 0 ? '+' : ''}${stock.change?.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                            <span>Volume:</span>
                            <span className="font-medium">{formatVolume(stock.volume)}</span>
                            </div>
                          </div>
                        </div>

                      {/* Financial Metrics */}
                        <div className="mb-3">
                        <h5 className="text-sm font-medium mb-2">Financial Metrics</h5>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                            <span>Market Cap:</span>
                            <span className="font-medium">{formatMarketCap(stock.marketCap)}</span>
                            </div>
                                                     {stock.pe && stock.pe > 0 && (
                            <div className="flex justify-between">
                               <span>P/E Ratio:</span>
                               <span className="font-medium">{stock.pe.toFixed(1)}</span>
                            </div>
                           )}
                                                     {stock.beta && stock.beta > 0 && (
                             <div className="flex justify-between">
                               <span>Beta:</span>
                               <span className="font-medium">{stock.beta.toFixed(2)}</span>
                        </div>
                      )}
                        </div>
                      </div>

                      

                                             {/* Sector Info */}
                       {(stock.sector || stock.industry) && (
                        <div>
                           <h5 className="text-sm font-medium mb-2">Company Info</h5>
                           <div className="space-y-1 text-xs">
                             {stock.sector && stock.sector !== 'Unknown' && (
                               <div className="flex justify-between">
                                 <span>Sector:</span>
                                 <span className="font-medium">{stock.sector}</span>
                                </div>
                             )}
                             {stock.industry && (
                               <div className="flex justify-between">
                                 <span>Industry:</span>
                                 <span className="font-medium">{stock.industry}</span>
                              </div>
                             )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Real-time Market Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Market Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {safeSelectedStocks.length > 0 
                      ? safeSelectedStocks.filter(s => s.changePercent > 0).length
                      : 0
                    }
                  </div>
                  <div className="text-sm text-muted-foreground">Stocks Up</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {safeSelectedStocks.length > 0 
                      ? safeSelectedStocks.filter(s => s.changePercent < 0).length
                      : 0
                    }
                  </div>
                  <div className="text-sm text-muted-foreground">Stocks Down</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {safeSelectedStocks.length > 0 
                      ? safeSelectedStocks.filter(s => s.changePercent === 0).length
                      : 0
                    }
                  </div>
                  <div className="text-sm text-muted-foreground">Stocks Flat</div>
                </div>
              </div>
              
              {safeSelectedStocks.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground mb-2">Portfolio Performance Summary</div>
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span>Total Value Change:</span>
                      <span className={`font-medium ${
                        safeSelectedStocks.reduce((acc, stock) => acc + (stock.change || 0), 0) > 0 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {safeSelectedStocks.reduce((acc, stock) => acc + (stock.change || 0), 0) > 0 ? '+' : ''}
                        ${safeSelectedStocks.reduce((acc, stock) => acc + (stock.change || 0), 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average Change:</span>
                      <span className={`font-medium ${
                        safeSelectedStocks.reduce((acc, stock) => acc + (stock.changePercent || 0), 0) / safeSelectedStocks.length > 0 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {(safeSelectedStocks.reduce((acc, stock) => acc + (stock.changePercent || 0), 0) / safeSelectedStocks.length).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Volume:</span>
                      <span className="font-medium">
                        {formatVolume(safeSelectedStocks.reduce((acc, stock) => acc + (stock.volume || 0), 0))}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
