import OpenAI from 'openai'
import { FileInfo, FileStorageService } from './file-storage-service'
import { PDFProcessor } from './pdf-processor'
import { DocumentProcessor } from './document-processor'
import { FinancialChartAnalyzer } from './financial-chart-analyzer'
import { StructuredOutputFormatter } from './structured-output-formatter'

export interface AnalysisResult {
  contentType: 'financial-chart' | 'financial-document' | 'general-document' | 'general-image' | 'table-data'
  summary: string
  extractedText?: string
  keyInsights: string[]
  structuredData?: any
  chartAnalysis?: ChartAnalysis
  recommendations?: string[]
  confidence: number
  processingTime: number
  formattedOutput?: any
}

export interface ChartAnalysis {
  chartType: string
  timeframe?: string
  trends: TrendAnalysis[]
  technicalIndicators: TechnicalIndicator[]
  priceTargets?: PriceTarget[]
  riskAssessment: RiskAssessment
  marketContext: string
}

export interface TrendAnalysis {
  direction: 'bullish' | 'bearish' | 'sideways'
  strength: 'weak' | 'moderate' | 'strong'
  duration: string
  description: string
  supportLevels?: number[]
  resistanceLevels?: number[]
}

export interface TechnicalIndicator {
  name: string
  value: string | number
  signal: 'buy' | 'sell' | 'hold' | 'neutral'
  description: string
}

export interface PriceTarget {
  target: number
  timeframe: string
  probability: number
  rationale: string
  type: 'conservative' | 'moderate' | 'aggressive'
}

export interface RiskAssessment {
  level: 'low' | 'medium' | 'high'
  factors: string[]
  volatility: string
  recommendations: string[]
}

export class FileAnalysisService {
  private static readonly FINANCIAL_KEYWORDS = [
    'stock', 'price', 'chart', 'candlestick', 'volume', 'trading', 'market',
    'bull', 'bear', 'trend', 'support', 'resistance', 'rsi', 'macd', 'moving average',
    'earnings', 'revenue', 'profit', 'financial', 'analysis', 'forecast', 'target'
  ]

  static async analyzeFile(
    fileInfo: FileInfo,
    analysisMode: 'financial' | 'general',
    userPrompt: string,
    openai: OpenAI
  ): Promise<AnalysisResult> {
    const startTime = Date.now()

    try {
      console.log(`🔍 Starting analysis for ${fileInfo.originalName} in ${analysisMode} mode`)

      let analysisResult: AnalysisResult

      if (FileStorageService.isImageFile(fileInfo.mimeType)) {
        analysisResult = await this.analyzeImage(fileInfo, analysisMode, userPrompt, openai)
      } else if (FileStorageService.isPDFFile(fileInfo.mimeType)) {
        analysisResult = await this.analyzePDF(fileInfo, analysisMode, userPrompt, openai)
      } else if (FileStorageService.isDocumentFile(fileInfo.mimeType)) {
        analysisResult = await this.analyzeDocument(fileInfo, analysisMode, userPrompt, openai)
      } else {
        throw new Error(`Unsupported file type: ${fileInfo.mimeType}`)
      }

      analysisResult.processingTime = Date.now() - startTime
      
      // Add structured formatting
      analysisResult.formattedOutput = StructuredOutputFormatter.formatAnalysisResult(analysisResult)
      
      console.log(`✅ Analysis completed in ${analysisResult.processingTime}ms`)

      return analysisResult
    } catch (error) {
      console.error('File analysis error:', error)
      throw new Error(`Failed to analyze file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private static async analyzeImage(
    fileInfo: FileInfo,
    analysisMode: 'financial' | 'general',
    userPrompt: string,
    openai: OpenAI
  ): Promise<AnalysisResult> {
    console.log(`📸 Analyzing image: ${fileInfo.originalName}`)

    // Read the image file
    const imageBuffer = await FileStorageService.readFile(fileInfo.path)
    const base64Image = imageBuffer.toString('base64')

    // Prepare the prompt based on analysis mode
    const systemPrompt = this.getSystemPrompt(analysisMode)
    const analysisPrompt = this.buildAnalysisPrompt(analysisMode, userPrompt, 'image')

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: analysisPrompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${fileInfo.mimeType};base64,${base64Image}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0.1
      })

      const analysisText = response.choices[0]?.message?.content || ''
      
      // Parse the structured response
      return this.parseAnalysisResponse(analysisText, analysisMode, 'image')

    } catch (error) {
      console.error('OpenAI Vision API error:', error)
      throw new Error(`Image analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private static async analyzePDF(
    fileInfo: FileInfo,
    analysisMode: 'financial' | 'general',
    userPrompt: string,
    openai: OpenAI
  ): Promise<AnalysisResult> {
    console.log(`📄 Analyzing PDF: ${fileInfo.originalName}`)

    // Extract text and images from PDF
    const pdfContent = await PDFProcessor.processPDF(fileInfo.path)

    // If PDF contains images (charts), analyze them with Vision API
    if (pdfContent.images.length > 0 && analysisMode === 'financial') {
      console.log(`📊 Found ${pdfContent.images.length} images in PDF, analyzing charts...`)
      
      const chartAnalyses = await Promise.all(
        pdfContent.images.map(async (image, index) => {
          try {
            const base64Image = image.data.toString('base64')
            const chartPrompt = this.buildChartAnalysisPrompt(userPrompt)

            const response = await openai.chat.completions.create({
              model: 'gpt-4o',
              messages: [
                {
                  role: 'system',
                  content: this.getSystemPrompt('financial')
                },
                {
                  role: 'user',
                  content: [
                    {
                      type: 'text',
                      text: chartPrompt
                    },
                    {
                      type: 'image_url',
                      image_url: {
                        url: `data:image/png;base64,${base64Image}`,
                        detail: 'high'
                      }
                    }
                  ]
                }
              ],
              max_tokens: 1500,
              temperature: 0.1
            })

            return {
              imageIndex: index,
              analysis: response.choices[0]?.message?.content || ''
            }
          } catch (error) {
            console.error(`Error analyzing chart ${index}:`, error)
            return {
              imageIndex: index,
              analysis: `Error analyzing chart ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          }
        })
      )

      // Combine text and chart analyses
      return this.combineTextAndChartAnalysis(pdfContent.text, chartAnalyses, analysisMode)
    }

    // Text-only analysis
    return this.analyzeTextContent(pdfContent.text, analysisMode, userPrompt, openai)
  }

  private static async analyzeDocument(
    fileInfo: FileInfo,
    analysisMode: 'financial' | 'general',
    userPrompt: string,
    openai: OpenAI
  ): Promise<AnalysisResult> {
    console.log(`📝 Analyzing document: ${fileInfo.originalName}`)

    // Extract text content from document
    const textContent = await DocumentProcessor.processDocument(fileInfo.path, fileInfo.mimeType)
    
    return this.analyzeTextContent(textContent, analysisMode, userPrompt, openai)
  }

  private static async analyzeTextContent(
    text: string,
    analysisMode: 'financial' | 'general',
    userPrompt: string,
    openai: OpenAI
  ): Promise<AnalysisResult> {
    const systemPrompt = this.getSystemPrompt(analysisMode)
    const analysisPrompt = this.buildAnalysisPrompt(analysisMode, userPrompt, 'text')

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `${analysisPrompt}\n\nDocument content:\n${text.slice(0, 8000)}` // Limit text to avoid token limits
        }
      ],
      max_tokens: 2000,
      temperature: 0.1
    })

    const analysisText = response.choices[0]?.message?.content || ''
    return this.parseAnalysisResponse(analysisText, analysisMode, 'text', text)
  }

  private static getSystemPrompt(analysisMode: 'financial' | 'general'): string {
    if (analysisMode === 'financial') {
      return `You are an expert financial analyst specializing in chart analysis, market trends, and financial document review. 

Your expertise includes:
- Technical analysis of stock/crypto charts
- Pattern recognition (head & shoulders, triangles, channels, etc.)
- Technical indicators (RSI, MACD, Moving Averages, Bollinger Bands)
- Support and resistance levels identification
- Trend analysis and market sentiment
- Risk assessment and price target forecasting
- Financial document analysis (earnings reports, analyst notes, etc.)

For charts/graphs:
- Identify chart type, timeframe, and asset
- Analyze trends, patterns, and technical indicators
- Provide specific support/resistance levels
- Offer price targets with rationale
- Assess risk and provide trading recommendations

For financial documents:
- Extract key financial metrics and insights
- Summarize important findings
- Identify investment opportunities and risks
- Provide contextual market analysis

Always provide structured, actionable insights with confidence levels.`
    } else {
      return `You are an expert document analyst capable of processing and analyzing various types of content including images, documents, charts, and reports.

Your capabilities include:
- Text extraction and summarization
- Key insight identification
- Data structure analysis
- Content categorization
- Question answering about document content
- Business intelligence extraction

For any content:
- Provide clear, structured analysis
- Extract key points and insights
- Summarize main findings
- Identify actionable information
- Organize content logically

Focus on clarity, accuracy, and practical value in your analysis.`
    }
  }

  private static buildAnalysisPrompt(
    analysisMode: 'financial' | 'general',
    userPrompt: string,
    contentType: 'image' | 'text'
  ): string {
    const basePrompt = userPrompt || `Please analyze this ${contentType} thoroughly.`
    
    if (analysisMode === 'financial') {
      return `${basePrompt}

Please provide a comprehensive financial analysis including:

1. **Content Type & Overview**: What type of financial content is this?
2. **Key Insights**: The most important findings
3. **Technical Analysis** (if chart): Trends, patterns, indicators
4. **Financial Metrics** (if document): Key numbers and ratios
5. **Market Context**: How this relates to current market conditions
6. **Risk Assessment**: Potential risks and concerns
7. **Recommendations**: Specific actionable advice
8. **Confidence Level**: How confident are you in this analysis (1-10)?

Format your response as a structured analysis with clear sections.`
    } else {
      return `${basePrompt}

Please provide a comprehensive analysis including:

1. **Content Summary**: What is this document/image about?
2. **Key Insights**: The most important findings or information
3. **Main Topics**: Primary subjects covered
4. **Structured Data**: Any tables, lists, or organized information
5. **Actionable Information**: What can be done with this information?
6. **Questions Answered**: If this answers specific questions
7. **Confidence Level**: How confident are you in this analysis (1-10)?

Organize your response clearly and provide practical value.`
    }
  }

  private static buildChartAnalysisPrompt(userPrompt: string): string {
    return `${userPrompt || 'Analyze this financial chart in detail.'}

This appears to be a financial chart or graph. Please provide:

1. **Chart Identification**: Type of chart, asset, and timeframe
2. **Trend Analysis**: Current trend direction and strength
3. **Technical Patterns**: Any chart patterns you can identify
4. **Support/Resistance**: Key price levels
5. **Technical Indicators**: Any visible indicators and their signals
6. **Price Action**: Notable price movements or events
7. **Trading Insights**: Entry/exit points and risk management
8. **Market Context**: How this fits into broader market conditions

Provide specific, actionable insights for traders and investors.`
  }

  private static parseAnalysisResponse(
    analysisText: string,
    analysisMode: 'financial' | 'general',
    contentType: 'image' | 'text',
    extractedText?: string
  ): AnalysisResult {
    // Extract confidence level
    const confidenceMatch = analysisText.match(/confidence.*?(\d+)/i)
    const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : 7

    // Determine content type based on analysis
    let detectedContentType: AnalysisResult['contentType']
    if (analysisMode === 'financial') {
      if (contentType === 'image' || this.containsFinancialTerms(analysisText)) {
        detectedContentType = 'financial-chart'
      } else {
        detectedContentType = 'financial-document'
      }
    } else {
      if (contentType === 'image') {
        detectedContentType = 'general-image'
      } else {
        detectedContentType = 'general-document'
      }
    }

    // Extract key insights
    const insights = this.extractKeyInsights(analysisText)
    
    // Extract recommendations
    const recommendations = this.extractRecommendations(analysisText)

    // Parse chart analysis if financial
    const chartAnalysis = analysisMode === 'financial' && detectedContentType === 'financial-chart' 
      ? this.parseChartAnalysis(analysisText) 
      : undefined

    return {
      contentType: detectedContentType,
      summary: this.extractSummary(analysisText),
      extractedText,
      keyInsights: insights,
      chartAnalysis,
      recommendations,
      confidence,
      processingTime: 0 // Will be set by caller
    }
  }

  private static containsFinancialTerms(text: string): boolean {
    const lowerText = text.toLowerCase()
    return this.FINANCIAL_KEYWORDS.some(keyword => lowerText.includes(keyword))
  }

  private static extractSummary(text: string): string {
    // Try to extract summary from structured response
    const summaryMatch = text.match(/(?:summary|overview)[:\s]*([^]*?)(?:\n\n|\n(?:[A-Z]|\d+\.))/i)
    if (summaryMatch) {
      return summaryMatch[1].trim()
    }
    
    // Fall back to first paragraph
    const paragraphs = text.split('\n\n')
    return paragraphs[0] || text.slice(0, 200) + '...'
  }

  private static extractKeyInsights(text: string): string[] {
    const insights: string[] = []
    
    // Look for bullet points or numbered lists
    const bulletMatches = text.match(/[-•*]\s*([^]*?)(?=\n[-•*]|\n\n|\n(?:[A-Z]|\d+\.))/g)
    if (bulletMatches) {
      insights.push(...bulletMatches.map(match => match.replace(/^[-•*]\s*/, '').trim()))
    }
    
    // Look for numbered insights
    const numberedMatches = text.match(/\d+\.\s*([^]*?)(?=\n\d+\.|\n\n)/g)
    if (numberedMatches) {
      insights.push(...numberedMatches.map(match => match.replace(/^\d+\.\s*/, '').trim()))
    }
    
    // If no structured insights found, extract key sentences
    if (insights.length === 0) {
      const sentences = text.split(/[.!?]+/).filter(s => s.length > 20)
      insights.push(...sentences.slice(0, 5).map(s => s.trim()))
    }
    
    return insights.slice(0, 8) // Limit to 8 insights
  }

  private static extractRecommendations(text: string): string[] {
    const recommendations: string[] = []
    
    // Look for recommendation section
    const recMatch = text.match(/recommendations?[:\s]*([^]*?)(?:\n\n|\n(?:[A-Z]|\d+\.))/i)
    if (recMatch) {
      const recText = recMatch[1]
      const bulletRecs = recText.match(/[-•*]\s*([^]*?)(?=\n[-•*]|\n\n|\n(?:[A-Z]|\d+\.))/g)
      if (bulletRecs) {
        recommendations.push(...bulletRecs.map(match => match.replace(/^[-•*]\s*/, '').trim()))
      } else {
        recommendations.push(recText.trim())
      }
    }
    
    return recommendations.slice(0, 5)
  }

  private static parseChartAnalysis(text: string): ChartAnalysis | undefined {
    try {
      // This is a simplified parser - in a real implementation, you'd want more sophisticated parsing
      return {
        chartType: this.extractChartType(text),
        trends: this.extractTrends(text),
        technicalIndicators: this.extractTechnicalIndicators(text),
        riskAssessment: this.extractRiskAssessment(text),
        marketContext: this.extractMarketContext(text)
      }
    } catch (error) {
      console.error('Error parsing chart analysis:', error)
      return undefined
    }
  }

  private static extractChartType(text: string): string {
    const chartTypes = ['candlestick', 'line chart', 'bar chart', 'area chart', 'price chart']
    const lowerText = text.toLowerCase()
    
    for (const type of chartTypes) {
      if (lowerText.includes(type)) {
        return type
      }
    }
    
    return 'price chart'
  }

  private static extractTrends(text: string): TrendAnalysis[] {
    const trends: TrendAnalysis[] = []
    const lowerText = text.toLowerCase()
    
    // Simple trend detection
    if (lowerText.includes('bullish') || lowerText.includes('uptrend')) {
      trends.push({
        direction: 'bullish',
        strength: 'moderate',
        duration: 'short-term',
        description: 'Bullish trend identified'
      })
    }
    
    if (lowerText.includes('bearish') || lowerText.includes('downtrend')) {
      trends.push({
        direction: 'bearish',
        strength: 'moderate',
        duration: 'short-term',
        description: 'Bearish trend identified'
      })
    }
    
    return trends
  }

  private static extractTechnicalIndicators(text: string): TechnicalIndicator[] {
    const indicators: TechnicalIndicator[] = []
    const lowerText = text.toLowerCase()
    
    // Simple indicator detection
    if (lowerText.includes('rsi')) {
      indicators.push({
        name: 'RSI',
        value: 'N/A',
        signal: 'neutral',
        description: 'RSI mentioned in analysis'
      })
    }
    
    if (lowerText.includes('macd')) {
      indicators.push({
        name: 'MACD',
        value: 'N/A',
        signal: 'neutral',
        description: 'MACD mentioned in analysis'
      })
    }
    
    return indicators
  }

  private static extractRiskAssessment(text: string): RiskAssessment {
    const lowerText = text.toLowerCase()
    
    let level: 'low' | 'medium' | 'high' = 'medium'
    if (lowerText.includes('high risk') || lowerText.includes('risky')) {
      level = 'high'
    } else if (lowerText.includes('low risk') || lowerText.includes('safe')) {
      level = 'low'
    }
    
    return {
      level,
      factors: ['Market volatility', 'Technical indicators'],
      volatility: 'moderate',
      recommendations: ['Use appropriate position sizing', 'Set stop-loss orders']
    }
  }

  private static extractMarketContext(text: string): string {
    // Extract context from the analysis
    const contextMatch = text.match(/(?:market context|context)[:\s]*([^]*?)(?:\n\n|\n(?:[A-Z]|\d+\.))/i)
    if (contextMatch) {
      return contextMatch[1].trim()
    }
    
    return 'General market conditions apply'
  }

  private static combineTextAndChartAnalysis(
    text: string,
    chartAnalyses: Array<{ imageIndex: number; analysis: string }>,
    analysisMode: 'financial' | 'general'
  ): AnalysisResult {
    const combinedAnalysis = `
Document Text Analysis:
${text.slice(0, 2000)}

Chart Analysis:
${chartAnalyses.map((chart, index) => `Chart ${index + 1}: ${chart.analysis}`).join('\n\n')}
    `

    return this.parseAnalysisResponse(combinedAnalysis, analysisMode, 'text', text)
  }
}
