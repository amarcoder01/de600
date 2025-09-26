import { WebSearchScreenerService } from '../WebSearchScreenerService'
import { PerformanceOptimizer } from '../PerformanceOptimizer'

interface BenchmarkResult {
  testName: string
  averageTime: number
  minTime: number
  maxTime: number
  successRate: number
  throughput: number
  memoryUsage: number
}

interface BenchmarkConfig {
  iterations: number
  concurrency: number
  warmupRuns: number
  targetResponseTime: number
}

class PerformanceBenchmark {
  private service: WebSearchScreenerService
  private optimizer: PerformanceOptimizer
  private results: BenchmarkResult[] = []

  constructor() {
    this.service = new WebSearchScreenerService()
    this.optimizer = new PerformanceOptimizer()
  }

  async runBenchmarks(config: BenchmarkConfig = {
    iterations: 100,
    concurrency: 10,
    warmupRuns: 10,
    targetResponseTime: 500 // 500ms target
  }): Promise<BenchmarkResult[]> {
    console.log('🚀 Starting Performance Benchmarks...')
    console.log(`Configuration: ${JSON.stringify(config, null, 2)}`)

    // Warmup runs
    await this.warmup(config.warmupRuns)

    // Test scenarios
    const scenarios = [
      {
        name: 'Basic Web Search',
        query: 'technology stocks under $100',
        options: { limit: 20, useMultiSource: false, enableSynthesis: false }
      },
      {
        name: 'Enhanced Multi-Source Search',
        query: 'AI companies with high growth potential',
        options: { limit: 30, useMultiSource: true, enableSynthesis: true, maxSources: 3 }
      },
      {
        name: 'Complex Financial Query',
        query: 'dividend stocks in healthcare sector with P/E ratio under 15',
        options: { limit: 50, useMultiSource: true, enableSynthesis: true, maxSources: 5 }
      },
      {
        name: 'Stock Discovery',
        query: 'emerging renewable energy companies',
        options: { maxResults: 25, includeAnalysis: true, semanticSearch: true }
      }
    ]

    // Run benchmarks for each scenario
    for (const scenario of scenarios) {
      console.log(`\n📊 Testing: ${scenario.name}`)
      
      if (scenario.name === 'Stock Discovery') {
        const result = await this.benchmarkStockDiscovery(
          scenario.query,
          scenario.options,
          config
        )
        this.results.push(result)
      } else {
        const result = await this.benchmarkEnhancedSearch(
          scenario.query,
          scenario.options,
          config
        )
        this.results.push(result)
      }
    }

    // Run concurrency tests
    console.log('\n🔄 Testing Concurrent Requests...')
    const concurrencyResult = await this.benchmarkConcurrency(config)
    this.results.push(concurrencyResult)

    // Run cache performance tests
    console.log('\n💾 Testing Cache Performance...')
    const cacheResult = await this.benchmarkCachePerformance(config)
    this.results.push(cacheResult)

    // Generate report
    this.generateReport(config.targetResponseTime)

    return this.results
  }

  private async warmup(runs: number): Promise<void> {
    console.log(`🔥 Warming up with ${runs} runs...`)
    
    for (let i = 0; i < runs; i++) {
      try {
        await this.service.enhancedWebSearch('warmup query', {
          limit: 5,
          useMultiSource: false,
          enableSynthesis: false
        })
      } catch (error) {
        // Ignore warmup errors
      }
    }
    
    console.log('✅ Warmup completed')
  }

  private async benchmarkEnhancedSearch(
    query: string,
    options: any,
    config: BenchmarkConfig
  ): Promise<BenchmarkResult> {
    const times: number[] = []
    let successCount = 0
    const startMemory = process.memoryUsage().heapUsed

    for (let i = 0; i < config.iterations; i++) {
      const startTime = performance.now()
      
      try {
        await this.service.enhancedWebSearch(query, options)
        const endTime = performance.now()
        times.push(endTime - startTime)
        successCount++
      } catch (error) {
        console.warn(`Iteration ${i + 1} failed:`, error.message)
        times.push(Infinity) // Mark as failed
      }

      // Progress indicator
      if ((i + 1) % 10 === 0) {
        process.stdout.write(`${i + 1}/${config.iterations} `)
      }
    }

    const endMemory = process.memoryUsage().heapUsed
    const validTimes = times.filter(t => t !== Infinity)

    return {
      testName: `Enhanced Search: ${query.substring(0, 30)}...`,
      averageTime: validTimes.reduce((a, b) => a + b, 0) / validTimes.length,
      minTime: Math.min(...validTimes),
      maxTime: Math.max(...validTimes),
      successRate: (successCount / config.iterations) * 100,
      throughput: successCount / (validTimes.reduce((a, b) => a + b, 0) / 1000),
      memoryUsage: (endMemory - startMemory) / 1024 / 1024 // MB
    }
  }

  private async benchmarkStockDiscovery(
    context: string,
    options: any,
    config: BenchmarkConfig
  ): Promise<BenchmarkResult> {
    const times: number[] = []
    let successCount = 0
    const startMemory = process.memoryUsage().heapUsed

    for (let i = 0; i < config.iterations; i++) {
      const startTime = performance.now()
      
      try {
        await this.service.discoverStocks(context, options)
        const endTime = performance.now()
        times.push(endTime - startTime)
        successCount++
      } catch (error) {
        console.warn(`Discovery iteration ${i + 1} failed:`, error.message)
        times.push(Infinity)
      }

      if ((i + 1) % 10 === 0) {
        process.stdout.write(`${i + 1}/${config.iterations} `)
      }
    }

    const endMemory = process.memoryUsage().heapUsed
    const validTimes = times.filter(t => t !== Infinity)

    return {
      testName: `Stock Discovery: ${context.substring(0, 30)}...`,
      averageTime: validTimes.reduce((a, b) => a + b, 0) / validTimes.length,
      minTime: Math.min(...validTimes),
      maxTime: Math.max(...validTimes),
      successRate: (successCount / config.iterations) * 100,
      throughput: successCount / (validTimes.reduce((a, b) => a + b, 0) / 1000),
      memoryUsage: (endMemory - startMemory) / 1024 / 1024
    }
  }

  private async benchmarkConcurrency(config: BenchmarkConfig): Promise<BenchmarkResult> {
    const startTime = performance.now()
    const startMemory = process.memoryUsage().heapUsed
    
    const promises = Array.from({ length: config.concurrency }, (_, i) => 
      this.service.enhancedWebSearch(`concurrent test ${i}`, {
        limit: 10,
        useMultiSource: true,
        enableSynthesis: false
      }).catch(() => null) // Handle failures gracefully
    )

    const results = await Promise.all(promises)
    const endTime = performance.now()
    const endMemory = process.memoryUsage().heapUsed
    
    const successCount = results.filter(r => r !== null).length
    const totalTime = endTime - startTime

    return {
      testName: `Concurrent Requests (${config.concurrency} parallel)`,
      averageTime: totalTime / config.concurrency,
      minTime: totalTime / config.concurrency,
      maxTime: totalTime / config.concurrency,
      successRate: (successCount / config.concurrency) * 100,
      throughput: successCount / (totalTime / 1000),
      memoryUsage: (endMemory - startMemory) / 1024 / 1024
    }
  }

  private async benchmarkCachePerformance(config: BenchmarkConfig): Promise<BenchmarkResult> {
    const times: number[] = []
    const query = 'cache performance test'
    const options = { limit: 10, useMultiSource: false, enableSynthesis: false }
    
    // First request (cache miss)
    let startTime = performance.now()
    await this.service.enhancedWebSearch(query, options)
    let endTime = performance.now()
    const cacheMissTime = endTime - startTime

    // Subsequent requests (cache hits)
    for (let i = 0; i < 10; i++) {
      startTime = performance.now()
      await this.service.enhancedWebSearch(query, options)
      endTime = performance.now()
      times.push(endTime - startTime)
    }

    const averageCacheHitTime = times.reduce((a, b) => a + b, 0) / times.length
    const cacheEfficiency = ((cacheMissTime - averageCacheHitTime) / cacheMissTime) * 100

    return {
      testName: `Cache Performance (${cacheEfficiency.toFixed(1)}% efficiency)`,
      averageTime: averageCacheHitTime,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      successRate: 100,
      throughput: 10 / (times.reduce((a, b) => a + b, 0) / 1000),
      memoryUsage: 0
    }
  }

  private generateReport(targetResponseTime: number): void {
    console.log('\n\n📈 PERFORMANCE BENCHMARK REPORT')
    console.log('=' .repeat(80))
    
    const overallStats = {
      totalTests: this.results.length,
      passedTests: this.results.filter(r => r.averageTime <= targetResponseTime).length,
      averageResponseTime: this.results.reduce((sum, r) => sum + r.averageTime, 0) / this.results.length,
      averageSuccessRate: this.results.reduce((sum, r) => sum + r.successRate, 0) / this.results.length,
      totalMemoryUsage: this.results.reduce((sum, r) => sum + r.memoryUsage, 0)
    }

    console.log(`\n📊 OVERALL STATISTICS:`)
    console.log(`   Tests Passed: ${overallStats.passedTests}/${overallStats.totalTests} (${((overallStats.passedTests / overallStats.totalTests) * 100).toFixed(1)}%)`)
    console.log(`   Average Response Time: ${overallStats.averageResponseTime.toFixed(2)}ms (Target: ${targetResponseTime}ms)`)
    console.log(`   Average Success Rate: ${overallStats.averageSuccessRate.toFixed(1)}%`)
    console.log(`   Total Memory Usage: ${overallStats.totalMemoryUsage.toFixed(2)}MB`)

    console.log(`\n📋 DETAILED RESULTS:`)
    console.log('-'.repeat(120))
    console.log('Test Name'.padEnd(50) + 'Avg Time'.padEnd(12) + 'Min Time'.padEnd(12) + 'Max Time'.padEnd(12) + 'Success%'.padEnd(10) + 'Throughput'.padEnd(12) + 'Memory(MB)')
    console.log('-'.repeat(120))

    this.results.forEach(result => {
      const status = result.averageTime <= targetResponseTime ? '✅' : '❌'
      const name = `${status} ${result.testName}`.padEnd(50)
      const avgTime = `${result.averageTime.toFixed(1)}ms`.padEnd(12)
      const minTime = `${result.minTime.toFixed(1)}ms`.padEnd(12)
      const maxTime = `${result.maxTime.toFixed(1)}ms`.padEnd(12)
      const successRate = `${result.successRate.toFixed(1)}%`.padEnd(10)
      const throughput = `${result.throughput.toFixed(1)}/s`.padEnd(12)
      const memory = `${result.memoryUsage.toFixed(2)}MB`
      
      console.log(name + avgTime + minTime + maxTime + successRate + throughput + memory)
    })

    console.log('-'.repeat(120))

    // Performance recommendations
    console.log(`\n💡 RECOMMENDATIONS:`)
    
    if (overallStats.averageResponseTime > targetResponseTime) {
      console.log(`   ⚠️  Average response time (${overallStats.averageResponseTime.toFixed(2)}ms) exceeds target (${targetResponseTime}ms)`)
      console.log(`   🔧 Consider: Increase cache size, reduce parallelism, optimize queries`)
    } else {
      console.log(`   ✅ Average response time meets target requirements`)
    }

    if (overallStats.averageSuccessRate < 95) {
      console.log(`   ⚠️  Success rate (${overallStats.averageSuccessRate.toFixed(1)}%) is below 95%`)
      console.log(`   🔧 Consider: Implement better error handling, increase retry attempts`)
    } else {
      console.log(`   ✅ Success rate meets reliability requirements`)
    }

    if (overallStats.totalMemoryUsage > 100) {
      console.log(`   ⚠️  High memory usage detected (${overallStats.totalMemoryUsage.toFixed(2)}MB)`)
      console.log(`   🔧 Consider: Implement memory cleanup, reduce cache size`)
    } else {
      console.log(`   ✅ Memory usage is within acceptable limits`)
    }

    // Get system metrics
    const metrics = this.service.getPerformanceMetrics()
    console.log(`\n📈 SYSTEM METRICS:`)
    console.log(`   Cache Hit Rate: ${(metrics.cacheHitRate * 100).toFixed(1)}%`)
    console.log(`   Error Rate: ${(metrics.errorRate * 100).toFixed(1)}%`)
    console.log(`   Total Requests: ${metrics.totalRequests}`)
    console.log(`   Circuit Breaker States: ${JSON.stringify(metrics.circuitBreakerStates)}`)

    console.log('\n' + '='.repeat(80))
  }

  // Method to run a quick performance check
  async quickCheck(): Promise<boolean> {
    console.log('🏃‍♂️ Running Quick Performance Check...')
    
    const startTime = performance.now()
    
    try {
      await this.service.enhancedWebSearch('quick performance test', {
        limit: 10,
        useMultiSource: true,
        enableSynthesis: true,
        maxSources: 2
      })
      
      const responseTime = performance.now() - startTime
      const passed = responseTime <= 500
      
      console.log(`Response Time: ${responseTime.toFixed(2)}ms ${passed ? '✅' : '❌'}`)
      return passed
    } catch (error) {
      console.log(`Quick check failed: ${error.message} ❌`)
      return false
    }
  }
}

// Export for use in tests and manual benchmarking
export { PerformanceBenchmark, BenchmarkResult, BenchmarkConfig }

// CLI runner for manual benchmarking
if (require.main === module) {
  const benchmark = new PerformanceBenchmark()
  
  // Parse command line arguments
  const args = process.argv.slice(2)
  const isQuickCheck = args.includes('--quick')
  
  if (isQuickCheck) {
    benchmark.quickCheck().then(passed => {
      process.exit(passed ? 0 : 1)
    })
  } else {
    const config: BenchmarkConfig = {
      iterations: parseInt(args.find(arg => arg.startsWith('--iterations='))?.split('=')[1] || '50'),
      concurrency: parseInt(args.find(arg => arg.startsWith('--concurrency='))?.split('=')[1] || '5'),
      warmupRuns: parseInt(args.find(arg => arg.startsWith('--warmup='))?.split('=')[1] || '5'),
      targetResponseTime: parseInt(args.find(arg => arg.startsWith('--target='))?.split('=')[1] || '500')
    }
    
    benchmark.runBenchmarks(config).then(results => {
      const passed = results.every(r => r.averageTime <= config.targetResponseTime && r.successRate >= 95)
      process.exit(passed ? 0 : 1)
    }).catch(error => {
      console.error('Benchmark failed:', error)
      process.exit(1)
    })
  }
}