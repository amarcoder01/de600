import { Metadata } from 'next'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { UserProfile } from '@/components/auth/UserProfile'

export const metadata: Metadata = {
  title: 'Profile - Vidality Trading Platform',
  description: 'Manage your account profile and preferences on Vidality trading platform.',
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <UserProfile />
    </ProtectedRoute>
  )
}
