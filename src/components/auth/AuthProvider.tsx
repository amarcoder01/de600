
import React, { useState, useEffect } from 'react'
import { useAuthStore } from '@/store'
import { LoginModal } from './LoginModal'
import { RegisterModal } from './RegisterModal'
import { UserMenu } from './UserMenu'
import { Button } from '@/components/ui/button'
import { LogIn, UserPlus } from 'lucide-react'

export function AuthProvider() {
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const { user, isAuthenticated, checkAuth } = useAuthStore()

  useEffect(() => {
    // Skip automatic auth check entirely to prevent interference with modal-based authentication
    // Let the parent components handle authentication checking when needed
    console.log('🔐 AuthProvider: Skipping automatic auth check to prevent interference')
  }, [checkAuth])

  const handleSwitchToRegister = () => {
    setShowLoginModal(false)
    setShowRegisterModal(true)
  }

  const handleSwitchToLogin = () => {
    setShowRegisterModal(false)
    setShowLoginModal(true)
  }

  // If user is authenticated, show user menu
  if (isAuthenticated && user) {
    return <UserMenu />
  }

  // If not authenticated, show auth buttons
  return (
    <>
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowLoginModal(true)}
          className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
        >
          <LogIn className="w-4 h-4" />
          <span className="hidden sm:inline">Sign In</span>
        </Button>
        
        <Button
          onClick={() => setShowRegisterModal(true)}
          size="sm"
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Sign Up</span>
        </Button>
      </div>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSwitchToRegister={handleSwitchToRegister}
      />

      {/* Register Modal */}
      <RegisterModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSwitchToLogin={handleSwitchToLogin}
      />
    </>
  )
}
