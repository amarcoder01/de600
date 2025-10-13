import { MainLayout } from '@/components/layout/main-layout'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { SessionExpiredBanner } from '@/components/auth/SessionExpiredBanner'

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard requireAuth={true}>
      <MainLayout>
        <SessionExpiredBanner />
        {children}
      </MainLayout>
    </AuthGuard>
  )
}
