'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Plus, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  BarChart3,
  PieChart,
  Activity,
  Search,
  Download,
  Upload,
  Settings,
  History,
  ArrowUp,
  ArrowDown,
  Loader2,
  AlertTriangle,
  RefreshCw
} from 'lucide-react'
import { Stock } from '@/types'
import { useToast } from '@/hooks/use-toast'
import PortfolioAnalytics from './PortfolioAnalytics'

interface Trade {
  id: string
  symbol: string
  type: 'buy' | 'sell'
  quantity: number
  price: number
  amount: number
  date: string
  notes?: string
}

interface Position {
  id: string
  symbol: string
  name: string
  quantity: number
  averagePrice: number
  currentPrice: number
  marketValue: number
  unrealizedPnL: number
  unrealizedPnLPercent: number
  entryDate: string
  notes?: string
}

interface Portfolio {
  id: string
  name: string
  description?: string
  positions: Position[]
  createdAt: string
  updatedAt: string
}

export default function ProductionPortfolioManager() {
  const { toast } = useToast()
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [activePortfolio, setActivePortfolio] = useState<Portfolio | null>(null)
  const [trades, setTrades] = useState<Trade[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [searchSymbol, setSearchSymbol] = useState('')
  const [stockData, setStockData] = useState<Stock | null>(null)
  const [activeTab, setActiveTab] = useState('portfolio')
  const [isSearching, setIsSearching] = useState(false)
  const [isUpdatingPositions, setIsUpdatingPositions] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreatingPortfolio, setIsCreatingPortfolio] = useState(false)
  const [newPortfolioName, setNewPortfolioName] = useState('')
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [maxRetries] = useState(3)
  
  // Enhanced loading states for all operations
  const [isAddingTrade, setIsAddingTrade] = useState(false)
  const [isDeletingTrade, setIsDeletingTrade] = useState<string | null>(null)
  const [isDeletingPosition, setIsDeletingPosition] = useState<string | null>(null)
  const [isRefreshingPortfolio, setIsRefreshingPortfolio] = useState(false)
  const [isRefreshingData, setIsRefreshingData] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  
  const [tradeForm, setTradeForm] = useState({
    symbol: '',
    type: 'buy' as 'buy' | 'sell',
    quantity: 0,
    price: 0,
    notes: ''
  })

  // Retry mechanism for failed API calls
  const retryOperation = useCallback(async (operation: () => Promise<void>, operationName: string) => {
    if (retryCount < maxRetries) {
      console.log(`🔄 Portfolio Component - Retrying ${operationName} (attempt ${retryCount + 1}/${maxRetries})`)
      setRetryCount(prev => prev + 1)
      setError(null)
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000))
      
      try {
        await operation()
        setRetryCount(0) // Reset retry count on success
      } catch (error) {
        console.error(`❌ Portfolio Component - Retry ${operationName} failed:`, error)
        if (retryCount + 1 >= maxRetries) {
          setError(`Failed to ${operationName.toLowerCase()} after ${maxRetries} attempts. Please try again later.`)
        }
      }
    } else {
      setError(`Failed to ${operationName.toLowerCase()} after ${maxRetries} attempts. Please try again later.`)
    }
  }, [retryCount, maxRetries])

  // Load positions for a portfolio
  const loadPositions = useCallback(async (portfolioId: string) => {
    try {
      console.log('📡 Portfolio Component - Loading positions for portfolio:', portfolioId)
      const response = await fetch(`/api/portfolio/${portfolioId}/positions`, {
        credentials: 'include'
      })
      
      if (!response.ok) {
        console.error('❌ Portfolio Component - Failed to load positions:', response.status)
        if (response.status === 401) {
          setError('Authentication required. Please sign in and try again.')
        } else if (response.status === 404) {
          setError('Portfolio not found.')
        } else {
          setError(`Failed to load positions: ${response.status}`)
        }
        return
      }
      
      const data = await response.json()
      console.log('📊 Portfolio Component - Positions data:', data)
      
      if (data.success) {
        // Update positions with real-time stock data
        const updatedPositions = await Promise.all(
          data.data.map(async (position: any) => {
            try {
              // Fetch current stock data from Polygon API
              const stockResponse = await fetch(`/api/stocks/quote?symbol=${position.symbol}`, {
                credentials: 'include'
              })
              if (stockResponse.ok) {
                const stockData = await stockResponse.json()
                if (stockData.success && stockData.data) {
                  const currentPrice = stockData.data.price || 0
                  const marketValue = position.quantity * currentPrice
                  const unrealizedPnL = marketValue - (position.quantity * position.averagePrice)
                  const unrealizedPnLPercent = position.averagePrice > 0 ? 
                    ((currentPrice - position.averagePrice) / position.averagePrice) * 100 : 0

                  return {
                    ...position,
                    currentPrice,
                    marketValue,
                    unrealizedPnL,
                    unrealizedPnLPercent,
                    name: stockData.data.name || position.symbol
                  }
                }
              }
            } catch (error) {
              console.error('❌ Portfolio Component - Error fetching stock data for:', position.symbol, error)
            }

            // Return position with default values if stock data fetch fails
            return {
              ...position,
              currentPrice: position.averagePrice,
              marketValue: position.quantity * position.averagePrice,
              unrealizedPnL: 0,
              unrealizedPnLPercent: 0,
              name: position.symbol
            }
          })
        )

        setPositions(updatedPositions)
        console.log('✅ Portfolio Component - Positions loaded successfully:', updatedPositions.length, 'positions')
      } else {
        console.error('❌ Portfolio Component - Failed to load positions:', data.error)
        setError(data.error || 'Failed to load positions')
      }
    } catch (err) {
      console.error('❌ Portfolio Component - Error loading positions:', err)
      setError(err instanceof Error ? err.message : 'Failed to load positions')
    }
  }, [])

  // Load trades for a portfolio
  const loadTrades = useCallback(async (portfolioId: string) => {
    try {
      console.log('📡 Portfolio Component - Loading trades for portfolio:', portfolioId)
      const response = await fetch(`/api/portfolio/${portfolioId}/trades`, {
        credentials: 'include'
      })
      
      if (!response.ok) {
        console.error('❌ Portfolio Component - Failed to load trades:', response.status)
        if (response.status === 401) {
          setError('Authentication required. Please sign in and try again.')
        } else if (response.status === 404) {
          setError('Portfolio not found.')
        } else {
          setError(`Failed to load trades: ${response.status}`)
        }
        return
      }
      
      const data = await response.json()
      console.log('📊 Portfolio Component - Trades data:', data)
      
      if (data.success) {
        setTrades(data.data)
        console.log('✅ Portfolio Component - Trades loaded successfully:', data.data.length, 'trades')
      } else {
        console.error('❌ Portfolio Component - Failed to load trades:', data.error)
        setError(data.error || 'Failed to load trades')
      }
    } catch (err) {
      console.error('❌ Portfolio Component - Error loading trades:', err)
      setError(err instanceof Error ? err.message : 'Failed to load trades')
    }
  }, [])

  // Load portfolios from API
  const loadPortfolios = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      console.log('📡 Portfolio Component - Fetching portfolios...')
      const response = await fetch('/api/portfolio', {
        credentials: 'include'
      })
      console.log('📡 Portfolio Component - Response status:', response.status)
      
      if (!response.ok) {
        if (response.status === 401) {
          console.error('❌ Portfolio Component - Authentication required (401)')
          throw new Error('Authentication required. Please sign in and try again.')
        } else if (response.status === 503) {
          console.error('❌ Portfolio Component - Service unavailable (503)')
          throw new Error('Service temporarily unavailable. Please try again later.')
        }
        const errorText = await response.text()
        console.error('❌ Portfolio Component - Response not ok:', {
          status: response.status,
          statusText: response.statusText,
          errorText
        })
        throw new Error(`Failed to load portfolios: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('📊 Portfolio Component - Response data:', data)
      
      if (data.success) {
        setPortfolios(data.data)
        if (data.data.length > 0 && !activePortfolio) {
          setActivePortfolio(data.data[0])
          // Load positions and trades for the first portfolio
          await Promise.all([
            loadPositions(data.data[0].id),
            loadTrades(data.data[0].id)
          ])
        }
        console.log('✅ Portfolio Component - Portfolios loaded successfully:', data.data)
      } else {
        throw new Error(data.error || 'Failed to load portfolios')
      }
    } catch (err) {
      console.error('❌ Portfolio Component - Error loading portfolios:', err)
      setError(err instanceof Error ? err.message : 'Failed to load portfolios')
    } finally {
      setIsLoading(false)
    }
  }, [activePortfolio, loadPositions, loadTrades])

  // Removed localStorage trade management - now using database only

  useEffect(() => {
    loadPortfolios()
  }, [loadPortfolios])

  // Update trade form type when tab changes
  useEffect(() => {
    if (activeTab === 'buy' || activeTab === 'sell') {
      setTradeForm(prev => ({
        ...prev,
        type: activeTab as 'buy' | 'sell'
      }))
    }
  }, [activeTab])

  // Removed local position calculation - now using database positions only

  // Handle portfolio switching
  const handlePortfolioChange = useCallback(async (portfolio: Portfolio) => {
    try {
      setIsRefreshingData(true)
      setError(null)
      
      setActivePortfolio(portfolio)
      setPositions([])
      setTrades([])
      
      // Load positions and trades for the selected portfolio
      await Promise.all([
        loadPositions(portfolio.id),
        loadTrades(portfolio.id)
      ])
    } catch (err) {
      console.error('❌ Portfolio Component - Error switching portfolio:', err)
      setError(err instanceof Error ? err.message : 'Failed to switch portfolio')
    } finally {
      setIsRefreshingData(false)
    }
  }, [loadPositions, loadTrades])

  // Create new portfolio
  const createPortfolio = async () => {
    if (!newPortfolioName.trim()) {
      setError('Portfolio name is required')
      return
    }

    try {
      setIsCreatingPortfolio(true)
      setError(null)
      
      const response = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newPortfolioName.trim(),
          description: `Portfolio created on ${new Date().toLocaleDateString()}`
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create portfolio')
      }

      const data = await response.json()
      if (data.success) {
        setPortfolios(prev => [...prev, data.data])
        setActivePortfolio(data.data)
        setNewPortfolioName('')
        setError(null)
      } else {
        throw new Error(data.error || 'Failed to create portfolio')
      }
    } catch (err) {
      console.error('Error creating portfolio:', err)
      setError(err instanceof Error ? err.message : 'Failed to create portfolio')
    } finally {
      setIsCreatingPortfolio(false)
    }
  }

  // Search for stock data
  const searchStock = async () => {
    if (!searchSymbol.trim()) return
    
    setIsSearching(true)
    setStockData(null)
    setError(null)
    
    try {
      console.log('🔍 Portfolio Component - Searching for stock:', searchSymbol.toUpperCase())
      
      const response = await fetch(`/api/stocks/quote?symbol=${encodeURIComponent(searchSymbol.toUpperCase())}`, {
        credentials: 'include'
      })
      
      console.log('📡 Portfolio Component - Stock API response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      })
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Stock symbol "${searchSymbol.toUpperCase()}" not found. Please check the symbol and try again.`)
        } else if (response.status === 503) {
          throw new Error('Stock data service is temporarily unavailable. Please try again later.')
        } else {
          throw new Error(`Failed to fetch stock data: ${response.status} ${response.statusText}`)
        }
      }
      
      const data = await response.json()
      console.log('📊 Portfolio Component - Stock API data:', data)
      
      if (data.success && data.data) {
        setStockData(data.data)
        setTradeForm(prev => ({ ...prev, symbol: data.data.symbol, price: data.data.price }))
        console.log('✅ Portfolio Component - Stock data loaded successfully:', data.data.symbol)
      } else {
        throw new Error(`Stock data not available for ${searchSymbol.toUpperCase()}. Please check the symbol and try again.`)
      }
    } catch (error) {
      console.error(`❌ Portfolio Component - Error fetching stock data for ${searchSymbol}:`, error)
      setError(error instanceof Error ? error.message : 'Error fetching stock data. Please try again.')
    } finally {
      setIsSearching(false)
    }
  }

  // Add new trade
  const addTrade = async () => {
    if (!activePortfolio) {
      setError('Please select a portfolio first.')
      return
    }

    if (!tradeForm.symbol || tradeForm.quantity <= 0 || tradeForm.price <= 0) {
      setError('Please fill in all required fields with valid values.')
      return
    }

    try {
      setIsAddingTrade(true)
      setError(null)
      
      console.log('📡 Portfolio Component - Adding trade to database:', {
        portfolioId: activePortfolio.id,
        symbol: tradeForm.symbol.toUpperCase(),
        type: tradeForm.type,
        quantity: tradeForm.quantity,
        price: tradeForm.price
      })

      const response = await fetch(`/api/portfolio/${activePortfolio.id}/trades`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          symbol: tradeForm.symbol.toUpperCase(),
          type: tradeForm.type,
          quantity: tradeForm.quantity,
          price: tradeForm.price,
          notes: tradeForm.notes
        })
      })

      console.log('📡 Portfolio Component - Trade API response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      })

      if (!response.ok) {
        let errorMessage = 'Failed to add trade'
        
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          // If we can't parse the error response, use the status text
          if (response.status === 400) {
            errorMessage = 'Invalid trade data. Please check your input and try again.'
          } else if (response.status === 401) {
            errorMessage = 'Authentication required. Please sign in and try again.'
          } else if (response.status === 404) {
            errorMessage = 'Portfolio not found.'
          } else if (response.status === 503) {
            errorMessage = 'Service temporarily unavailable. Please try again later.'
          } else {
            errorMessage = `Failed to add trade: ${response.status} ${response.statusText}`
          }
        }
        // Surface error contextually to the user (no scrolling required)
        toast({
          title: 'Trade failed',
          description: errorMessage,
        })
        
        throw new Error(errorMessage)
      }

      const tradeData = await response.json()
      console.log('✅ Portfolio Component - Trade added successfully:', tradeData)

      // Refresh positions and trades lists
      await Promise.all([
        loadPositions(activePortfolio.id),
        loadTrades(activePortfolio.id)
      ])
      
      // Reset form
      setTradeForm({
        symbol: '',
        type: 'buy',
        quantity: 0,
        price: 0,
        notes: ''
      })
      setStockData(null)
      setSearchSymbol('')
      setError(null)
      
      console.log('✅ Portfolio Component - Trade form reset and data refreshed')
      toast({
        title: 'Trade recorded',
        description: `${tradeForm.type === 'buy' ? 'Buy' : 'Sell'} order for ${tradeForm.quantity} ${tradeForm.symbol.toUpperCase()} recorded successfully.`,
      })
    } catch (err) {
      console.error('❌ Portfolio Component - Error adding trade:', err)
      setError(err instanceof Error ? err.message : 'Failed to add trade')
      // Also show a toast near the action context
      toast({
        title: 'Trade failed',
        description: err instanceof Error ? err.message : 'Failed to add trade',
      })
    } finally {
      setIsAddingTrade(false)
    }
  }

  const deleteTrade = async (tradeId: string) => {
    if (!activePortfolio) return

    if (window.confirm('Are you sure you want to delete this trade? This action cannot be undone.')) {
      try {
        console.log('🗑️ Portfolio Component - Deleting trade:', tradeId)
        
        const response = await fetch(`/api/portfolio/${activePortfolio.id}/trades/${tradeId}`, {
          method: 'DELETE',
          credentials: 'include'
        })

        console.log('📡 Portfolio Component - Delete trade API response:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        })

        if (!response.ok) {
          let errorMessage = 'Failed to delete trade'
          
          try {
            const errorData = await response.json()
            errorMessage = errorData.error || errorMessage
          } catch {
            if (response.status === 401) {
              errorMessage = 'Authentication required. Please sign in and try again.'
            } else if (response.status === 404) {
              errorMessage = 'Trade not found.'
            } else if (response.status === 503) {
              errorMessage = 'Service temporarily unavailable. Please try again later.'
            } else {
              errorMessage = `Failed to delete trade: ${response.status} ${response.statusText}`
            }
          }
          
          throw new Error(errorMessage)
        }

        console.log('✅ Portfolio Component - Trade deleted successfully')
        
        // Refresh trades list
        await loadTrades(activePortfolio.id)
      } catch (err) {
        console.error('❌ Portfolio Component - Error deleting trade:', err)
        setError(err instanceof Error ? err.message : 'Failed to delete trade')
      }
    }
  }

  const deletePosition = async (positionId: string) => {
    if (!activePortfolio) return

    if (window.confirm('Are you sure you want to delete this position? This action cannot be undone.')) {
      try {
        setIsDeletingPosition(positionId)
        setError(null)
        
        console.log('🗑️ Portfolio Component - Deleting position:', positionId)
        
        const response = await fetch(`/api/portfolio/${activePortfolio.id}/positions/${positionId}`, {
          method: 'DELETE',
          credentials: 'include'
        })

        console.log('📡 Portfolio Component - Delete position API response:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        })

        if (!response.ok) {
          let errorMessage = 'Failed to delete position'
          
          try {
            const errorData = await response.json()
            errorMessage = errorData.error || errorMessage
            } catch {
            if (response.status === 401) {
              errorMessage = 'Authentication required. Please sign in and try again.'
            } else if (response.status === 404) {
              errorMessage = 'Position not found.'
            } else if (response.status === 503) {
              errorMessage = 'Service temporarily unavailable. Please try again later.'
            } else {
              errorMessage = `Failed to delete position: ${response.status} ${response.statusText}`
            }
          }
          
          throw new Error(errorMessage)
        }

        console.log('✅ Portfolio Component - Position deleted successfully')
        
        // Refresh positions list
        await loadPositions(activePortfolio.id)
      } catch (err) {
        console.error('❌ Portfolio Component - Error deleting position:', err)
        setError(err instanceof Error ? err.message : 'Failed to delete position')
      } finally {
        setIsDeletingPosition(null)
      }
    }
  }

  const portfolioStats = {
    totalValue: positions.reduce((sum, pos) => sum + pos.marketValue, 0),
    totalCost: positions.reduce((sum, pos) => sum + (pos.quantity * pos.averagePrice), 0),
    totalPnL: positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0),
    totalPnLPercent: positions.length > 0 ? 
      (positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0) / 
       positions.reduce((sum, pos) => sum + (pos.quantity * pos.averagePrice), 0)) * 100 : 0
  }

  const exportPortfolio = async () => {
    try {
      setIsExporting(true)
      setError(null)
      
      const data = {
        portfolios,
        trades,
        positions,
        exportDate: new Date().toISOString(),
        portfolioStats
      }
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `portfolio-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 500))
    } catch (err) {
      console.error('❌ Portfolio Component - Error exporting portfolio:', err)
      setError(err instanceof Error ? err.message : 'Failed to export portfolio')
    } finally {
      setIsExporting(false)
    }
  }

  const importPortfolio = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setIsImporting(true)
      setError(null)
      
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string)
          if (data.trades) setTrades(data.trades)
          setError(null)
        } catch (error) {
          console.error('Error importing portfolio:', error)
          setError('Error importing portfolio data. Please check the file format.')
        }
      }
      reader.readAsText(file)
      
      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 500))
    } catch (err) {
      console.error('❌ Portfolio Component - Error importing portfolio:', err)
      setError(err instanceof Error ? err.message : 'Failed to import portfolio')
    } finally {
      setIsImporting(false)
    }
  }

  const refreshPortfolio = async () => {
    try {
      setIsRefreshingPortfolio(true)
      setError(null)
      await loadPortfolios()
    } catch (err) {
      console.error('❌ Portfolio Component - Error refreshing portfolio:', err)
      setError(err instanceof Error ? err.message : 'Failed to refresh portfolio')
    } finally {
      setIsRefreshingPortfolio(false)
    }
  }

  const refreshPortfolioData = async () => {
    if (activePortfolio) {
      try {
        setIsRefreshingData(true)
        setError(null)
        await Promise.all([
          loadPositions(activePortfolio.id),
          loadTrades(activePortfolio.id)
        ])
      } catch (err) {
        console.error('❌ Portfolio Component - Error refreshing portfolio data:', err)
        setError(err instanceof Error ? err.message : 'Failed to refresh portfolio data')
      } finally {
        setIsRefreshingData(false)
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading portfolio data...</p>
          <div className="mt-4 text-sm text-gray-500">
            <p>Fetching portfolios...</p>
            <p>Loading positions and trades...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 dark:text-red-200">
            <div className="flex items-center justify-between">
              <span>{error}</span>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setError(null)
                    setRetryCount(0)
                    loadPortfolios()
                  }}
                  className="text-red-700 border-red-300 hover:bg-red-100 dark:text-red-300 dark:border-red-700 dark:hover:bg-red-900/30"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Retry
                </Button>
                {retryCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    Attempt {retryCount}/{maxRetries}
                  </Badge>
                )}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
       

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Portfolio Management</span>
            <Button onClick={refreshPortfolio} variant="outline" size="sm" disabled={isRefreshingPortfolio}>
              {isRefreshingPortfolio ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {isRefreshingPortfolio ? 'Refreshing...' : 'Refresh'}
            </Button>
          </CardTitle>
          <CardDescription>
            Select a portfolio or create a new one to manage your investments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {portfolios.length === 0 ? (
            <div className="text-center py-8">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No portfolios yet. Create your first portfolio to get started.</p>
              <div className="flex gap-2 justify-center">
                <Input
                  placeholder="New portfolio name"
                  value={newPortfolioName}
                  onChange={(e) => setNewPortfolioName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && createPortfolio()}
                  className="w-[200px]"
                />
                <Button 
                  onClick={createPortfolio} 
                  disabled={isCreatingPortfolio || !newPortfolioName.trim()}
                  size="sm"
                >
                  {isCreatingPortfolio ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {isCreatingPortfolio ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-4 items-center">
              {portfolios.map((portfolio) => (
                <Button
                  key={portfolio.id}
                  variant={activePortfolio?.id === portfolio.id ? "default" : "outline"}
                  onClick={() => handlePortfolioChange(portfolio)}
                  disabled={isRefreshingData}
                  className="min-w-[150px]"
                >
                  {isRefreshingData && activePortfolio?.id === portfolio.id ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <BarChart3 className="h-4 w-4 mr-2" />
                  )}
                  {portfolio.name}
                </Button>
              ))}
              
              <div className="flex gap-2">
                <Input
                  placeholder="New portfolio name"
                  value={newPortfolioName}
                  onChange={(e) => setNewPortfolioName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && createPortfolio()}
                  className="w-[200px]"
                />
                <Button 
                  onClick={createPortfolio} 
                  disabled={isCreatingPortfolio || !newPortfolioName.trim()}
                  size="sm"
                >
                  {isCreatingPortfolio ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {isCreatingPortfolio ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Portfolio Summary
          </CardTitle>
          <CardDescription>
            Track your real stock investments with detailed trade history
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!activePortfolio ? (
            <div className="text-center py-8">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Select a portfolio to view summary</p>
            </div>
          ) : isRefreshingData ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 text-blue-600 mr-3 animate-spin" />
              <span className="text-gray-600">Updating portfolio summary...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-800">
                  ${portfolioStats.totalValue.toLocaleString()}
                </div>
                <div className="text-sm text-blue-600">Total Value</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-800">
                  ${portfolioStats.totalCost.toLocaleString()}
                </div>
                <div className="text-sm text-green-600">Total Cost</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="portfolio" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Portfolio
          </TabsTrigger>
          <TabsTrigger value="trades" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Trades
          </TabsTrigger>
          <TabsTrigger value="buy" className="flex items-center gap-2">
            <ArrowUp className="h-4 w-4" />
            Buy
          </TabsTrigger>
          <TabsTrigger value="sell" className="flex items-center gap-2">
            <ArrowDown className="h-4 w-4" />
            Sell
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="portfolio" className="space-y-4">
          {!activePortfolio ? (
            <div className="text-center py-8">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Select a portfolio to view positions</p>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Current Positions</h3>
                <div className="flex gap-2">
                  <Button onClick={refreshPortfolioData} variant="outline" size="sm" disabled={isRefreshingData}>
                    {isRefreshingData ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    {isRefreshingData ? 'Refreshing...' : 'Refresh'}
                  </Button>
                  <Button onClick={() => setActiveTab('buy')} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Trade
                  </Button>
                </div>
              </div>
              
              {isUpdatingPositions || isRefreshingData ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <Loader2 className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
                    <p className="text-gray-600">
                      {isUpdatingPositions ? 'Updating portfolio positions...' : 'Refreshing portfolio data...'}
                    </p>
                  </CardContent>
                </Card>
              ) : positions.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No positions yet. Add your first trade to get started.</p>
                  </CardContent>
                </Card>
              ) : (
            <div className="grid gap-4">
              {positions.map((position) => (
                <Card key={position.symbol}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-lg">{position.symbol}</h4>
                          <span className="text-sm text-gray-600">{position.name}</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Quantity:</span>
                            <div className="font-medium">{position.quantity.toLocaleString()}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Avg Price:</span>
                            <div className="font-medium">${position.averagePrice.toFixed(2)}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Current Price:</span>
                            <div className="font-medium">${position.currentPrice.toFixed(2)}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Market Value:</span>
                            <div className="font-medium">${position.marketValue.toLocaleString()}</div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {position.unrealizedPnL !== 0 && (
                          <>
                            <div className={`text-lg font-bold ${position.unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ${position.unrealizedPnL.toLocaleString()}
                            </div>
                            <div className={`text-sm ${position.unrealizedPnLPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {position.unrealizedPnLPercent >= 0 ? '+' : ''}{position.unrealizedPnLPercent.toFixed(2)}%
                            </div>
                            <Badge variant={position.unrealizedPnL > 0 ? 'default' : 'destructive'} className="mt-2">
                              {position.unrealizedPnL > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                              {position.unrealizedPnL > 0 ? 'Profit' : 'Loss'}
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-4 pt-4 border-t">
                      <div className="text-sm text-gray-600">
                        Last updated: {new Date(position.entryDate).toLocaleDateString()}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => {
                            setTradeForm({
                              symbol: position.symbol,
                              type: 'sell',
                              quantity: 0,
                              price: position.currentPrice,
                              notes: ''
                            })
                            setActiveTab('sell')
                          }}
                          variant="outline" 
                          size="sm"
                        >
                          <ArrowDown className="h-4 w-4 mr-2" />
                          Sell
                        </Button>
                        <Button 
                          onClick={() => deletePosition(position.id)}
                          variant="outline" 
                          size="sm"
                          disabled={isDeletingPosition === position.id}
                          className="text-red-600 hover:text-red-700"
                        >
                          {isDeletingPosition === position.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
            </>
          )}
        </TabsContent>

        <TabsContent value="trades" className="space-y-4">
          {!activePortfolio ? (
            <div className="text-center py-8">
              <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Select a portfolio to view trade history</p>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Trade History</h3>
                <Button onClick={() => activePortfolio && loadTrades(activePortfolio.id)} variant="outline" size="sm" disabled={isRefreshingData}>
                  {isRefreshingData ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  {isRefreshingData ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>
              
              {isRefreshingData ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <Loader2 className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
                    <p className="text-gray-600">Refreshing trade history...</p>
                  </CardContent>
                </Card>
              ) : trades.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No trades yet. Your buy and sell transactions will appear here.</p>
                  </CardContent>
                </Card>
              ) : (
            <div className="space-y-2">
              {trades
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((trade) => (
                <Card key={trade.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <Badge variant={trade.type === 'buy' ? 'default' : 'secondary'}>
                          {trade.type.toUpperCase()}
                        </Badge>
                        <div>
                          <div className="font-semibold">{trade.symbol}</div>
                          <div className="text-sm text-gray-600">
                            {trade.quantity.toLocaleString()} shares @ ${trade.price.toFixed(2)}
                          </div>
                          {trade.notes && (
                            <div className="text-xs text-gray-500 mt-1">{trade.notes}</div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">${trade.amount.toLocaleString()}</div>
                        <div className="text-sm text-gray-600">
                          {new Date(trade.date).toLocaleDateString()}
                        </div>
                        <Button 
                          onClick={() => deleteTrade(trade.id)}
                          variant="ghost" 
                          size="sm"
                          disabled={isDeletingTrade === trade.id}
                          className="text-red-600 hover:text-red-700 mt-1"
                        >
                          {isDeletingTrade === trade.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
            </>
          )}
        </TabsContent>

        <TabsContent value="buy" className="space-y-4">
          {!activePortfolio ? (
            <div className="text-center py-8">
              <ArrowUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Select a portfolio to record buy trades</p>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowUp className="h-5 w-5 text-green-600" />
                  Record Buy Trade
                </CardTitle>
                <CardDescription>
                  Record buying shares at a specific price
                </CardDescription>
              </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="symbol">Stock Symbol</Label>
                <div className="flex gap-2">
                  <Input
                    id="symbol"
                    placeholder={isSearching ? "Searching..." : "Enter stock symbol (e.g., AAPL)"}
                    value={searchSymbol}
                    onChange={(e) => setSearchSymbol(e.target.value.toUpperCase())}
                    onKeyPress={(e) => e.key === 'Enter' && searchStock()}
                    disabled={isSearching}
                    className="bg-white text-gray-900 placeholder-gray-500 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder-neutral-400 dark:border-neutral-700"
                  />
                  <Button 
                    onClick={searchStock} 
                    disabled={!searchSymbol.trim() || isSearching}
                    className="min-w-[100px]"
                  >
                    {isSearching ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Search
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {isSearching && !stockData && (
                <Card className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-8 w-8 text-blue-600 mr-3 animate-spin" />
                      <span className="text-blue-800">Searching for stock data...</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {stockData && (
                <Card className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/40">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-lg">{stockData.symbol}</h4>
                        <p className="text-gray-600 dark:text-neutral-300">{stockData.name}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">${stockData.price}</div>
                        <div className={`text-sm ${stockData.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {stockData.change >= 0 ? '+' : ''}{stockData.change.toFixed(2)} ({stockData.changePercent.toFixed(2)}%)
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {stockData && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity</Label>
                      <Input
                        id="quantity"
                        type="number"
                        placeholder="Number of shares"
                        value={tradeForm.quantity}
                        onChange={(e) => {
                          const raw = e.target.value
                          const sanitized = raw.replace(/^0+(?=\d)/, '')
                          if (sanitized !== raw) e.target.value = sanitized
                          setTradeForm({
                            ...tradeForm,
                            quantity: parseFloat(sanitized) || 0,
                          })
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price">Buy Price</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        placeholder="Price per share"
                        value={tradeForm.price}
                        onChange={(e) => setTradeForm({...tradeForm, price: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Input
                      id="notes"
                      placeholder="Add notes about this trade"
                      value={tradeForm.notes}
                      onChange={(e) => setTradeForm({...tradeForm, notes: e.target.value})}
                    />
                  </div>
                  <Button 
                    onClick={addTrade} 
                    className="w-full"
                    disabled={tradeForm.quantity <= 0 || tradeForm.price <= 0 || isAddingTrade}
                  >
                    {isAddingTrade ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ArrowUp className="h-4 w-4 mr-2" />
                    )}
                    {isAddingTrade ? 'Recording Trade...' : 'Record Buy Trade'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
            )}
        </TabsContent>

        <TabsContent value="sell" className="space-y-4">
          {!activePortfolio ? (
            <div className="text-center py-8">
              <ArrowDown className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Select a portfolio to record sell trades</p>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowDown className="h-5 w-5 text-red-600" />
                  Record Sell Trade
                </CardTitle>
                <CardDescription>
                  Record selling shares at a specific price
                </CardDescription>
              </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sell-symbol">Stock Symbol</Label>
                <div className="flex gap-2">
                  <Input
                    id="sell-symbol"
                    placeholder={isSearching ? "Searching..." : "Enter stock symbol (e.g., AAPL)"}
                    value={searchSymbol}
                    onChange={(e) => setSearchSymbol(e.target.value.toUpperCase())}
                    onKeyPress={(e) => e.key === 'Enter' && searchStock()}
                    disabled={isSearching}
                    className="bg-white text-gray-900 placeholder-gray-500 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder-neutral-400 dark:border-neutral-700"
                  />
                  <Button 
                    onClick={searchStock} 
                    disabled={!searchSymbol.trim() || isSearching}
                    className="min-w-[100px]"
                  >
                    {isSearching ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Search
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {isSearching && !stockData && (
                <Card className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-8 w-8 text-blue-600 mr-3 animate-spin" />
                      <span className="text-blue-800">Searching for stock data...</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {stockData && (
                <Card className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-lg">{stockData.symbol}</h4>
                        <p className="text-gray-600 dark:text-neutral-300">{stockData.name}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">${stockData.price}</div>
                        <div className={`text-sm ${stockData.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {stockData.change >= 0 ? '+' : ''}{stockData.change.toFixed(2)} ({stockData.changePercent.toFixed(2)}%)
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {stockData && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sell-quantity">Quantity</Label>
                      <Input
                        id="sell-quantity"
                        type="number"
                        placeholder="Number of shares"
                        value={tradeForm.quantity}
                        onChange={(e) => {
                          const raw = e.target.value
                          const sanitized = raw.replace(/^0+(?=\d)/, '')
                          if (sanitized !== raw) e.target.value = sanitized
                          setTradeForm({
                            ...tradeForm,
                            quantity: parseFloat(sanitized) || 0,
                          })
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sell-price">Sell Price</Label>
                      <Input
                        id="sell-price"
                        type="number"
                        step="0.01"
                        placeholder="Price per share"
                        value={tradeForm.price}
                        onChange={(e) => setTradeForm({...tradeForm, price: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sell-notes">Notes (Optional)</Label>
                    <Input
                      id="sell-notes"
                      placeholder="Add notes about this trade"
                      value={tradeForm.notes}
                      onChange={(e) => setTradeForm({...tradeForm, notes: e.target.value})}
                    />
                  </div>
                  <Button 
                    onClick={addTrade} 
                    className="w-full"
                    disabled={tradeForm.quantity <= 0 || tradeForm.price <= 0 || isAddingTrade}
                  >
                    {isAddingTrade ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ArrowDown className="h-4 w-4 mr-2" />
                    )}
                    {isAddingTrade ? 'Recording Trade...' : 'Record Sell Trade'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
            )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {!activePortfolio ? (
            <div className="text-center py-8">
              <PieChart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Select a portfolio to view analytics</p>
            </div>
          ) : isRefreshingData ? (
            <Card>
              <CardContent className="text-center py-8">
                <Loader2 className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
                <p className="text-gray-600">Loading portfolio analytics...</p>
              </CardContent>
            </Card>
          ) : (
            <PortfolioAnalytics 
              portfolio={activePortfolio} 
              positions={positions}
              trades={trades}
              onRefresh={() => {
                if (activePortfolio) {
                  Promise.all([
                    loadPositions(activePortfolio.id),
                    loadTrades(activePortfolio.id)
                  ])
                }
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          {!activePortfolio ? (
            <div className="text-center py-8">
              <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Select a portfolio to manage settings</p>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Portfolio Settings</CardTitle>
                <CardDescription>
                  Manage your portfolio data and settings
                </CardDescription>
              </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Export Portfolio</Label>
                  <Button onClick={exportPortfolio} className="w-full" variant="outline" disabled={isExporting}>
                    {isExporting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    {isExporting ? 'Exporting...' : 'Export Data'}
                  </Button>
                  <p className="text-sm text-gray-600">
                    Download your portfolio data as JSON file
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Import Portfolio</Label>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".json"
                      onChange={importPortfolio}
                      disabled={isImporting}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Button className="w-full" variant="outline" disabled={isImporting}>
                      {isImporting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      {isImporting ? 'Importing...' : 'Import Data'}
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600">
                    Import portfolio data from JSON file
                  </p>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-2">Data Storage</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Your portfolio data is stored locally in your browser. Clearing browser data will remove your portfolio.
                </p>
                <div className="text-sm text-gray-500">
                  <p>Trades: {trades.length}</p>
                  <p>Positions: {positions.length}</p>
                  <p>Portfolios: {portfolios.length}</p>
                  <p>Last updated: {new Date().toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
            )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
