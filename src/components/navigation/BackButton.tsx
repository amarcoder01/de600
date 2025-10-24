'use client'

import React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const ROOT_PATHS = new Set<string>(['/', '/dashboard'])

interface BackButtonProps {
  className?: string
  buttonClassName?: string
  fallbackPath?: string
  tooltip?: string
  hideOnPaths?: string[]
  hideIfNoHistory?: boolean
}

export function BackButton({
  className,
  buttonClassName,
  fallbackPath = '/dashboard',
  tooltip = 'Back to dashboard',
  hideOnPaths = [],
  hideIfNoHistory = false,
}: BackButtonProps) {
  const router = useRouter()
  const pathname = usePathname()
  const shouldHide = React.useMemo(() => {
    if (!pathname) return false
    if (ROOT_PATHS.has(pathname)) return true
    return hideOnPaths.includes(pathname)
  }, [hideOnPaths, pathname])

  if (shouldHide) return null

  const canGoBack = typeof window !== 'undefined' && ((window.history?.state as any)?.idx ?? 0) > 0

  if (hideIfNoHistory && !canGoBack) return null

  const handleBack = () => {
    if (canGoBack) {
      router.back()
    } else {
      router.push(fallbackPath)
    }
  }

  return (
    <div className={className}>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              aria-label={tooltip}
              className={cn('h-8 w-8 p-0 transition-transform hover:scale-[1.03] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary/50', buttonClassName)}
            >
              <ArrowLeft className="w-4 h-4 transition-colors hover:text-primary" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
