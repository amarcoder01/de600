import { LRUCache } from 'lru-cache'
import { EventEmitter } from 'events'

export interface CacheConfig {
  maxSize: number
  ttl: number // Time to live in milliseconds
  staleWhileRevalidate: number // Additional time to serve stale data while revalidating
  updateAgeOnGet: boolean
}

export interface CircuitBreakerConfig {
  failureThreshold: number // Number of failures before opening circuit
  resetTimeout: number // Time to wait before attempting to close circuit
  monitoringPeriod: number // Time window for failure counting
  volumeThreshold: number // Minimum number of requests before circuit can open
}

export interface PerformanceMetrics {
  requestCount: number
  averageResponseTime: number
  p95ResponseTime: number
  p99ResponseTime: number
  errorRate: number
  cacheHitRate: number
  circuitBreakerStatus: 'closed' | 'open' | 'half-open'
  lastUpdated: string
}

export interface ProcessingPipeline<T, R> {
  id: string
  stages: PipelineStage<any, any>[]
  parallelism: number
  timeout: number
  retryConfig: RetryConfig
}

export interface PipelineStage<T, R> {
  name: string
  processor: (input: T) => Promise<R>
  timeout: number
  retries: number
  fallback?: (input: T, error?: Error) => Promise<R>
}

export interface RetryConfig {
  maxAttempts: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
  jitter: boolean
}

export interface OptimizationStrategy {
  name: string
  condition: (metrics: PerformanceMetrics) => boolean
  action: (optimizer: PerformanceOptimizer) => Promise<void>
  priority: number
}

export class CircuitBreaker extends EventEmitter {
  private state: 'closed' | 'open' | 'half-open' = 'closed'
  private failures = 0
  private requests = 0
  private lastFailureTime = 0
  private nextAttempt = 0
  private readonly config: CircuitBreakerConfig

  constructor(config: CircuitBreakerConfig) {
    super()
    this.config = config
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is open')
      }
      this.state = 'half-open'
      this.emit('stateChange', 'half-open')
    }

    this.requests++

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess(): void {
    this.failures = 0
    if (this.state === 'half-open') {
      this.state = 'closed'
      this.emit('stateChange', 'closed')
    }
  }

  private onFailure(): void {
    this.failures++
    this.lastFailureTime = Date.now()

    if (this.requests >= this.config.volumeThreshold &&
        this.failures >= this.config.failureThreshold) {
      this.state = 'open'
      this.nextAttempt = Date.now() + this.config.resetTimeout
      this.emit('stateChange', 'open')
    }
  }

  getState(): 'closed' | 'open' | 'half-open' {
    return this.state
  }

  getMetrics(): { failures: number; requests: number; state: string } {
    return {
      failures: this.failures,
      requests: this.requests,
      state: this.state
    }
  }

  reset(): void {
    this.state = 'closed'
    this.failures = 0
    this.requests = 0
    this.lastFailureTime = 0
    this.nextAttempt = 0
    this.emit('stateChange', 'closed')
  }
}

export class IntelligentCache<K extends {}, V extends {}> {
  private cache: LRUCache<K, V>
  private staleCache: LRUCache<K, { value: V; timestamp: number }>
  private revalidationPromises: Map<K, Promise<V>> = new Map()
  private hitCount = 0
  private missCount = 0
  private readonly config: CacheConfig

  constructor(config: CacheConfig) {
    this.config = config
    this.cache = new LRUCache({
      max: config.maxSize,
      ttl: config.ttl,
      updateAgeOnGet: config.updateAgeOnGet
    })
    
    this.staleCache = new LRUCache({
      max: Math.floor(config.maxSize * 0.5),
      ttl: config.ttl + config.staleWhileRevalidate
    })
  }

  async get(
    key: K,
    fetcher: () => Promise<V>,
    options?: { forceRefresh?: boolean }
  ): Promise<V> {
    if (options?.forceRefresh) {
      return this.fetchAndCache(key, fetcher)
    }

    // Check main cache first
    const cached = this.cache.get(key)
    if (cached !== undefined) {
      this.hitCount++
      return cached
    }

    // Check if revalidation is in progress
    const revalidationPromise = this.revalidationPromises.get(key)
    if (revalidationPromise) {
      return revalidationPromise
    }

    // Check stale cache
    const stale = this.staleCache.get(key)
    if (stale) {
      // Serve stale data while revalidating in background
      this.revalidateInBackground(key, fetcher)
      this.hitCount++
      return stale.value
    }

    // Cache miss - fetch fresh data
    this.missCount++
    return this.fetchAndCache(key, fetcher)
  }

  private async fetchAndCache(key: K, fetcher: () => Promise<V>): Promise<V> {
    const promise = fetcher()
    this.revalidationPromises.set(key, promise)

    try {
      const value = await promise
      this.cache.set(key, value)
      
      // Also store in stale cache for future stale-while-revalidate
      this.staleCache.set(key, {
        value,
        timestamp: Date.now()
      })
      
      return value
    } finally {
      this.revalidationPromises.delete(key)
    }
  }

  private revalidateInBackground(key: K, fetcher: () => Promise<V>): void {
    // Don't start multiple revalidations for the same key
    if (this.revalidationPromises.has(key)) {
      return
    }

    const promise = this.fetchAndCache(key, fetcher).catch(error => {
      console.warn(`Background revalidation failed for key ${String(key)}:`, error)
    })

    this.revalidationPromises.set(key, promise as Promise<V>)
  }

  set(key: K, value: V): void {
    this.cache.set(key, value)
    this.staleCache.set(key, {
      value,
      timestamp: Date.now()
    })
  }

  delete(key: K): boolean {
    this.staleCache.delete(key)
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
    this.staleCache.clear()
    this.revalidationPromises.clear()
    this.hitCount = 0
    this.missCount = 0
  }

  getHitRate(): number {
    const total = this.hitCount + this.missCount
    return total > 0 ? this.hitCount / total : 0
  }

  getStats(): { hits: number; misses: number; hitRate: number; size: number } {
    return {
      hits: this.hitCount,
      misses: this.missCount,
      hitRate: this.getHitRate(),
      size: this.cache.size
    }
  }
}

export class AsyncProcessingPipeline<T, R> {
  private readonly pipeline: ProcessingPipeline<T, R>
  private readonly semaphore: Map<string, number> = new Map()
  private readonly metrics: Map<string, { duration: number; success: boolean; timestamp: number }[]> = new Map()

  constructor(pipeline: ProcessingPipeline<T, R>) {
    this.pipeline = pipeline
  }

  async process(input: T): Promise<R> {
    const startTime = Date.now()
    let currentData: any = input

    try {
      for (const stage of this.pipeline.stages) {
        currentData = await this.processStage(stage, currentData)
      }

      this.recordMetrics(this.pipeline.id, Date.now() - startTime, true)
      return currentData as R
    } catch (error) {
      this.recordMetrics(this.pipeline.id, Date.now() - startTime, false)
      throw error
    }
  }

  private async processStage<I, O>(stage: PipelineStage<I, O>, input: I): Promise<O> {
    const semaphoreKey = `${this.pipeline.id}_${stage.name}`
    
    // Implement semaphore for parallelism control
    await this.acquireSemaphore(semaphoreKey)

    try {
      return await this.executeWithRetry(stage, input)
    } finally {
      this.releaseSemaphore(semaphoreKey)
    }
  }

  private async executeWithRetry<I, O>(stage: PipelineStage<I, O>, input: I): Promise<O> {
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= stage.retries + 1; attempt++) {
      try {
        return await this.executeWithTimeout(stage.processor, input, stage.timeout)
      } catch (error) {
        lastError = error as Error
        
        if (attempt <= stage.retries) {
          const delay = this.calculateRetryDelay(attempt)
          await this.sleep(delay)
        }
      }
    }

    // Try fallback if available
    if (stage.fallback && lastError) {
      try {
        return await this.executeWithTimeout(stage.fallback, input, stage.timeout, lastError)
      } catch (fallbackError) {
        throw new Error(`Stage ${stage.name} failed: ${lastError.message}. Fallback also failed: ${(fallbackError as Error).message}`)
      }
    }

    throw lastError || new Error(`Stage ${stage.name} failed after ${stage.retries + 1} attempts`)
  }

  private async executeWithTimeout<I, O>(
    processor: (input: I, error?: Error) => Promise<O>,
    input: I,
    timeout: number,
    error?: Error
  ): Promise<O> {
    return Promise.race([
      processor(input, error),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Operation timed out after ${timeout}ms`)), timeout)
      })
    ])
  }

  private calculateRetryDelay(attempt: number): number {
    const { baseDelay, maxDelay, backoffMultiplier, jitter } = this.pipeline.retryConfig
    
    let delay = baseDelay * Math.pow(backoffMultiplier, attempt - 1)
    delay = Math.min(delay, maxDelay)
    
    if (jitter) {
      delay *= (0.5 + Math.random() * 0.5) // Add 0-50% jitter
    }
    
    return delay
  }

  private async acquireSemaphore(key: string): Promise<void> {
    const current = this.semaphore.get(key) || 0
    
    if (current >= this.pipeline.parallelism) {
      // Wait for a slot to become available
      await new Promise<void>(resolve => {
        const checkSlot = () => {
          const currentCount = this.semaphore.get(key) || 0
          if (currentCount < this.pipeline.parallelism) {
            this.semaphore.set(key, currentCount + 1)
            resolve()
          } else {
            setTimeout(checkSlot, 10) // Check again in 10ms
          }
        }
        checkSlot()
      })
    } else {
      this.semaphore.set(key, current + 1)
    }
  }

  private releaseSemaphore(key: string): void {
    const current = this.semaphore.get(key) || 0
    this.semaphore.set(key, Math.max(0, current - 1))
  }

  private recordMetrics(pipelineId: string, duration: number, success: boolean): void {
    if (!this.metrics.has(pipelineId)) {
      this.metrics.set(pipelineId, [])
    }
    
    const metrics = this.metrics.get(pipelineId)!
    metrics.push({
      duration,
      success,
      timestamp: Date.now()
    })
    
    // Keep only recent metrics (last 1000 entries)
    if (metrics.length > 1000) {
      this.metrics.set(pipelineId, metrics.slice(-1000))
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  getMetrics(pipelineId: string): { avgDuration: number; successRate: number; throughput: number } {
    const metrics = this.metrics.get(pipelineId) || []
    
    if (metrics.length === 0) {
      return { avgDuration: 0, successRate: 0, throughput: 0 }
    }
    
    const avgDuration = metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length
    const successRate = metrics.filter(m => m.success).length / metrics.length
    
    // Calculate throughput (requests per second) over last minute
    const oneMinuteAgo = Date.now() - 60000
    const recentMetrics = metrics.filter(m => m.timestamp > oneMinuteAgo)
    const throughput = recentMetrics.length / 60
    
    return { avgDuration, successRate, throughput }
  }
}

export class PerformanceOptimizer extends EventEmitter {
  private readonly caches: Map<string, IntelligentCache<any, any>> = new Map()
  private readonly circuitBreakers: Map<string, CircuitBreaker> = new Map()
  private readonly pipelines: Map<string, AsyncProcessingPipeline<any, any>> = new Map()
  private readonly responseTimes: number[] = []
  private readonly optimizationStrategies: OptimizationStrategy[] = []
  private metricsInterval: NodeJS.Timeout | null = null
  private readonly maxResponseTimeHistory = 1000

  constructor() {
    super()
    this.initializeDefaultStrategies()
    this.startMetricsCollection()
  }

  private initializeDefaultStrategies(): void {
    // Strategy 1: Increase cache size when hit rate is low
    this.optimizationStrategies.push({
      name: 'increase_cache_size',
      condition: (metrics) => metrics.cacheHitRate < 0.7 && metrics.averageResponseTime > 300,
      action: async (optimizer) => {
        for (const [name, cache] of Array.from(optimizer.caches.entries())) {
          const stats = cache.getStats()
          if (stats.hitRate < 0.7) {
            console.log(`Increasing cache size for ${name} due to low hit rate: ${stats.hitRate}`)
            // Implementation would resize cache
          }
        }
      },
      priority: 1
    })

    // Strategy 2: Open circuit breakers when error rate is high
    this.optimizationStrategies.push({
      name: 'circuit_breaker_protection',
      condition: (metrics) => metrics.errorRate > 0.1,
      action: async (optimizer) => {
        console.log('High error rate detected, circuit breakers may activate')
        // Circuit breakers handle this automatically
      },
      priority: 2
    })

    // Strategy 3: Reduce parallelism when response times are high
    this.optimizationStrategies.push({
      name: 'reduce_parallelism',
      condition: (metrics) => metrics.p95ResponseTime > 1000,
      action: async (optimizer) => {
        console.log('High response times detected, consider reducing parallelism')
        // Implementation would adjust pipeline parallelism
      },
      priority: 3
    })
  }

  createCache<K extends {}, V extends {}>(name: string, config: CacheConfig): IntelligentCache<K, V> {
    const cache = new IntelligentCache<K, V>(config)
    this.caches.set(name, cache)
    return cache
  }

  createCircuitBreaker(name: string, config: CircuitBreakerConfig): CircuitBreaker {
    const circuitBreaker = new CircuitBreaker(config)
    this.circuitBreakers.set(name, circuitBreaker)
    
    circuitBreaker.on('stateChange', (state) => {
      this.emit('circuitBreakerStateChange', { name, state })
    })
    
    return circuitBreaker
  }

  createPipeline<T, R>(pipeline: ProcessingPipeline<T, R>): AsyncProcessingPipeline<T, R> {
    const processingPipeline = new AsyncProcessingPipeline(pipeline)
    this.pipelines.set(pipeline.id, processingPipeline)
    return processingPipeline
  }

  recordResponseTime(duration: number): void {
    this.responseTimes.push(duration)
    
    // Keep only recent response times
    if (this.responseTimes.length > this.maxResponseTimeHistory) {
      this.responseTimes.shift()
    }
  }

  getMetrics(): PerformanceMetrics {
    const now = new Date().toISOString()
    
    // Calculate response time metrics
    const sortedTimes = [...this.responseTimes].sort((a, b) => a - b)
    const averageResponseTime = sortedTimes.length > 0 
      ? sortedTimes.reduce((sum, time) => sum + time, 0) / sortedTimes.length 
      : 0
    
    const p95Index = Math.floor(sortedTimes.length * 0.95)
    const p99Index = Math.floor(sortedTimes.length * 0.99)
    const p95ResponseTime = sortedTimes[p95Index] || 0
    const p99ResponseTime = sortedTimes[p99Index] || 0
    
    // Calculate cache hit rate
    let totalHits = 0
    let totalRequests = 0
    
    for (const cache of Array.from(this.caches.values())) {
      const stats = cache.getStats()
      totalHits += stats.hits
      totalRequests += stats.hits + stats.misses
    }
    
    const cacheHitRate = totalRequests > 0 ? totalHits / totalRequests : 0
    
    // Get circuit breaker status
    const circuitBreakerStates = Array.from(this.circuitBreakers.values()).map(cb => cb.getState())
    const circuitBreakerStatus = circuitBreakerStates.includes('open') ? 'open' 
      : circuitBreakerStates.includes('half-open') ? 'half-open' 
      : 'closed'
    
    return {
      requestCount: this.responseTimes.length,
      averageResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      errorRate: 0, // Would be calculated from actual error tracking
      cacheHitRate,
      circuitBreakerStatus,
      lastUpdated: now
    }
  }

  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      const metrics = this.getMetrics()
      
      // Apply optimization strategies
      this.optimizationStrategies
        .sort((a, b) => a.priority - b.priority)
        .forEach(strategy => {
          if (strategy.condition(metrics)) {
            strategy.action(this).catch(error => {
              console.error(`Optimization strategy ${strategy.name} failed:`, error)
            })
          }
        })
      
      this.emit('metricsUpdated', metrics)
    }, 30000) // Every 30 seconds
  }

  addOptimizationStrategy(strategy: OptimizationStrategy): void {
    this.optimizationStrategies.push(strategy)
  }

  removeOptimizationStrategy(name: string): boolean {
    const index = this.optimizationStrategies.findIndex(s => s.name === name)
    if (index >= 0) {
      this.optimizationStrategies.splice(index, 1)
      return true
    }
    return false
  }

  getCache<K extends {}, V extends {}>(name: string): IntelligentCache<K, V> | undefined {
    return this.caches.get(name) as IntelligentCache<K, V> | undefined
  }

  getCircuitBreaker(name: string): CircuitBreaker | undefined {
    return this.circuitBreakers.get(name)
  }

  getPipeline<T, R>(id: string): AsyncProcessingPipeline<T, R> | undefined {
    return this.pipelines.get(id) as AsyncProcessingPipeline<T, R> | undefined
  }

  clearAllCaches(): void {
    for (const cache of Array.from(this.caches.values())) {
      cache.clear()
    }
  }

  resetAllCircuitBreakers(): void {
    for (const circuitBreaker of Array.from(this.circuitBreakers.values())) {
      circuitBreaker.reset()
    }
  }

  destroy(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval)
      this.metricsInterval = null
    }
    
    this.clearAllCaches()
    this.resetAllCircuitBreakers()
    this.removeAllListeners()
  }
}

// Global performance optimizer instance
export const performanceOptimizer = new PerformanceOptimizer()

// Utility functions for common optimization patterns
export const withCache = async <T extends {}>(
  key: string,
  fetcher: () => Promise<T>,
  cacheName = 'default',
  cacheConfig?: Partial<CacheConfig>
): Promise<T> => {
  let cache = performanceOptimizer.getCache<string, T>(cacheName)
  
  if (!cache) {
    const defaultConfig: CacheConfig = {
      maxSize: 1000,
      ttl: 300000, // 5 minutes
      staleWhileRevalidate: 60000, // 1 minute
      updateAgeOnGet: true
    }
    
    cache = performanceOptimizer.createCache(cacheName, { ...defaultConfig, ...cacheConfig })
  }
  
  return cache.get(key, fetcher)
}

export const withCircuitBreaker = async <T>(
  operation: () => Promise<T>,
  breakerName = 'default',
  config?: Partial<CircuitBreakerConfig>
): Promise<T> => {
  let circuitBreaker = performanceOptimizer.getCircuitBreaker(breakerName)
  
  if (!circuitBreaker) {
    const defaultConfig: CircuitBreakerConfig = {
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      monitoringPeriod: 60000, // 1 minute
      volumeThreshold: 10
    }
    
    circuitBreaker = performanceOptimizer.createCircuitBreaker(breakerName, { ...defaultConfig, ...config })
  }
  
  return circuitBreaker.execute(operation)
}

export const measurePerformance = <T extends (...args: any[]) => Promise<any>>(
  fn: T
): T => {
  return (async (...args: any[]) => {
    const startTime = Date.now()
    try {
      const result = await fn(...args)
      performanceOptimizer.recordResponseTime(Date.now() - startTime)
      return result
    } catch (error) {
      performanceOptimizer.recordResponseTime(Date.now() - startTime)
      throw error
    }
  }) as T
}