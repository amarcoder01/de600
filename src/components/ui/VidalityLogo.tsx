import React from 'react'
import { cn } from '@/lib/utils'

interface VidalityLogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'minimal' | 'full'
}

export function VidalityLogo({ 
  className, 
  size = 'md', 
  variant = 'default' 
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

  if (variant === 'minimal') {
    return (
      <div className={cn(baseClasses, 'flex items-center')}>
        <span className="text-pink-500">V</span>
        <span className="text-gray-700 dark:text-gray-300">idality</span>
      </div>
    )
  }

  if (variant === 'full') {
    return (
      <div className={cn(baseClasses, 'flex items-center space-x-1')}>
        {/* Sound wave elements */}
        <div className="flex items-end space-x-0.5">
          <div className="w-0.5 h-2 bg-pink-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
          <div className="w-0.5 h-3 bg-pink-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
          <div className="w-0.5 h-1.5 bg-pink-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
        </div>
        
        {/* Logo text */}
        <div className="flex items-center">
          <span className="text-pink-500 relative">
            V
            {/* Decorative flourish */}
            <div className="absolute -bottom-0.5 -left-0.5 w-1 h-1 bg-pink-500 rounded-full opacity-60"></div>
          </span>
          <span className="text-gray-700 dark:text-gray-300">idality</span>
        </div>
      </div>
    )
  }

  // Default variant
  return (
    <div className={cn(baseClasses, 'flex items-center space-x-1')}>
      {/* Sound wave elements */}
      <div className="flex items-end space-x-0.5">
        <div className="w-0.5 h-2 bg-pink-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
        <div className="w-0.5 h-3 bg-pink-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
        <div className="w-0.5 h-1.5 bg-pink-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
      </div>
      
      {/* Logo text */}
      <div className="flex items-center">
        <span className="text-pink-500 relative">
          V
          {/* Decorative flourish */}
          <div className="absolute -bottom-0.5 -left-0.5 w-1 h-1 bg-pink-500 rounded-full opacity-60"></div>
        </span>
        <span className="text-gray-700 dark:text-gray-300">idality</span>
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
