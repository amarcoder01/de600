import { SearchResult } from './UniversalSearchAPI'
import { CrawledStockData } from './FinancialSiteCrawler'
import { SemanticSearchResult } from './DataDiscoveryEngine'

export interface SynthesizedData {
  ticker: string
  consolidatedInfo: {
    price?: {
      value: number
      confidence: number
      sources: string[]
      timestamp: string
      variance: number
    }
    marketCap?: {
      value: number
      confidence: number
      sources: string[]
      timestamp: string
    }
    volume?: {
      value: number
      confidence: number
      sources: string[]
      timestamp: string
    }
    fundamentals?: {
      peRatio?: number
      dividendYield?: number
      eps?: number
      confidence: number
      sources: string[]
    }
    sentiment?: {
      score: number // -1 to 1
      confidence: number
      sources: string[]
      breakdown: {
        positive: number
        negative: number
        neutral: number
      }
    }
  }
  qualityScore: number
  conflictResolution: ConflictResolution[]
  factCheckResults: FactCheckResult[]
  sourceReliability: SourceReliability[]
  synthesisMetadata: {
    processedAt: string
    processingTime: number
    sourcesAnalyzed: number
    conflictsResolved: number
    confidenceLevel: 'low' | 'medium' | 'high'
  }
}

export interface ConflictResolution {
  field: string
  conflictType: 'value_mismatch' | 'source_disagreement' | 'temporal_inconsistency'
  conflictingValues: Array<{
    value: any
    source: string
    confidence: number
    timestamp: string
  }>
  resolution: {
    chosenValue: any
    reasoning: string
    confidence: number
    method: 'weighted_average' | 'highest_confidence' | 'most_recent' | 'consensus'
  }
}

export interface FactCheckResult {
  claim: string
  field: string
  value: any
  verification: {
    status: 'verified' | 'disputed' | 'unverified' | 'impossible_to_verify'
    confidence: number
    supportingSources: string[]
    contradictingSources: string[]
    reasoning: string
  }
  crossReferences: Array<{
    source: string
    value: any
    agreement: boolean
    reliability: number
  }>
}

export interface SourceReliability {
  source: string
  domain: string
  reliabilityScore: number // 0-1
  factors: {
    historicalAccuracy: number
    updateFrequency: number
    dataCompleteness: number
    sourceReputation: number
  }
  trackRecord: {
    totalChecks: number
    accurateChecks: number
    inaccurateChecks: number
    lastUpdated: string
  }
}

export interface ValidationRule {
  name: string
  field: string
  validator: (value: any, context: any) => boolean
  errorMessage: string
  severity: 'low' | 'medium' | 'high'
}

export class InformationSynthesis {
  private sourceReliabilityMap: Map<string, SourceReliability> = new Map()
  private validationRules: ValidationRule[] = []
  private conflictResolutionStrategies: Map<string, (conflicts: any[]) => any> = new Map()
  private factCheckCache: Map<string, FactCheckResult> = new Map()
  private synthesisHistory: Map<string, SynthesizedData[]> = new Map()
  private readonly cacheTimeout = 300000 // 5 minutes

  constructor() {
    this.initializeSourceReliability()
    this.initializeValidationRules()
    this.initializeConflictResolutionStrategies()
  }

  private initializeSourceReliability() {
    const sources = [
      {
        source: 'Yahoo Finance',
        domain: 'finance.yahoo.com',
        reliabilityScore: 0.95,
        factors: {
          historicalAccuracy: 0.95,
          updateFrequency: 0.98,
          dataCompleteness: 0.92,
          sourceReputation: 0.95
        }
      },
      {
        source: 'Bloomberg',
        domain: 'bloomberg.com',
        reliabilityScore: 0.96,
        factors: {
          historicalAccuracy: 0.97,
          updateFrequency: 0.95,
          dataCompleteness: 0.94,
          sourceReputation: 0.98
        }
      },
      {
        source: 'MarketWatch',
        domain: 'marketwatch.com',
        reliabilityScore: 0.90,
        factors: {
          historicalAccuracy: 0.88,
          updateFrequency: 0.92,
          dataCompleteness: 0.89,
          sourceReputation: 0.91
        }
      },
      {
        source: 'Reuters',
        domain: 'reuters.com',
        reliabilityScore: 0.93,
        factors: {
          historicalAccuracy: 0.94,
          updateFrequency: 0.90,
          dataCompleteness: 0.91,
          sourceReputation: 0.96
        }
      },
      {
        source: 'Finviz',
        domain: 'finviz.com',
        reliabilityScore: 0.85,
        factors: {
          historicalAccuracy: 0.83,
          updateFrequency: 0.87,
          dataCompleteness: 0.88,
          sourceReputation: 0.82
        }
      },
      {
        source: 'Seeking Alpha',
        domain: 'seekingalpha.com',
        reliabilityScore: 0.75,
        factors: {
          historicalAccuracy: 0.72,
          updateFrequency: 0.78,
          dataCompleteness: 0.76,
          sourceReputation: 0.74
        }
      }
    ]

    sources.forEach(sourceData => {
      const reliability: SourceReliability = {
        ...sourceData,
        trackRecord: {
          totalChecks: 0,
          accurateChecks: 0,
          inaccurateChecks: 0,
          lastUpdated: new Date().toISOString()
        }
      }
      this.sourceReliabilityMap.set(sourceData.source, reliability)
    })
  }

  private initializeValidationRules() {
    this.validationRules = [
      {
        name: 'price_range_validation',
        field: 'price',
        validator: (value: number) => value > 0 && value < 100000,
        errorMessage: 'Stock price must be between $0 and $100,000',
        severity: 'high'
      },
      {
        name: 'market_cap_validation',
        field: 'marketCap',
        validator: (value: number) => value > 0 && value < 10e12,
        errorMessage: 'Market cap must be positive and reasonable',
        severity: 'medium'
      },
      {
        name: 'volume_validation',
        field: 'volume',
        validator: (value: number) => value >= 0,
        errorMessage: 'Trading volume cannot be negative',
        severity: 'high'
      },
      {
        name: 'pe_ratio_validation',
        field: 'peRatio',
        validator: (value: number) => value > -100 && value < 1000,
        errorMessage: 'P/E ratio must be within reasonable bounds',
        severity: 'medium'
      },
      {
        name: 'dividend_yield_validation',
        field: 'dividendYield',
        validator: (value: number) => value >= 0 && value <= 50,
        errorMessage: 'Dividend yield must be between 0% and 50%',
        severity: 'medium'
      }
    ]
  }

  private initializeConflictResolutionStrategies() {
    // Weighted average strategy
    this.conflictResolutionStrategies.set('weighted_average', (conflicts) => {
      const totalWeight = conflicts.reduce((sum, c) => sum + c.confidence, 0)
      const weightedSum = conflicts.reduce((sum, c) => sum + (c.value * c.confidence), 0)
      return totalWeight > 0 ? weightedSum / totalWeight : conflicts[0]?.value
    })

    // Highest confidence strategy
    this.conflictResolutionStrategies.set('highest_confidence', (conflicts) => {
      return conflicts.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      ).value
    })

    // Most recent strategy
    this.conflictResolutionStrategies.set('most_recent', (conflicts) => {
      return conflicts.reduce((latest, current) => 
        new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest
      ).value
    })

    // Consensus strategy
    this.conflictResolutionStrategies.set('consensus', (conflicts) => {
      const valueGroups = new Map()
      conflicts.forEach(c => {
        const key = typeof c.value === 'number' ? Math.round(c.value * 100) / 100 : c.value
        if (!valueGroups.has(key)) {
          valueGroups.set(key, [])
        }
        valueGroups.get(key).push(c)
      })
      
      let bestGroup: Array<{ value: any; source: string; confidence: number; timestamp: string }> = []
      let bestScore = 0
      
      Array.from(valueGroups.entries()).forEach(([value, group]) => {
        const score = group.reduce((sum: number, c: { value: any; source: string; confidence: number; timestamp: string }) => sum + c.confidence, 0)
        if (score > bestScore) {
          bestScore = score
          bestGroup = group
        }
      })
      
      return bestGroup[0]?.value
    })
  }

  async synthesizeInformation(
    ticker: string,
    crawledData: CrawledStockData[],
    searchResults: SearchResult[],
    semanticResults?: SemanticSearchResult[]
  ): Promise<SynthesizedData> {
    const startTime = Date.now()
    
    try {
      // Step 1: Validate input data
      const validatedData = this.validateInputData(crawledData)
      
      // Step 2: Identify and resolve conflicts
      const conflictResolutions = await this.resolveConflicts(ticker, validatedData)
      
      // Step 3: Perform fact-checking
      const factCheckResults = await this.performFactChecking(ticker, validatedData, searchResults)
      
      // Step 4: Consolidate information
      const consolidatedInfo = this.consolidateInformation(validatedData, conflictResolutions)
      
      // Step 5: Calculate quality score
      const qualityScore = this.calculateQualityScore(validatedData, conflictResolutions, factCheckResults)
      
      // Step 6: Generate source reliability assessment
      const sourceReliability = this.assessSourceReliability(validatedData)
      
      const synthesizedData: SynthesizedData = {
        ticker,
        consolidatedInfo,
        qualityScore,
        conflictResolution: conflictResolutions,
        factCheckResults,
        sourceReliability,
        synthesisMetadata: {
          processedAt: new Date().toISOString(),
          processingTime: Date.now() - startTime,
          sourcesAnalyzed: validatedData.length,
          conflictsResolved: conflictResolutions.length,
          confidenceLevel: this.determineConfidenceLevel(qualityScore)
        }
      }
      
      // Store in history
      this.updateSynthesisHistory(ticker, synthesizedData)
      
      return synthesizedData
    } catch (error) {
      console.error('Information synthesis error:', error)
      throw new Error(`Synthesis failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private validateInputData(data: CrawledStockData[]): CrawledStockData[] {
    return data.filter(item => {
      for (const rule of this.validationRules) {
        const value = (item as any)[rule.field]
        if (value !== undefined && value !== null && !rule.validator(value, item)) {
          console.warn(`Validation failed for ${item.ticker} ${rule.field}: ${rule.errorMessage}`)
          if (rule.severity === 'high') {
            return false // Exclude this data point
          }
        }
      }
      return true
    })
  }

  private async resolveConflicts(ticker: string, data: CrawledStockData[]): Promise<ConflictResolution[]> {
    const conflicts: ConflictResolution[] = []
    const fields = ['price', 'marketCap', 'volume', 'peRatio', 'dividendYield']
    
    for (const field of fields) {
      const fieldData = data
        .filter(item => (item as any)[field] !== undefined && (item as any)[field] !== null)
        .map(item => ({
          value: (item as any)[field],
          source: item.source,
          confidence: item.confidence,
          timestamp: item.timestamp
        }))
      
      if (fieldData.length > 1) {
        const conflict = this.detectConflict(field, fieldData)
        if (conflict) {
          const resolution = this.resolveConflict(field, fieldData)
          conflicts.push({
            field,
            conflictType: conflict.type,
            conflictingValues: fieldData,
            resolution
          })
        }
      }
    }
    
    return conflicts
  }

  private detectConflict(field: string, data: Array<{ value: any; source: string; confidence: number; timestamp: string }>): { type: ConflictResolution['conflictType'] } | null {
    if (data.length < 2) return null
    
    const values = data.map(d => d.value)
    const uniqueValues = Array.from(new Set(values))
    
    if (uniqueValues.length === 1) return null // No conflict
    
    // For numeric values, check if variance is significant
    if (typeof values[0] === 'number') {
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
      const coefficientOfVariation = Math.sqrt(variance) / mean
      
      if (coefficientOfVariation > 0.1) { // 10% threshold
        return { type: 'value_mismatch' }
      }
    } else {
      return { type: 'source_disagreement' }
    }
    
    // Check temporal inconsistency
    const timestamps = data.map(d => new Date(d.timestamp).getTime())
    const timeSpread = Math.max(...timestamps) - Math.min(...timestamps)
    if (timeSpread > 3600000) { // 1 hour
      return { type: 'temporal_inconsistency' }
    }
    
    return null
  }

  private resolveConflict(
    field: string,
    data: Array<{ value: any; source: string; confidence: number; timestamp: string }>
  ): ConflictResolution['resolution'] {
    // Choose resolution strategy based on field type and data characteristics
    let strategy: string
    let reasoning: string
    
    if (field === 'price' || field === 'volume') {
      // For real-time data, prefer most recent
      strategy = 'most_recent'
      reasoning = 'Used most recent value for real-time financial data'
    } else if (data.some(d => d.confidence > 0.9)) {
      // If we have high-confidence sources, use them
      strategy = 'highest_confidence'
      reasoning = 'Selected value from highest confidence source'
    } else {
      // Default to weighted average for numeric data
      strategy = 'weighted_average'
      reasoning = 'Calculated weighted average based on source confidence'
    }
    
    const resolver = this.conflictResolutionStrategies.get(strategy)!
    const chosenValue = resolver(data)
    
    // Calculate confidence in the resolution
    const confidence = this.calculateResolutionConfidence(strategy, data, chosenValue)
    
    return {
      chosenValue,
      reasoning,
      confidence,
      method: strategy as ConflictResolution['resolution']['method']
    }
  }

  private calculateResolutionConfidence(
    strategy: string,
    data: Array<{ value: any; source: string; confidence: number; timestamp: string }>,
    resolvedValue: any
  ): number {
    switch (strategy) {
      case 'highest_confidence':
        return Math.max(...data.map(d => d.confidence))
      
      case 'most_recent':
        const mostRecent = data.reduce((latest, current) => 
          new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest
        )
        return mostRecent.confidence
      
      case 'weighted_average':
        const totalWeight = data.reduce((sum, d) => sum + d.confidence, 0)
        return totalWeight / data.length
      
      case 'consensus':
        const agreeing = data.filter(d => d.value === resolvedValue)
        return agreeing.reduce((sum, d) => sum + d.confidence, 0) / agreeing.length
      
      default:
        return 0.5
    }
  }

  private async performFactChecking(
    ticker: string,
    data: CrawledStockData[],
    searchResults: SearchResult[]
  ): Promise<FactCheckResult[]> {
    const factCheckResults: FactCheckResult[] = []
    const fields = ['price', 'marketCap', 'volume']
    
    for (const field of fields) {
      const fieldData = data.filter(item => (item as any)[field] !== undefined)
      
      if (fieldData.length > 0) {
        const primaryValue = fieldData[0]
        const cacheKey = `${ticker}_${field}_${(primaryValue as any)[field]}`
        
        // Check cache first
        const cached = this.factCheckCache.get(cacheKey)
        if (cached && Date.now() - new Date(cached.verification.supportingSources[0] || '').getTime() < this.cacheTimeout) {
          factCheckResults.push(cached)
          continue
        }
        
        // Perform cross-reference checking
        const crossReferences = this.performCrossReferenceCheck(field, (primaryValue as any)[field], data, searchResults)
        
        // Determine verification status
        const verification = this.determineVerificationStatus(crossReferences)
        
        const factCheckResult: FactCheckResult = {
          claim: `${ticker} ${field} is ${(primaryValue as any)[field]}`,
          field,
          value: (primaryValue as any)[field],
          verification,
          crossReferences
        }
        
        factCheckResults.push(factCheckResult)
        this.factCheckCache.set(cacheKey, factCheckResult)
      }
    }
    
    return factCheckResults
  }

  private performCrossReferenceCheck(
    field: string,
    value: any,
    data: CrawledStockData[],
    searchResults: SearchResult[]
  ): FactCheckResult['crossReferences'] {
    const crossReferences: FactCheckResult['crossReferences'] = []
    
    // Check against other crawled data
    const otherSources = data.filter(item => (item as any)[field] !== undefined)
    
    for (const source of otherSources) {
      const sourceValue = (source as any)[field]
      const agreement = this.valuesAgree(value, sourceValue, field)
      const reliability = this.sourceReliabilityMap.get(source.source)?.reliabilityScore || 0.5
      
      crossReferences.push({
        source: source.source,
        value: sourceValue,
        agreement,
        reliability
      })
    }
    
    // Check against search results (simplified - would need more sophisticated extraction)
    for (const result of searchResults.slice(0, 5)) {
      const extractedValue = this.extractValueFromSearchResult(result, field)
      if (extractedValue !== null) {
        const agreement = this.valuesAgree(value, extractedValue, field)
        const domain = new URL(result.url).hostname
        const reliability = this.sourceReliabilityMap.get(domain)?.reliabilityScore || 0.3
        
        crossReferences.push({
          source: result.source,
          value: extractedValue,
          agreement,
          reliability
        })
      }
    }
    
    return crossReferences
  }

  private valuesAgree(value1: any, value2: any, field: string): boolean {
    if (typeof value1 === 'number' && typeof value2 === 'number') {
      // For numeric values, allow small variance
      const tolerance = field === 'price' ? 0.05 : 0.1 // 5% for price, 10% for others
      const difference = Math.abs(value1 - value2) / Math.max(value1, value2)
      return difference <= tolerance
    }
    
    return value1 === value2
  }

  private extractValueFromSearchResult(result: SearchResult, field: string): any {
    // Simplified extraction - in practice, would use more sophisticated NLP
    const text = `${result.title} ${result.snippet}`.toLowerCase()
    
    switch (field) {
      case 'price':
        const priceMatch = text.match(/\$([0-9,]+\.?[0-9]*)/)
        return priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : null
      
      case 'volume':
        const volumeMatch = text.match(/volume[:\s]+([0-9,]+)/)
        return volumeMatch ? parseInt(volumeMatch[1].replace(/,/g, '')) : null
      
      default:
        return null
    }
  }

  private determineVerificationStatus(
    crossReferences: FactCheckResult['crossReferences']
  ): FactCheckResult['verification'] {
    if (crossReferences.length === 0) {
      return {
        status: 'impossible_to_verify',
        confidence: 0,
        supportingSources: [],
        contradictingSources: [],
        reasoning: 'No cross-references available for verification'
      }
    }
    
    const supporting = crossReferences.filter(ref => ref.agreement)
    const contradicting = crossReferences.filter(ref => !ref.agreement)
    
    const supportingWeight = supporting.reduce((sum, ref) => sum + ref.reliability, 0)
    const contradictingWeight = contradicting.reduce((sum, ref) => sum + ref.reliability, 0)
    
    const totalWeight = supportingWeight + contradictingWeight
    const supportRatio = totalWeight > 0 ? supportingWeight / totalWeight : 0
    
    let status: FactCheckResult['verification']['status']
    let confidence: number
    let reasoning: string
    
    if (supportRatio >= 0.8) {
      status = 'verified'
      confidence = supportRatio
      reasoning = `Verified by ${supporting.length} reliable sources`
    } else if (supportRatio <= 0.2) {
      status = 'disputed'
      confidence = 1 - supportRatio
      reasoning = `Disputed by ${contradicting.length} sources`
    } else {
      status = 'unverified'
      confidence = 0.5
      reasoning = 'Mixed evidence from sources'
    }
    
    return {
      status,
      confidence,
      supportingSources: supporting.map(ref => ref.source),
      contradictingSources: contradicting.map(ref => ref.source),
      reasoning
    }
  }

  private consolidateInformation(
    data: CrawledStockData[],
    conflicts: ConflictResolution[]
  ): SynthesizedData['consolidatedInfo'] {
    const consolidated: SynthesizedData['consolidatedInfo'] = {}
    
    // Helper function to get resolved value or best available
    const getValue = (field: string) => {
      const conflict = conflicts.find(c => c.field === field)
      if (conflict) {
        return {
          value: conflict.resolution.chosenValue,
          confidence: conflict.resolution.confidence,
          sources: conflict.conflictingValues.map(cv => cv.source),
          method: 'conflict_resolution'
        }
      }
      
      const fieldData = data.filter(item => (item as any)[field] !== undefined)
      if (fieldData.length > 0) {
        const best = fieldData.reduce((best, current) => 
          current.confidence > best.confidence ? current : best
        )
        return {
          value: (best as any)[field],
          confidence: best.confidence,
          sources: [best.source],
          method: 'best_source'
        }
      }
      
      return null
    }
    
    // Consolidate price information
    const priceInfo = getValue('price')
    if (priceInfo) {
      const priceData = data.filter(item => item.price !== undefined)
      const prices = priceData.map(item => item.price!)
      const variance = prices.length > 1 ? this.calculateVariance(prices) : 0
      
      consolidated.price = {
        value: priceInfo.value,
        confidence: priceInfo.confidence,
        sources: priceInfo.sources,
        timestamp: new Date().toISOString(),
        variance
      }
    }
    
    // Consolidate market cap
    const marketCapInfo = getValue('marketCap')
    if (marketCapInfo) {
      consolidated.marketCap = {
        value: marketCapInfo.value,
        confidence: marketCapInfo.confidence,
        sources: marketCapInfo.sources,
        timestamp: new Date().toISOString()
      }
    }
    
    // Consolidate volume
    const volumeInfo = getValue('volume')
    if (volumeInfo) {
      consolidated.volume = {
        value: volumeInfo.value,
        confidence: volumeInfo.confidence,
        sources: volumeInfo.sources,
        timestamp: new Date().toISOString()
      }
    }
    
    // Consolidate fundamentals
    const peInfo = getValue('peRatio')
    const dividendInfo = getValue('dividendYield')
    
    if (peInfo || dividendInfo) {
      consolidated.fundamentals = {
        confidence: Math.max(peInfo?.confidence || 0, dividendInfo?.confidence || 0),
        sources: [...(peInfo?.sources || []), ...(dividendInfo?.sources || [])]
      }
      
      if (peInfo) consolidated.fundamentals.peRatio = peInfo.value
      if (dividendInfo) consolidated.fundamentals.dividendYield = dividendInfo.value
    }
    
    return consolidated
  }

  private calculateVariance(values: number[]): number {
    if (values.length < 2) return 0
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    return variance
  }

  private calculateQualityScore(
    data: CrawledStockData[],
    conflicts: ConflictResolution[],
    factChecks: FactCheckResult[]
  ): number {
    let score = 0.5 // Base score
    
    // Source diversity bonus
    const uniqueSources = new Set(data.map(item => item.source)).size
    score += Math.min(uniqueSources * 0.05, 0.2)
    
    // Data completeness bonus
    const fields = ['price', 'marketCap', 'volume', 'peRatio', 'dividendYield']
    const completeness = fields.filter(field => 
      data.some(item => (item as any)[field] !== undefined)
    ).length / fields.length
    score += completeness * 0.2
    
    // Conflict resolution penalty
    const conflictPenalty = Math.min(conflicts.length * 0.05, 0.15)
    score -= conflictPenalty
    
    // Fact-check bonus/penalty
    const verifiedCount = factChecks.filter(fc => fc.verification.status === 'verified').length
    const disputedCount = factChecks.filter(fc => fc.verification.status === 'disputed').length
    
    if (factChecks.length > 0) {
      const factCheckScore = (verifiedCount - disputedCount) / factChecks.length
      score += factCheckScore * 0.2
    }
    
    // Source reliability bonus
    const avgReliability = data.reduce((sum, item) => {
      const reliability = this.sourceReliabilityMap.get(item.source)?.reliabilityScore || 0.5
      return sum + reliability
    }, 0) / data.length
    score += (avgReliability - 0.5) * 0.3
    
    return Math.max(0, Math.min(1, score))
  }

  private assessSourceReliability(data: CrawledStockData[]): SourceReliability[] {
    const sourceMap = new Map<string, CrawledStockData[]>()
    
    // Group data by source
    data.forEach(item => {
      if (!sourceMap.has(item.source)) {
        sourceMap.set(item.source, [])
      }
      sourceMap.get(item.source)!.push(item)
    })
    
    const assessments: SourceReliability[] = []
    
    for (const [source, items] of Array.from(sourceMap.entries())) {
      const existing = this.sourceReliabilityMap.get(source)
      if (existing) {
        // Update track record
        existing.trackRecord.totalChecks += items.length
        existing.trackRecord.lastUpdated = new Date().toISOString()
        assessments.push(existing)
      } else {
        // Create new assessment for unknown source
        const newAssessment: SourceReliability = {
          source,
          domain: source.toLowerCase().replace(/\s+/g, ''),
          reliabilityScore: 0.5, // Default score
          factors: {
            historicalAccuracy: 0.5,
            updateFrequency: 0.5,
            dataCompleteness: items.length > 3 ? 0.7 : 0.4,
            sourceReputation: 0.5
          },
          trackRecord: {
            totalChecks: items.length,
            accurateChecks: 0,
            inaccurateChecks: 0,
            lastUpdated: new Date().toISOString()
          }
        }
        
        this.sourceReliabilityMap.set(source, newAssessment)
        assessments.push(newAssessment)
      }
    }
    
    return assessments
  }

  private determineConfidenceLevel(qualityScore: number): 'low' | 'medium' | 'high' {
    if (qualityScore >= 0.8) return 'high'
    if (qualityScore >= 0.6) return 'medium'
    return 'low'
  }

  private updateSynthesisHistory(ticker: string, data: SynthesizedData): void {
    if (!this.synthesisHistory.has(ticker)) {
      this.synthesisHistory.set(ticker, [])
    }
    
    const history = this.synthesisHistory.get(ticker)!
    history.push(data)
    
    // Keep only recent history (last 10 entries)
    if (history.length > 10) {
      this.synthesisHistory.set(ticker, history.slice(-10))
    }
  }

  // Public methods
  getSynthesisHistory(ticker: string): SynthesizedData[] {
    return this.synthesisHistory.get(ticker) || []
  }

  getSourceReliability(source: string): SourceReliability | undefined {
    return this.sourceReliabilityMap.get(source)
  }

  updateSourceReliability(source: string, updates: Partial<SourceReliability>): void {
    const existing = this.sourceReliabilityMap.get(source)
    if (existing) {
      Object.assign(existing, updates)
    }
  }

  clearCache(): void {
    this.factCheckCache.clear()
  }

  getValidationRules(): ValidationRule[] {
    return [...this.validationRules]
  }

  addValidationRule(rule: ValidationRule): void {
    this.validationRules.push(rule)
  }
}

export const informationSynthesis = new InformationSynthesis()