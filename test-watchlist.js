// Simple test script to verify watchlist functionality
// Run this with: node test-watchlist.js

const testWatchlistFlow = async () => {
  console.log('🧪 Testing Watchlist Flow...\n')
  
  try {
    // Test 1: Check if we can create a watchlist
    console.log('📝 Test 1: Creating a watchlist...')
    const createResponse = await fetch('http://localhost:3000/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Watchlist' })
    })
    
    if (createResponse.ok) {
      const createData = await createResponse.json()
      console.log('✅ Watchlist created successfully:', createData.data.id)
      
      const watchlistId = createData.data.id
      
      // Test 2: Add a stock to the watchlist
      console.log('\n📈 Test 2: Adding a stock to the watchlist...')
      const addStockResponse = await fetch(`http://localhost:3000/api/watchlist/${watchlistId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: 'AAPL',
          name: 'Apple Inc.',
          type: 'stock',
          price: 150.00,
          change: 2.50,
          changePercent: 1.67,
          exchange: 'NASDAQ',
          sector: 'Technology',
          industry: 'Consumer Electronics',
          volume: 1000000,
          marketCap: 2500000000000
        })
      })
      
      if (addStockResponse.ok) {
        const addStockData = await addStockResponse.json()
        console.log('✅ Stock added successfully:', addStockData.data.symbol)
      } else {
        const errorData = await addStockResponse.json()
        console.error('❌ Failed to add stock:', errorData)
      }
      
      // Test 3: Get the watchlist to verify the stock was added
      console.log('\n🔍 Test 3: Getting the watchlist...')
      const getResponse = await fetch(`http://localhost:3000/api/watchlist`)
      
      if (getResponse.ok) {
        const getData = await getResponse.json()
        console.log('✅ Watchlists retrieved successfully')
        console.log('📊 Number of watchlists:', getData.data.length)
        console.log('📈 Watchlist items:', getData.data[0]?.items?.length || 0)
      } else {
        const errorData = await getResponse.json()
        console.error('❌ Failed to get watchlists:', errorData)
      }
      
    } else {
      const errorData = await createResponse.json()
      console.error('❌ Failed to create watchlist:', errorData)
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message)
  }
  
  console.log('\n🏁 Test completed!')
}

// Run the test if this file is executed directly
if (typeof window === 'undefined') {
  // Node.js environment
  const fetch = require('node-fetch')
  testWatchlistFlow()
} else {
  // Browser environment
  console.log('🌐 Running in browser - use the test function directly')
  window.testWatchlistFlow = testWatchlistFlow
}
