import React from 'react'
import { cn } from '@/lib/utils'

interface VidalityLogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'minimal' | 'full'
  theme?: 'default' | 'onDark'
}

export function VidalityLogo({ 
  className, 
  size = 'md', 
  variant = 'default',
  theme = 'default'
}: VidalityLogoProps) {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl'
  }

  const baseClasses = cn(
    'font-bold tracking-tight select-none',
    sizeClasses[size],
    className
  )

  const textMainClass = theme === 'onDark' ? 'text-white' : 'text-gray-700 dark:text-gray-300'

  if (variant === 'minimal') {
    return (
      <div className={cn(baseClasses, 'flex items-center')}>
        <span className={cn(theme === 'onDark' ? 'text-pink-400' : 'text-pink-500')}>V</span>
        <span className={cn(textMainClass)}>idality</span>
      </div>
    )
  }

  if (variant === 'full') {
    return (
      <div className={cn(baseClasses, 'flex items-center space-x-1')}>
        {/* Sound wave elements */}
        <div className="flex items-end space-x-0.5">
          <div className={cn('w-0.5 h-2 rounded-full animate-pulse', theme === 'onDark' ? 'bg-pink-400' : 'bg-pink-500')} style={{ animationDelay: '0ms' }}></div>
          <div className={cn('w-0.5 h-3 rounded-full animate-pulse', theme === 'onDark' ? 'bg-pink-400' : 'bg-pink-500')} style={{ animationDelay: '150ms' }}></div>
          <div className={cn('w-0.5 h-1.5 rounded-full animate-pulse', theme === 'onDark' ? 'bg-pink-400' : 'bg-pink-500')} style={{ animationDelay: '300ms' }}></div>
        </div>
        
        {/* Logo text */}
        <div className="flex items-center">
          <span className={cn('relative', theme === 'onDark' ? 'text-pink-400' : 'text-pink-500')}>
            V
            {/* Decorative flourish */}
            <div className={cn('absolute -bottom-0.5 -left-0.5 w-1 h-1 rounded-full opacity-60', theme === 'onDark' ? 'bg-pink-400' : 'bg-pink-500')}></div>
          </span>
          <span className={cn(textMainClass)}>idality</span>
        </div>
      </div>
    )
  }

  // Default variant
  return (
    <div className={cn(baseClasses, 'flex items-center space-x-1')}>
      {/* Sound wave elements */}
      <div className="flex items-end space-x-0.5">
        <div className={cn('w-0.5 h-2 rounded-full animate-pulse', theme === 'onDark' ? 'bg-pink-400' : 'bg-pink-500')} style={{ animationDelay: '0ms' }}></div>
        <div className={cn('w-0.5 h-3 rounded-full animate-pulse', theme === 'onDark' ? 'bg-pink-400' : 'bg-pink-500')} style={{ animationDelay: '150ms' }}></div>
        <div className={cn('w-0.5 h-1.5 rounded-full animate-pulse', theme === 'onDark' ? 'bg-pink-400' : 'bg-pink-500')} style={{ animationDelay: '300ms' }}></div>
      </div>
      
      {/* Logo text */}
      <div className="flex items-center">
        <span className={cn('relative', theme === 'onDark' ? 'text-pink-400' : 'text-pink-500')}>
          V
          {/* Decorative flourish */}
          <div className={cn('absolute -bottom-0.5 -left-0.5 w-1 h-1 rounded-full opacity-60', theme === 'onDark' ? 'bg-pink-400' : 'bg-pink-500')}></div>
        </span>
        <span className={cn(textMainClass)}>idality</span>
      </div>
    </div>
  )
}

// Compact version for small spaces
export function VidalityLogoCompact({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center space-x-1', className)}>
      <div className="flex items-end space-x-0.5">
        <div className="w-0.5 h-1.5 bg-pink-500 rounded-full animate-pulse"></div>
        <div className="w-0.5 h-2 bg-pink-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
      </div>
      <span className="text-pink-500 font-bold text-lg">V</span>
    </div>
  )
}
