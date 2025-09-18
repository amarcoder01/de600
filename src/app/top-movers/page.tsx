'use client'

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import Dashboard from '@/components/top-gainers-losers/Dashboard'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
})

export default function TopMoversPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>
  )
}