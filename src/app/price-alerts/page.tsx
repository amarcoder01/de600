'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Bell, 
  Plus, 
  Trash2, 
  Edit, 
  Eye, 
  Phone, 
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Loader2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Settings,
  History,
  BarChart3
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { usePriceAlertStore } from '@/store'
import { toast } from 'sonner'
import { PriceAlert, CreatePriceAlertRequest } from '@/types'

export default function PriceAlertsPage() {
  const { 
    alerts, 
    currentPrices,
    isLoading, 
    error, 
    createAlert, 
    updateAlert, 
    deleteAlert, 
    cancelAlert, 
    loadAlerts, 
    loadCurrentPrices,
    refreshAlerts,
    getActiveAlerts,
    getAlertHistory
  } = usePriceAlertStore()

  const [activeTab, setActiveTab] = useState('active')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)
  const [selectedAlert, setSelectedAlert] = useState<PriceAlert | null>(null)
  const [alertHistory, setAlertHistory] = useState<any[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    triggered: 0,
    cancelled: 0
  })

  // Form state
  const [formData, setFormData] = useState<CreatePriceAlertRequest>({
    symbol: '',
    targetPrice: 0,
    condition: 'above',
    userEmail: ''
  })

  // Form validation state
  const [formErrors, setFormErrors] = useState<{
    symbol?: string
    targetPrice?: string
    userEmail?: string
  }>({})
  
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load alerts on component mount
  useEffect(() => {
    loadAlerts()
    loadStats()
  }, [loadAlerts])

  // Set up automatic price updates every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadCurrentPrices()
    }, 30000) // Update prices every 30 seconds

    return () => clearInterval(interval)
  }, [loadCurrentPrices])

  // Valid TLDs for email validation
  const validTLDs = new Set([
    'com', 'org', 'net', 'edu', 'gov', 'mil', 'int', 'info', 'biz', 'name', 'pro',
    'us', 'uk', 'ca', 'au', 'de', 'fr', 'it', 'es', 'nl', 'be', 'ch', 'at', 'se',
    'no', 'dk', 'fi', 'ie', 'pt', 'pl', 'cz', 'ru', 'ua', 'ro', 'gr', 'jp', 'cn',
    'kr', 'tw', 'hk', 'sg', 'my', 'th', 'vn', 'ph', 'id', 'in', 'pk', 'nz', 'mx',
    'br', 'ar', 'cl', 'co', 'pe', 've', 'io', 'ai', 'tv', 'me', 'cc', 'xyz', 'app',
    'dev', 'tech', 'online', 'site', 'store', 'shop', 'blog', 'cloud', 'email'
  ])

  // Email validation function - RFC 5322 compliant with TLD validation
  const validateEmail = (email: string): boolean => {
    // More comprehensive email validation
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    
    if (!emailRegex.test(email)) {
      return false
    }
    
    // Additional checks
    const parts = email.split('@')
    if (parts.length !== 2) return false
    
    const [localPart, domain] = parts
    
    // Check local part length (max 64 characters)
    if (localPart.length > 64 || localPart.length === 0) return false
    
    // Check domain part
    if (domain.length > 255 || domain.length === 0) return false
    
    // Check if domain has at least one dot
    if (!domain.includes('.')) return false
    
    // Check domain extension length and validity
    const domainParts = domain.split('.')
    const extension = domainParts[domainParts.length - 1].toLowerCase()
    
    if (extension.length < 2) return false
    
    // Validate TLD against known valid TLDs
    if (!validTLDs.has(extension)) return false
    
    return true
  }

  // Form validation function
  const validateForm = (): boolean => {
    const errors: typeof formErrors = {}
    let isValid = true

    // Validate symbol
    if (!formData.symbol || formData.symbol.trim() === '') {
      errors.symbol = 'Asset symbol is required'
      isValid = false
    } else if (formData.symbol.length > 10) {
      errors.symbol = 'Symbol must be 10 characters or less'
      isValid = false
    }

    // Validate target price
    if (!formData.targetPrice || formData.targetPrice <= 0) {
      errors.targetPrice = 'Target price must be greater than 0'
      isValid = false
    } else if (isNaN(formData.targetPrice)) {
      errors.targetPrice = 'Please enter a valid number'
      isValid = false
    }

    // Validate email
    if (!formData.userEmail || formData.userEmail.trim() === '') {
      errors.userEmail = 'Email address is required'
      isValid = false
    } else if (!validateEmail(formData.userEmail.trim())) {
      // Check if it's a TLD issue for better error message
      const parts = formData.userEmail.trim().split('@')
      if (parts.length === 2 && parts[1].includes('.')) {
        const domainParts = parts[1].split('.')
        const extension = domainParts[domainParts.length - 1].toLowerCase()
        if (!validTLDs.has(extension)) {
          errors.userEmail = `Invalid domain extension '.${extension}'. Please use a valid email domain (e.g., gmail.com, outlook.com)`
        } else {
          errors.userEmail = 'Please enter a valid email address (e.g., user@example.com)'
        }
      } else {
        errors.userEmail = 'Please enter a valid email address (e.g., user@example.com)'
      }
      isValid = false
    }

    setFormErrors(errors)
    return isValid
  }

  // Real-time field validation
  const validateField = (field: keyof typeof formErrors, value: any) => {
    const errors = { ...formErrors }

    switch (field) {
      case 'symbol':
        if (!value || value.trim() === '') {
          errors.symbol = 'Asset symbol is required'
        } else if (value.length > 10) {
          errors.symbol = 'Symbol must be 10 characters or less'
        } else {
          delete errors.symbol
        }
        break

      case 'targetPrice':
        if (!value || value <= 0) {
          errors.targetPrice = 'Target price must be greater than 0'
        } else if (isNaN(value)) {
          errors.targetPrice = 'Please enter a valid number'
        } else {
          delete errors.targetPrice
        }
        break

      case 'userEmail':
        if (!value || value.trim() === '') {
          errors.userEmail = 'Email address is required'
        } else if (!validateEmail(value.trim())) {
          // Check if it's a TLD issue
          const parts = value.trim().split('@')
          if (parts.length === 2 && parts[1].includes('.')) {
            const domainParts = parts[1].split('.')
            const extension = domainParts[domainParts.length - 1].toLowerCase()
            if (!validTLDs.has(extension)) {
              errors.userEmail = `Invalid domain extension '.${extension}'. Please use a valid email domain (e.g., gmail.com, outlook.com)`
            } else {
              errors.userEmail = 'Please enter a valid email address (e.g., user@example.com)'
            }
          } else {
            errors.userEmail = 'Please enter a valid email address (e.g., user@example.com)'
          }
        } else {
          delete errors.userEmail
        }
        break
    }

    setFormErrors(errors)
  }

  // Load statistics
  const loadStats = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const response = await fetch('/api/price-alerts/check', {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      })
      const data = await response.json()
      if (data.success) {
        setStats(data.data)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  // Handle form submission
  const handleCreateAlert = async () => {
    // Validate form before submission
    if (!validateForm()) {
      toast.error('Please fix the errors in the form')
      return
    }

    setIsSubmitting(true)
    
    try {
      await createAlert(formData)
      
      // Success: close dialog and reset form
      setShowCreateDialog(false)
      setFormData({
        symbol: '',
        targetPrice: 0,
        condition: 'above',
        userEmail: ''
      })
      setFormErrors({})
      toast.success('Price alert created successfully!')
      await loadStats()
      await loadAlerts()
      
    } catch (error: any) {
      // Handle specific error messages from the backend
      const errorMessage = error?.message || 'Failed to create price alert'
      
      // Show specific error messages for better UX
      if (errorMessage.includes('email')) {
        setFormErrors({ ...formErrors, userEmail: errorMessage })
        toast.error(errorMessage)
      } else if (errorMessage.includes('symbol')) {
        setFormErrors({ ...formErrors, symbol: errorMessage })
        toast.error(errorMessage)
      } else if (errorMessage.includes('price')) {
        setFormErrors({ ...formErrors, targetPrice: errorMessage })
        toast.error(errorMessage)
      } else if (errorMessage.includes('already have')) {
        // Duplicate alert error
        toast.error(errorMessage, { duration: 5000 })
      } else {
        toast.error(errorMessage)
      }
      
      console.error('Error creating price alert:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle alert deletion
  const handleDeleteAlert = async (alertId: string) => {
    try {
      await deleteAlert(alertId)
      toast.success('Price alert deleted successfully!')
      loadStats()
    } catch (error) {
      toast.error('Failed to delete price alert')
    }
  }

  // Handle alert cancellation
  const handleCancelAlert = async (alertId: string) => {
    try {
      await cancelAlert(alertId)
      toast.success('Price alert cancelled successfully!')
      loadStats()
    } catch (error) {
      toast.error('Failed to cancel price alert')
    }
  }

  // Load alert history
  const handleViewHistory = async (alert: PriceAlert) => {
    try {
      const history = await getAlertHistory(alert.id)
      setAlertHistory(history)
      setSelectedAlert(alert)
      setShowHistoryDialog(true)
    } catch (error) {
      toast.error('Failed to load alert history')
    }
  }

  // Manual price check
  const handleManualCheck = async () => {
    setIsRefreshing(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const response = await fetch('/api/price-alerts/check', { 
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      })
      const data = await response.json()
      
      if (data.success) {
        toast.success('Price check completed!')
        await refreshAlerts()
        await loadStats()
      } else {
        toast.error('Price check failed')
      }
    } catch (error) {
      toast.error('Failed to perform price check')
    } finally {
      setIsRefreshing(false)
    }
  }

  // Filter alerts by status
  const getFilteredAlerts = () => {
    switch (activeTab) {
      case 'active':
        return alerts.filter(alert => alert.status === 'active' && alert.isActive)
      case 'triggered':
        return alerts.filter(alert => alert.status === 'triggered')
      case 'cancelled':
        return alerts.filter(alert => alert.status === 'cancelled')
      default:
        return alerts
    }
  }

  const filteredAlerts = getFilteredAlerts()

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50 dark:bg-green-900/20'
      case 'triggered': return 'text-red-600 bg-red-50 dark:bg-red-900/20'
      case 'cancelled': return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20'
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20'
    }
  }

  const getConditionIcon = (condition: string) => {
    return condition === 'above' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />
  }



  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading price alerts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Price Alerts</h1>
          <p className="text-muted-foreground">
            Set up price alerts for your favorite assets and get notified instantly
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            💡 Automatic price checking runs every 5 minutes • Manual check available below
          </p>
        </div>
                 <div className="flex items-center space-x-2">
           <div className="flex items-center space-x-2 text-xs text-muted-foreground">
             <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
             <span>Auto-check: 5min</span>
           </div>
           <Button 
             variant="outline" 
             size="sm" 
             onClick={handleManualCheck}
             disabled={isRefreshing}
           >
             {isRefreshing ? (
               <>
                 <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                 Checking...
               </>
             ) : (
               <>
                 <RefreshCw className="w-4 h-4 mr-2" />
                 Check Prices
               </>
             )}
           </Button>
           <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Alert
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Price Alert</DialogTitle>
                <DialogDescription>
                  Set up a new price alert to get notified when your target is reached
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Asset Symbol <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g., BTC, ETH, AAPL"
                    value={formData.symbol}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase()
                      setFormData({ ...formData, symbol: value })
                      validateField('symbol', value)
                    }}
                    onBlur={() => validateField('symbol', formData.symbol)}
                    className={formErrors.symbol ? 'border-red-500 focus:border-red-500' : ''}
                  />
                  {formErrors.symbol && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {formErrors.symbol}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Target Price <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.targetPrice || ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0
                      setFormData({ ...formData, targetPrice: value })
                      validateField('targetPrice', value)
                    }}
                    onBlur={() => validateField('targetPrice', formData.targetPrice)}
                    className={formErrors.targetPrice ? 'border-red-500 focus:border-red-500' : ''}
                  />
                  {formErrors.targetPrice && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {formErrors.targetPrice}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Condition <span className="text-red-500">*</span>
                  </label>
                  <Select value={formData.condition} onValueChange={(value: 'above' | 'below') => setFormData({ ...formData, condition: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="above">Price Above</SelectItem>
                      <SelectItem value="below">Price Below</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={formData.userEmail}
                    onChange={(e) => {
                      const value = e.target.value
                      setFormData({ ...formData, userEmail: value })
                      // Only validate on blur to avoid annoying users while typing
                      if (value.includes('@') && value.includes('.')) {
                        validateField('userEmail', value)
                      }
                    }}
                    onBlur={() => validateField('userEmail', formData.userEmail)}
                    className={formErrors.userEmail ? 'border-red-500 focus:border-red-500' : ''}
                  />
                  {formErrors.userEmail && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {formErrors.userEmail}
                    </p>
                  )}
                  {!formErrors.userEmail && formData.userEmail && validateEmail(formData.userEmail) && (
                    <p className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Valid email format
                    </p>
                  )}
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowCreateDialog(false)
                      setFormErrors({})
                      setFormData({
                        symbol: '',
                        targetPrice: 0,
                        condition: 'above',
                        userEmail: ''
                      })
                    }}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateAlert}
                    disabled={isSubmitting || Object.keys(formErrors).length > 0}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Alert'
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>


       {/* Statistics Cards */}
       <motion.div
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         className="grid grid-cols-1 md:grid-cols-4 gap-4"
       >
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Bell className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Alerts</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Triggered</p>
                <p className="text-2xl font-bold">{stats.triggered}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-sm text-muted-foreground">Cancelled</p>
                <p className="text-2xl font-bold">{stats.cancelled}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Alerts Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="active">Active ({stats.active})</TabsTrigger>
          <TabsTrigger value="triggered">Triggered ({stats.triggered})</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled ({stats.cancelled})</TabsTrigger>
          <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-6">
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No {activeTab} alerts</h3>
              <p className="text-muted-foreground">
                {activeTab === 'active' ? 'Create your first price alert to get started' : `No ${activeTab} alerts found`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredAlerts.map((alert) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -2 }}
                  className="group"
                >
                  <Card className="h-full hover:shadow-lg transition-all duration-200">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                                                     <div className="flex items-center space-x-2 mb-2">
                             <Badge className={getStatusColor(alert.status)}>
                               {alert.status.toUpperCase()}
                             </Badge>
                             <Badge variant="outline" className="flex items-center space-x-1">
                               {getConditionIcon(alert.condition)}
                               <span>{alert.condition.toUpperCase()}</span>
                             </Badge>
                           </div>
                          <CardTitle className="text-lg mb-2 group-hover:text-primary transition-colors">
                            {alert.symbol}
                          </CardTitle>
                          <CardDescription className="text-sm">
                            Target: ${alert.targetPrice.toFixed(2)}
                          </CardDescription>
                          {currentPrices[alert.symbol] && (
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Current:</span>
                                <span className={`font-semibold ${
                                  currentPrices[alert.symbol]?.currentPrice && 
                                  currentPrices[alert.symbol]?.currentPrice! > alert.targetPrice 
                                    ? 'text-green-600' 
                                    : 'text-red-600'
                                }`}>
                                  ${currentPrices[alert.symbol]?.currentPrice?.toFixed(2) || 'N/A'}
                                </span>
                              </div>
                              {currentPrices[alert.symbol]?.priceChangePercent && (
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">Change:</span>
                                  <span className={`font-medium ${
                                    currentPrices[alert.symbol]?.priceChangePercent! > 0 
                                      ? 'text-green-600' 
                                      : 'text-red-600'
                                  }`}>
                                    {currentPrices[alert.symbol]?.priceChangePercent! > 0 ? '+' : ''}
                                    {currentPrices[alert.symbol]?.priceChangePercent?.toFixed(2)}%
                                  </span>
                                </div>
                              )}
                              {currentPrices[alert.symbol]?.lastUpdated && (
                                <div className="text-xs text-muted-foreground">
                                                                      Updated: {currentPrices[alert.symbol]?.lastUpdated ? new Date(currentPrices[alert.symbol]?.lastUpdated!).toLocaleTimeString() : 'N/A'}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewHistory(alert)}
                            title="View History"
                          >
                            <History className="w-4 h-4" />
                          </Button>
                          {alert.status === 'active' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCancelAlert(alert.id)}
                                title="Cancel Alert"
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteAlert(alert.id)}
                                title="Delete Alert"
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                                         <CardContent className="space-y-4">
                       <div className="flex items-center justify-between text-sm">
                         <span className="text-muted-foreground">Email:</span>
                         <span className="font-medium">{alert.userEmail}</span>
                       </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Created:</span>
                        <span>{new Date(alert.createdAt).toLocaleDateString()}</span>
                      </div>
                      {alert.lastChecked && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Last Checked:</span>
                          <span>{new Date(alert.lastChecked).toLocaleString()}</span>
                        </div>
                      )}
                      {alert.triggeredAt && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Triggered:</span>
                          <span>{new Date(alert.triggeredAt).toLocaleString()}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Alert History</DialogTitle>
            <DialogDescription>
              History for {selectedAlert?.symbol} price alert
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {alertHistory.length === 0 ? (
              <p className="text-muted-foreground">No history available</p>
            ) : (
              <div className="space-y-2">
                {alertHistory.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        entry.action === 'triggered' ? 'bg-red-500' :
                        entry.action === 'created' ? 'bg-green-500' :
                        entry.action === 'cancelled' ? 'bg-gray-500' : 'bg-blue-500'
                      }`} />
                      <div>
                        <p className="font-medium capitalize">{entry.action}</p>
                        <p className="text-sm text-muted-foreground">{entry.message}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {entry.price ? `$${entry.price.toFixed(2)}` : '-'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(entry.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
