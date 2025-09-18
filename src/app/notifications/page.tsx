import { Metadata } from 'next'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { NotificationsPage } from '@/components/auth/NotificationsPage'

export const metadata: Metadata = {
  title: 'Notifications - Vidality Trading Platform',
  description: 'Manage your notifications and alerts on Vidality trading platform.',
}

export default function Notifications() {
  return (
    <ProtectedRoute>
      <NotificationsPage />
    </ProtectedRoute>
  )
}
