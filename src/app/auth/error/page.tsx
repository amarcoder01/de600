'use client'

import React from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { AlertTriangle, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams?.get('error')

  const getErrorMessage = (error: string | null | undefined) => {
    switch (error) {
      case 'Configuration':
        return 'There is a problem with the server configuration.'
      case 'AccessDenied':
        return 'Access denied. You do not have permission to sign in.'
      case 'Verification':
        return 'The verification token has expired or has already been used.'
      case 'Default':
        return 'An error occurred during authentication.'
      case 'NoSession':
        return 'No session found. Please try signing in again.'
      case 'UserNotFound':
        return 'User account not found. Please contact support.'
      case 'CallbackError':
        return 'An error occurred during the sign-in process. Please try again.'
      case 'OAuthAccountNotLinked':
        return 'This email is already registered with a different sign-in method. Please use your existing sign-in method or contact support.'
      case 'OAuthSignin':
        return 'Error occurred during Google sign-in. Please try again.'
      case 'OAuthCallback':
        return 'Error occurred during Google authentication callback. Please try again.'
      case 'OAuthCreateAccount':
        return 'Error occurred while creating your account. Please try again.'
      case 'EmailCreateAccount':
        return 'Error occurred while creating your account. Please try again.'
      case 'Callback':
        return 'Error occurred during authentication. Please try again.'
      case 'OAuthAccountNotLinked':
        return 'This email is already registered with another account. Please use your existing sign-in method.'
      default:
        return `Authentication error: ${error || 'Unknown error'}. Please try again.`
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Authentication Error
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              {getErrorMessage(error)}
            </p>
            
            <div className="space-y-3">
              <Link href="/login">
                <Button className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Sign In
                </Button>
              </Link>
              
              <Link href="/">
                <Button variant="outline" className="w-full">
                  Go to Homepage
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
