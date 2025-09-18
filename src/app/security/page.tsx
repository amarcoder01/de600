import { Metadata } from 'next'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { SecurityPage } from '@/components/auth/SecurityPage'

export const metadata: Metadata = {
  title: 'Security - Vidality Trading Platform',
  description: 'Manage your account security settings on Vidality trading platform.',
}

export default function Security() {
  return (
    <ProtectedRoute>
      <SecurityPage />
    </ProtectedRoute>
  )
}
