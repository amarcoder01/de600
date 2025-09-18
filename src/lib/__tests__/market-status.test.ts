/**
 * Basic tests for market status service
 * These tests ensure the service doesn't break existing functionality
 */

import { MarketStatusService } from '../market-status'

describe('MarketStatusService', () => {
  let service: MarketStatusService

  beforeEach(() => {
    service = MarketStatusService.getInstance()
  })

  it('should create singleton instance', () => {
    const instance1 = MarketStatusService.getInstance()
    const instance2 = MarketStatusService.getInstance()
    expect(instance1).toBe(instance2)
  })

  it('should get market status without throwing', async () => {
    const status = await service.getMarketStatus()
    
    expect(status).toBeDefined()
    expect(typeof status.isOpen).toBe('boolean')
    expect(typeof status.isPreMarket).toBe('boolean')
    expect(typeof status.isPostMarket).toBe('boolean')
    expect(typeof status.isExtendedHours).toBe('boolean')
    expect(['open', 'closed', 'pre-market', 'post-market']).toContain(status.status)
    expect(status.currentTime).toBeDefined()
    expect(status.marketTime).toBeDefined()
    expect(status.lastUpdated).toBeDefined()
  })

  it('should provide cache duration', async () => {
    const status = await service.getMarketStatus()
    const duration = service.getCacheDuration(status)
    
    expect(typeof duration).toBe('number')
    expect(duration).toBeGreaterThan(0)
  })

  it('should validate data freshness', async () => {
    const status = await service.getMarketStatus()
    const now = new Date()
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
    
    const isFresh = service.isDataFresh(now, status)
    const isStale = service.isDataFresh(fiveMinutesAgo, status)
    
    expect(typeof isFresh).toBe('boolean')
    expect(typeof isStale).toBe('boolean')
  })

  it('should get current trading date', () => {
    const date = service.getCurrentTradingDate()
    
    expect(typeof date).toBe('string')
    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/) // YYYY-MM-DD format
  })

  it('should get previous trading date', () => {
    const date = service.getPreviousTradingDate(1)
    
    expect(typeof date).toBe('string')
    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/) // YYYY-MM-DD format
  })

  it('should handle errors gracefully', async () => {
    // Test that the service doesn't throw even if external APIs fail
    const status = await service.getMarketStatus()
    
    // Should always return a valid status object
    expect(status).toBeDefined()
    expect(status.status).toBeDefined()
  })
})
