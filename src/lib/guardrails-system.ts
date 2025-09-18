// Advanced Guardrails System for TradeGPT
import { AIChatMessage, ToolCall, ToolResult } from '@/types'

export interface GuardrailConfig {
  riskLimits: RiskLimits
  complianceRules: ComplianceRules
  safetyChecks: SafetyChecks
  contentFilters: ContentFilters
  rateLimits: RateLimits
  userProtection: UserProtection
}

export interface RiskLimits {
  maxPositionSize: number // Percentage of portfolio
  maxDailyLoss: number // Percentage of portfolio
  maxLeverage: number
  maxConcentration: number // Percentage in single stock
  minDiversification: number // Minimum number of positions
  maxVolatility: number // Maximum allowed volatility
  stopLossRequired: boolean
  takeProfitRequired: boolean
}

export interface ComplianceRules {
  disclaimers: string[]
  riskWarnings: string[]
  regulatoryCompliance: boolean
  insiderTradingCheck: boolean
  marketManipulationCheck: boolean
  suitabilityCheck: boolean
  knowYourCustomer: boolean
}

export interface SafetyChecks {
  inputValidation: boolean
  outputSanitization: boolean
  hallucinationDetection: boolean
  factChecking: boolean
  sourceVerification: boolean
  confidenceThreshold: number
  uncertaintyHandling: boolean
}

export interface ContentFilters {
  profanityFilter: boolean
  personalInfoFilter: boolean
  financialAdviceFilter: boolean
  marketTimingFilter: boolean
  pumpAndDumpFilter: boolean
  insiderInfoFilter: boolean
}

export interface RateLimits {
  maxRequestsPerMinute: number
  maxRequestsPerHour: number
  maxRequestsPerDay: number
  maxConcurrentSessions: number
  cooldownPeriod: number // milliseconds
}

export interface UserProtection {
  ageVerification: boolean
  experienceLevelCheck: boolean
  riskToleranceValidation: boolean
  investmentGoalValidation: boolean
  financialCapacityCheck: boolean
  coolingOffPeriod: number // hours
}

export interface GuardrailResult {
  passed: boolean
  warnings: GuardrailWarning[]
  errors: GuardrailError[]
  recommendations: string[]
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  confidence: number
  requiresHumanReview: boolean
}

export interface GuardrailWarning {
  type: 'risk' | 'compliance' | 'safety' | 'content' | 'rate' | 'protection'
  severity: 'low' | 'medium' | 'high'
  message: string
  code: string
  suggestion?: string
}

export interface GuardrailError {
  type: 'risk' | 'compliance' | 'safety' | 'content' | 'rate' | 'protection'
  severity: 'medium' | 'high' | 'critical'
  message: string
  code: string
  action: 'block' | 'modify' | 'flag' | 'require_approval'
}

export class GuardrailsSystem {
  private static instance: GuardrailsSystem
  private config: GuardrailConfig
  private violationHistory = new Map<string, any[]>()
  private rateLimitTracker = new Map<string, number[]>()

  static getInstance(): GuardrailsSystem {
    if (!GuardrailsSystem.instance) {
      GuardrailsSystem.instance = new GuardrailsSystem()
    }
    return GuardrailsSystem.instance
  }

  constructor() {
    this.config = this.getDefaultConfig()
  }

  // Main guardrail check for AI responses
  async checkResponse(
    userId: string,
    sessionId: string,
    userMessage: AIChatMessage,
    aiResponse: AIChatMessage,
    toolCalls?: ToolCall[],
    toolResults?: ToolResult[]
  ): Promise<GuardrailResult> {
    const result: GuardrailResult = {
      passed: true,
      warnings: [],
      errors: [],
      recommendations: [],
      riskLevel: 'low',
      confidence: 1.0,
      requiresHumanReview: false
    }

    // Run all guardrail checks
    await Promise.all([
      this.checkRiskLimits(userId, sessionId, aiResponse, toolResults, result),
      this.checkComplianceRules(userId, sessionId, aiResponse, result),
      this.checkSafetyChecks(userId, sessionId, aiResponse, result),
      this.checkContentFilters(userId, sessionId, aiResponse, result),
      this.checkRateLimits(userId, sessionId, result),
      this.checkUserProtection(userId, sessionId, aiResponse, result)
    ])

    // Determine overall result
    result.passed = result.errors.length === 0
    result.riskLevel = this.calculateRiskLevel(result)
    result.confidence = this.calculateConfidence(result)
    result.requiresHumanReview = this.requiresHumanReview(result)

    // Add recommendations
    result.recommendations = this.generateRecommendations(result)

    return result
  }

  // Check risk limits for trading recommendations
  private async checkRiskLimits(
    userId: string,
    sessionId: string,
    aiResponse: AIChatMessage,
    toolResults: ToolResult[] | undefined,
    result: GuardrailResult
  ): Promise<void> {
    const content = aiResponse.content.toLowerCase()
    
    // Check for trading recommendations
    if (this.containsTradingRecommendation(content)) {
      const riskAnalysis = await this.analyzeTradingRisk(content, toolResults)
      
      // Check position size limits
      if (riskAnalysis.positionSize > this.config.riskLimits.maxPositionSize) {
        result.errors.push({
          type: 'risk',
          severity: 'high',
          message: `Recommended position size (${riskAnalysis.positionSize}%) exceeds maximum allowed (${this.config.riskLimits.maxPositionSize}%)`,
          code: 'RISK_POSITION_SIZE_EXCEEDED',
          action: 'modify'
        })
      }

      // Check leverage limits
      if (riskAnalysis.leverage > this.config.riskLimits.maxLeverage) {
        result.errors.push({
          type: 'risk',
          severity: 'critical',
          message: `Recommended leverage (${riskAnalysis.leverage}x) exceeds maximum allowed (${this.config.riskLimits.maxLeverage}x)`,
          code: 'RISK_LEVERAGE_EXCEEDED',
          action: 'block'
        })
      }

      // Check concentration limits
      if (riskAnalysis.concentration > this.config.riskLimits.maxConcentration) {
        result.warnings.push({
          type: 'risk',
          severity: 'medium',
          message: `High concentration in single position (${riskAnalysis.concentration}%)`,
          code: 'RISK_HIGH_CONCENTRATION',
          suggestion: 'Consider diversifying across multiple positions'
        })
      }

      // Check for required stop loss
      if (this.config.riskLimits.stopLossRequired && !riskAnalysis.hasStopLoss) {
        result.warnings.push({
          type: 'risk',
          severity: 'medium',
          message: 'Stop loss recommendation is required for risk management',
          code: 'RISK_MISSING_STOP_LOSS',
          suggestion: 'Always include stop loss levels in trading recommendations'
        })
      }

      // Check volatility limits
      if (riskAnalysis.volatility > this.config.riskLimits.maxVolatility) {
        result.warnings.push({
          type: 'risk',
          severity: 'high',
          message: `High volatility recommendation (${riskAnalysis.volatility}%)`,
          code: 'RISK_HIGH_VOLATILITY',
          suggestion: 'Consider lower volatility alternatives'
        })
      }
    }
  }

  // Check compliance rules
  private async checkComplianceRules(
    userId: string,
    sessionId: string,
    aiResponse: AIChatMessage,
    result: GuardrailResult
  ): Promise<void> {
    const content = aiResponse.content

    // Check for required disclaimers
    const requiredDisclaimers = this.config.complianceRules.disclaimers
    const missingDisclaimers = requiredDisclaimers.filter(disclaimer => 
      !content.toLowerCase().includes(disclaimer.toLowerCase())
    )

    if (missingDisclaimers.length > 0) {
      result.warnings.push({
        type: 'compliance',
        severity: 'medium',
        message: 'Missing required disclaimers',
        code: 'COMPLIANCE_MISSING_DISCLAIMERS',
        suggestion: `Add disclaimers: ${missingDisclaimers.join(', ')}`
      })
    }

    // Check for insider trading indicators
    if (this.config.complianceRules.insiderTradingCheck) {
      if (this.containsInsiderInfo(content)) {
        result.errors.push({
          type: 'compliance',
          severity: 'critical',
          message: 'Content may contain insider information',
          code: 'COMPLIANCE_INSIDER_INFO',
          action: 'block'
        })
      }
    }

    // Check for market manipulation indicators
    if (this.config.complianceRules.marketManipulationCheck) {
      if (this.containsMarketManipulation(content)) {
        result.errors.push({
          type: 'compliance',
          severity: 'critical',
          message: 'Content may promote market manipulation',
          code: 'COMPLIANCE_MARKET_MANIPULATION',
          action: 'block'
        })
      }
    }

    // Check suitability
    if (this.config.complianceRules.suitabilityCheck) {
      const suitabilityResult = await this.checkSuitability(userId, content)
      if (!suitabilityResult.suitable) {
        result.warnings.push({
          type: 'compliance',
          severity: 'medium',
          message: 'Recommendation may not be suitable for user profile',
          code: 'COMPLIANCE_SUITABILITY_WARNING',
          suggestion: 'Consider user risk tolerance and investment goals'
        })
      }
    }
  }

  // Check safety and accuracy
  private async checkSafetyChecks(
    userId: string,
    sessionId: string,
    aiResponse: AIChatMessage,
    result: GuardrailResult
  ): Promise<void> {
    const content = aiResponse.content

    // Check for hallucinations
    if (this.config.safetyChecks.hallucinationDetection) {
      const hallucinationScore = await this.detectHallucinations(content)
      if (hallucinationScore > 0.7) {
        result.warnings.push({
          type: 'safety',
          severity: 'high',
          message: 'Response may contain inaccurate or hallucinated information',
          code: 'SAFETY_HALLUCINATION_DETECTED',
          suggestion: 'Verify information with reliable sources'
        })
      }
    }

    // Check confidence threshold
    const confidence = aiResponse.metadata?.confidence || 0.5
    if (confidence < this.config.safetyChecks.confidenceThreshold) {
      result.warnings.push({
        type: 'safety',
        severity: 'medium',
        message: `Low confidence response (${confidence * 100}%)`,
        code: 'SAFETY_LOW_CONFIDENCE',
        suggestion: 'Consider providing more conservative recommendations'
      })
    }

    // Check for factual accuracy
    if (this.config.safetyChecks.factChecking) {
      const factCheckResult = await this.factCheck(content)
      if (!factCheckResult.accurate) {
        result.warnings.push({
          type: 'safety',
          severity: 'medium',
          message: 'Some information may be inaccurate',
          code: 'SAFETY_FACT_CHECK_FAILED',
          suggestion: 'Verify facts with multiple sources'
        })
      }
    }
  }

  // Check content filters
  private async checkContentFilters(
    userId: string,
    sessionId: string,
    aiResponse: AIChatMessage,
    result: GuardrailResult
  ): Promise<void> {
    const content = aiResponse.content

    // Check for profanity
    if (this.config.contentFilters.profanityFilter) {
      if (this.containsProfanity(content)) {
        result.errors.push({
          type: 'content',
          severity: 'medium',
          message: 'Content contains inappropriate language',
          code: 'CONTENT_PROFANITY',
          action: 'modify'
        })
      }
    }

    // Check for personal information
    if (this.config.contentFilters.personalInfoFilter) {
      if (this.containsPersonalInfo(content)) {
        result.errors.push({
          type: 'content',
          severity: 'high',
          message: 'Content may contain personal information',
          code: 'CONTENT_PERSONAL_INFO',
          action: 'block'
        })
      }
    }

    // Check for financial advice
    if (this.config.contentFilters.financialAdviceFilter) {
      if (this.containsFinancialAdvice(content)) {
        result.warnings.push({
          type: 'content',
          severity: 'medium',
          message: 'Content contains financial advice',
          code: 'CONTENT_FINANCIAL_ADVICE',
          suggestion: 'Include appropriate disclaimers'
        })
      }
    }

    // Check for market timing
    if (this.config.contentFilters.marketTimingFilter) {
      if (this.containsMarketTiming(content)) {
        result.warnings.push({
          type: 'content',
          severity: 'medium',
          message: 'Content may promote market timing',
          code: 'CONTENT_MARKET_TIMING',
          suggestion: 'Focus on long-term strategies'
        })
      }
    }
  }

  // Check rate limits
  private async checkRateLimits(
    userId: string,
    sessionId: string,
    result: GuardrailResult
  ): Promise<void> {
    const key = `${userId}:${sessionId}`
    const now = Date.now()
    
    if (!this.rateLimitTracker.has(key)) {
      this.rateLimitTracker.set(key, [])
    }
    
    const requests = this.rateLimitTracker.get(key)!
    
    // Clean old requests
    const validRequests = requests.filter(time => now - time < 60000) // Last minute
    this.rateLimitTracker.set(key, validRequests)
    
    // Check per-minute limit
    if (validRequests.length >= this.config.rateLimits.maxRequestsPerMinute) {
      result.errors.push({
        type: 'rate',
        severity: 'medium',
        message: 'Rate limit exceeded (per minute)',
        code: 'RATE_LIMIT_PER_MINUTE',
        action: 'block'
      })
      return
    }
    
    // Add current request
    validRequests.push(now)
    this.rateLimitTracker.set(key, validRequests)
  }

  // Check user protection
  private async checkUserProtection(
    userId: string,
    sessionId: string,
    aiResponse: AIChatMessage,
    result: GuardrailResult
  ): Promise<void> {
    // Check experience level
    if (this.config.userProtection.experienceLevelCheck) {
      const userExperience = await this.getUserExperienceLevel(userId)
      const contentComplexity = this.assessContentComplexity(aiResponse.content)
      
      if (contentComplexity > userExperience + 1) {
        result.warnings.push({
          type: 'protection',
          severity: 'medium',
          message: 'Content may be too complex for user experience level',
          code: 'PROTECTION_COMPLEXITY_MISMATCH',
          suggestion: 'Simplify explanation for user experience level'
        })
      }
    }

    // Check risk tolerance
    if (this.config.userProtection.riskToleranceValidation) {
      const userRiskTolerance = await this.getUserRiskTolerance(userId)
      const contentRisk = this.assessContentRisk(aiResponse.content)
      
      if (contentRisk > userRiskTolerance) {
        result.warnings.push({
          type: 'protection',
          severity: 'high',
          message: 'Content risk exceeds user risk tolerance',
          code: 'PROTECTION_RISK_MISMATCH',
          suggestion: 'Provide lower-risk alternatives'
        })
      }
    }
  }

  // Helper methods
  private containsTradingRecommendation(content: string): boolean {
    const tradingKeywords = [
      'buy', 'sell', 'trade', 'position', 'entry', 'exit', 'stop loss',
      'take profit', 'target', 'recommend', 'suggest', 'advise'
    ]
    return tradingKeywords.some(keyword => content.includes(keyword))
  }

  private async analyzeTradingRisk(content: string, toolResults?: ToolResult[]): Promise<{
    positionSize: number
    leverage: number
    concentration: number
    volatility: number
    hasStopLoss: boolean
  }> {
    // This would integrate with real risk analysis
    return {
      positionSize: 5, // 5% default
      leverage: 1, // 1x default
      concentration: 10, // 10% default
      volatility: 20, // 20% default
      hasStopLoss: content.toLowerCase().includes('stop loss')
    }
  }

  private containsInsiderInfo(content: string): boolean {
    const insiderKeywords = [
      'insider', 'non-public', 'confidential', 'material non-public',
      'earnings preview', 'merger talks', 'acquisition talks'
    ]
    return insiderKeywords.some(keyword => content.toLowerCase().includes(keyword))
  }

  private containsMarketManipulation(content: string): boolean {
    const manipulationKeywords = [
      'pump', 'dump', 'manipulate', 'artificial', 'fake', 'false',
      'misleading', 'deceptive', 'coordinated', 'group effort'
    ]
    return manipulationKeywords.some(keyword => content.toLowerCase().includes(keyword))
  }

  private async checkSuitability(userId: string, content: string): Promise<{ suitable: boolean }> {
    // This would check against user profile
    return { suitable: true }
  }

  private async detectHallucinations(content: string): Promise<number> {
    // This would use advanced hallucination detection
    return 0.1 // Low hallucination score
  }

  private async factCheck(content: string): Promise<{ accurate: boolean }> {
    // This would use fact-checking services
    return { accurate: true }
  }

  private containsProfanity(content: string): boolean {
    const profanityList = ['bad', 'word', 'list'] // Simplified for demo
    return profanityList.some(word => content.toLowerCase().includes(word))
  }

  private containsPersonalInfo(content: string): boolean {
    const personalPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b\d{4}-\d{4}-\d{4}-\d{4}\b/, // Credit card
      /\b\d{10}\b/ // Phone number
    ]
    return personalPatterns.some(pattern => pattern.test(content))
  }

  private containsFinancialAdvice(content: string): boolean {
    const adviceKeywords = [
      'you should', 'you must', 'you need to', 'I recommend',
      'I suggest', 'I advise', 'you ought to'
    ]
    return adviceKeywords.some(keyword => content.toLowerCase().includes(keyword))
  }

  private containsMarketTiming(content: string): boolean {
    const timingKeywords = [
      'time the market', 'market timing', 'perfect entry',
      'exact bottom', 'exact top', 'crystal ball'
    ]
    return timingKeywords.some(keyword => content.toLowerCase().includes(keyword))
  }

  private async getUserExperienceLevel(userId: string): Promise<number> {
    // This would fetch from user profile
    return 2 // Intermediate level
  }

  private assessContentComplexity(content: string): number {
    // Simple complexity assessment
    const words = content.split(' ').length
    const technicalTerms = ['volatility', 'beta', 'alpha', 'sharpe', 'correlation'].filter(term => 
      content.toLowerCase().includes(term)
    ).length
    return Math.min(5, Math.floor(words / 50) + technicalTerms)
  }

  private async getUserRiskTolerance(userId: string): Promise<number> {
    // This would fetch from user profile
    return 3 // Moderate risk tolerance
  }

  private assessContentRisk(content: string): number {
    // Simple risk assessment
    const riskKeywords = ['high risk', 'volatile', 'speculative', 'aggressive'].filter(keyword => 
      content.toLowerCase().includes(keyword)
    ).length
    return Math.min(5, riskKeywords + 1)
  }

  private calculateRiskLevel(result: GuardrailResult): 'low' | 'medium' | 'high' | 'critical' {
    const criticalErrors = result.errors.filter(e => e.severity === 'critical').length
    const highErrors = result.errors.filter(e => e.severity === 'high').length
    const highWarnings = result.warnings.filter(w => w.severity === 'high').length

    if (criticalErrors > 0) return 'critical'
    if (highErrors > 0 || highWarnings > 2) return 'high'
    if (result.errors.length > 0 || result.warnings.length > 3) return 'medium'
    return 'low'
  }

  private calculateConfidence(result: GuardrailResult): number {
    let confidence = 1.0
    
    // Reduce confidence based on errors and warnings
    result.errors.forEach(error => {
      if (error.severity === 'critical') confidence -= 0.3
      else if (error.severity === 'high') confidence -= 0.2
      else confidence -= 0.1
    })
    
    result.warnings.forEach(warning => {
      if (warning.severity === 'high') confidence -= 0.1
      else confidence -= 0.05
    })
    
    return Math.max(0.1, confidence)
  }

  private requiresHumanReview(result: GuardrailResult): boolean {
    return result.riskLevel === 'critical' || 
           result.errors.some(e => e.severity === 'critical') ||
           result.confidence < 0.5
  }

  private generateRecommendations(result: GuardrailResult): string[] {
    const recommendations: string[] = []
    
    if (result.riskLevel === 'high' || result.riskLevel === 'critical') {
      recommendations.push('Consider consulting with a financial advisor')
    }
    
    if (result.warnings.some(w => w.type === 'risk')) {
      recommendations.push('Review risk management strategies')
    }
    
    if (result.warnings.some(w => w.type === 'compliance')) {
      recommendations.push('Ensure compliance with regulatory requirements')
    }
    
    return recommendations
  }

  private getDefaultConfig(): GuardrailConfig {
    return {
      riskLimits: {
        maxPositionSize: 10, // 10% max position size
        maxDailyLoss: 5, // 5% max daily loss
        maxLeverage: 2, // 2x max leverage
        maxConcentration: 20, // 20% max concentration
        minDiversification: 5, // Minimum 5 positions
        maxVolatility: 30, // 30% max volatility
        stopLossRequired: true,
        takeProfitRequired: false
      },
      complianceRules: {
        disclaimers: [
          'This is not financial advice',
          'Past performance does not guarantee future results',
          'Investing involves risk of loss'
        ],
        riskWarnings: [
          'Consider your risk tolerance',
          'Diversify your portfolio',
          'Consult with a financial advisor'
        ],
        regulatoryCompliance: true,
        insiderTradingCheck: true,
        marketManipulationCheck: true,
        suitabilityCheck: true,
        knowYourCustomer: true
      },
      safetyChecks: {
        inputValidation: true,
        outputSanitization: true,
        hallucinationDetection: true,
        factChecking: true,
        sourceVerification: true,
        confidenceThreshold: 0.6,
        uncertaintyHandling: true
      },
      contentFilters: {
        profanityFilter: true,
        personalInfoFilter: true,
        financialAdviceFilter: true,
        marketTimingFilter: true,
        pumpAndDumpFilter: true,
        insiderInfoFilter: true
      },
      rateLimits: {
        maxRequestsPerMinute: 10,
        maxRequestsPerHour: 100,
        maxRequestsPerDay: 1000,
        maxConcurrentSessions: 3,
        cooldownPeriod: 60000 // 1 minute
      },
      userProtection: {
        ageVerification: true,
        experienceLevelCheck: true,
        riskToleranceValidation: true,
        investmentGoalValidation: true,
        financialCapacityCheck: true,
        coolingOffPeriod: 24 // 24 hours
      }
    }
  }
}

// Export singleton instance
export const guardrailsSystem = GuardrailsSystem.getInstance()
