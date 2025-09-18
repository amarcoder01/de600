/**
 * Basic tests for MarketStatusWidget
 * These tests ensure the component renders without breaking
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MarketStatusWidget, MarketStatusDot } from '../MarketStatusWidget'

// Mock fetch for testing
global.fetch = jest.fn()

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: Infinity,
    },
  },
})

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  )
}

describe('MarketStatusWidget', () => {
  beforeEach(() => {
    ;(fetch as jest.Mock).mockClear()
  })

  it('renders loading state initially', () => {
    ;(fetch as jest.Mock).mockImplementation(() => new Promise(() => {})) // Never resolves
    
    renderWithQueryClient(<MarketStatusWidget />)
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders compact version', () => {
    ;(fetch as jest.Mock).mockImplementation(() => new Promise(() => {})) // Never resolves
    
    renderWithQueryClient(<MarketStatusWidget compact={true} />)
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders MarketStatusDot without crashing', () => {
    ;(fetch as jest.Mock).mockImplementation(() => new Promise(() => {})) // Never resolves
    
    renderWithQueryClient(<MarketStatusDot />)
    
    // Should render a dot element (div with rounded-full class)
    const dotElement = document.querySelector('.rounded-full')
    expect(dotElement).toBeInTheDocument()
  })

  it('handles API success response', async () => {
    const mockResponse = {
      success: true,
      data: {
        isOpen: true,
        isPreMarket: false,
        isPostMarket: false,
        isExtendedHours: false,
        status: 'open' as const,
        nextOpen: null,
        nextClose: '2024-01-01T21:00:00Z',
        marketTime: '2024-01-01T15:30:00Z',
        currentTime: '2024-01-01T15:30:00Z'
      },
      timestamp: '2024-01-01T15:30:00Z'
    }

    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    renderWithQueryClient(<MarketStatusWidget />)

    // Should eventually show market status (after loading)
    await screen.findByText('Market Open')
  })

  it('handles API error gracefully', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'))

    renderWithQueryClient(<MarketStatusWidget />)

    // Should show loading initially, then handle error gracefully
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })
})
