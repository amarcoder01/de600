'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'

interface DynamicPageWrapperProps {
  children: React.ReactNode
}

// Force dynamic rendering to prevent static generation issues
export function DynamicPageWrapper({ children }: DynamicPageWrapperProps) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      {children}
    </Suspense>
  )
}

// Export a dynamic version that forces client-side rendering
export const DynamicPage = dynamic(() => Promise.resolve(DynamicPageWrapper), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading...</p>
      </div>
    </div>
  )
})
