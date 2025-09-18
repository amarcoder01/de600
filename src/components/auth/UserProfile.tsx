'use client'

import React from 'react'
import { 
  User, 
  Mail, 
  Calendar, 
  Shield, 
  Lock
} from 'lucide-react'
import { useAuthStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'

export function UserProfile() {
  const { user } = useAuthStore()
  const router = useRouter()

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">User not found</p>
        </div>
      </div>
    )
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-600 mt-2">Manage your account information and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Profile Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Personal Information</h2>
              </div>

              <div className="space-y-6">
                {/* Avatar and Basic Info */}
                <div className="flex items-center space-x-4">
                  <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {user?.avatar ? (
                      <img 
                      src={user?.avatar || ''} 
                      alt={`${user?.firstName || ''} ${user?.lastName || ''}`}
                        className="w-20 h-20 rounded-full object-cover"
                      />
                    ) : (
                    getInitials(user?.firstName || '', user?.lastName || '')
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                    {user?.firstName || ''} {user?.lastName || ''}
                    </h3>
                  <p className="text-gray-500">{user?.email || ''}</p>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                      <span>Joined {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}</span>
                      </div>
                    {user?.isEmailVerified && (
                        <div className="flex items-center space-x-1 text-green-600">
                          <Shield className="w-4 h-4" />
                          <span>Verified</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                      First Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="firstName"
                        type="text"
                       value={user?.firstName || ''}
                       className="pl-10 bg-gray-50"
                       disabled={true}
                      />
                    </div>
                   <p className="text-xs text-gray-500 mt-1">Name cannot be changed for security reasons</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">
                      Last Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="lastName"
                        type="text"
                       value={user?.lastName || ''}
                       className="pl-10 bg-gray-50"
                       disabled={true}
                      />
                    </div>
                   <p className="text-xs text-gray-500 mt-1">Name cannot be changed for security reasons</p>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                      value={user?.email || ''}
                      className="pl-10 bg-gray-50"
                      disabled={true}
                      />
                    </div>
                  <p className="text-xs text-gray-500 mt-1">Email address cannot be changed for security reasons</p>
                  </div>
                </div>

              
            </div>
          </div>

          {/* Password Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Lock className="w-5 h-5 text-red-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Password</h2>
              </div>
            </div>
              
              <div className="space-y-4">
                <div>
                <Label className="text-sm font-medium text-gray-700">Last Changed</Label>
                <p className="text-sm text-gray-500 mt-1">
                  {user?.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : 'Unknown'}
                </p>
                </div>
                
              <div className="pt-4">
                                 <Button
                   variant="outline"
                   onClick={() => router.push('/security')}
                   className="w-full"
                 >
                  <Lock className="w-4 h-4 mr-2" />
                  Update Password
                </Button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Click to go to Security settings to change your password
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
