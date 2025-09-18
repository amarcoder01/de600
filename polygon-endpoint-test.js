#!/usr/bin/env node

/**
 * Polygon.io API Endpoint-Specific Testing
 * 
 * Tests specific endpoints that should work with different API plans
 * Focuses on endpoints that are commonly accessible
 */

const https = require('https');
require('dotenv').config({ path: '.env.local' });

const POLYGON_API_KEY = process.env.POLYGON_API_KEY || process.env.NEXT_PUBLIC_POLYGON_API_KEY;
const BASE_URL = 'https://api.polygon.io';

class PolygonEndpointTester {
    constructor() {
        if (!POLYGON_API_KEY) {
            console.error('❌ ERROR: Polygon API key not found!');
            process.exit(1);
        }
        
        console.log('🎯 Polygon.io Endpoint-Specific Testing');
        console.log(`📊 API Key: ${POLYGON_API_KEY.substring(0, 8)}...`);
        console.log('');
    }

    async makeRequest(endpoint, params = {}) {
        return new Promise((resolve) => {
            const url = new URL(`${BASE_URL}${endpoint}`);
            url.searchParams.append('apikey', POLYGON_API_KEY);
            
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    url.searchParams.append(key, value.toString());
                }
            });

            const startTime = Date.now();
            
            const req = https.get(url.toString(), (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    const responseTime = Date.now() - startTime;
                    
                    try {
                        const jsonData = JSON.parse(data);
                        resolve({
                            success: true,
                            status: res.statusCode,
                            responseTime,
                            data: jsonData,
                            endpoint,
                            dataSize: data.length
                        });
                    } catch (error) {
                        resolve({
                            success: false,
                            status: res.statusCode,
                            responseTime,
                            error: 'JSON Parse Error',
                            rawData: data.substring(0, 500),
                            endpoint
                        });
                    }
                });
            });
            
            req.on('error', (error) => {
                resolve({
                    success: false,
                    status: 0,
                    responseTime: Date.now() - startTime,
                    error: error.message,
                    endpoint
                });
            });
            
            req.setTimeout(10000, () => {
                req.destroy();
                resolve({
                    success: false,
                    status: 0,
                    responseTime: 10000,
                    error: 'Request timeout',
                    endpoint
                });
            });
        });
    }

    logResult(testName, result) {
        const status = result.success && result.status === 200 ? 
            '✅ SUCCESS' : 
            result.status === 403 ? '🔒 FORBIDDEN' :
            result.status === 429 ? '⚠️ RATE_LIMITED' :
            result.status === 404 ? '❓ NOT_FOUND' :
            '❌ FAILED';
        
        console.log(`  ${status} | ${result.status} | ${result.responseTime}ms | ${testName}`);
        
        if (result.success && result.data) {
            if (result.data.status === 'OK' && result.data.results) {
                const count = Array.isArray(result.data.results) ? result.data.results.length : 1;
                console.log(`    📊 Results: ${count} items`);
            } else if (result.data.status) {
                console.log(`    📋 Status: ${result.data.status}`);
            }
            if (result.data.message) {
                console.log(`    💬 Message: ${result.data.message}`);
            }
        } else if (!result.success) {
            console.log(`    ❌ Error: ${result.error}`);
            if (result.rawData) {
                console.log(`    📄 Response: ${result.rawData}`);
            }
        }
    }

    // Test basic market status (usually available on all plans)
    async testMarketStatus() {
        console.log('📈 Testing Market Status Endpoints:');
        
        const tests = [
            { endpoint: '/v1/marketstatus/now', name: 'Current Market Status' },
            { endpoint: '/v1/marketstatus/upcoming', name: 'Upcoming Market Status' }
        ];
        
        for (const test of tests) {
            const result = await this.makeRequest(test.endpoint);
            this.logResult(test.name, result);
            await this.sleep(500);
        }
    }

    // Test ticker/reference data (usually available)
    async testReferenceData() {
        console.log('\n📊 Testing Reference Data Endpoints:');
        
        const tests = [
            { endpoint: '/v3/reference/tickers', params: { limit: 5 }, name: 'All Tickers (Limited)' },
            { endpoint: '/v3/reference/tickers/AAPL', name: 'AAPL Ticker Details' },
            { endpoint: '/v3/reference/tickers', params: { market: 'stocks', active: 'true', limit: 3 }, name: 'Active Stock Tickers' }
        ];
        
        for (const test of tests) {
            const result = await this.makeRequest(test.endpoint, test.params || {});
            this.logResult(test.name, result);
            await this.sleep(500);
        }
    }

    // Test aggregates (historical data - usually available)
    async testAggregatesData() {
        console.log('\n📈 Testing Aggregates (Historical Data) Endpoints:');
        
        const today = new Date();
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const todayStr = today.toISOString().split('T')[0];
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        const lastWeekStr = lastWeek.toISOString().split('T')[0];
        
        const tests = [
            { endpoint: `/v2/aggs/ticker/AAPL/prev`, name: 'AAPL Previous Day' },
            { endpoint: `/v2/aggs/ticker/AAPL/range/1/day/${lastWeekStr}/${todayStr}`, params: { adjusted: 'true', sort: 'asc', limit: 10 }, name: 'AAPL Weekly Range' },
            { endpoint: `/v2/aggs/grouped/locale/us/market/stocks/${yesterdayStr}`, params: { adjusted: 'true', limit: 5 }, name: 'Market Grouped Data' }
        ];
        
        for (const test of tests) {
            const result = await this.makeRequest(test.endpoint, test.params || {});
            this.logResult(test.name, result);
            await this.sleep(500);
        }
    }

    // Test real-time/snapshot data (may require paid plan)
    async testRealtimeData() {
        console.log('\n⚡ Testing Real-time/Snapshot Endpoints:');
        
        const tests = [
            { endpoint: '/v2/snapshot/locale/us/markets/stocks/tickers', params: { limit: 3 }, name: 'Market Snapshot (Limited)' },
            { endpoint: '/v2/snapshot/locale/us/markets/stocks/tickers/AAPL', name: 'AAPL Snapshot' },
            { endpoint: '/v2/last/trade/AAPL', name: 'AAPL Last Trade' },
            { endpoint: '/v2/last/nbbo/AAPL', name: 'AAPL Last Quote' }
        ];
        
        for (const test of tests) {
            const result = await this.makeRequest(test.endpoint, test.params || {});
            this.logResult(test.name, result);
            await this.sleep(500);
        }
    }

    // Test news endpoints (may have limitations)
    async testNewsData() {
        console.log('\n📰 Testing News Endpoints:');
        
        const tests = [
            { endpoint: '/v2/reference/news', params: { limit: 3 }, name: 'General News (Limited)' },
            { endpoint: '/v2/reference/news', params: { ticker: 'AAPL', limit: 2 }, name: 'AAPL News (Limited)' }
        ];
        
        for (const test of tests) {
            const result = await this.makeRequest(test.endpoint, test.params || {});
            this.logResult(test.name, result);
            await this.sleep(500);
        }
    }

    // Test options data (usually requires paid plan)
    async testOptionsData() {
        console.log('\n🎯 Testing Options Endpoints:');
        
        const tests = [
            { endpoint: '/v3/reference/options/contracts', params: { underlying_ticker: 'AAPL', limit: 2 }, name: 'AAPL Options Contracts' },
            { endpoint: '/v2/snapshot/options/AAPL', name: 'AAPL Options Snapshot' }
        ];
        
        for (const test of tests) {
            const result = await this.makeRequest(test.endpoint, test.params || {});
            this.logResult(test.name, result);
            await this.sleep(500);
        }
    }

    // Test crypto data (if available)
    async testCryptoData() {
        console.log('\n₿ Testing Crypto Endpoints:');
        
        const tests = [
            { endpoint: '/v2/snapshot/locale/global/markets/crypto/tickers', params: { limit: 3 }, name: 'Crypto Snapshots' },
            { endpoint: '/v2/last/trade/X:BTCUSD', name: 'Bitcoin Last Trade' }
        ];
        
        for (const test of tests) {
            const result = await this.makeRequest(test.endpoint, test.params || {});
            this.logResult(test.name, result);
            await this.sleep(500);
        }
    }

    // Test forex data (if available)
    async testForexData() {
        console.log('\n💱 Testing Forex Endpoints:');
        
        const tests = [
            { endpoint: '/v2/snapshot/locale/global/markets/forex/tickers', params: { limit: 3 }, name: 'Forex Snapshots' },
            { endpoint: '/v2/last/trade/C:EURUSD', name: 'EUR/USD Last Trade' }
        ];
        
        for (const test of tests) {
            const result = await this.makeRequest(test.endpoint, test.params || {});
            this.logResult(test.name, result);
            await this.sleep(500);
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Run all endpoint tests
    async runAllEndpointTests() {
        console.log('🚀 Starting comprehensive endpoint testing...\n');
        
        try {
            await this.testMarketStatus();
            await this.testReferenceData();
            await this.testAggregatesData();
            await this.testRealtimeData();
            await this.testNewsData();
            await this.testOptionsData();
            await this.testCryptoData();
            await this.testForexData();
            
            console.log('\n✅ All endpoint tests completed!');
            console.log('\n📋 Summary:');
            console.log('- ✅ SUCCESS: Endpoint works with your API plan');
            console.log('- 🔒 FORBIDDEN: Endpoint requires higher plan or different permissions');
            console.log('- ⚠️ RATE_LIMITED: Hit rate limits (try again later)');
            console.log('- ❓ NOT_FOUND: Endpoint may not exist or be deprecated');
            console.log('- ❌ FAILED: Network or other error');
            
        } catch (error) {
            console.error('💥 Endpoint testing failed:', error);
        }
    }
}

// Run the tests
if (require.main === module) {
    const tester = new PolygonEndpointTester();
    tester.runAllEndpointTests();
}

module.exports = PolygonEndpointTester;
