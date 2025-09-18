#!/usr/bin/env node

/**
 * Polygon.io API Stress Test - High Volume Request Testing
 * 
 * This script performs more intensive testing:
 * - Burst requests to test rate limits
 * - Concurrent connection testing
 * - Memory usage monitoring
 * - Real-time data streaming simulation
 */

const https = require('https');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const POLYGON_API_KEY = process.env.POLYGON_API_KEY || process.env.NEXT_PUBLIC_POLYGON_API_KEY;
const BASE_URL = 'https://api.polygon.io';

// Extended test symbols for stress testing
const STRESS_SYMBOLS = [
    'AAPL', 'MSFT', 'GOOGL', 'TSLA', 'AMZN', 'NVDA', 'META', 'NFLX',
    'BABA', 'TSM', 'V', 'JNJ', 'WMT', 'JPM', 'PG', 'UNH',
    'MA', 'HD', 'BAC', 'ABBV', 'PFE', 'KO', 'PEP', 'TMO'
];

class PolygonStressTester {
    constructor() {
        this.results = [];
        this.startTime = Date.now();
        this.requestCount = 0;
        this.concurrentRequests = 0;
        this.maxConcurrent = 0;
        
        if (!POLYGON_API_KEY) {
            console.error('❌ ERROR: Polygon API key not found!');
            process.exit(1);
        }
        
        console.log('🔥 Polygon.io API Stress Test Starting...');
        console.log(`📊 API Key: ${POLYGON_API_KEY.substring(0, 8)}...`);
        console.log(`🎯 Stress Symbols: ${STRESS_SYMBOLS.length} symbols`);
        console.log('');
    }

    async makeRequest(endpoint, params = {}) {
        this.requestCount++;
        this.concurrentRequests++;
        this.maxConcurrent = Math.max(this.maxConcurrent, this.concurrentRequests);
        
        return new Promise((resolve, reject) => {
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
                    this.concurrentRequests--;
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
                            dataSize: data.length
                        });
                    } catch (error) {
                        resolve({
                            success: false,
                            status: res.statusCode,
                            responseTime,
                            error: 'JSON Parse Error',
                            endpoint,
                            dataSize: data.length
                        });
                    }
                });
            });
            
            req.on('error', (error) => {
                this.concurrentRequests--;
                const endTime = Date.now();
                resolve({
                    success: false,
                    status: 0,
                    responseTime: endTime - startTime,
                    error: error.message,
                    endpoint
                });
            });
            
            req.setTimeout(15000, () => {
                this.concurrentRequests--;
                req.destroy();
                resolve({
                    success: false,
                    status: 0,
                    responseTime: 15000,
                    error: 'Request timeout',
                    endpoint
                });
            });
        });
    }

    // Test 1: Burst Request Test (10 requests in rapid succession)
    async testBurstRequests() {
        console.log('💥 Test 1: Burst Request Test (10 rapid requests)');
        
        const burstPromises = [];
        const symbols = STRESS_SYMBOLS.slice(0, 10);
        
        const startTime = Date.now();
        
        // Fire all requests simultaneously
        for (const symbol of symbols) {
            burstPromises.push(this.makeRequest(`/v2/last/trade/${symbol}`));
        }
        
        const results = await Promise.all(burstPromises);
        const endTime = Date.now();
        const totalTime = endTime - startTime;
        
        const successful = results.filter(r => r.success && r.status === 200).length;
        const rateLimited = results.filter(r => r.status === 429).length;
        const forbidden = results.filter(r => r.status === 403).length;
        
        console.log(`  ⚡ Total Time: ${totalTime}ms`);
        console.log(`  ✅ Successful: ${successful}`);
        console.log(`  🚫 Rate Limited (429): ${rateLimited}`);
        console.log(`  🔒 Forbidden (403): ${forbidden}`);
        
        this.results.push(...results);
        return results;
    }

    // Test 2: Sustained Load Test (50 requests over 30 seconds)
    async testSustainedLoad() {
        console.log('🔄 Test 2: Sustained Load Test (50 requests over 30 seconds)');
        
        const totalRequests = 50;
        const duration = 30000; // 30 seconds
        const interval = duration / totalRequests;
        
        const results = [];
        let completed = 0;
        
        return new Promise((resolve) => {
            const intervalId = setInterval(async () => {
                if (completed >= totalRequests) {
                    clearInterval(intervalId);
                    console.log(`  🎯 Completed ${completed} requests`);
                    resolve(results);
                    return;
                }
                
                const symbol = STRESS_SYMBOLS[completed % STRESS_SYMBOLS.length];
                const result = await this.makeRequest(`/v2/last/trade/${symbol}`);
                results.push(result);
                this.results.push(result);
                
                completed++;
                
                if (completed % 10 === 0) {
                    console.log(`  📊 Progress: ${completed}/${totalRequests} requests completed`);
                }
            }, interval);
        });
    }

    // Test 3: Concurrent Connection Test
    async testConcurrentConnections() {
        console.log('🌐 Test 3: Concurrent Connection Test (20 simultaneous connections)');
        
        const promises = [];
        const symbols = STRESS_SYMBOLS.slice(0, 20);
        
        // Create 20 concurrent requests with different endpoints
        for (let i = 0; i < symbols.length; i++) {
            const symbol = symbols[i];
            
            // Vary the endpoints to test different API paths
            let endpoint;
            switch (i % 4) {
                case 0:
                    endpoint = `/v2/last/trade/${symbol}`;
                    break;
                case 1:
                    endpoint = `/v3/reference/tickers/${symbol}`;
                    break;
                case 2:
                    endpoint = `/v2/snapshot/locale/us/markets/stocks/tickers/${symbol}`;
                    break;
                case 3:
                    endpoint = `/v2/aggs/ticker/${symbol}/prev`;
                    break;
            }
            
            promises.push(this.makeRequest(endpoint));
        }
        
        const results = await Promise.all(promises);
        
        const successful = results.filter(r => r.success && r.status === 200).length;
        const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
        
        console.log(`  🎯 Max Concurrent: ${this.maxConcurrent}`);
        console.log(`  ✅ Successful: ${successful}/${results.length}`);
        console.log(`  ⏱️  Avg Response Time: ${avgResponseTime.toFixed(0)}ms`);
        
        this.results.push(...results);
        return results;
    }

    // Test 4: Data Volume Test (Large dataset requests)
    async testDataVolume() {
        console.log('📊 Test 4: Data Volume Test (Large dataset requests)');
        
        const symbol = 'AAPL';
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
        
        const from = startDate.toISOString().split('T')[0];
        const to = endDate.toISOString().split('T')[0];
        
        const result = await this.makeRequest(
            `/v2/aggs/ticker/${symbol}/range/1/day/${from}/${to}`,
            { adjusted: true, sort: 'asc', limit: 5000 }
        );
        
        console.log(`  📈 Symbol: ${symbol}`);
        console.log(`  📅 Date Range: ${from} to ${to}`);
        console.log(`  📊 Response Time: ${result.responseTime}ms`);
        console.log(`  💾 Data Size: ${(result.dataSize / 1024).toFixed(1)} KB`);
        
        if (result.success && result.data.results) {
            console.log(`  📋 Records: ${result.data.results.length}`);
        }
        
        this.results.push(result);
        return result;
    }

    // Test 5: Error Recovery Test
    async testErrorRecovery() {
        console.log('🔧 Test 5: Error Recovery Test');
        
        // Test with invalid symbols and endpoints
        const errorTests = [
            { endpoint: '/v2/last/trade/INVALID123', name: 'Invalid Symbol' },
            { endpoint: '/v2/invalid/endpoint/AAPL', name: 'Invalid Endpoint' },
            { endpoint: '/v2/last/trade/', name: 'Missing Symbol' }
        ];
        
        const results = [];
        
        for (const test of errorTests) {
            const result = await this.makeRequest(test.endpoint);
            console.log(`  ${test.name}: Status ${result.status} (${result.responseTime}ms)`);
            results.push(result);
            this.results.push(result);
        }
        
        return results;
    }

    // Memory usage monitoring
    getMemoryUsage() {
        const usage = process.memoryUsage();
        return {
            rss: Math.round(usage.rss / 1024 / 1024 * 100) / 100, // MB
            heapTotal: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100, // MB
            heapUsed: Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100, // MB
            external: Math.round(usage.external / 1024 / 1024 * 100) / 100 // MB
        };
    }

    // Generate comprehensive stress test report
    generateStressReport() {
        const totalTime = Date.now() - this.startTime;
        const totalRequests = this.results.length;
        const successfulRequests = this.results.filter(r => r.success && r.status === 200).length;
        const rateLimitedRequests = this.results.filter(r => r.status === 429).length;
        const forbiddenRequests = this.results.filter(r => r.status === 403).length;
        const errorRequests = this.results.filter(r => !r.success || (r.status !== 200 && r.status !== 403)).length;
        
        const avgResponseTime = this.results.reduce((sum, r) => sum + r.responseTime, 0) / totalRequests;
        const minResponseTime = Math.min(...this.results.map(r => r.responseTime));
        const maxResponseTime = Math.max(...this.results.map(r => r.responseTime));
        
        const requestsPerSecond = (totalRequests / (totalTime / 1000)).toFixed(2);
        const memoryUsage = this.getMemoryUsage();
        
        console.log('\n' + '='.repeat(70));
        console.log('🔥 POLYGON.IO API STRESS TEST REPORT');
        console.log('='.repeat(70));
        
        console.log('\n📊 Overall Performance:');
        console.log(`  Total Requests: ${totalRequests}`);
        console.log(`  Total Duration: ${(totalTime / 1000).toFixed(1)}s`);
        console.log(`  Requests/Second: ${requestsPerSecond}`);
        console.log(`  Max Concurrent: ${this.maxConcurrent}`);
        
        console.log('\n✅ Request Status:');
        console.log(`  Successful (200): ${successfulRequests} (${(successfulRequests/totalRequests*100).toFixed(1)}%)`);
        console.log(`  Forbidden (403): ${forbiddenRequests} (${(forbiddenRequests/totalRequests*100).toFixed(1)}%)`);
        console.log(`  Rate Limited (429): ${rateLimitedRequests} (${(rateLimitedRequests/totalRequests*100).toFixed(1)}%)`);
        console.log(`  Errors: ${errorRequests} (${(errorRequests/totalRequests*100).toFixed(1)}%)`);
        
        console.log('\n⏱️ Response Times:');
        console.log(`  Average: ${avgResponseTime.toFixed(0)}ms`);
        console.log(`  Minimum: ${minResponseTime}ms`);
        console.log(`  Maximum: ${maxResponseTime}ms`);
        
        console.log('\n💾 Memory Usage:');
        console.log(`  RSS: ${memoryUsage.rss} MB`);
        console.log(`  Heap Used: ${memoryUsage.heapUsed} MB`);
        console.log(`  Heap Total: ${memoryUsage.heapTotal} MB`);
        
        // Save stress test report
        const reportData = {
            timestamp: new Date().toISOString(),
            summary: {
                totalRequests,
                totalDuration: totalTime,
                requestsPerSecond: parseFloat(requestsPerSecond),
                maxConcurrent: this.maxConcurrent,
                successfulRequests,
                forbiddenRequests,
                rateLimitedRequests,
                errorRequests
            },
            performance: {
                avgResponseTime,
                minResponseTime,
                maxResponseTime
            },
            memoryUsage,
            detailedResults: this.results
        };
        
        fs.writeFileSync('polygon-stress-test-report.json', JSON.stringify(reportData, null, 2));
        console.log('\n📁 Detailed stress report saved to: polygon-stress-test-report.json');
        console.log('='.repeat(70));
    }

    // Main stress test runner
    async runStressTests() {
        try {
            console.log('🚀 Starting comprehensive stress testing...\n');
            
            // Test 1: Burst requests
            await this.testBurstRequests();
            await this.sleep(2000);
            
            // Test 2: Sustained load
            await this.testSustainedLoad();
            await this.sleep(2000);
            
            // Test 3: Concurrent connections
            await this.testConcurrentConnections();
            await this.sleep(2000);
            
            // Test 4: Data volume
            await this.testDataVolume();
            await this.sleep(2000);
            
            // Test 5: Error recovery
            await this.testErrorRecovery();
            
            // Generate comprehensive report
            this.generateStressReport();
            
        } catch (error) {
            console.error('💥 Stress test failed:', error);
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Run the stress tests
if (require.main === module) {
    const tester = new PolygonStressTester();
    tester.runStressTests().then(() => {
        console.log('\n🎉 All stress tests completed!');
    }).catch(error => {
        console.error('💥 Stress test execution failed:', error);
        process.exit(1);
    });
}

module.exports = PolygonStressTester;
