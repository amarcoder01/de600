'use client'

import React, { useEffect, useState } from 'react'
import { useUIStore } from '@/store'

interface ThemeProviderProps {
  children: React.ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [mounted, setMounted] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')

  // Ensure component is mounted before applying theme
  useEffect(() => {
    setMounted(true)
    
    // Initialize theme from store after mounting
    try {
      const { theme: storeTheme } = useUIStore.getState()
      setTheme(storeTheme)
    } catch (error) {
      console.warn('Could not access theme from store:', error)
    }
  }, [])

  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return

    const root = window.document.documentElement

    // Remove existing theme classes
    root.classList.remove('light', 'dark')

    // Apply the current theme
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      root.classList.add(systemTheme)
    } else {
      root.classList.add(theme)
    }
  }, [theme, mounted])

  // Listen for system theme changes when theme is set to 'system'
  useEffect(() => {
    if (!mounted || theme !== 'system' || typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = () => {
      const root = window.document.documentElement
      root.classList.remove('light', 'dark')
      const systemTheme = mediaQuery.matches ? 'dark' : 'light'
      root.classList.add(systemTheme)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme, mounted])

  // Always render children, but theme logic only runs after mounting
  return <>{children}</>
}
