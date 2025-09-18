import { Metadata } from 'next'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { SettingsPage } from '@/components/auth/SettingsPage'

export const metadata: Metadata = {
  title: 'Settings - Vidality Trading Platform',
  description: 'Manage your account settings and preferences on Vidality trading platform.',
}

export default function Settings() {
  return (
    <ProtectedRoute>
      <SettingsPage />
    </ProtectedRoute>
  )
}
