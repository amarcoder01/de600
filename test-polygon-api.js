#!/usr/bin/env node

/**
 * Polygon.io API Multi-Request Testing Script
 * 
 * This script tests multiple Polygon.io API endpoints with various request patterns:
 * - Sequential requests
 * - Parallel requests
 * - Rate limit testing
 * - Error handling
 * - Performance analysis
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Configuration
const POLYGON_API_KEY = process.env.POLYGON_API_KEY || process.env.NEXT_PUBLIC_POLYGON_API_KEY;
const BASE_URL = 'https://api.polygon.io';

// Test symbols for various requests
const TEST_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'AMZN', 'NVDA', 'META', 'NFLX'];

// Color codes for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

class PolygonAPITester {
    constructor() {
        this.results = [];
        this.startTime = Date.now();
        
        if (!POLYGON_API_KEY || POLYGON_API_KEY.trim() === '' || POLYGON_API_KEY === 'your_actual_api_key_here') {
            console.error(`${colors.red}❌ ERROR: Polygon API key not found!${colors.reset}`);
            console.error('Please set POLYGON_API_KEY or NEXT_PUBLIC_POLYGON_API_KEY in your .env.local file');
            console.error('Get your API key from: https://polygon.io/dashboard');
            process.exit(1);
        }
        
        console.log(`${colors.cyan}🚀 Polygon.io API Multi-Request Test Starting...${colors.reset}`);
        console.log(`${colors.yellow}📊 API Key: ${POLYGON_API_KEY.substring(0, 8)}...${colors.reset}`);
        console.log(`${colors.yellow}🎯 Test Symbols: ${TEST_SYMBOLS.join(', ')}${colors.reset}`);
        console.log('');
    }

    // Make HTTP request with promise wrapper
    makeRequest(endpoint, params = {}) {
        return new Promise((resolve, reject) => {
            const url = new URL(`${BASE_URL}${endpoint}`);
            url.searchParams.append('apikey', POLYGON_API_KEY);
            
            // Add additional parameters
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
                    const endTime = Date.now();
                    const responseTime = endTime - startTime;
                    
                    try {
                        const jsonData = JSON.parse(data);
                        resolve({
                            success: true,
                            status: res.statusCode,
                            responseTime,
                            data: jsonData,
                            endpoint,
                            url: url.toString().replace(POLYGON_API_KEY, '[API_KEY]')
                        });
                    } catch (error) {
                        resolve({
                            success: false,
                            status: res.statusCode,
                            responseTime,
                            error: 'JSON Parse Error',
                            rawData: data,
                            endpoint,
                            url: url.toString().replace(POLYGON_API_KEY, '[API_KEY]')
                        });
                    }
                });
            });
            
            req.on('error', (error) => {
                const endTime = Date.now();
                const responseTime = endTime - startTime;
                
                resolve({
                    success: false,
                    status: 0,
                    responseTime,
                    error: error.message,
                    endpoint,
                    url: url.toString().replace(POLYGON_API_KEY, '[API_KEY]')
                });
            });
            
            req.setTimeout(10000, () => {
                req.destroy();
                resolve({
                    success: false,
                    status: 0,
                    responseTime: 10000,
                    error: 'Request timeout',
                    endpoint,
                    url: url.toString().replace(POLYGON_API_KEY, '[API_KEY]')
                });
            });
        });
    }

    // Test 1: Market Status
    async testMarketStatus() {
        console.log(`${colors.blue}📈 Test 1: Market Status${colors.reset}`);
        
        const result = await this.makeRequest('/v1/marketstatus/now');
        this.logResult('Market Status', result);
        this.results.push(result);
        
        return result;
    }

    // Test 2: Stock Ticker Details (Sequential)
    async testTickerDetailsSequential() {
        console.log(`${colors.blue}📊 Test 2: Ticker Details (Sequential)${colors.reset}`);
        
        const results = [];
        for (const symbol of TEST_SYMBOLS.slice(0, 3)) {
            console.log(`  → Fetching ${symbol}...`);
            const result = await this.makeRequest(`/v3/reference/tickers/${symbol}`);
            this.logResult(`Ticker ${symbol}`, result);
            results.push(result);
            this.results.push(result);
            
            // Small delay to avoid rate limits
            await this.sleep(200);
        }
        
        return results;
    }

    // Test 3: Stock Quotes (Parallel)
    async testStockQuotesParallel() {
        console.log(`${colors.blue}💹 Test 3: Stock Quotes (Parallel)${colors.reset}`);
        
        const promises = TEST_SYMBOLS.slice(0, 4).map(symbol => {
            console.log(`  → Requesting ${symbol} quote...`);
            return this.makeRequest(`/v2/last/trade/${symbol}`);
        });
        
        const results = await Promise.all(promises);
        
        results.forEach((result, index) => {
            this.logResult(`Quote ${TEST_SYMBOLS[index]}`, result);
            this.results.push(result);
        });
        
        return results;
    }

    // Test 4: Aggregates (Historical Data)
    async testAggregates() {
        console.log(`${colors.blue}📈 Test 4: Aggregates (Historical Data)${colors.reset}`);
        
        const today = new Date();
        const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const from = lastWeek.toISOString().split('T')[0];
        const to = today.toISOString().split('T')[0];
        
        const symbol = 'AAPL';
        const result = await this.makeRequest(
            `/v2/aggs/ticker/${symbol}/range/1/day/${from}/${to}`,
            { adjusted: true, sort: 'asc', limit: 10 }
        );
        
        this.logResult(`Aggregates ${symbol}`, result);
        this.results.push(result);
        
        return result;
    }

    // Test 5: Market Snapshots
    async testMarketSnapshots() {
        console.log(`${colors.blue}📸 Test 5: Market Snapshots${colors.reset}`);
        
        const result = await this.makeRequest('/v2/snapshot/locale/us/markets/stocks/tickers', {
            'tickers.gte': 'A',
            'tickers.lte': 'B',
            limit: 5
        });
        
        this.logResult('Market Snapshots', result);
        this.results.push(result);
        
        return result;
    }

    // Test 6: Rate Limit Testing
    async testRateLimits() {
        console.log(`${colors.blue}⚡ Test 6: Rate Limit Testing${colors.reset}`);
        
        const rapidRequests = [];
        const symbols = TEST_SYMBOLS.slice(0, 6);
        
        console.log(`  → Making ${symbols.length} rapid requests...`);
        
        // Make multiple requests rapidly to test rate limits
        for (let i = 0; i < symbols.length; i++) {
            rapidRequests.push(
                this.makeRequest(`/v2/last/trade/${symbols[i]}`)
            );
        }
        
        const results = await Promise.all(rapidRequests);
        
        let rateLimitHit = false;
        results.forEach((result, index) => {
            if (result.status === 429) {
                rateLimitHit = true;
                console.log(`  ${colors.red}⚠️  Rate limit hit for ${symbols[index]}${colors.reset}`);
            }
            this.logResult(`RateLimit ${symbols[index]}`, result);
            this.results.push(result);
        });
        
        if (!rateLimitHit) {
            console.log(`  ${colors.green}✅ No rate limits encountered${colors.reset}`);
        }
        
        return results;
    }

    // Test 7: Error Handling (Invalid Symbol)
    async testErrorHandling() {
        console.log(`${colors.blue}🔧 Test 7: Error Handling${colors.reset}`);
        
        const invalidSymbol = 'INVALID_SYMBOL_12345';
        const result = await this.makeRequest(`/v2/last/trade/${invalidSymbol}`);
        
        this.logResult('Error Handling', result);
        this.results.push(result);
        
        return result;
    }

    // Helper method to log results
    logResult(testName, result) {
        const status = result.success ? 
            `${colors.green}✅ SUCCESS${colors.reset}` : 
            `${colors.red}❌ FAILED${colors.reset}`;
        
        const responseTime = `${result.responseTime}ms`;
        const httpStatus = result.status || 'N/A';
        
        console.log(`  ${status} | ${httpStatus} | ${responseTime} | ${testName}`);
        
        if (!result.success) {
            console.log(`    ${colors.red}Error: ${result.error}${colors.reset}`);
        } else if (result.data && result.data.results) {
            const resultCount = Array.isArray(result.data.results) ? 
                result.data.results.length : 
                (result.data.results ? 1 : 0);
            console.log(`    ${colors.cyan}Results: ${resultCount} items${colors.reset}`);
        }
    }

    // Helper method for delays
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Generate comprehensive test report
    generateReport() {
        const totalTests = this.results.length;
        const successfulTests = this.results.filter(r => r.success).length;
        const failedTests = totalTests - successfulTests;
        const averageResponseTime = this.results.reduce((sum, r) => sum + r.responseTime, 0) / totalTests;
        const totalTime = Date.now() - this.startTime;

        console.log('\n' + '='.repeat(60));
        console.log(`${colors.bright}🎯 POLYGON.IO API TEST REPORT${colors.reset}`);
        console.log('='.repeat(60));
        
        console.log(`${colors.cyan}📊 Summary:${colors.reset}`);
        console.log(`  Total Tests: ${totalTests}`);
        console.log(`  Successful: ${colors.green}${successfulTests}${colors.reset}`);
        console.log(`  Failed: ${colors.red}${failedTests}${colors.reset}`);
        console.log(`  Success Rate: ${colors.yellow}${((successfulTests/totalTests)*100).toFixed(1)}%${colors.reset}`);
        console.log(`  Average Response Time: ${colors.yellow}${averageResponseTime.toFixed(0)}ms${colors.reset}`);
        console.log(`  Total Test Duration: ${colors.yellow}${(totalTime/1000).toFixed(1)}s${colors.reset}`);

        console.log(`\n${colors.cyan}⚡ Performance Analysis:${colors.reset}`);
        const fastRequests = this.results.filter(r => r.responseTime < 500).length;
        const mediumRequests = this.results.filter(r => r.responseTime >= 500 && r.responseTime < 2000).length;
        const slowRequests = this.results.filter(r => r.responseTime >= 2000).length;
        
        console.log(`  Fast (<500ms): ${colors.green}${fastRequests}${colors.reset}`);
        console.log(`  Medium (500-2000ms): ${colors.yellow}${mediumRequests}${colors.reset}`);
        console.log(`  Slow (>2000ms): ${colors.red}${slowRequests}${colors.reset}`);

        console.log(`\n${colors.cyan}🔍 Error Analysis:${colors.reset}`);
        const errorCounts = {};
        this.results.filter(r => !r.success).forEach(r => {
            const key = r.status || 'Network Error';
            errorCounts[key] = (errorCounts[key] || 0) + 1;
        });
        
        if (Object.keys(errorCounts).length === 0) {
            console.log(`  ${colors.green}No errors encountered!${colors.reset}`);
        } else {
            Object.entries(errorCounts).forEach(([error, count]) => {
                console.log(`  ${error}: ${colors.red}${count}${colors.reset}`);
            });
        }

        // Save detailed results to file
        const reportData = {
            timestamp: new Date().toISOString(),
            summary: {
                totalTests,
                successfulTests,
                failedTests,
                successRate: (successfulTests/totalTests)*100,
                averageResponseTime,
                totalTestDuration: totalTime
            },
            performance: { fastRequests, mediumRequests, slowRequests },
            errors: errorCounts,
            detailedResults: this.results.map(r => ({
                ...r,
                url: r.url // URL is already sanitized
            }))
        };

        const reportPath = path.join(__dirname, 'polygon-api-test-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
        
        console.log(`\n${colors.magenta}📁 Detailed report saved to: ${reportPath}${colors.reset}`);
        console.log('='.repeat(60));
    }

    // Main test runner
    async runAllTests() {
        try {
            // Run all tests sequentially to avoid overwhelming the API
            await this.testMarketStatus();
            await this.sleep(500);
            
            await this.testTickerDetailsSequential();
            await this.sleep(500);
            
            await this.testStockQuotesParallel();
            await this.sleep(500);
            
            await this.testAggregates();
            await this.sleep(500);
            
            await this.testMarketSnapshots();
            await this.sleep(500);
            
            await this.testRateLimits();
            await this.sleep(500);
            
            await this.testErrorHandling();
            
            // Generate final report
            this.generateReport();
            
        } catch (error) {
            console.error(`${colors.red}💥 Test suite failed:${colors.reset}`, error);
        }
    }
}

// Run the tests
if (require.main === module) {
    const tester = new PolygonAPITester();
    tester.runAllTests().then(() => {
        console.log(`\n${colors.green}🎉 All tests completed!${colors.reset}`);
    }).catch(error => {
        console.error(`${colors.red}💥 Test execution failed:${colors.reset}`, error);
        process.exit(1);
    });
}

module.exports = PolygonAPITester;
