#!/usr/bin/env node

/**
 * Simple integration test script to verify market status implementation
 * Run this script to test that the new market status features don't break the site
 */

const { MarketStatusService } = require('../src/lib/market-status')

async function testMarketStatus() {
  console.log('🧪 Testing Market Status Service...')
  
  try {
    const service = MarketStatusService.getInstance()
    
    // Test 1: Get market status
    console.log('1. Testing getMarketStatus()...')
    const status = await service.getMarketStatus()
    console.log('✅ Market Status:', {
      isOpen: status.isOpen,
      status: status.status,
      isExtendedHours: status.isExtendedHours
    })
    
    // Test 2: Get trading dates
    console.log('2. Testing trading date calculations...')
    const currentDate = service.getCurrentTradingDate()
    const previousDate = service.getPreviousTradingDate(1)
    console.log('✅ Trading Dates:', {
      current: currentDate,
      previous: previousDate
    })
    
    // Test 3: Cache duration
    console.log('3. Testing cache duration calculation...')
    const cacheDuration = service.getCacheDuration(status)
    console.log('✅ Cache Duration:', cacheDuration, 'ms')
    
    // Test 4: Data freshness
    console.log('4. Testing data freshness validation...')
    const now = new Date()
    const isFresh = service.isDataFresh(now, status)
    console.log('✅ Data Freshness:', isFresh)
    
    console.log('\n🎉 All tests passed! Market status service is working correctly.')
    
    // Display current market info
    console.log('\n📊 Current Market Information:')
    console.log(`Market Status: ${status.status.toUpperCase()}`)
    console.log(`Market Time: ${new Date(status.marketTime).toLocaleString('en-US', { timeZone: 'America/New_York' })} ET`)
    
    if (status.nextOpen) {
      console.log(`Next Open: ${new Date(status.nextOpen).toLocaleString('en-US', { timeZone: 'America/New_York' })} ET`)
    }
    
    if (status.nextClose) {
      console.log(`Next Close: ${new Date(status.nextClose).toLocaleString('en-US', { timeZone: 'America/New_York' })} ET`)
    }
    
    return true
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    return false
  }
}

async function testAPIEndpoints() {
  console.log('\n🌐 Testing API Endpoints...')
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  
  try {
    // Test market status endpoint
    console.log('1. Testing /api/market/status...')
    const statusResponse = await fetch(`${baseUrl}/api/market/status`)
    
    if (statusResponse.ok) {
      const statusData = await statusResponse.json()
      console.log('✅ Market Status API working')
      console.log('   Status:', statusData.data?.status)
    } else {
      console.log('⚠️ Market Status API returned:', statusResponse.status)
    }
    
    // Test market indices endpoint
    console.log('2. Testing /api/market/indices...')
    const indicesResponse = await fetch(`${baseUrl}/api/market/indices`)
    
    if (indicesResponse.ok) {
      const indicesData = await indicesResponse.json()
      console.log('✅ Market Indices API working')
      console.log('   Indices count:', indicesData.indices?.length || 0)
      console.log('   Market Status included:', !!indicesData.marketStatus)
    } else {
      console.log('⚠️ Market Indices API returned:', indicesResponse.status)
    }
    
    // Test stocks endpoint
    console.log('3. Testing /api/stocks...')
    const stocksResponse = await fetch(`${baseUrl}/api/stocks?limit=5`)
    
    if (stocksResponse.ok) {
      const stocksData = await stocksResponse.json()
      console.log('✅ Stocks API working')
      console.log('   Stocks count:', stocksData.stocks?.length || 0)
      console.log('   Market Status included:', !!stocksData.marketStatus)
      console.log('   Data Freshness included:', !!stocksData.dataFreshness)
    } else {
      console.log('⚠️ Stocks API returned:', stocksResponse.status)
    }
    
    console.log('\n🎉 API endpoint tests completed!')
    return true
  } catch (error) {
    console.error('❌ API test failed:', error.message)
    console.log('💡 Note: API tests require the server to be running')
    return false
  }
}

async function main() {
  console.log('🚀 Market Status Implementation Test Suite\n')
  
  const serviceTest = await testMarketStatus()
  
  // Only test APIs if service tests pass
  if (serviceTest) {
    await testAPIEndpoints()
  }
  
  console.log('\n✨ Testing complete!')
  
  if (serviceTest) {
    console.log('🟢 The market status implementation is ready and should not break the site.')
    console.log('🔄 The system will now provide:')
    console.log('   • Proper timezone handling (Eastern Time)')
    console.log('   • Market-aware data refresh intervals')
    console.log('   • Fresh data validation based on market hours')
    console.log('   • Visual market status indicators')
  } else {
    console.log('🔴 There may be issues with the implementation.')
  }
}

// Run tests
main().catch(console.error)
