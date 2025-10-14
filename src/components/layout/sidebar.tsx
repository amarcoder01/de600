'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter, usePathname } from 'next/navigation'
import { 
  Eye, 
  ChevronLeft, 
  ChevronRight,
  Home,
  Bot,
  Globe,
  Search,
  BarChart3,
  Play,
  Wrench,
  TrendingUp,
  TrendingDown,
  Building2,
  Filter,
  Brain,
  DollarSign,
  BrainCircuit,
  Target,
  Newspaper,
  Bell
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store'
import { Button } from '@/components/ui/button'
import { VidalityLogo, VidalityLogoCompact } from '@/components/ui/VidalityLogo'

interface SidebarItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  description?: string
}

export function Sidebar() {
  const { sidebarCollapsed, setSidebarCollapsed, sidebarOpenMobile, setSidebarOpenMobile } = useUIStore()
  const router = useRouter()
  const pathname = usePathname()

  const sidebarItems: SidebarItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      href: '/dashboard',
      description: 'Trading overview and analytics'
    },
    {
      id: 'market-view',
      label: 'Market',
      icon: Building2,
      href: '/market-view',
      description: 'Browse and search stocks'
    },
    {
      id: 'news',
      label: 'News',
      icon: Newspaper,
      href: '/news',
      description: 'Real-time market news and updates'
    },
    {
      id: 'top-movers',
      label: 'Top Movers',
      icon: TrendingDown,
      href: '/top-movers',
      description: 'Top gainers and losers'
    },
    {
      id: 'screener',
      label: 'Screener',
      icon: Filter,
      href: '/screener',
      description: 'Advanced stock screening'
    },
    {
      id: 'watchlist',
      label: 'Watchlist',
      icon: Eye,
      href: '/watchlist',
      description: 'Track favorite assets'
    },
    {
      id: 'price-alerts',
      label: 'Alerts',
      icon: Bell,
      href: '/price-alerts',
      description: 'Price alerts and notifications'
    },
    {
      id: 'paper-trading',
      label: 'Paper Trading',
      icon: Play,
      href: '/paper-trading',
      description: 'Practice with virtual money'
    },
    {
      id: 'treadgpt',
      label: 'TradeGPT',
      icon: Bot,
      href: '/treadgpt',
      description: 'AI trading assistant'
    },
    {
      id: 'backtesting',
      label: 'Backtesting',
      icon: BarChart3,
      href: '/backtesting',
      description: 'Strategy backtesting'
    },
    {
      id: 'ai-predictions',
      label: 'AI Predictions',
      icon: Brain,
      href: '/ai-predictions',
      description: 'Market predictions'
    },
    {
      id: 'portfolio-manager',
      label: 'Portfolio',
      icon: DollarSign,
      href: '/portfolio-manager',
      description: 'Portfolio management'
    },
    {
      id: 'strategy-builder',
      label: 'Strategy Builder',
      icon: BrainCircuit,
      href: '/strategy-builder',
      description: 'Create trading strategies'
    },
    {
      id: 'stock-comparison',
      label: 'Comparison',
      icon: Target,
      href: '/stock-comparison',
      description: 'Compare stocks'
    },
    {
      id: 'advanced-charts',
      label: 'Charts',
      icon: TrendingUp,
      href: '/advanced-charts',
      description: 'Professional charting'
    }
  ]

  const handleItemClick = (href: string) => {
    router.push(href)
    // Close mobile sidebar after navigation
    setSidebarOpenMobile(false)
  }

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity',
          sidebarOpenMobile ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setSidebarOpenMobile(false)}
        aria-hidden="true"
      />
      {/* Desktop sidebar */}
      <motion.div
        initial={false}
        animate={{ width: sidebarCollapsed ? 70 : 280 }}
        className="hidden md:flex sidebar-container bg-card border-r border-border"
      >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
        <AnimatePresence mode="wait">
          {!sidebarCollapsed ? (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex items-center space-x-2"
            >
              <VidalityLogo size="md" />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center justify-center"
            >
              <VidalityLogoCompact />
            </motion.div>
          )}
        </AnimatePresence>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="ml-auto"
        >
          {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {/* Navigation Items */}
      <nav className="sidebar-content py-4">
        <div className="space-y-1 px-3">
          {sidebarItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            
            return (
              <motion.div
                key={item.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <button
                  onClick={() => handleItemClick(item.href)}
                  className={cn(
                    "w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <Icon className={cn(
                    "w-5 h-5 transition-colors",
                    isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                  )} />
                  
                  <AnimatePresence mode="wait">
                    {!sidebarCollapsed && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="flex-1 flex items-center justify-between"
                      >
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{item.label}</span>
                          {item.description && (
                            <span className="text-xs text-muted-foreground/70 truncate max-w-[180px]">
                              {item.description}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </motion.div>
            )
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border flex-shrink-0">
        <AnimatePresence mode="wait">
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="text-center"
            >
              <p className="text-xs text-muted-foreground">
                TradingPro Platform
              </p>
              <p className="text-xs text-muted-foreground/70">
                v1.0.0
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </motion.div>
      {/* Mobile drawer */}
      <div
        className={cn(
          'md:hidden fixed top-0 left-0 h-full w-72 bg-card border-r border-border z-50 transform transition-transform duration-300 ease-in-out',
          sidebarOpenMobile ? 'translate-x-0' : '-translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
          <VidalityLogo size="md" />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpenMobile(false)}
            className="ml-auto"
            aria-label="Close menu"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>
        {/* Navigation Items (mobile) */}
        <nav className="py-4 overflow-y-auto h-[calc(100%-64px)]">
          <div className="space-y-1 px-3">
            {sidebarItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.href)}
                  className={cn(
                    'w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}
                >
                  <Icon className={cn('w-5 h-5', isActive ? 'text-primary-foreground' : 'text-muted-foreground')} />
                  <span className="font-medium">{item.label}</span>
                </button>
              )
            })}
          </div>
        </nav>
      </div>
    </>
  )
}