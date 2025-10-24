'use client'

import React, { useState } from 'react'
import { 
  Lock, 
  Eye,
  EyeOff,
  Save
} from 'lucide-react'
import { useAuthStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BackButton } from '@/components/navigation/BackButton'

export function SecurityPage() {
  const { user } = useAuthStore()
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [validationInfo, setValidationInfo] = useState<{ requirements?: string[]; feedback?: string[]; suggestions?: string[] }>({})
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">User not found</p>
        </div>
      </div>
    )
  }

  const handlePasswordChange = async () => {
    // Clear previous messages
    setError(null)
    setSuccess(null)
    setValidationInfo({})
    setIsLoading(true)

    try {
      // Get token from localStorage
      const token = localStorage.getItem('token')
      
      if (!token) {
        setError('Authentication token not found. Please log in again.')
        setIsLoading(false)
        return
      }

      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess('Password updated successfully! You can now use your new password to log in.')
        setIsChangingPassword(false)
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
        setValidationInfo({})
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          setSuccess(null)
        }, 5000)
      } else {
        setError(data.error || 'Failed to update password. Please try again.')
        setValidationInfo({
          requirements: data.requirements,
          feedback: data.strength?.feedback,
          suggestions: data.strength?.suggestions
        })
        
        // Clear error message after 5 seconds
        setTimeout(() => {
          setError(null)
          setValidationInfo({})
        }, 10000)
      }
    } catch (error) {
      console.error('Password change error:', error)
      setError('An unexpected error occurred. Please try again.')
      
      // Clear error message after 5 seconds
      setTimeout(() => {
        setError(null)
      }, 10000)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelPasswordChange = () => {
    setIsChangingPassword(false)
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    setError(null)
    setSuccess(null)
    setValidationInfo({})
  }

  const isPasswordValid = 
    passwordData.currentPassword.length > 0 &&
    passwordData.newPassword.length >= 8 &&
    passwordData.newPassword === passwordData.confirmPassword &&
    passwordData.newPassword !== passwordData.currentPassword

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-3">
            <BackButton buttonClassName="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Security Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage your account security settings</p>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <p className="text-sm text-green-700 dark:text-green-300">{success}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
            {(validationInfo.requirements || validationInfo.feedback || validationInfo.suggestions) && (
              <div className="mt-3 text-xs text-red-700 dark:text-red-300">
                {validationInfo.requirements && validationInfo.requirements.length > 0 && (
                  <div className="mt-2">
                    <p className="font-medium">Password should:</p>
                    <ul className="list-disc ml-5 mt-1 space-y-1">
                      {validationInfo.requirements.map((r, idx) => (
                        <li key={`req-${idx}`}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {validationInfo.feedback && validationInfo.feedback.length > 0 && (
                  <div className="mt-3">
                    <p className="font-medium">Issues detected:</p>
                    <ul className="list-disc ml-5 mt-1 space-y-1">
                      {validationInfo.feedback.map((f, idx) => (
                        <li key={`fb-${idx}`}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {validationInfo.suggestions && validationInfo.suggestions.length > 0 && (
                  <div className="mt-3">
                    <p className="font-medium">Suggestions:</p>
                    <ul className="list-disc ml-5 mt-1 space-y-1">
                      {validationInfo.suggestions.map((s, idx) => (
                        <li key={`sg-${idx}`}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-8">
          {/* Update Password */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Lock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Update Password</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Change your account password to keep it secure</p>
                </div>
              </div>
              {!isChangingPassword && (
                <Button
                  onClick={() => setIsChangingPassword(true)}
                  variant="outline"
                  size="sm"
                >
                  Change Password
                </Button>
              )}
            </div>

            {isChangingPassword && (
              <div className="space-y-4">
                {/* Current Password */}
                <div className="space-y-2">
                  <Label htmlFor="currentPassword" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Current Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className="pr-10"
                      placeholder="Enter your current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="pr-10"
                      placeholder="Enter your new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordData.newPassword && passwordData.newPassword.length < 8 && (
                    <p className="text-xs text-red-500">Password must be at least 8 characters long</p>
                  )}
                </div>

                {/* Confirm New Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Confirm New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="pr-10"
                      placeholder="Confirm your new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                    <p className="text-xs text-red-500">Passwords do not match</p>
                  )}
                  {passwordData.newPassword && passwordData.newPassword === passwordData.currentPassword && (
                    <p className="text-xs text-red-500">New password must be different from current password</p>
                  )}
                </div>

                <div className="flex items-center space-x-3 pt-4">
                  <Button
                    onClick={handlePasswordChange}
                    disabled={!isPasswordValid || isLoading}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Updating...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Update Password
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancelPasswordChange}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
