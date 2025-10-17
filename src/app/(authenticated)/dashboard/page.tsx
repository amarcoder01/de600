'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Plus,
  Star,
  BarChart3,
  Target,
  ArrowRight,
  Sparkles,
  Eye,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore, usePortfolioStore, useWatchlistStore, usePriceAlertStore } from '@/store'
import { TodayTradesCard } from '@/components/dashboard/PortfolioCard'
import { useRouter } from 'next/navigation'
import { AlertsPanel } from '@/components/dashboard/AlertsPanel'
import TopMoversWidget from '@/components/dashboard/TopMoversWidget'
import TopGainersLosersWidget from '@/components/dashboard/TopGainersLosersWidget'
import CompactTopMoversWidget from '@/components/dashboard/CompactTopMoversWidget'

export default function Dashboard() {
  const { user, isAuthenticated } = useAuthStore()
  const { portfolios } = usePortfolioStore()
  const { watchlists, loadWatchlists, clearWatchlists, isLoading: watchlistsLoading } = useWatchlistStore()
  const { 
    alerts: priceAlerts,
    loadAlerts: loadPriceAlerts,
    cancelAlert: cancelPriceAlert,
  } = usePriceAlertStore()
  const router = useRouter()
  
  const [isLoading, setIsLoading] = useState(true)
  const [selectedWatchlistId, setSelectedWatchlistId] = useState<string | null>(null)
  const [useCompactWidget, setUseCompactWidget] = useState(false)

  // Trades state (kept separate from existing loading to avoid regressions)
  type Trade = {
    id: string
    portfolioId: string
    symbol: string
    type: 'buy' | 'sell'
    quantity: number
    price: number
    amount: number
    date: string | Date
    notes?: string | null
  }
  const [trades, setTrades] = useState<Trade[]>([])
  const [tradesLoading, setTradesLoading] = useState(false)
  const [activePortfolioId, setActivePortfolioId] = useState<string | null>(null)
  const [portfolioOptions, setPortfolioOptions] = useState<Array<{ id: string; name: string }>>([])

  // Helper to load trades for a given portfolio
  const fetchTradesForPortfolio = async (portfolioId: string) => {
    try {
      setTradesLoading(true)
      const trRes = await fetch(`/api/portfolio/${portfolioId}/trades`)
      if (!trRes.ok) {
        console.warn('⚠️ Failed to load trades for portfolio:', portfolioId, trRes.status)
        setTrades([])
        return
      }
      const trJson = await trRes.json()
      const items: Trade[] = trJson?.data || []
      setTrades(items)
    } catch (err) {
      console.error('Error loading trades for portfolio:', portfolioId, err)
      setTrades([])
    } finally {
      setTradesLoading(false)
    }
  }

  // Load user data on component mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Only load watchlists if user is authenticated
        if (isAuthenticated && user) {
          console.log('🔐 Dashboard: User authenticated, loading watchlists for user:', user.id)
          await loadWatchlists()
        } else {
          console.log('🔐 Dashboard: User not authenticated, skipping watchlist load')
        }
      } catch (error) {
        console.error('Error loading user data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadUserData()
  }, [loadWatchlists, isAuthenticated, user])

  // Clear watchlist data when user logs out
  useEffect(() => {
    if (!isAuthenticated || !user) {
      console.log('🔐 Dashboard: User logged out, clearing watchlist data')
      clearWatchlists() // Clear watchlist data from store when user is not authenticated
    }
  }, [isAuthenticated, user, clearWatchlists])

  // Load portfolios and then recent trades (non-intrusive, separate state)
  useEffect(() => {
    const loadPortfoliosAndTrades = async () => {
      if (!isAuthenticated || !user) return
      try {
        setTradesLoading(true)
        // Fetch portfolios via API (cookie-based auth)
        const pfRes = await fetch('/api/portfolio')
        if (!pfRes.ok) {
          console.warn('⚠️ Failed to load portfolios for trades section:', pfRes.status)
          setTrades([])
          return
        }
        const pfJson = await pfRes.json()
        const pfList: Array<{ id: string; name: string }> = pfJson?.data || []
        setPortfolioOptions(pfList)
        const firstPortfolioId = pfList?.[0]?.id || null
        setActivePortfolioId(firstPortfolioId)
        if (!firstPortfolioId) {
          setTrades([])
          return
        }
        // Initial trades load for first portfolio
        await fetchTradesForPortfolio(firstPortfolioId)
      } catch (err) {
        console.error('Error loading portfolios/trades:', err)
        setTrades([])
      } finally {
        setTradesLoading(false)
      }
    }

    loadPortfoliosAndTrades()
  }, [isAuthenticated, user])

  // Load price alerts for the authenticated user (isolated side-effect)
  useEffect(() => {
    const loadAlertsSafe = async () => {
      if (!isAuthenticated || !user) return
      try {
        await loadPriceAlerts()
      } catch (e) {
        console.warn('⚠️ Failed to load price alerts:', e)
      }
    }
    loadAlertsSafe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user])

  // Helper function to get items to display based on current selection
  const getItemsToDisplay = () => {
    if (selectedWatchlistId) {
      // Return items from specific watchlist
      return watchlists.find(w => w.id === selectedWatchlistId)?.items || []
    } else {
      // Return all items from all watchlists combined
      return watchlists.reduce((allItems: any[], watchlist) => {
        if (watchlist.items && watchlist.items.length > 0) {
          return [...allItems, ...watchlist.items]
        }
        return allItems
      }, [])
    }
  }

  // Get default watchlist only for authenticated users
  const defaultWatchlist = isAuthenticated && user ? watchlists?.find(w => w.name === 'My Watchlist') : null
  const watchlistItems = getItemsToDisplay()

  // Calculate watchlist statistics only for authenticated users
  const totalStocks = watchlistItems.length
  const gainers = watchlistItems.filter(item => (item.changePercent || 0) > 0).length
  const losers = watchlistItems.filter(item => (item.changePercent || 0) < 0).length
  const totalChangePercent = totalStocks > 0 
    ? watchlistItems.reduce((sum, item) => sum + (item.changePercent || 0), 0) / totalStocks 
    : 0

  // Today trades count
  const today = new Date()
  const isSameDay = (d: Date) => d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
  const todaysTradesCount = trades.filter(t => {
    const dt = new Date(t.date)
    return isSameDay(dt)
  }).length

  // Map store alerts to AlertsPanel UI shape with safe index-based IDs (no mutation of store data)
  const alertsList = Array.isArray(priceAlerts) ? priceAlerts : []
  const dashboardAlerts = alertsList.map((a, idx) => {
    const status: 'active' | 'triggered' | 'cancelled' =
      a.status === 'active' && a.isActive
        ? 'active'
        : a.status === 'triggered'
        ? 'triggered'
        : 'cancelled'

    return {
      id: idx + 1,
      type: 'price' as const,
      symbol: a.symbol,
      condition: a.condition,
      value: a.targetPrice,
      status,
      time: new Date(a.updatedAt).toLocaleString(),
    }
  })

  const handleAddAlert = () => {
    router.push('/price-alerts')
  }

  const handleDismissAlert = async (uiId: number) => {
    const alert = alertsList[uiId - 1]
    if (!alert) return
    try {
      await cancelPriceAlert(alert.id)
      toast.success('Alert cancelled successfully')
    } catch (e) {
      toast.error('Failed to cancel alert')
    }
  }

  const handleEditAlert = (uiId: number) => {
    const alert = alertsList[uiId - 1]
    if (alert) {
      router.push(`/price-alerts?id=${alert.id}`)
    }
  }

  // Check if user is new (no portfolios and no watchlist items)
  const isNewUser = portfolios.length === 0 && totalStocks === 0

  // Show loading state while checking authentication
  if (isLoading || watchlistsLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Show authentication required message if user is not authenticated
  if (!isAuthenticated || !user) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Authentication Required
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Please log in to view your personalized dashboard and watchlist.
          </p>
          <Button onClick={() => router.push('/login')}>
            Go to Login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Welcome back, {user?.firstName || 'User'}! Here's your trading overview.
          </p>
        </div>
      </div>

      {/* New User Welcome Section */}
      {isNewUser && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6"
        >
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Welcome to Vidality! 🎉
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                You're all set up! Start exploring the platform by creating your first watchlist, 
                trying paper trading, or exploring market data. We're here to help you succeed.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button 
                  onClick={() => router.push('/watchlist')}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  title="Create your first watchlist"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Watchlist
                </Button>
                <Button 
                  onClick={() => router.push('/paper-trading')}
                  variant="outline"
                  className="border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-900/20"
                  title="Practice trading with virtual funds"
                >
                  <Target className="w-4 h-4 mr-2" />
                  Start Paper Trading
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Enhanced Top Gainers & Losers Widget */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Market Overview
          </h2>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">View:</span>
              <Button
                size="sm"
                variant={useCompactWidget ? "outline" : "default"}
                onClick={() => setUseCompactWidget(false)}
                className="text-xs"
                title="Show full movers widget"
              >
                Full
              </Button>
              <Button
                size="sm"
                variant={useCompactWidget ? "default" : "outline"}
                onClick={() => setUseCompactWidget(true)}
                className="text-xs"
                title="Show compact movers widget"
              >
                Compact
              </Button>
            </div>
          </div>
        </div>
        
        {useCompactWidget ? (
          <CompactTopMoversWidget 
            limit={3}
            showRefresh={true}
            autoRefresh={false}
            refreshInterval={30000}
          />
        ) : (
          <TopGainersLosersWidget 
            limit={5}
            showRefresh={true}
            autoRefresh={false}
            refreshInterval={30000}
          />
        )}
      </div>

      {/* Quick Watchlist Summary - show for all users with watchlists */}
      {!isNewUser && watchlists.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Star className="w-8 h-8 text-green-600" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedWatchlistId 
                    ? `${watchlists.find(w => w.id === selectedWatchlistId)?.name} Summary`
                    : 'Watchlist Summary'
                  }
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {totalStocks} stocks • {gainers} gainers • {losers} losers
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {watchlists.length > 1 && (
                <select
                  value={selectedWatchlistId || ''}
                  onChange={(e) => setSelectedWatchlistId(e.target.value || null)}
                  className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Watchlists</option>
                  {watchlists.map((watchlist) => (
                    <option key={watchlist.id} value={watchlist.id}>
                      {watchlist.name}
                    </option>
                  ))}
                </select>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => router.push('/watchlist')}
                title="Open watchlist page"
              >
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Watchlist Overview - only show if user has stocks */}
      {totalStocks > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {selectedWatchlistId 
                ? `${watchlists.find(w => w.id === selectedWatchlistId)?.name} Overview`
                : 'Your Watchlist'
              }
            </h2>
            <div className="flex items-center space-x-3">
              {/* Watchlist Selector */}
              {watchlists.length > 0 && (
                <select
                  value={selectedWatchlistId || ''}
                  onChange={(e) => setSelectedWatchlistId(e.target.value || null)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  title="Select a watchlist to view"
                >
                  <option value="">All Watchlists</option>
                  {watchlists.map((watchlist) => (
                    <option key={watchlist.id} value={watchlist.id}>
                      {watchlist.name} ({watchlist.items?.length || 0} stocks)
                    </option>
                  ))}
                </select>
              )}
              <Button variant="outline" onClick={() => router.push('/watchlist')}>
                View All
              </Button>
            </div>
          </div>
          
          {/* Watchlist Status Indicator */}
          {selectedWatchlistId && watchlists.find(w => w.id === selectedWatchlistId) && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Currently viewing: <strong>{watchlists.find(w => w.id === selectedWatchlistId)?.name}</strong>
                  </span>
                </div>
                <div className="flex items-center space-x-4 text-sm text-blue-700 dark:text-blue-300">
                  <span>
                    📊 {watchlists.find(w => w.id === selectedWatchlistId)?.items?.length || 0} stocks
                  </span>
                  <span>
                    📅 Created {new Date(watchlists.find(w => w.id === selectedWatchlistId)?.createdAt || '').toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {/* Watchlist Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Star className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Stocks</p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{totalStocks}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">Gainers</p>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">{gainers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
                    <TrendingDown className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">Losers</p>
                    <p className="text-2xl font-bold text-red-900 dark:text-red-100">{losers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Avg Change</p>
                    <p className={`text-2xl font-bold ${totalChangePercent >= 0 ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'}`}>
                      {totalChangePercent >= 0 ? '+' : ''}{totalChangePercent.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Recent Watchlist Items */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">
                {selectedWatchlistId 
                  ? `Recent ${watchlists.find(w => w.id === selectedWatchlistId)?.name} Items`
                  : 'Recent Watchlist Items'
                }
              </h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {watchlistItems.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">{item.symbol[0]}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{item.symbol}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{item.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900 dark:text-white">${item.price?.toFixed(2) || 'N/A'}</p>
                      <p className={`text-sm ${(item.changePercent || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {(item.changePercent || 0) >= 0 ? '+' : ''}{(item.changePercent || 0).toFixed(2)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Portfolio Trades Summary */}
      {isAuthenticated && user && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Portfolio Selector */}
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Portfolio Trades</h2>
            {portfolioOptions.length > 0 && (
              <div className="flex items-center space-x-2">
                <label htmlFor="portfolio-select" className="text-sm text-gray-600 dark:text-gray-300">Portfolio</label>
                <select
                  id="portfolio-select"
                  value={activePortfolioId || ''}
                  onChange={async (e) => {
                    const newId = e.target.value || null
                    setActivePortfolioId(newId)
                    if (newId) {
                      await fetchTradesForPortfolio(newId)
                    } else {
                      setTrades([])
                    }
                  }}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  title="Select a portfolio to view trades"
                >
                  {portfolioOptions.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <TodayTradesCard count={todaysTradesCount} />
          </div>

          {/* Recent Trades List */}
          {(tradesLoading || trades.length > 0) && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Recent Trades {activePortfolioId ? '' : '(No Portfolio Yet)'}</h3>
              </CardHeader>
              <CardContent>
                {tradesLoading && (
                  <div className="text-sm text-gray-500 dark:text-gray-400">Loading trades…</div>
                )}
                {!tradesLoading && trades.length === 0 && (
                  <div className="text-sm text-gray-500 dark:text-gray-400">No trades found.</div>
                )}
                {!tradesLoading && trades.length > 0 && (
                  <div className="space-y-3">
                    {trades.slice(0, 5).map((t) => (
                      <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-sm">{t.symbol?.[0]}</span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{t.symbol} • {t.type.toUpperCase()}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {new Date(t.date).toLocaleString()} • {t.quantity} @ ${t.price.toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-medium ${t.type === 'buy' ? 'text-red-600' : 'text-green-600'}`}>
                            {t.type === 'buy' ? '-' : '+'}${t.amount.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}

      {/* Price Alerts Snapshot */}
      {isAuthenticated && user && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <AlertsPanel
            alerts={dashboardAlerts}
            onAddAlert={handleAddAlert}
            onDismissAlert={handleDismissAlert}
            onEditAlert={handleEditAlert}
          />
        </motion.div>
      )}
    </div>
  )
}
