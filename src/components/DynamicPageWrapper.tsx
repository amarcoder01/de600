'use client'

import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

interface DynamicPageWrapperProps {
  children: React.ReactNode
  loadingComponent?: React.ReactNode
}

const DefaultLoadingComponent = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p>Loading content...</p>
    </div>
  </div>
)

function DynamicPageWrapper({ children, loadingComponent }: DynamicPageWrapperProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return loadingComponent || <DefaultLoadingComponent />
  }

  return <>{children}</>
}

// This helper function can be used to wrap client-side components
// that might be rendered in a server-side context, forcing them to
// only hydrate on the client.
export const withDynamicClient = (Component: React.ComponentType<any>, loadingComponent?: React.ReactNode) => {
  return dynamic(() => Promise.resolve((props: any) => (
    <DynamicPageWrapper loadingComponent={loadingComponent}>
      <Component {...props} />
    </DynamicPageWrapper>
  )), { 
    ssr: false, 
    loading: () => (loadingComponent || <DefaultLoadingComponent />) as React.ReactElement
  })
}

export default DynamicPageWrapper