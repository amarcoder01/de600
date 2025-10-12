import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { 
  UIState, 
  UserSettings, 
  Watchlist, 
  Portfolio, 
  ChatSession,
  Stock,
  WatchlistItem,
  RealTimeData,
  Crypto,
  Forex,
  Commodity,
  PriceAlert,
  CreatePriceAlertRequest,
  PriceAlertHistory,
  User,
  AuthState,
  LoginCredentials,
  RegisterCredentials,
  AuthResponse
} from '@/types'
import { trackAuthEvent, setUserId } from '@/lib/telemetry'
import { AuthValidator } from '@/lib/auth-validation'

// UI Store
interface UIStore extends UIState {
  setSidebarCollapsed: (collapsed: boolean) => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setActiveTab: (tab: string) => void
  addNotification: (notification: Omit<UIState['notifications'][0], 'id' | 'timestamp'>) => void
  removeNotification: (id: string) => void
  markNotificationAsRead: (id: string) => void
  // Mobile-only UI state
  sidebarOpenMobile: boolean
  setSidebarOpenMobile: (open: boolean) => void
}

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      theme: 'system',
      activeTab: 'dashboard',
      notifications: [],
      // Mobile sidebar
      sidebarOpenMobile: false,
      
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setSidebarOpenMobile: (open) => set({ sidebarOpenMobile: open }),
      setTheme: (theme) => {
        set({ theme })
        // Apply theme immediately to DOM
        if (typeof window !== 'undefined') {
          const root = window.document.documentElement
          root.classList.remove('light', 'dark')
          if (theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
            root.classList.add(systemTheme)
          } else {
            root.classList.add(theme)
          }
        }
      },
      setActiveTab: (tab) => set({ activeTab: tab }),
      addNotification: (notification) => set((state) => ({
        notifications: [
          ...state.notifications,
          {
            ...notification,
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date(),
          }
        ]
      })),
      removeNotification: (id) => set((state) => ({
        notifications: state.notifications.filter(n => n.id !== id)
      })),
      markNotificationAsRead: (id) => set((state) => ({
        notifications: state.notifications.map(n => 
          n.id === id ? { ...n, read: true } : n
        )
      })),
    }),
    {
      name: 'ui-store',
      partialize: (state) => ({ 
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
        activeTab: state.activeTab,
      }),
      onRehydrateStorage: () => (state) => {
        // Apply theme immediately after rehydration
        if (state && typeof window !== 'undefined') {
          const root = window.document.documentElement
          root.classList.remove('light', 'dark')
          if (state.theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
            root.classList.add(systemTheme)
          } else {
            root.classList.add(state.theme)
          }
        }
      },
    }
  )
)

// Settings Store
interface SettingsStore {
  settings: UserSettings
  updateSettings: (settings: Partial<UserSettings>) => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: {
        theme: 'system',
        currency: 'USD',
        timezone: 'UTC',
        notifications: {
          priceAlerts: true,
          newsAlerts: true,
          orderUpdates: true,
        },
        chartSettings: {
          defaultTimeframe: '1D',
          defaultIndicators: ['SMA', 'EMA'],
          colorScheme: 'dark',
        },
      },
      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings }
      })),
    }),
    {
      name: 'settings-store'
    }
  )
)

// Watchlist Store
// IMPORTANT: This store is database-first and does NOT persist watchlist data
// - All watchlist data is fetched fresh from the database on each load
// - localStorage is only used for authentication tokens
// - The store acts as a cache for UI state, not data persistence
interface WatchlistStore {
  watchlists: Watchlist[]
  activeWatchlist: string | null
  isLoading: boolean
  isConnectedToRealTime: boolean
  isHydrated: boolean
  createWatchlist: (name: string) => Promise<void>
  addWatchlist: (watchlist: Watchlist) => void
  removeWatchlist: (id: string) => Promise<void>
  addToWatchlist: (watchlistId: string, item: WatchlistItem) => Promise<void>
  removeFromWatchlist: (watchlistId: string, itemId: string) => Promise<void>
  removeFromWatchlistBySymbol: (watchlistId: string, symbol: string, itemId: string) => Promise<void>
  updateWatchlistItem: (watchlistId: string, itemId: string, updates: Partial<WatchlistItem>) => void
  updateWatchlistItemPrice: (watchlistId: string, itemId: string, price: number, change: number, changePercent: number) => void
  setActiveWatchlist: (id: string | null) => void
  loadWatchlists: () => Promise<void>
  refreshWatchlistData: () => Promise<void>
  clearWatchlist: (watchlistId: string) => Promise<void>
  removeDuplicates: (watchlistId: string) => Promise<void>
  startRealTimeUpdates: () => void
  stopRealTimeUpdates: () => void
  updatePriceFromWebSocket: (symbol: string, price: number, change: number, changePercent: number) => void
  setHydrated: (hydrated: boolean) => void
  clearWatchlists: () => void
}

export const useWatchlistStore = create<WatchlistStore>()(
  persist(
    (set, get) => ({
      watchlists: [] as Watchlist[],
      activeWatchlist: null,
      isLoading: false,
      isConnectedToRealTime: false,
      isHydrated: false,
      
      loadWatchlists: async () => {
        set({ isLoading: true })
        try {
          // Check if we have a valid token in localStorage
          const token = localStorage.getItem('token')
          console.log('🔐 Watchlist Store: loadWatchlists called, localStorage token:', !!token)
          
          if (!token) {
            console.log('🔐 Watchlist Store: No token found, skipping watchlist load')
            set({ watchlists: [], isLoading: false })
            return
          }

          console.log('📡 Watchlist Store: Fetching fresh data from database...')
          
          const response = await fetch('/api/watchlist', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
          console.log('📡 Watchlist API response status:', response.status)
          
          if (response.status === 401) {
            console.log('🔐 Watchlist Store: Unauthorized (token expired), attempting token refresh...')
            
            try {
              // Try to refresh the token first
              const refreshResponse = await fetch('/api/auth/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
                // Refresh token is sent via HTTP-only cookie
              })
              
              if (refreshResponse.ok) {
                const refreshData = await refreshResponse.json()
                console.log('🔐 Watchlist Store: Token refreshed successfully, retrying request...')
                
                // Update localStorage with new token
                localStorage.setItem('token', refreshData.accessToken)
                
                // Retry the original request with new token
                const retryResponse = await fetch('/api/watchlist', {
                  headers: {
                    'Authorization': `Bearer ${refreshData.accessToken}`,
                    'Content-Type': 'application/json'
                  }
                })
                
                if (retryResponse.ok) {
                  const retryData = await retryResponse.json()
                  console.log('✅ Watchlist Store: Request succeeded after token refresh')
                  
                  if (retryData.success && retryData.data) {
                    set({ watchlists: retryData.data, isLoading: false })
                    console.log('✅ Watchlist Store: Fresh data loaded from database:', retryData.data)
                    return
                  }
                }
              }
            } catch (refreshError) {
              console.log('🔐 Watchlist Store: Token refresh failed:', refreshError)
            }
            
            // If refresh failed or retry failed, clear auth state and redirect
            console.log('🔐 Watchlist Store: Authentication failed, clearing state and redirecting...')
            localStorage.removeItem('token')
            document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
            document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
            
            set({ watchlists: [], isLoading: false })
            
            // Redirect to login page unless an auth modal is open
            if (typeof window !== 'undefined') {
              const authOpen = useAuthStore.getState().authModalOpen
              if (!authOpen) {
                window.location.href = '/login?message=session_expired'
              }
            }
            return
          }
          
          if (response.ok) {
            const responseData = await response.json()
            console.log('📊 Watchlist API response data:', responseData)
            
            if (responseData.success && responseData.data) {
              let watchlists = responseData.data
              
              // Always use fresh data from database - no localStorage for watchlist data
              set({ watchlists, isLoading: false })
              console.log('✅ Watchlist Store: Fresh data loaded from database:', watchlists)
            } else {
              console.error('❌ Invalid response format:', responseData)
              set({ isLoading: false })
            }
          } else {
            const errorData = await response.json().catch(() => ({}))
            console.error('❌ Failed to load watchlists:', {
              status: response.status,
              statusText: response.statusText,
              error: errorData
            })
            set({ isLoading: false })
          }
        } catch (error) {
          console.error('❌ Error loading watchlists:', error)
          set({ isLoading: false })
        }
      },

      // Refresh watchlist data from database to ensure synchronization
      refreshWatchlistData: async () => {
        set({ isLoading: true })
        try {
          console.log('🔄 Watchlist Store: Refreshing data from database...')
          
          // Clear local data first to ensure fresh fetch
          set({ watchlists: [] })
          
          // Always fetch fresh data from database
          await get().loadWatchlists()
          
          console.log('✅ Watchlist Store: Data refreshed from database successfully')
        } catch (error) {
          console.error('❌ Error refreshing watchlist data:', error)
        } finally {
          set({ isLoading: false })
        }
      },

      // Clear all items from a watchlist
      clearWatchlist: async (watchlistId: string) => {
        set({ isLoading: true })
        try {
          console.log(`🗑️ Clearing all items from watchlist ${watchlistId}...`)
          
          // Get current watchlist items
          const watchlist = get().watchlists.find(w => w.id === watchlistId)
          if (!watchlist) {
            throw new Error('Watchlist not found')
          }
          
          if (!watchlist.items || watchlist.items.length === 0) {
            console.log('⚠️ Watchlist is already empty')
            set({ isLoading: false })
            return
          }
          
          // Remove all items one by one with better error handling
          const removePromises = watchlist.items.map(async (item) => {
            try {
              console.log(`🗑️ Removing ${item.symbol} from watchlist...`)
              const response = await fetch(`/api/watchlist/${watchlistId}/items?symbol=${encodeURIComponent(item.symbol)}`, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                }
              })
              
              if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                console.warn(`⚠️ Failed to remove item ${item.symbol}:`, {
                  status: response.status,
                  statusText: response.statusText,
                  error: errorData
                })
                throw new Error(`Failed to remove ${item.symbol}: ${errorData.message || response.statusText}`)
              }
              
              console.log(`✅ Successfully removed ${item.symbol}`)
            } catch (error) {
              console.error(`❌ Error removing item ${item.symbol}:`, error)
              throw error // Re-throw to stop the process if any item fails
            }
          })
          
          await Promise.all(removePromises)
          
          // Update local state
          set((state) => ({
            watchlists: state.watchlists.map(w =>
              w.id === watchlistId
                ? { ...w, items: [], updatedAt: new Date() }
                : w
            ),
            isLoading: false
          }))
          
          console.log('✅ Watchlist cleared successfully')
        } catch (error) {
          console.error('❌ Error clearing watchlist:', error)
          set({ isLoading: false })
          throw error
        }
      },

      // Remove duplicate stocks from watchlist
      removeDuplicates: async (watchlistId: string) => {
        set({ isLoading: true })
        try {
          console.log(`🔍 Checking for duplicates in watchlist ${watchlistId}...`)
          
          const watchlist = get().watchlists.find(w => w.id === watchlistId)
          if (!watchlist) {
            throw new Error('Watchlist not found')
          }
          
          // Find duplicates by symbol
          const symbolCounts = new Map<string, WatchlistItem[]>()
          watchlist.items.forEach(item => {
            const symbol = item.symbol.toUpperCase()
            if (!symbolCounts.has(symbol)) {
              symbolCounts.set(symbol, [])
            }
            symbolCounts.get(symbol)!.push(item)
          })
          
          const duplicates = Array.from(symbolCounts.entries())
            .filter(([symbol, items]) => items.length > 1)
            .flatMap(([symbol, items]) => items.slice(1)) // Keep first, remove rest
          
          if (duplicates.length === 0) {
            console.log('✅ No duplicates found')
            set({ isLoading: false })
            return
          }
          
          console.log(`🗑️ Found ${duplicates.length} duplicate items to remove:`, duplicates.map(d => d.symbol))
          
          // Remove duplicates
          const removePromises = duplicates.map(async (item) => {
            try {
              const response = await fetch(`/api/watchlist/${watchlistId}/items?symbol=${encodeURIComponent(item.symbol)}`, {
                method: 'DELETE'
              })
              if (!response.ok) {
                console.warn(`⚠️ Failed to remove duplicate item ${item.symbol}`)
              }
            } catch (error) {
              console.error(`❌ Error removing duplicate item ${item.symbol}:`, error)
            }
          })
          
          await Promise.all(removePromises)
          
          // Update local state instead of refreshing from database to prevent loops
          set((state) => ({
            watchlists: state.watchlists.map(w =>
              w.id === watchlistId
                ? { ...w, updatedAt: new Date() }
                : w
            ),
            isLoading: false
          }))
          
          console.log('✅ Duplicates removed successfully')
        } catch (error) {
          console.error('❌ Error removing duplicates:', error)
          set({ isLoading: false })
          throw error
        }
      },
      
      createWatchlist: async (name: string) => {
        set({ isLoading: true })
        try {
          // Check if we have a valid token in localStorage
          const token = localStorage.getItem('token')
          if (!token) {
            console.log('🔐 Watchlist Store: No token found, cannot create watchlist')
            set({ isLoading: false })
            throw new Error('Authentication required to create watchlist')
          }

          console.log(`📝 Store: Creating watchlist "${name}"...`)
          
          const response = await fetch('/api/watchlist', {
            method: 'POST',
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ name })
          })
          
          console.log(`📡 Create watchlist API response status:`, response.status)
          
          if (response.ok) {
            const { data } = await response.json()
            console.log(`✅ Successfully created watchlist:`, data)
            
            set((state) => ({
              watchlists: [...state.watchlists, data],
              isLoading: false
            }))
            
            // Refresh watchlists to ensure we have the latest data
            await get().loadWatchlists()
          } else if (response.status === 401) {
            console.log('🔐 Watchlist Store: Unauthorized (token expired), attempting token refresh...')
            
            try {
              // Try to refresh the token first
              const refreshResponse = await fetch('/api/auth/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
                // Refresh token is sent via HTTP-only cookie
              })
              
              if (refreshResponse.ok) {
                const refreshData = await refreshResponse.json()
                console.log('🔐 Watchlist Store: Token refreshed successfully, retrying request...')
                
                // Update localStorage with new token
                localStorage.setItem('token', refreshData.accessToken)
                
                // Retry the original request with new token
                const retryResponse = await fetch('/api/watchlist', {
                  method: 'POST',
                  headers: { 
                    'Authorization': `Bearer ${refreshData.accessToken}`,
                    'Content-Type': 'application/json' 
                  },
                  body: JSON.stringify({ name })
                })
                
                if (retryResponse.ok) {
                  const retryData = await retryResponse.json()
                  console.log('✅ Watchlist Store: Create watchlist succeeded after token refresh')
                  
                  set((state) => ({
                    watchlists: [...state.watchlists, retryData.data],
                    isLoading: false
                  }))
                  
                  // Refresh watchlists to ensure we have the latest data
                  await get().loadWatchlists()
                  return
                }
              }
            } catch (refreshError) {
              console.log('🔐 Watchlist Store: Token refresh failed:', refreshError)
            }
            
            // If refresh failed or retry failed, clear auth state and throw error
            console.log('🔐 Watchlist Store: Authentication failed, clearing state...')
            localStorage.removeItem('token')
            document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
            document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
            
            set({ isLoading: false })
            throw new Error('Your session has expired. Please log in again.')
          } else {
            const errorData = await response.json().catch(() => ({}))
            console.error('❌ Failed to create watchlist:', {
              status: response.status,
              statusText: response.statusText,
              error: errorData
            })
            set({ isLoading: false })
            throw new Error(errorData.message || 'Failed to create watchlist')
          }
        } catch (error) {
          console.error('❌ Error creating watchlist:', error)
          set({ isLoading: false })
          throw error
        }
      },
      
      addWatchlist: (watchlist: Watchlist) => set((state: WatchlistStore) => ({
        watchlists: [...state.watchlists, {
          ...watchlist,
          updatedAt: new Date()
        }]
      })),
      
      removeWatchlist: async (id: string) => {
        set({ isLoading: true })
        try {
          const response = await fetch(`/api/watchlist/${id}`, {
            method: 'DELETE'
          })
          
          if (response.ok) {
            set((state) => ({
              watchlists: state.watchlists.filter(w => w.id !== id),
              isLoading: false
            }))
          } else {
            console.error('Failed to remove watchlist')
            set({ isLoading: false })
          }
        } catch (error) {
          console.error('Error removing watchlist:', error)
          set({ isLoading: false })
        }
      },
      
      addToWatchlist: async (watchlistId: string, item: WatchlistItem) => {
        set({ isLoading: true })
        try {
          console.log(`🔍 Store: Adding ${item.symbol} to watchlist ${watchlistId}...`)
          console.log(`📊 Item data:`, item)
          
          // Validate watchlistId
          if (!watchlistId || watchlistId === 'default') {
            throw new Error('Invalid watchlist ID. Please refresh the page and try again.')
          }
          
          const response = await fetch(`/api/watchlist/${watchlistId}/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              symbol: item.symbol,
              name: item.name,
              type: item.type,
              price: item.price,
              change: item.change,
              changePercent: item.changePercent,
              exchange: item.exchange,
              sector: item.sector,
              volume: item.volume,
              marketCap: item.marketCap,
            })
          })
          
          console.log(`📡 API Response status:`, response.status)
          
          if (response.ok) {
            const { data } = await response.json()
            console.log(`✅ API Response data:`, data)
            
            const newItem = { ...item, id: data.id, lastUpdated: new Date(data.lastUpdated) }
            
            set((state) => {
              const watchlist = state.watchlists.find(w => w.id === watchlistId)
              const isUpdate = watchlist?.items.some(existingItem => existingItem.symbol === item.symbol)
              
              console.log(`✅ Successfully ${isUpdate ? 'updated' : 'added'} ${item.symbol} to watchlist in store`)
              
              return {
                watchlists: state.watchlists.map(w =>
                  w.id === watchlistId
                    ? { 
                        ...w,
                        items: isUpdate
                          ? w.items.map(existingItem => 
                              existingItem.symbol === item.symbol ? newItem : existingItem
                            )
                          : [...w.items, newItem],
                        updatedAt: new Date()
                      }
                    : w
                ),
                isLoading: false
              }
            })
          } else {
            const errorData = await response.json().catch(() => ({}))
            console.error('❌ Failed to add item to watchlist:', {
              status: response.status,
              statusText: response.statusText,
              error: errorData
            })
            
            // Throw error with details for better error handling
            const errorMessage = errorData.message || errorData.error || response.statusText || 'Unknown error'
            console.error('❌ API Error details:', {
              status: response.status,
              message: errorMessage,
              fullError: errorData
            })
            throw new Error(`API Error ${response.status}: ${errorMessage}`)
          }
        } catch (error) {
          console.error('❌ Error adding item to watchlist:', error)
          set({ isLoading: false })
          // Re-throw the error so the component can handle it
          throw error
        }
      },
      
      removeFromWatchlist: async (watchlistId: string, itemId: string) => {
        set({ isLoading: true })
        try {
          // Get the item to find its symbol
          const watchlist = get().watchlists.find(w => w.id === watchlistId)
          const item = watchlist?.items.find(i => i.id === itemId)
          
          if (!item) {
            console.error('Item not found in watchlist:', { watchlistId, itemId })
            set({ isLoading: false })
            throw new Error('Item not found in watchlist')
          }
          
          console.log(`🗑️ Removing ${item.symbol} from watchlist ${watchlistId}...`)
          
          const response = await fetch(`/api/watchlist/${watchlistId}/items?symbol=${encodeURIComponent(item.symbol)}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            }
          })
          
          if (response.ok) {
            console.log(`✅ Successfully removed ${item.symbol} from watchlist`)
            set((state) => ({
              watchlists: state.watchlists.map(w =>
                w.id === watchlistId
                  ? {
                      ...w,
                      items: w.items.filter(i => i.id !== itemId),
                      updatedAt: new Date()
                    }
                  : w
              ),
              isLoading: false
            }))
          } else {
            const errorData = await response.json().catch(() => ({}))
            console.error('❌ Failed to remove item from watchlist:', {
              status: response.status,
              statusText: response.statusText,
              error: errorData
            })
            set({ isLoading: false })
            throw new Error(`Failed to remove item: ${errorData.message || response.statusText}`)
          }
        } catch (error) {
          console.error('❌ Error removing item from watchlist:', error)
          set({ isLoading: false })
          throw error
        }
      },

      // Remove from watchlist by symbol (more reliable approach)
      removeFromWatchlistBySymbol: async (watchlistId: string, symbol: string, itemId: string) => {
        set({ isLoading: true })
        try {
          console.log(`🗑️ Removing ${symbol} from watchlist ${watchlistId} by symbol...`)
          
          const response = await fetch(`/api/watchlist/${watchlistId}/items?symbol=${encodeURIComponent(symbol)}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            }
          })
          
          if (response.ok) {
            console.log(`✅ Successfully removed ${symbol} from watchlist`)
            set((state) => ({
              watchlists: state.watchlists.map(w =>
                w.id === watchlistId
                  ? {
                      ...w,
                      items: w.items.filter(i => i.id !== itemId),
                      updatedAt: new Date()
                    }
                  : w
              ),
              isLoading: false
            }))
          } else {
            const errorData = await response.json().catch(() => ({}))
            console.error('❌ Failed to remove item from watchlist:', {
              status: response.status,
              statusText: response.statusText,
              error: errorData
            })
            set({ isLoading: false })
            throw new Error(`Failed to remove item: ${errorData.message || response.statusText}`)
          }
        } catch (error) {
          console.error('❌ Error removing item from watchlist:', error)
          set({ isLoading: false })
          throw error
        }
      },
      
      updateWatchlistItem: (watchlistId: string, itemId: string, updates: Partial<WatchlistItem>) => set((state: WatchlistStore) => ({
        watchlists: state.watchlists.map(w =>
          w.id === watchlistId
            ? {
                ...w,
                items: w.items.map(i =>
                  i.id === itemId ? { ...i, ...updates, lastUpdated: new Date().toISOString() } : i
                ),
                updatedAt: new Date()
              }
            : w
        )
      })),
      
      updateWatchlistItemPrice: (watchlistId: string, itemId: string, price: number, change: number, changePercent: number) => set((state: WatchlistStore) => ({
        watchlists: state.watchlists.map(w =>
          w.id === watchlistId
            ? {
                ...w,
                items: w.items.map(i =>
                  i.id === itemId ? { 
                    ...i, 
                    price,
                    change,
                    changePercent,
                    lastUpdated: new Date().toISOString()
                  } : i
                ),
                updatedAt: new Date()
              }
            : w
        )
      })),
      
      setActiveWatchlist: (id: string | null) => set((state: WatchlistStore) => ({ activeWatchlist: id })),
      
      startRealTimeUpdates: () => {
        try {
          // Use dynamic import instead of require to avoid SSR issues
          import('@/lib/multi-source-api').then(({ getStockData }) => {
            // Set up periodic updates using multi-source system
            const allSymbols = get().watchlists.flatMap(w => w.items.map(item => item.symbol))
            
            if (allSymbols.length > 0) {
              // Start periodic updates every 30 seconds
              const updateInterval = setInterval(async () => {
                try {
                  for (const symbol of allSymbols) {
                    const freshData = await getStockData(symbol)
                    if (freshData && freshData.price > 0) {
                      get().updatePriceFromWebSocket(symbol, freshData.price, freshData.change, freshData.changePercent)
                    }
                  }
                } catch (error) {
                  console.error('Error in periodic update:', error)
                }
              }, 30000)
              
              set({ isConnectedToRealTime: true })
              
              // Store cleanup function for later use
              get().stopRealTimeUpdates = () => {
                clearInterval(updateInterval)
                set({ isConnectedToRealTime: false })
              }
            } else {
              set({ isConnectedToRealTime: false })
            }
          }).catch((error) => {
            console.error('Error importing multi-source API:', error)
            set({ isConnectedToRealTime: false })
          })
          
        } catch (error) {
          console.error('Error starting real-time updates:', error)
          set({ isConnectedToRealTime: false })
        }
      },
      
      stopRealTimeUpdates: () => {
        try {
          // The cleanup function is stored in startRealTimeUpdates
          set({ isConnectedToRealTime: false })
        } catch (error) {
          console.error('Error stopping real-time updates:', error)
          set({ isConnectedToRealTime: false })
        }
      },
      
      updatePriceFromWebSocket: (symbol: string, price: number, change: number, changePercent: number) => {
        set((state) => ({
          watchlists: state.watchlists.map(watchlist => ({
            ...watchlist,
            items: watchlist.items.map(item => 
              item.symbol === symbol 
                ? { 
                    ...item, 
                    price, 
                    change, 
                    changePercent, 
                    lastUpdated: new Date().toISOString() 
                  }
                : item
            )
          }))
        }))
      },
      
      setHydrated: (hydrated: boolean) => set({ isHydrated: hydrated }),

      clearWatchlists: () => {
        console.log('🗑️ Watchlist Store: Clearing all watchlist data')
        set({ 
          watchlists: [],
          activeWatchlist: null,
          isLoading: false,
          isConnectedToRealTime: false
        })
        // Note: This only clears the local store state
        // The actual data remains in the database
        // Use removeWatchlist() to delete from database
      }
    }),
    {
      name: 'watchlist-store',
      partialize: (state) => ({ 
        // Only persist UI state, not watchlist data
        activeWatchlist: state.activeWatchlist,
        isHydrated: state.isHydrated
        // watchlists array is NOT persisted - always fetch fresh from database
      }),
    }
  )
)

// Portfolio Store
interface PortfolioStore {
  portfolios: Portfolio[]
  activePortfolio: string | null
  addPortfolio: (portfolio: Omit<Portfolio, 'id' | 'createdAt' | 'updatedAt'>) => void
  removePortfolio: (id: string) => void
  addPosition: (portfolioId: string, position: Omit<Portfolio['positions'][0], 'id'>) => void
  removePosition: (portfolioId: string, positionId: string) => void
  updatePosition: (portfolioId: string, positionId: string, updates: Partial<Portfolio['positions'][0]>) => void
  setActivePortfolio: (id: string | null) => void
}

export const usePortfolioStore = create<PortfolioStore>()(
  persist(
    (set) => ({
      portfolios: [],
      activePortfolio: null,
      
      addPortfolio: (portfolio) => set((state) => ({
        portfolios: [
          ...state.portfolios,
          {
            ...portfolio,
            id: Math.random().toString(36).substr(2, 9),
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        ]
      })),
      removePortfolio: (id) => set((state) => ({
        portfolios: state.portfolios.filter(p => p.id !== id),
        activePortfolio: state.activePortfolio === id ? null : state.activePortfolio,
      })),
      addPosition: (portfolioId, position) => set((state) => ({
        portfolios: state.portfolios.map(p => 
          p.id === portfolioId 
            ? {
                ...p,
                positions: [
                  ...p.positions,
                  {
                    ...position,
                    id: Math.random().toString(36).substr(2, 9),
                  }
                ],
                updatedAt: new Date(),
              }
            : p
        )
      })),
      removePosition: (portfolioId, positionId) => set((state) => ({
        portfolios: state.portfolios.map(p => 
          p.id === portfolioId 
            ? {
                ...p,
                positions: p.positions.filter(pos => pos.id !== positionId),
                updatedAt: new Date(),
              }
            : p
        )
      })),
      updatePosition: (portfolioId, positionId, updates) => set((state) => ({
        portfolios: state.portfolios.map(p => 
          p.id === portfolioId 
            ? {
                ...p,
                positions: p.positions.map(pos => 
                  pos.id === positionId ? { ...pos, ...updates } : pos
                ),
                updatedAt: new Date(),
              }
            : p
        )
      })),
      setActivePortfolio: (id) => set({ activePortfolio: id }),
    }),
    {
      name: 'portfolio-store',
    }
  )
)

// Chat Store
interface ChatStore {
  sessions: ChatSession[]
  activeSession: string | null
  addSession: (session: Omit<ChatSession, 'id' | 'createdAt' | 'updatedAt'>) => void
  removeSession: (id: string) => void
  addMessage: (sessionId: string, message: Omit<ChatSession['messages'][0], 'id' | 'timestamp'>) => void
  setActiveSession: (id: string | null) => void
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set) => ({
      sessions: [],
      activeSession: null,
      
      addSession: (session) => set((state) => ({
        sessions: [
          ...state.sessions,
          {
            ...session,
            id: Math.random().toString(36).substr(2, 9),
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        ]
      })),
      removeSession: (id) => set((state) => ({
        sessions: state.sessions.filter(s => s.id !== id),
        activeSession: state.activeSession === id ? null : state.activeSession,
      })),
      addMessage: (sessionId, message) => set((state) => ({
        sessions: state.sessions.map(s => 
          s.id === sessionId 
            ? {
                ...s,
                messages: [
                  ...s.messages,
                  {
                    ...message,
                    id: Math.random().toString(36).substr(2, 9),
                    timestamp: new Date(),
                  }
                ],
                updatedAt: new Date(),
              }
            : s
        )
      })),
      setActiveSession: (id) => set({ activeSession: id }),
    }),
    {
      name: 'chat-store',
    }
  )
)

// Market Data Store
interface MarketDataStore {
  stocks: Stock[]
  cryptos: Crypto[]
  forex: Forex[]
  commodities: Commodity[]
  realTimeData: Record<string, RealTimeData>
  setStocks: (stocks: Stock[]) => void
  setCryptos: (cryptos: Crypto[]) => void
  setForex: (forex: Forex[]) => void
  setCommodities: (commodities: Commodity[]) => void
  updateRealTimeData: (data: RealTimeData) => void
}

export const useMarketDataStore = create<MarketDataStore>()(
  persist(
    (set) => ({
      stocks: [] as Stock[],
      cryptos: [] as Crypto[],
      forex: [] as Forex[],
      commodities: [] as Commodity[],
      realTimeData: {} as Record<string, RealTimeData>,
      
      setStocks: (stocks: Stock[]) => set({ stocks }),
      setCryptos: (cryptos: Crypto[]) => set({ cryptos }),
      setForex: (forex: Forex[]) => set({ forex }),
      setCommodities: (commodities: Commodity[]) => set({ commodities }),
      updateRealTimeData: (data: RealTimeData) => set((state) => ({
        realTimeData: {
          ...state.realTimeData,
          [data.symbol]: data
        }
      }))
    }),
    {
      name: 'market-data-store'
    }
  )
)

// News Store
interface NewsStore {
  news: any[]
  marketUpdates: any[]
  bookmarkedNews: any[]
  userBookmarks: Set<string>
  unreadCount: number
  isLoading: boolean
  lastFetch: Date | null
  fetchNews: () => Promise<void>
  fetchBookmarks: () => Promise<void>
  addBookmark: (newsItem: any) => Promise<boolean>
  removeBookmark: (newsId: string) => Promise<boolean>
  isBookmarked: (newsId: string) => boolean
  markAsRead: () => void
  incrementUnreadCount: () => void
}

export const useNewsStore = create<NewsStore>()(
  persist(
    (set, get) => ({
      news: [],
      marketUpdates: [],
      bookmarkedNews: [],
      userBookmarks: new Set<string>(),
      unreadCount: 0,
      isLoading: false,
      lastFetch: null,
      
      fetchNews: async () => {
        set({ isLoading: true })
        try {
          const [newsResponse, updatesResponse] = await Promise.all([
            fetch('/api/news?limit=15'),
            fetch('/api/news?type=market-updates&limit=5')
          ])
          
          const newsData = await newsResponse.json()
          const updatesData = await updatesResponse.json()
          
          if (newsData.success && updatesData.success) {
            set({ 
              news: newsData.data, 
              marketUpdates: updatesData.data,
              lastFetch: new Date(),
              unreadCount: Math.min(get().unreadCount + 5, 99) // Increment unread count for real news
            })
            console.log(`✅ News store updated: ${newsData.data.length} articles, ${updatesData.data.length} updates`)
          } else {
            console.warn('⚠️ News API returned partial data:', { newsData, updatesData })
            // Still update with available data
            if (newsData.success) {
              set({ 
                news: newsData.data, 
                lastFetch: new Date(),
                unreadCount: Math.min(get().unreadCount + 3, 99)
              })
            }
            if (updatesData.success) {
              set({ 
                marketUpdates: updatesData.data,
                lastFetch: new Date()
              })
            }
          }
        } catch (error) {
          console.error('❌ Error fetching news:', error)
          // Don't throw error, just log it and keep existing data
        } finally {
          set({ isLoading: false })
        }
      },
      
      fetchBookmarks: async () => {
        try {
          const token = localStorage.getItem('token')
          if (!token) {
            // Ensure userBookmarks is always a Set, even without token
            set({ userBookmarks: new Set<string>() })
            return
          }
          
          const response = await fetch('/api/news/bookmarks', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          
          if (response.status === 401) {
            console.warn('⚠️ Authentication failed for bookmarks, initializing empty Set')
            set({ userBookmarks: new Set<string>() })
            return
          }
          
          const data = await response.json()
          if (data.success && data.bookmarks) {
            const bookmarkIds = new Set<string>(data.bookmarks.map((item: any) => item.id as string))
            set({ 
              bookmarkedNews: data.bookmarks,
              userBookmarks: bookmarkIds
            })
          } else {
            // Fallback: ensure userBookmarks is always a Set
            set({ userBookmarks: new Set<string>() })
          }
        } catch (error) {
          console.error('❌ Error fetching bookmarks:', error)
          // Ensure userBookmarks is always a Set even on error
          set({ userBookmarks: new Set<string>() })
        }
      },
      
      addBookmark: async (newsItem: any) => {
        try {
          const token = localStorage.getItem('token')
          if (!token) return false
          
          const response = await fetch('/api/news/bookmarks', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              newsId: newsItem.id,
              title: newsItem.title,
              summary: newsItem.summary,
              source: newsItem.source,
              url: newsItem.url,
              publishedAt: newsItem.publishedAt,
              category: newsItem.category,
              sentiment: newsItem.sentiment,
              impact: newsItem.impact,
              symbols: newsItem.symbols || []
            })
          })
          
          const data = await response.json()
          if (data.success) {
            const currentBookmarks = get().userBookmarks
            // Ensure currentBookmarks is a valid Set
            const safeCurrentBookmarks = currentBookmarks instanceof Set ? currentBookmarks : new Set<string>()
            const newBookmarks = new Set<string>([...Array.from(safeCurrentBookmarks), newsItem.id])
            set({ 
              userBookmarks: newBookmarks,
              bookmarkedNews: [...get().bookmarkedNews, newsItem]
            })
            return true
          }
          return false
        } catch (error) {
          console.error('❌ Error adding bookmark:', error)
          return false
        }
      },
      
      removeBookmark: async (newsId: string) => {
        try {
          const token = localStorage.getItem('token')
          if (!token) return false
          
          const response = await fetch(`/api/news/bookmarks?newsId=${newsId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          
          const data = await response.json()
          if (data.success) {
            const currentBookmarks = get().userBookmarks
            // Ensure currentBookmarks is a valid Set
            const safeCurrentBookmarks = currentBookmarks instanceof Set ? currentBookmarks : new Set<string>()
            const newBookmarks = new Set<string>([...Array.from(safeCurrentBookmarks)])
            newBookmarks.delete(newsId)
            
            set({ 
              userBookmarks: newBookmarks,
              bookmarkedNews: get().bookmarkedNews.filter(item => item.id !== newsId)
            })
            return true
          }
          return false
        } catch (error) {
          console.error('❌ Error removing bookmark:', error)
          return false
        }
      },
      
      isBookmarked: (newsId: string) => {
        const userBookmarks = get().userBookmarks
        // Safety check: ensure userBookmarks is a Set and has the has method
        if (!userBookmarks || typeof userBookmarks.has !== 'function') {
          console.warn('⚠️ userBookmarks is not a valid Set, initializing new Set')
          set({ userBookmarks: new Set<string>() })
          return false
        }
        return userBookmarks.has(newsId)
      },
      
      markAsRead: () => set({ unreadCount: 0 }),
      
      incrementUnreadCount: () => set((state) => ({ 
        unreadCount: Math.min(state.unreadCount + 1, 99) 
      }))
    }),
    {
      name: 'news-store'
    }
  )
)

// Price Alert Store
interface PriceAlertStore {
  alerts: PriceAlert[]
  currentPrices: Record<string, {
    currentPrice: number | null
    priceChange: number | null
    priceChangePercent: number | null
    name: string | null
    lastUpdated: string | null
  }>
  schedulerStatus: {
    isActive: boolean
    intervalSeconds: number
    nextCheckTime: string | null
  }
  isLoading: boolean
  error: string | null
  createAlert: (alert: CreatePriceAlertRequest) => Promise<void>
  updateAlert: (id: string, updates: Partial<PriceAlert>) => Promise<void>
  deleteAlert: (id: string) => Promise<void>
  cancelAlert: (id: string) => Promise<void>
  loadAlerts: () => Promise<void>
  loadCurrentPrices: () => Promise<void>
  loadSchedulerStatus: () => Promise<void>
  startScheduler: () => Promise<void>
  stopScheduler: () => Promise<void>
  refreshAlerts: () => Promise<void>
  getActiveAlerts: () => PriceAlert[]
  getAlertHistory: (alertId: string) => Promise<PriceAlertHistory[]>
}

export const usePriceAlertStore = create<PriceAlertStore>()(
  persist(
    (set, get) => ({
      alerts: [],
      currentPrices: {},
      schedulerStatus: {
        isActive: false,
        intervalSeconds: 60,
        nextCheckTime: null
      },
      isLoading: false,
      error: null,
      
      createAlert: async (alertData: CreatePriceAlertRequest) => {
        set({ isLoading: true, error: null })
        try {
          const token = localStorage.getItem('token')
          const response = await fetch('/api/price-alerts', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify(alertData)
          })
          
          if (response.ok) {
            const { data } = await response.json()
            set((state) => ({
              alerts: [...state.alerts, data],
              isLoading: false
            }))
          } else {
            const errorData = await response.json()
            set({ 
              error: errorData.message || 'Failed to create alert',
              isLoading: false 
            })
            throw new Error(errorData.message || 'Failed to create alert')
          }
        } catch (error) {
          console.error('Error creating price alert:', error)
          set({ 
            error: error instanceof Error ? error.message : 'Failed to create alert',
            isLoading: false 
          })
          throw error
        }
      },
      
      updateAlert: async (id: string, updates: Partial<PriceAlert>) => {
        set({ isLoading: true, error: null })
        try {
          const token = localStorage.getItem('token')
          const response = await fetch(`/api/price-alerts/${id}`, {
            method: 'PUT',
            headers: { 
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify(updates)
          })
          
          if (response.ok) {
            const { data } = await response.json()
            set((state) => ({
              alerts: state.alerts.map(alert => 
                alert.id === id ? { ...alert, ...data } : alert
              ),
              isLoading: false
            }))
          } else {
            const errorData = await response.json()
            set({ 
              error: errorData.message || 'Failed to update alert',
              isLoading: false 
            })
            throw new Error(errorData.message || 'Failed to update alert')
          }
        } catch (error) {
          console.error('Error updating price alert:', error)
          set({ 
            error: error instanceof Error ? error.message : 'Failed to update alert',
            isLoading: false 
          })
          throw error
        }
      },
      
      deleteAlert: async (id: string) => {
        set({ isLoading: true, error: null })
        try {
          const token = localStorage.getItem('token')
          const response = await fetch(`/api/price-alerts/${id}`, {
            method: 'DELETE',
            headers: {
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
          })
          
          if (response.ok) {
            set((state) => ({
              alerts: state.alerts.filter(alert => alert.id !== id),
              isLoading: false
            }))
          } else {
            const errorData = await response.json()
            set({ 
              error: errorData.message || 'Failed to delete alert',
              isLoading: false 
            })
            throw new Error(errorData.message || 'Failed to delete alert')
          }
        } catch (error) {
          console.error('Error deleting price alert:', error)
          set({ 
            error: error instanceof Error ? error.message : 'Failed to delete alert',
            isLoading: false 
          })
          throw error
        }
      },
      
      cancelAlert: async (id: string) => {
        await get().updateAlert(id, { status: 'cancelled', isActive: false })
      },
      
      loadAlerts: async () => {
        set({ isLoading: true, error: null })
        try {
          const token = localStorage.getItem('token')
          const response = await fetch('/api/price-alerts', {
            headers: {
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
          })
          
          if (response.ok) {
            const { data } = await response.json()
            set({ alerts: data, isLoading: false })
            // Load current prices after loading alerts
            await get().loadCurrentPrices()
          } else {
            const errorData = await response.json()
            set({ 
              error: errorData.message || 'Failed to load alerts',
              isLoading: false 
            })
          }
        } catch (error) {
          console.error('Error loading price alerts:', error)
          set({ 
            error: error instanceof Error ? error.message : 'Failed to load alerts',
            isLoading: false 
          })
        }
      },

      loadCurrentPrices: async () => {
        try {
          const token = localStorage.getItem('token')
          const response = await fetch('/api/price-alerts/prices', {
            headers: {
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
          })
          
          if (response.ok) {
            const { data } = await response.json()
            const pricesMap: Record<string, any> = {}
            data.forEach((item: any) => {
              pricesMap[item.symbol] = {
                currentPrice: item.currentPrice,
                priceChange: item.priceChange,
                priceChangePercent: item.priceChangePercent,
                name: item.name,
                lastUpdated: item.lastUpdated
              }
            })
            set({ currentPrices: pricesMap })
          }
        } catch (error) {
          console.error('Failed to load current prices:', error)
        }
      },

      loadSchedulerStatus: async () => {
        try {
          const token = localStorage.getItem('token')
          const response = await fetch('/api/price-alerts/scheduler', {
            headers: {
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
          })
          
          if (response.ok) {
            const { data } = await response.json()
            set({ schedulerStatus: data })
          }
        } catch (error) {
          console.error('Failed to load scheduler status:', error)
        }
      },

      startScheduler: async () => {
        try {
          const token = localStorage.getItem('token')
          const response = await fetch('/api/price-alerts/scheduler', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ action: 'start' })
          })
          
          if (response.ok) {
            const { data } = await response.json()
            set({ schedulerStatus: data })
          } else {
            const errorData = await response.json()
            throw new Error(errorData.message || 'Failed to start scheduler')
          }
        } catch (error) {
          console.error('Error starting scheduler:', error)
          throw error
        }
      },

      stopScheduler: async () => {
        try {
          const token = localStorage.getItem('token')
          const response = await fetch('/api/price-alerts/scheduler', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ action: 'stop' })
          })
          
          if (response.ok) {
            const { data } = await response.json()
            set({ schedulerStatus: data })
          } else {
            const errorData = await response.json()
            throw new Error(errorData.message || 'Failed to stop scheduler')
          }
        } catch (error) {
          console.error('Error stopping scheduler:', error)
          throw error
        }
      },
      
      refreshAlerts: async () => {
        set({ isLoading: true })
        try {
          await get().loadAlerts()
        } finally {
          set({ isLoading: false })
        }
      },
      
      getActiveAlerts: () => {
        return get().alerts.filter(alert => alert.status === 'active' && alert.isActive)
      },
      
      getAlertHistory: async (alertId: string) => {
        try {
          const token = localStorage.getItem('token')
          const response = await fetch(`/api/price-alerts/${alertId}/history`, {
            headers: {
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
          })
          
          if (response.ok) {
            const { data } = await response.json()
            return data
          } else {
            console.error('Failed to load alert history')
            return []
          }
        } catch (error) {
          console.error('Error loading alert history:', error)
          return []
        }
      }
    }),
    {
      name: 'price-alert-store'
    }
  )
)

// Authentication Store
interface AuthStore extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>
  register: (credentials: RegisterCredentials) => Promise<void>
  logout: () => void
  clearError: () => void
  updateUser: (updates: Partial<User>) => void
  refreshToken: () => Promise<void>
  checkAuth: () => Promise<void>
  // UI coordination: whether any auth modal (login/register/forgot) is open
  authModalOpen: boolean
  setAuthModalOpen: (open: boolean) => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      token: null,
      authModalOpen: false,
      setAuthModalOpen: (open: boolean) => set({ authModalOpen: open }),
      
      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null })
        try {
          console.log('🔐 Auth Store: Attempting login...')
          
          // Track login attempt
          trackAuthEvent('login_attempt', true, {
            email: credentials.email,
            timestamp: new Date().toISOString()
          })
          
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials)
          })
          
          const data = await response.json()
          console.log('🔐 Auth Store: Login response:', { status: response.status, data })
          
          if (response.ok) {
            console.log('🔐 Auth Store: Login successful, setting user data...')
            
            // Handle both old and new API response formats
            const userData = data.data?.user || data.user
            const accessToken = data.data?.accessToken || data.accessToken
            
            console.log('🔐 Auth Store: Setting authentication state:', {
              user: userData,
              token: !!accessToken,
              isAuthenticated: true
            })
            
            set({
              user: userData,
              token: accessToken,
              isAuthenticated: true,
              isLoading: false,
              error: null
            })
            
            console.log('🔐 Auth Store: Authentication state set successfully')
            
            // Set user ID for telemetry
            setUserId(userData.id)
            
            // Store access token in localStorage (refresh token is in HTTP-only cookie)
            localStorage.setItem('token', accessToken)
            console.log('🔐 Auth Store: User authenticated successfully, isAuthenticated set to true')
            
            // Track successful login
            trackAuthEvent('login_success', true, {
              userId: userData.id,
              email: userData.email,
              timestamp: new Date().toISOString()
            })
            
            // Handle suspicious activity warning
            if (data.suspiciousActivity) {
              console.warn('Suspicious activity detected:', data.suspiciousReasons)
              trackAuthEvent('suspicious_activity', false, {
                userId: userData.id,
                reasons: data.suspiciousReasons,
                timestamp: new Date().toISOString()
              })
            }
          } else {
            // Handle different error types
            let errorMessage = data.error || data.message || 'Login failed'
            
            if (data.type === 'RATE_LIMIT_EXCEEDED') {
              const retryAfter = response.headers.get('Retry-After')
              errorMessage = `Too many login attempts. Please try again in ${retryAfter || '15 minutes'}.`
            } else if (data.type === 'ACCOUNT_LOCKED') {
              errorMessage = 'Account is temporarily locked due to multiple failed login attempts. Please try again later.'
            } else if (data.type === 'ACCOUNT_DISABLED') {
              errorMessage = 'This account has been disabled. Please contact support.'
            } else if (data.type === 'USER_NOT_FOUND' || response.status === 404) {
              // Specific message for unregistered email
              errorMessage = 'Email is not registered'
            } else if (data.type === 'INVALID_CREDENTIALS') {
              errorMessage = 'Invalid email or password'
            } else if (data.requiresEmailVerification) {
              // Handle email verification requirement
              errorMessage = data.error || 'Please verify your email address before signing in'
              
              console.error('🔐 Auth Store: Email verification required:', errorMessage)
              set({
                error: errorMessage,
                isLoading: false
              })
              
              // Track email verification requirement
              trackAuthEvent('email_verification_required', false, {
                email: credentials.email,
                userId: data.userId,
                timestamp: new Date().toISOString()
              })
              
              // Throw error with additional data for the UI to handle
              const emailVerificationError = new Error(errorMessage)
              ;(emailVerificationError as any).requiresEmailVerification = true
              ;(emailVerificationError as any).userId = data.userId
              ;(emailVerificationError as any).email = data.email
              throw emailVerificationError
            }
            
            console.error('🔐 Auth Store: Login failed:', errorMessage)
            set({
              error: errorMessage,
              isLoading: false
            })
            
            // Track failed login
            trackAuthEvent('login_failed', false, {
              email: credentials.email,
              reason: errorMessage,
              timestamp: new Date().toISOString()
            })
            
            throw new Error(errorMessage)
          }
        } catch (error) {
          console.error('🔐 Auth Store: Login error:', error)
          
          // Check if this is an email verification error that should be re-thrown with additional data
          if (error instanceof Error && (error as any).requiresEmailVerification) {
            throw error // Re-throw with the additional data intact
          }
          
          set({
            error: error instanceof Error ? error.message : 'Login failed',
            isLoading: false
          })
          throw error
        }
      },
      
      register: async (credentials: RegisterCredentials) => {
        set({ isLoading: true, error: null })
        try {
          // Preflight email validation (client-side guard before API)
          const emailCheck = AuthValidator.validateEmail(credentials.email)
          if (!emailCheck.success) {
            const errorMessage = emailCheck.message || 'Please enter a valid email address'
            set({ error: errorMessage, isLoading: false })
            trackAuthEvent('register_failed', false, {
              email: credentials.email,
              reason: errorMessage,
              timestamp: new Date().toISOString()
            })
            throw new Error(errorMessage)
          }

          // Sanitize email to normalized form
          const sanitizedEmail = emailCheck.data || credentials.email.toLowerCase().trim()
          const payload = { ...credentials, email: sanitizedEmail }

          // Track registration attempt
          trackAuthEvent('register_attempt', true, {
            email: sanitizedEmail,
            timestamp: new Date().toISOString()
          })
          
          const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
          
          const data = await response.json()
          console.log('🔐 Auth Store: Registration response:', { status: response.status, data })
          
          if (!response.ok) {
            // Handle error responses FIRST before any state changes
            let errorMessage = data.error || data.message || 'Registration failed'
            
            console.log('🔐 Auth Store: Registration failed:', { status: response.status, errorMessage })
            
            if (response.status === 409) {
              errorMessage = 'An account with this email already exists'
            } else if (data.type === 'VALIDATION_ERROR' && data.details?.errors) {
              // Format validation errors
              const errorDetails = Object.entries(data.details.errors)
                .map(([field, message]) => `${field}: ${message}`)
                .join(', ')
              errorMessage = `Validation failed: ${errorDetails}`
            } else if (data.type === 'RATE_LIMIT_EXCEEDED') {
              errorMessage = 'Too many registration attempts. Please try again later.'
            }
            
            // Set error state and loading false - DO NOT change authentication state
            set({
              error: errorMessage,
              isLoading: false
              // Don't change isAuthenticated, user, or token on registration failure
              // Don't clear tokens either - let the user stay in their current state
            })
            
            // Track failed registration
            trackAuthEvent('register_failed', false, {
              email: credentials.email,
              reason: errorMessage,
              timestamp: new Date().toISOString()
            })
            
            throw new Error(errorMessage)
          }
          
          // Only process successful registration AFTER confirming response.ok
          console.log('🔐 Auth Store: Registration successful, setting user data...')
          
          // Handle both old and new API response formats
          const userData = data.data?.user || data.user
          const accessToken = data.data?.accessToken || data.accessToken
          
          // Validate required data before setting authentication state
          if (!userData || !accessToken) {
            const errorMessage = 'Invalid registration response - missing user data or token'
            set({
              error: errorMessage,
              isLoading: false,
              isAuthenticated: false,
              user: null,
              token: null
            })
            throw new Error(errorMessage)
          }
          
          console.log('🔐 Auth Store: Setting registration authentication state:', {
            user: userData,
            token: !!accessToken,
            isAuthenticated: true
          })
          
          // Set successful authentication state
          set({
            user: userData,
            token: accessToken,
            isAuthenticated: true,
            isLoading: false,
            error: null
          })
          
          console.log('🔐 Auth Store: Registration authentication state set successfully')
          
          // Set user ID for telemetry
          setUserId(userData.id)
          
          // Store access token in localStorage (refresh token is in HTTP-only cookie)
          localStorage.setItem('token', accessToken)
          console.log('🔐 Auth Store: User registered successfully, isAuthenticated set to true')
          
          // Track successful registration
          trackAuthEvent('register_success', true, {
            userId: userData.id,
            email: userData.email,
            timestamp: new Date().toISOString()
          })
          
        } catch (error) {
          console.error('Registration error:', error)
          
          // Ensure authentication state is cleared on any error
          const errorMessage = error instanceof Error ? error.message : 'Registration failed'
          set({
            error: errorMessage,
            isLoading: false,
            isAuthenticated: false,  // Critical: ensure authentication is false
            user: null,
            token: null
          })
          
          // Clear localStorage token to prevent confusion
          localStorage.removeItem('token')
          
          // Clear any auth cookies from the client side as well
          document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
          document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
          
          throw error
        }
      },
      
      logout: async () => {
        try {
          console.log('🔐 Auth Store: Starting logout process...')
          
          // Track logout
          const currentUser = useAuthStore.getState().user
          if (currentUser) {
            trackAuthEvent('logout', true, {
              userId: currentUser.id,
              email: currentUser.email,
              timestamp: new Date().toISOString()
            })
          }
          
          // Call logout API to invalidate server-side session
          await fetch('/api/auth/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          })
          console.log('🔐 Auth Store: Server logout API called successfully')
        } catch (error) {
          console.error('Logout API error:', error)
          // Continue with logout even if API call fails
        }
        
        // Clear local state
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null
        })
        console.log('🔐 Auth Store: Local state cleared')
        
        // Clear localStorage
        localStorage.removeItem('token')
        console.log('🔐 Auth Store: localStorage cleared')
        
        // Clear token cookie by setting it to expire
        document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
        console.log('🔐 Auth Store: Cookies cleared')
        
        // Redirect to landing page with a small delay to ensure state is cleared
        if (typeof window !== 'undefined') {
          const authOpen = useAuthStore.getState().authModalOpen
          if (!authOpen) {
            console.log('🔐 Auth Store: Redirecting to landing page...')
            setTimeout(() => {
              window.location.href = '/'
            }, 100)
          }
        }
      },
      
      clearError: () => set({ error: null }),
      
      updateUser: (updates: Partial<User>) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null
      })),
      
      refreshToken: async () => {
        try {
          const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
            // Refresh token is sent via HTTP-only cookie
          })
          
          if (response.ok) {
            const data = await response.json()
            set({
              user: data.user,
              token: data.accessToken,
              isAuthenticated: true
            })
            
            // Update localStorage
            localStorage.setItem('token', data.accessToken)
            
            // Track token refresh
            trackAuthEvent('token_refresh', true, {
              userId: data.user.id,
              timestamp: new Date().toISOString()
            })
          } else {
            // Token is invalid, logout user
            trackAuthEvent('token_refresh_failed', false, {
              timestamp: new Date().toISOString()
            })
            useAuthStore.getState().logout()
          }
        } catch (error) {
          console.error('Token refresh error:', error)
          trackAuthEvent('token_refresh_error', false, {
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          })
          useAuthStore.getState().logout()
        }
      },
      
      checkAuth: async () => {
        console.log('🔐 Auth Store: checkAuth called')
        
        // First check if we have a token in localStorage
        const localToken = localStorage.getItem('token')
        console.log('🔐 Auth Store: Checking authentication, localStorage token exists:', !!localToken)
        
        // Check if we have a token cookie (set by API)
        const cookieToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('token='))
          ?.split('=')[1]
        console.log('🔐 Auth Store: Cookie token exists:', !!cookieToken)
        
        // Also check for a short-lived client-readable cookie set by OAuth bridge
        const cookieTokenClient = document.cookie
          .split('; ')
          .find(row => row.startsWith('token_client='))
          ?.split('=')[1]
        if (cookieTokenClient && !localToken) {
          // Migrate to localStorage for persistence and clear the helper cookie
          try {
            localStorage.setItem('token', cookieTokenClient)
            // Expire the helper cookie
            document.cookie = 'token_client=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
            console.log('🔐 Auth Store: Migrated token_client cookie to localStorage')
          } catch (e) {
            console.warn('🔐 Auth Store: Failed to migrate token_client to localStorage')
          }
        }
        
        // Use cookie token as the source of truth (since middleware uses it)
        const validToken = cookieToken || localToken || cookieTokenClient
        
        // If we have a token, validate it with the server before setting authenticated state
        const currentState = useAuthStore.getState()
        console.log('🔐 Auth Store: Current state:', {
          isAuthenticated: currentState.isAuthenticated,
          hasUser: !!currentState.user,
          hasToken: !!currentState.token
        })
        
        // If we already have a valid authentication state, don't re-check unnecessarily
        if (currentState.isAuthenticated && currentState.user && currentState.token) {
          console.log('🔐 Auth Store: Already authenticated, skipping re-check')
          return
        }
        
        if (validToken && !currentState.token) {
          console.log('🔐 Auth Store: Found token, validating with server...')
          
          try {
            // Validate token with server
            const response = await fetch('/api/auth/verify', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${validToken}`
              }
            })
            
            if (response.ok) {
              const data = await response.json()
              console.log('🔐 Auth Store: Token validation successful')
              set({ 
                token: validToken, 
                isAuthenticated: true,
                user: data.user,
                error: null
              })
              // Sync localStorage with cookie if needed
              if (cookieToken && cookieToken !== localToken) {
                localStorage.setItem('token', cookieToken)
              }
            } else {
              console.log('🔐 Auth Store: Token validation failed, clearing auth state')
              // Token is invalid, clear everything
              set({ isAuthenticated: false, user: null, token: null })
              localStorage.removeItem('token')
              document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
              document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
            }
          } catch (error) {
            console.error('🔐 Auth Store: Token validation error:', error)
            // Clear auth state on validation error
            set({ isAuthenticated: false, user: null, token: null })
            localStorage.removeItem('token')
            document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
            document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
          }
        }
        
        // If no token at all, only clear auth state if we were previously authenticated
        // This prevents clearing auth state when user is just on a public page
        if (!validToken) {
          const currentState = useAuthStore.getState()
          if (currentState.isAuthenticated) {
            console.log('🔐 Auth Store: No token found, clearing previous auth state')
            set({ isAuthenticated: false, user: null, token: null })
            localStorage.removeItem('token')
          } else {
            console.log('🔐 Auth Store: No token found, user already not authenticated')
          }
          return
        }
        
        // Only make the /api/auth/me call if we don't already have user data
        if (!currentState.user) {
          const tokenToUse = localToken || currentState.token
          
          try {
            console.log('🔐 Auth Store: Making auth check request...')
            const response = await fetch('/api/auth/me', {
              headers: { 'Authorization': `Bearer ${tokenToUse}` }
            })
            
            console.log('🔐 Auth Store: Auth check response status:', response.status)
            
            if (response.ok) {
              const data = await response.json()
              console.log('🔐 Auth Store: Auth check successful, user data:', data)
              set({
                user: data.user,
                token: tokenToUse,
                isAuthenticated: true
              })
              
              // Set user ID for telemetry
              setUserId(data.user.id)
              
              // Track successful auth check
              trackAuthEvent('auth_check_success', true, {
                userId: data.user.id,
                timestamp: new Date().toISOString()
              })
            } else {
              console.log('🔐 Auth Store: Auth check failed, logging out...')
              trackAuthEvent('auth_check_failed', false, {
                timestamp: new Date().toISOString()
              })
              get().logout()
            }
          } catch (error) {
            console.error('🔐 Auth Store: Auth check error:', error)
            trackAuthEvent('auth_check_error', false, {
              error: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date().toISOString()
            })
            get().logout()
          }
        }
        
        console.log('🔐 Auth Store: checkAuth completed')
      }
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)