'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Settings, 
  Save, 
  Palette, 
  DollarSign, 
  Sun, 
  Moon, 
  Monitor,
  Globe,
  Clock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { useAuthStore, useUIStore } from '@/store'

export function SettingsPage() {
  const { user, updateUser } = useAuthStore()
  const { theme, setTheme } = useUIStore()
  const [isEditing, setIsEditing] = useState(false)
  const [settings, setSettings] = useState({
    theme: theme,
    timezone: user?.preferences?.timezone || 'UTC'
  })

  // Update settings when theme changes from UI store
  useEffect(() => {
    setSettings(prev => ({
      ...prev,
      theme: theme
    }))
  }, [theme])

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">User not found</p>
        </div>
      </div>
    )
  }

  const handleThemeChange = (newTheme: string) => {
    // Update both local settings and global UI store
    setSettings(prev => ({ ...prev, theme: newTheme as 'light' | 'dark' | 'system' }))
    setTheme(newTheme as 'light' | 'dark' | 'system')
  }

  const handleSave = () => {
    // Update user preferences
    updateUser({
      preferences: {
        ...user?.preferences,
        theme: settings.theme,
        currency: 'USD', // Always USD
        timezone: settings.timezone
      }
    })
    setIsEditing(false)
  }

  const handleCancel = () => {
    // Reset to current values
    setSettings({
      theme: theme,
      timezone: user?.preferences?.timezone || 'UTC'
    })
    setIsEditing(false)
  }

  const getThemeIcon = (theme: string) => {
    switch (theme) {
      case 'light':
        return <Sun className="w-4 h-4" />
      case 'dark':
        return <Moon className="w-4 h-4" />
      default:
        return <Monitor className="w-4 h-4" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-2">Manage your account preferences and settings</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Appearance Settings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  {getThemeIcon(settings.theme)}
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Appearance</h2>
              </div>
            </div>

            <div className="space-y-6">
              {/* Theme Setting */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Theme</Label>
                <Select
                  value={settings.theme}
                  onValueChange={handleThemeChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">
                      <div className="flex items-center space-x-2">
                        <Monitor className="w-4 h-4" />
                        <span>System</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="light">
                      <div className="flex items-center space-x-2">
                        <Sun className="w-4 h-4" />
                        <span>Light</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="dark">
                      <div className="flex items-center space-x-2">
                        <Moon className="w-4 h-4" />
                        <span>Dark</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">Theme changes are applied immediately</p>
              </div>
            </div>
          </div>

          {/* Trading Preferences */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Trading Preferences</h2>
              </div>
            </div>

            <div className="space-y-6">
              {/* Currency Setting */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Currency</Label>
                <div className="flex items-center space-x-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <span className="text-sm font-medium text-gray-900">USD - US Dollar</span>
                  <span className="text-xs text-gray-500">(Fixed)</span>
                </div>
                <p className="text-xs text-gray-500">Currency is fixed to USD for US stock trading</p>
              </div>

              {/* Timezone Setting */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Timezone</Label>
                <Select
                  value={settings.timezone}
                  onValueChange={(value) => setSettings({ ...settings, timezone: value })}
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC - Coordinated Universal Time</SelectItem>
                    <SelectItem value="EST">EST - Eastern Standard Time</SelectItem>
                    <SelectItem value="PST">PST - Pacific Standard Time</SelectItem>
                    <SelectItem value="GMT">GMT - Greenwich Mean Time</SelectItem>
                    <SelectItem value="CET">CET - Central European Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex items-center justify-end space-x-3">
          {!isEditing ? (
            <Button
              onClick={() => setIsEditing(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              <Settings className="w-4 h-4 mr-2" />
              Edit Settings
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
