'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { 
  Settings, 
  Sun, 
  Moon, 
  Monitor,
  Menu
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { useUIStore, useSettingsStore } from '@/store'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { VidalityLogo } from '@/components/ui/VidalityLogo'
import { useRouter } from 'next/navigation'

export function Header() {
  const { theme, setTheme, setSidebarOpenMobile } = useUIStore()
  const { settings } = useSettingsStore()
  const router = useRouter()

  const handleThemeToggle = () => {
    const themes: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system']
    const currentIndex = themes.indexOf(theme)
    const nextIndex = (currentIndex + 1) % themes.length
    setTheme(themes[nextIndex])
  }

  const handleSettingsClick = () => {
    router.push('/settings')
  }

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="w-4 h-4" />
      case 'dark':
        return <Moon className="w-4 h-4" />
      default:
        return <Monitor className="w-4 h-4" />
    }
  }

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="h-16 bg-card border-b border-border flex items-center justify-between px-6"
    >
      {/* Left Section - Mobile menu + Logo */}
      <div className="flex items-center space-x-3">
        {/* Mobile hamburger */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden mr-1"
          aria-label="Open menu"
          onClick={() => setSidebarOpenMobile(true)}
        >
          <Menu className="w-5 h-5" />
        </Button>
        {/* Logo */}
        <VidalityLogo size="lg" className="cursor-pointer" />
      </div>

      {/* Right Section - Actions */}
      <div className="flex items-center space-x-3">
        <TooltipProvider delayDuration={0}>
        {/* Theme Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleThemeToggle}
              className="relative"
            >
              {getThemeIcon()}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center">
            Change Theme
          </TooltipContent>
        </Tooltip>

        {/* Settings */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSettingsClick}
            >
              <Settings className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center">
            Settings
          </TooltipContent>
        </Tooltip>
        </TooltipProvider>
        {/* Authentication */}
        <div className="flex items-center space-x-3 pl-3 border-l border-border">
          <AuthProvider />
        </div>
      </div>
    </motion.header>
  )
} 