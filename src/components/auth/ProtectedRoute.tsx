'use client'

import React, { useEffect } from 'react'
import { useAuthStore } from '@/store'
import { useRouter } from 'next/navigation'

interface ProtectedRouteProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, checkAuth, authModalOpen } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Show fallback or redirect if not authenticated
  if (!isAuthenticated) {
    // If an auth modal is open (login/register), avoid redirecting
    if (authModalOpen) {
      return fallback ? <>{fallback}</> : null
    }
    if (fallback) {
      return <>{fallback}</>
    }
    
    // Default fallback - redirect to home page
    router.push('/')
    return null
  }

  // User is authenticated, show protected content
  return <>{children}</>
}
