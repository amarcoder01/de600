'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3, 
  Plus,
  Settings,
  RefreshCw,
  Eye,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Zap,
  Shield,
  Activity,
  PieChart,
  Calendar,
  Users,
  Star,
  Bell,
  Filter,
  Download,
  Share2,
  MoreHorizontal,
  ChevronUp,
  ChevronDown,
  Info,
  Play,
  Pause,
  Square,
  RotateCcw,
  Trash2,
  FolderPlus,
  X,
  Loader2,
  ExternalLink,
  MessageCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/navigation/BackButton'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { PaperTradingAccount, PaperPosition, PaperOrder, PaperTransaction, Stock, Portfolio } from '@/types'
import { TradingOrderForm } from '@/components/trading/TradingOrderForm'
import AdvancedPnLDashboard from '@/components/trading/AdvancedPnLDashboard'
import PaperTradingAI from '@/components/trading/PaperTradingAI'
import { useAuthStore } from '@/store'
import { useRouter } from 'next/navigation'
 

export default function PaperTradingPage() {
  // Authentication
  const { user, isAuthenticated } = useAuthStore()
  const router = useRouter()
  
  // State
  const [accounts, setAccounts] = useState<PaperTradingAccount[]>([])
  const [selectedAccount, setSelectedAccount] = useState<PaperTradingAccount | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'positions' | 'orders' | 'history' | 'pnl'>('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateAccount, setShowCreateAccount] = useState(false)
  const [newAccountName, setNewAccountName] = useState('')
  const [showOrderForm, setShowOrderForm] = useState(false)
  const [selectedSymbol, setSelectedSymbol] = useState('')
  const [realTimeData, setRealTimeData] = useState<Map<string, Stock>>(new Map())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [accountToDelete, setAccountToDelete] = useState<PaperTradingAccount | null>(null)
  const [showAI, setShowAI] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [validatingSymbol, setValidatingSymbol] = useState(false)
  const [symbolValidationError, setSymbolValidationError] = useState<string | null>(null)

  // Add to Portfolio Manager Feature (with feature flag for safety)
  const ENABLE_ADD_TO_PORTFOLIO = true // Feature flag - can be disabled if needed
  const { toast } = useToast()
  const [showAddToPortfolioModal, setShowAddToPortfolioModal] = useState(false)
  const [selectedPosition, setSelectedPosition] = useState<PaperPosition | null>(null)
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>('')
  const [newPortfolioName, setNewPortfolioName] = useState('')
  const [showCreatePortfolio, setShowCreatePortfolio] = useState(false)
  const [addingToPortfolio, setAddingToPortfolio] = useState(false)
  const [loadingPortfolios, setLoadingPortfolios] = useState(false)
  const [portfolioError, setPortfolioError] = useState<string | null>(null)
  const [positionNotes, setPositionNotes] = useState('')
  const [positionQuantity, setPositionQuantity] = useState<number>(0)
  const [positionAveragePrice, setPositionAveragePrice] = useState<number>(0)

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.replace('/login')
      return
    }
  }, [isAuthenticated, user, router])

  // Do not render content while unauthenticated to avoid stale content flashing
  if (!isAuthenticated || !user) {
    return null
  }

  // Fetch accounts on component mount
  useEffect(() => {
    if (user) {
      fetchAccounts()
    }
  }, [user])

  // Real-time data updates
  useEffect(() => {
    if (selectedAccount) {
      updateRealTimeData()
      const interval = setInterval(updateRealTimeData, 30000) // Update every 30 seconds
      return () => clearInterval(interval)
    }
  }, [selectedAccount])

  const fetchAccounts = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      // Use enhanced API with proper user authentication
      const response = await fetch(`/api/paper-trading/enhanced?action=get-accounts&userId=${user.id}`)
      const data = await response.json()
      
      if (data.success) {
        setAccounts(data.data)
        if (data.data.length > 0 && !selectedAccount) {
          setSelectedAccount(data.data[0])
        }
      } else {
        setError(data.error || 'Failed to fetch accounts')
      }
    } catch (error) {
      setError('Failed to fetch accounts')
      console.error('Error fetching accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateRealTimeData = async () => {
    if (!selectedAccount) return

    try {
      console.log(`🔄 Updating real-time data for ${selectedAccount.positions.length} positions...`)
      // Update real-time data for all positions
      const newRealTimeData = new Map(realTimeData)
      
      for (const position of selectedAccount.positions) {
        try {
          const stockData = await fetchStockData(position.symbol)
          if (stockData) {
            newRealTimeData.set(position.symbol, stockData)
            console.log(`✅ Updated real-time data for ${position.symbol}: $${stockData.price}`)
          } else {
            console.log(`⚠️ No real-time data available for ${position.symbol}`)
          }
        } catch (error) {
          console.error(`❌ Error updating real-time data for ${position.symbol}:`, error)
        }
      }
      
      setRealTimeData(newRealTimeData)
      console.log(`✅ Real-time data update completed`)
    } catch (error) {
      console.error('❌ Error updating real-time data:', error)
    }
  }

  const fetchStockData = async (symbol: string): Promise<Stock | null> => {
    try {
      console.log(`🔍 Fetching stock data for ${symbol}...`)
      const response = await fetch(`/api/stocks/quote?symbol=${encodeURIComponent(symbol)}`)
      
      if (!response.ok) {
        console.error(`❌ Failed to fetch stock data for ${symbol}:`, response.status)
        return null
      }
      
      const data = await response.json()
      
      if (data.success && data.data) {
        console.log(`✅ Stock data fetched for ${symbol}: $${data.data.price}`)
        return data.data
      } else {
        console.error(`❌ No stock data for ${symbol}:`, data.error)
        return null
      }
    } catch (error) {
      console.error(`❌ Error fetching stock data for ${symbol}:`, error)
      return null
    }
  }



  const createAccount = async () => {
    if (!newAccountName.trim() || !user) return

    try {
      const response = await fetch('/api/paper-trading/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'create-account',
          userId: user.id,
          name: newAccountName, 
          initialBalance: 100000 
        }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setAccounts([...accounts, data.data])
        setSelectedAccount(data.data)
        setShowCreateAccount(false)
        setNewAccountName('')
      } else {
        setError(data.error || 'Failed to create account')
      }
    } catch (error) {
      setError('Failed to create account')
      console.error('Error creating account:', error)
    }
  }

  const validateStockSymbol = async (symbol: string): Promise<boolean> => {
    if (!symbol.trim()) return false
    
    setValidatingSymbol(true)
    setSymbolValidationError(null)
    
    try {
      const response = await fetch(`/api/stocks/quote?symbol=${encodeURIComponent(symbol.trim())}`)
      const data = await response.json()
      
      if (data.success && data.data) {
        setValidatingSymbol(false)
        return true
      } else {
        setSymbolValidationError(`Stock symbol "${symbol}" not found. Please enter a valid stock symbol.`)
        setValidatingSymbol(false)
        return false
      }
    } catch (error) {
      setSymbolValidationError('Failed to validate stock symbol. Please try again.')
      setValidatingSymbol(false)
      return false
    }
  }

  const handleNewOrder = (symbol?: string) => {
    if (symbol) {
      setSelectedSymbol(symbol)
      // Don't automatically show the order form - let user validate first
    }
    setShowOrderForm(true)
  }

  const handleOrderPlaced = async () => {
    if (!user) return
    
    setShowOrderForm(false)
    setSelectedSymbol('')
    setSymbolValidationError(null)
    setValidatingSymbol(false)
    
    // Refresh accounts to get updated data using enhanced API
    try {
      console.log('🔄 Refreshing accounts after order placement...')
      const response = await fetch(`/api/paper-trading/enhanced?action=get-accounts&userId=${user.id}`)
      const data = await response.json()
      
      if (data.success) {
        setAccounts(data.data)
        
        // Update the selected account with fresh data
        if (selectedAccount) {
          const updatedAccount = data.data.find((account: PaperTradingAccount) => account.id === selectedAccount.id)
          if (updatedAccount) {
            console.log('✅ Updated selected account with fresh data')
            setSelectedAccount(updatedAccount)
            
            // Also update real-time data for the new positions
            if (updatedAccount.positions.length > 0) {
              await updateRealTimeData()
            }
          }
        }
      } else {
        console.error('❌ Failed to refresh accounts:', data.error)
      }
    } catch (error) {
      console.error('❌ Error refreshing accounts:', error)
    }
  }

  const handleDeleteAccount = async () => {
    if (!accountToDelete || !user) return

    try {
      setDeletingAccount(true)
      console.log(`🗑️ Deleting account: ${accountToDelete.name}`)
      
      const response = await fetch('/api/paper-trading/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete-account',
          accountId: accountToDelete.id,
          userId: user.id
        }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        console.log('✅ Account deleted successfully')
        
        // Remove the account from the list
        const updatedAccounts = accounts.filter(account => account.id !== accountToDelete.id)
        setAccounts(updatedAccounts)
        
        // If the deleted account was selected, select the first available account or clear selection
        if (selectedAccount?.id === accountToDelete.id) {
          if (updatedAccounts.length > 0) {
            setSelectedAccount(updatedAccounts[0])
          } else {
            setSelectedAccount(null)
          }
        }
        
        // Close the confirmation modal
        setShowDeleteConfirm(false)
        setAccountToDelete(null)
      } else {
        console.error('❌ Failed to delete account:', data.error)
        setError(data.error || 'Failed to delete account')
      }
    } catch (error) {
      console.error('❌ Error deleting account:', error)
      setError('Failed to delete account')
    } finally {
      setDeletingAccount(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  const getRealTimePrice = (symbol: string) => {
    return realTimeData.get(symbol)?.price || 0
  }

  const getRealTimeChange = (symbol: string) => {
    const stock = realTimeData.get(symbol)
    return stock ? stock.changePercent : 0
  }

  // Export selected account data as a JSON file
  const exportSelectedAccountData = () => {
    if (!selectedAccount) return

    try {
      const payload = {
        meta: {
          exportedAt: new Date().toISOString(),
          app: 'PaperTrading',
          version: '1.0',
        },
        account: selectedAccount,
        // Convert Map to array for serialization
        realTimeData: Array.from(realTimeData.entries()),
      }

      const fileNameSafe = selectedAccount.name.replace(/[^a-z0-9-_]+/gi, '_')
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `paper_trading_${fileNameSafe}_${new Date().toISOString().slice(0,19).replace(/[:T]/g, '-')}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Failed to export account data:', e)
    }
  }

  // Portfolio Management Functions
  const fetchPortfolios = async () => {
    if (!ENABLE_ADD_TO_PORTFOLIO) return
    
    try {
      setLoadingPortfolios(true)
      setPortfolioError(null)
      
      const response = await fetch('/api/portfolio', {
        method: 'GET',
        credentials: 'include', // Include cookies for authentication
      })
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please log in again.')
        } else if (response.status === 403) {
          throw new Error('Access denied. Please check your permissions.')
        } else if (response.status >= 500) {
          throw new Error('Server error. Please try again later.')
        } else {
          throw new Error(`Failed to load portfolios (${response.status})`)
        }
      }
      
      const data = await response.json()
      
      if (data.success) {
        setPortfolios(data.data || [])
        // Auto-select first portfolio if available
        if (data.data && data.data.length > 0 && !selectedPortfolioId) {
          setSelectedPortfolioId(data.data[0].id)
        }
      } else {
        throw new Error(data.error || 'Failed to load portfolios')
      }
    } catch (error) {
      console.error('Error fetching portfolios:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to load portfolios'
      setPortfolioError(errorMessage)
      toast({
        title: "Error Loading Portfolios",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoadingPortfolios(false)
    }
  }

  const createPortfolio = async () => {
    if (!newPortfolioName.trim()) {
      toast({
        title: "Invalid Portfolio Name",
        description: "Please enter a valid portfolio name.",
        variant: "destructive",
      })
      return
    }

    try {
      setLoadingPortfolios(true)
      setPortfolioError(null)
      
      const response = await fetch('/api/portfolio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: newPortfolioName.trim()
        })
      })
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please log in again.')
        } else if (response.status === 403) {
          throw new Error('Access denied. Please check your permissions.')
        } else if (response.status >= 500) {
          throw new Error('Server error. Please try again later.')
        } else {
          throw new Error(`Failed to create portfolio (${response.status})`)
        }
      }
      
      const data = await response.json()
      
      if (data.success) {
        const newPortfolio = data.data
        setPortfolios(prev => [newPortfolio, ...prev])
        setSelectedPortfolioId(newPortfolio.id)
        setNewPortfolioName('')
        setShowCreatePortfolio(false)
        
        toast({
          title: "Portfolio Created",
          description: `Portfolio "${newPortfolio.name}" created successfully.`,
        })
      } else {
        throw new Error(data.error || 'Failed to create portfolio')
      }
    } catch (error) {
      console.error('Error creating portfolio:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create portfolio'
      setPortfolioError(errorMessage)
      toast({
        title: "Error Creating Portfolio",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoadingPortfolios(false)
    }
  }

  const openAddToPortfolioModal = (position: PaperPosition) => {
    if (!ENABLE_ADD_TO_PORTFOLIO) return
    
    setSelectedPosition(position)
    setPositionQuantity(position.quantity)
    setPositionAveragePrice(position.averagePrice)
    setPositionNotes(`Imported from Paper Trading on ${new Date().toLocaleDateString()}`)
    setShowAddToPortfolioModal(true)
    
    // Fetch portfolios when modal opens
    fetchPortfolios()
  }

  const closeAddToPortfolioModal = () => {
    setShowAddToPortfolioModal(false)
    setSelectedPosition(null)
    setSelectedPortfolioId('')
    setPositionQuantity(0)
    setPositionAveragePrice(0)
    setPositionNotes('')
    setPortfolioError(null)
    setShowCreatePortfolio(false)
    setNewPortfolioName('')
  }

  const addPositionToPortfolio = async () => {
    if (!selectedPosition || !selectedPortfolioId) {
      toast({
        title: "Missing Information",
        description: "Please select a portfolio and ensure position data is valid.",
        variant: "destructive",
      })
      return
    }

    // Validate inputs
    if (positionQuantity <= 0) {
      toast({
        title: "Invalid Quantity",
        description: "Quantity must be greater than 0.",
        variant: "destructive",
      })
      return
    }

    if (positionAveragePrice <= 0) {
      toast({
        title: "Invalid Price",
        description: "Average price must be greater than 0.",
        variant: "destructive",
      })
      return
    }

    try {
      setAddingToPortfolio(true)
      setPortfolioError(null)
      
      const requestBody = {
        symbol: selectedPosition.symbol.toUpperCase(),
        quantity: positionQuantity,
        averagePrice: positionAveragePrice,
        notes: positionNotes.trim() || undefined
      }
      
      console.log('Adding position to portfolio:', {
        portfolioId: selectedPortfolioId,
        position: requestBody
      })
      
      const response = await fetch(`/api/portfolio/${selectedPortfolioId}/positions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody)
      })
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please log in again.')
        } else if (response.status === 403) {
          throw new Error('Access denied. Please check your permissions.')
        } else if (response.status === 404) {
          throw new Error('Portfolio not found. Please refresh and try again.')
        } else if (response.status >= 500) {
          throw new Error('Server error. Please try again later.')
        } else {
          throw new Error(`Failed to add position (${response.status})`)
        }
      }
      
      const data = await response.json()
      
      if (data.success) {
        const portfolioName = portfolios.find(p => p.id === selectedPortfolioId)?.name || 'Portfolio'
        
        toast({
          title: "Position Added Successfully",
          description: `${selectedPosition.symbol} has been added to ${portfolioName}.`,
          action: (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                router.push('/portfolio-manager')
              }}
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              View Portfolio
            </Button>
          ),
        })
        
        closeAddToPortfolioModal()
      } else {
        throw new Error(data.error || 'Failed to add position to portfolio')
      }
    } catch (error) {
      console.error('Error adding position to portfolio:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to add position to portfolio'
      setPortfolioError(errorMessage)
      toast({
        title: "Error Adding Position",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setAddingToPortfolio(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Error</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={fetchAccounts}>Retry</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-4 space-y-6 max-w-screen-xl">
      <div className="flex items-center gap-2 sm:gap-3">
        <BackButton buttonClassName="h-8 w-8" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Paper Trading</h1>
          <p className="text-muted-foreground">Simulate trades and track performance risk-free</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Paper Trading</h1>
          <p className="text-muted-foreground">Practice trading with virtual money</p>
        </div>
        <div className="flex items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => setShowCreateAccount(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Account
          </Button>
          <Button onClick={fetchAccounts} className="w-full sm:w-auto">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button 
            onClick={() => setShowAI(true)}
            disabled={!selectedAccount}
            className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            AI Assistant
          </Button>
        </div>
      </div>



      {accounts.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Get started with Paper Trading</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Set up a virtual trading account to test strategies with simulated funds. No real money or live brokerage connection is required.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Target className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-sm">Create an account</span>
                </div>
                <p className="text-sm text-muted-foreground">Start with a simulated balance and manage multiple accounts for different strategies.</p>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-sm">Place your first order</span>
                </div>
                <p className="text-sm text-muted-foreground">Validate a symbol, choose order type and size, and simulate entries/exits.</p>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-sm">Track performance</span>
                </div>
                <p className="text-sm text-muted-foreground">Monitor P&L, cash, and history to evaluate risk and consistency over time.</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Button className="sm:w-auto w-full" onClick={() => setShowCreateAccount(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create your first account
              </Button>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              Results from simulated trading are for educational purposes and may differ from live market execution and slippage.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account Selection */}
      {accounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Select Account</span>
              {selectedAccount && (
                <Badge variant={selectedAccount.totalPnL >= 0 ? 'default' : 'destructive'}>
                  {formatPercentage(selectedAccount.totalPnLPercent)}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map((account) => (
                <Card
                  key={account.id}
                  className={`cursor-pointer transition-all ${
                    selectedAccount?.id === account.id
                      ? 'ring-2 ring-primary'
                      : 'hover:shadow-md'
                  }`}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 
                        className="font-semibold cursor-pointer flex-1"
                        onClick={() => setSelectedAccount(account)}
                      >
                        {account.name}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <Badge variant={account.isActive ? 'default' : 'secondary'}>
                          {account.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setAccountToDelete(account)
                            setShowDeleteConfirm(true)
                          }}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div 
                      className="space-y-1 cursor-pointer"
                      onClick={() => setSelectedAccount(account)}
                    >
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total Value:</span>
                        <span className="font-medium">{formatCurrency(account.totalValue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Available Cash:</span>
                        <span className="font-medium">{formatCurrency(account.availableCash)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">P&L:</span>
                        <span className={`font-medium ${account.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(account.totalPnL)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      {selectedAccount && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-w-0">
          {/* Left Sidebar - Account Overview */}
          <div className="lg:col-span-1 space-y-6 min-w-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <span>Account Overview</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Initial Balance:</span>
                    <span className="font-medium">{formatCurrency(selectedAccount.initialBalance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Current Balance:</span>
                    <span className="font-medium">{formatCurrency(selectedAccount.currentBalance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Available Cash:</span>
                    <span className="font-medium">{formatCurrency(selectedAccount.availableCash)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Value:</span>
                    <span className="font-medium">{formatCurrency(selectedAccount.totalValue)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => handleNewOrder()}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Order
                </Button>
                <Button className="w-full" variant="outline" onClick={exportSelectedAccountData} disabled={!selectedAccount}>
                  <Download className="w-4 h-4 mr-2" />
                  Export Data
                </Button>
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => setShowAI(true)}
                  disabled={!selectedAccount}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  AI Assistant
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6 min-w-0">
            {/* Tabs */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-2 overflow-x-auto">
                  {[ 
                    { id: 'overview', label: 'Overview', icon: Eye },
                    { id: 'positions', label: 'Positions', icon: BarChart3 },
                    { id: 'orders', label: 'Orders', icon: Clock },
                    { id: 'history', label: 'History', icon: Calendar },
                    { id: 'pnl', label: 'P&L Analytics', icon: TrendingUp },
                  ].map((tab) => {
                    const Icon = tab.icon
                    return (
                      <Button
                        key={tab.id}
                        variant={activeTab === tab.id ? 'default' : 'ghost'}
                        onClick={() => setActiveTab(tab.id as any)}
                        className="flex items-center space-x-2 shrink-0 text-sm"
                      >
                        <Icon className="w-4 h-4" />
                        <span>{tab.label}</span>
                      </Button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Positions</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{selectedAccount.positions.length}</div>
                    <p className="text-xs text-muted-foreground">
                      Active positions in portfolio
                    </p>
                  </CardContent>
                </Card>


                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Available Cash</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(selectedAccount.availableCash)}</div>
                    <p className="text-xs text-muted-foreground">
                      Ready for new trades
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'positions' && (
              <Card>
                <CardHeader>
                  <CardTitle>Current Positions</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedAccount.positions.length === 0 ? (
                    <div className="text-center py-8">
                      <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Positions</h3>
                      <p className="text-muted-foreground">
                        You don't have any open positions yet. Place an order to get started.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Symbol</th>
                            <th className="text-right p-2">Quantity</th>
                            <th className="text-right p-2">Avg Price</th>
                            <th className="text-right p-2">Current Price</th>
                            <th className="text-right p-2">Market Value</th>
                            {ENABLE_ADD_TO_PORTFOLIO && (
                              <th className="text-right p-2">Actions</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {selectedAccount.positions.map((position) => {
                            const rtPrice = getRealTimePrice(position.symbol) || position.currentPrice
                            const marketValue = position.quantity * rtPrice
                            return (
                              <tr key={position.id} className="border-b hover:bg-accent/50 transition-colors">
                                <td className="p-2 font-medium">{position.symbol}</td>
                                <td className="p-2 text-right">{position.quantity.toLocaleString()}</td>
                                <td className="p-2 text-right">{formatCurrency(position.averagePrice)}</td>
                                <td className="p-2 text-right">{formatCurrency(rtPrice)}</td>
                                <td className="p-2 text-right">{formatCurrency(marketValue)}</td>
                                {ENABLE_ADD_TO_PORTFOLIO && (
                                  <td className="p-2 text-right">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openAddToPortfolioModal(position)}
                                      className="h-8 px-2 text-xs"
                                      title={`Add ${position.symbol} to Portfolio Manager`}
                                    >
                                      <FolderPlus className="h-3 w-3 mr-1" />
                                      <span className="hidden sm:inline">Add to Portfolio</span>
                                      <span className="sm:hidden">Add</span>
                                    </Button>
                                  </td>
                                )}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}


            {activeTab === 'orders' && (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedAccount.orders.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Orders</h3>
                      <p className="text-muted-foreground">
                        You haven't placed any orders yet.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {selectedAccount.orders.slice(0, 10).map((order) => (
                        <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div>
                              <h4 className="font-semibold">{order.symbol}</h4>
                              <p className="text-sm text-muted-foreground">
                                {order.type.toUpperCase()} {order.side.toUpperCase()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">{order.quantity} shares</div>
                            {order.price && (
                              <div className="text-sm text-muted-foreground">
                                @ {formatCurrency(order.price)}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <Badge variant={
                              order.status === 'filled' ? 'default' :
                              order.status === 'pending' ? 'secondary' :
                              order.status === 'cancelled' ? 'destructive' : 'outline'
                            }>
                              {order.status.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === 'history' && (
              <Card>
                <CardHeader>
                  <CardTitle>Transaction History</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedAccount.transactions.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Transactions</h3>
                      <p className="text-muted-foreground">
                        No transactions have been recorded yet.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {selectedAccount.transactions.slice(0, 20).map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div>
                              <h4 className="font-semibold">{transaction.symbol}</h4>
                              <p className="text-sm text-muted-foreground">
                                {transaction.type.toUpperCase()} - {transaction.description}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">{formatCurrency(transaction.amount)}</div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(transaction.timestamp).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === 'pnl' && (
              <AdvancedPnLDashboard
                account={selectedAccount}
                onRefresh={fetchAccounts}
                realTimeData={realTimeData}
              />
            )}

            
          </div>
        </div>
      )}

      {/* Create Account Modal */}
      {showCreateAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Create New Paper Trading Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Account Name</label>
                <input
                  type="text"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  className="w-full mt-1 p-2 border rounded-md bg-white text-gray-900 placeholder-gray-500 dark:bg-white dark:text-gray-900 dark:placeholder-gray-600"
                  placeholder="Enter account name"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowCreateAccount(false)}>
                  Cancel
                </Button>
                <Button onClick={createAccount} disabled={!newAccountName.trim()}>
                  Create Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Order Form Modal */}
      {showOrderForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Place New Order</span>
                  <Button variant="outline" size="sm" onClick={() => setShowOrderForm(false)}>
                    <XCircle className="w-4 h-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <label className="text-sm font-medium mb-2 block">Enter Stock Symbol</label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="e.g., AAPL, MSFT, GOOGL"
                      className="w-full p-2 border rounded-md bg-white text-gray-900 placeholder-gray-500 dark:bg-white dark:text-gray-900 dark:placeholder-gray-600"
                      value={selectedSymbol}
                      onChange={(e) => {
                        setSelectedSymbol(e.target.value.toUpperCase())
                        setSymbolValidationError(null)
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          validateStockSymbol(selectedSymbol).then((isValid) => {
                            if (isValid) {
                              // Symbol is valid, the TradingOrderForm will show automatically
                            }
                          })
                        }
                      }}
                    />
                    {validatingSymbol && (
                      <div className="flex items-center space-x-2 text-sm text-blue-600">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span>Validating stock symbol...</span>
                      </div>
                    )}
                    {symbolValidationError && (
                      <div className="text-sm text-red-600 bg-red-50 p-2 rounded-md">
                        {symbolValidationError}
                      </div>
                    )}
                    <div className="flex space-x-2">
                      <Button
                        onClick={async () => {
                          const isValid = await validateStockSymbol(selectedSymbol)
                          if (isValid) {
                            // Symbol is valid, the TradingOrderForm will show automatically
                          }
                        }}
                        disabled={!selectedSymbol.trim() || validatingSymbol}
                        className="flex-1"
                      >
                        {validatingSymbol ? 'Validating...' : 'Validate Symbol'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedSymbol('')
                          setSymbolValidationError(null)
                        }}
                        disabled={validatingSymbol}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                </div>
                
                {selectedSymbol && !symbolValidationError && !validatingSymbol && (
                  <TradingOrderForm
                    symbol={selectedSymbol}
                    accountId={selectedAccount?.id}
                    onOrderPlaced={handleOrderPlaced}
                    onCancel={() => setShowOrderForm(false)}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && accountToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Confirm Deletion</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Are you sure you want to delete account "{accountToDelete.name}"? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDeleteAccount} disabled={deletingAccount}>
                  {deletingAccount ? 'Deleting...' : 'Delete Account'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add to Portfolio Modal */}
      {ENABLE_ADD_TO_PORTFOLIO && (
        <Dialog open={showAddToPortfolioModal} onOpenChange={closeAddToPortfolioModal}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FolderPlus className="h-5 w-5" />
                Add to Portfolio Manager
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {selectedPosition && (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Position Details</h4>
                  <div className="text-sm">
                    <div>
                      <span className="text-muted-foreground">Symbol:</span>
                      <span className="ml-2 font-medium">{selectedPosition.symbol}</span>
                    </div>
                  </div>
                </div>
              )}

              {portfolioError && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">Error</span>
                  </div>
                  <p className="text-sm text-destructive/80 mt-1">{portfolioError}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <Label htmlFor="portfolio-select">Target Portfolio</Label>
                  <div className="flex gap-2 mt-1">
                    <Select
                      value={selectedPortfolioId}
                      onValueChange={setSelectedPortfolioId}
                      disabled={loadingPortfolios}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder={loadingPortfolios ? "Loading portfolios..." : "Select a portfolio"} />
                      </SelectTrigger>
                      <SelectContent>
                        {portfolios.map((portfolio) => (
                          <SelectItem key={portfolio.id} value={portfolio.id}>
                            {portfolio.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCreatePortfolio(true)}
                      disabled={loadingPortfolios}
                      className="px-3"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {portfolios.length === 0 && !loadingPortfolios && (
                    <p className="text-sm text-muted-foreground mt-1">
                      No portfolios found. Create one to continue.
                    </p>
                  )}
                </div>

                {showCreatePortfolio && (
                  <div className="border rounded-lg p-4 bg-muted/30">
                    <Label htmlFor="new-portfolio-name">Create New Portfolio</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="new-portfolio-name"
                        value={newPortfolioName}
                        onChange={(e) => setNewPortfolioName(e.target.value)}
                        placeholder="Enter portfolio name"
                        disabled={loadingPortfolios}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            createPortfolio()
                          }
                        }}
                      />
                      <Button
                        onClick={createPortfolio}
                        disabled={!newPortfolioName.trim() || loadingPortfolios}
                        size="sm"
                      >
                        {loadingPortfolios ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Create'
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowCreatePortfolio(false)
                          setNewPortfolioName('')
                        }}
                        size="sm"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="position-quantity">Quantity</Label>
                    <Input
                      id="position-quantity"
                      type="number"
                      value={positionQuantity}
                      onChange={(e) => setPositionQuantity(parseFloat(e.target.value) || 0)}
                      min="0"
                      step="1"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="position-avg-price">Average Price</Label>
                    <Input
                      id="position-avg-price"
                      type="number"
                      value={positionAveragePrice}
                      onChange={(e) => setPositionAveragePrice(parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="position-notes">Notes (Optional)</Label>
                  <Textarea
                    id="position-notes"
                    value={positionNotes}
                    onChange={(e) => setPositionNotes(e.target.value)}
                    placeholder="Add any notes about this position..."
                    className="mt-1"
                    rows={3}
                  />
                </div>

                {selectedPosition && positionQuantity > 0 && positionAveragePrice > 0 && (
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <h5 className="text-sm font-medium mb-2">Position Summary</h5>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span>Total Value:</span>
                        <span className="font-medium">{formatCurrency(positionQuantity * positionAveragePrice)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Symbol:</span>
                        <span className="font-medium">{selectedPosition.symbol}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Shares:</span>
                        <span className="font-medium">{positionQuantity.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={closeAddToPortfolioModal} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button
                onClick={addPositionToPortfolio}
                disabled={
                  !selectedPosition ||
                  !selectedPortfolioId ||
                  positionQuantity <= 0 ||
                  positionAveragePrice <= 0 ||
                  addingToPortfolio ||
                  loadingPortfolios
                }
                className="w-full sm:w-auto"
              >
                {addingToPortfolio ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Adding Position...
                  </>
                ) : (
                  <>
                    <FolderPlus className="h-4 w-4 mr-2" />
                    Add to Portfolio
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* AI Assistant */}
      {showAI && selectedAccount && (
        <PaperTradingAI
          account={selectedAccount}
          realTimeData={realTimeData}
          onClose={() => setShowAI(false)}
          allAccounts={accounts}
        />
      )}
    </div>
  )
}
