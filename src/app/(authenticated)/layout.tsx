import { MainLayout } from '@/components/layout/main-layout'
import { AuthGuard } from '@/components/auth/AuthGuard'

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard requireAuth={true}>
      <MainLayout>
        {children}
      </MainLayout>
    </AuthGuard>
  )
}
