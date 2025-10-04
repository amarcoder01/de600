'use client'

import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { useUIStore } from '@/store'
import { NetworkStatusBanner } from '@/components/network/NetworkStatusBanner'

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const { sidebarCollapsed } = useUIStore()

  useEffect(() => {
    console.log(' MainLayout: Component mounted')
  }, [])

  return (
    <div className="layout-container flex bg-background">
      {/* Non-intrusive network status banner (dashboard scope only) */}
      <NetworkStatusBanner />
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content Area */}
      <div className="main-content">
        {/* Header */}
        <Header />
        
        {/* Content */}
        <main className="main-content-scrollable">
          <div className="min-h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}