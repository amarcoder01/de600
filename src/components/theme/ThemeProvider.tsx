'use client'

import React, { useEffect, useState } from 'react'
import { useUIStore } from '@/store'

interface ThemeProviderProps {
  children: React.ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [mounted, setMounted] = useState(false)
  const { theme } = useUIStore()

  // Ensure component is mounted before applying theme
  useEffect(() => {
    setMounted(true)
  }, [])

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
