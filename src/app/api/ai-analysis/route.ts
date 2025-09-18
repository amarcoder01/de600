import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { stocks, customPrompt } = body

    // Validate input
    if (!stocks || !Array.isArray(stocks) || stocks.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Missing or invalid stocks data. Expected array of stock objects.'
      }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'OpenAI API key not configured'
      }, { status: 500 })
    }

    console.log(`AI Analysis API: Processing comparison analysis for ${stocks.length} stocks`)

    // Create optimized prompt with essential stock data only
    const stockSymbols = stocks.map(stock => stock.symbol || stock.ticker || 'Unknown').join(', ')
    
    // Extract comprehensive financial data for detailed analysis
    const essentialStockData = stocks.map(stock => ({
      symbol: stock.symbol || stock.ticker || 'Unknown',
      name: stock.name || stock.symbol || 'Unknown',
      price: stock.price || stock.currentPrice || 0,
      change: stock.change || stock.priceChange || 0,
      changePercent: stock.changePercent || stock.priceChangePercent || 0,
      volume: stock.volume || 0,
      marketCap: stock.marketCap || 0,
      pe: stock.pe || null,
      beta: stock.beta || null,
      dividendYield: stock.dividendYield || 0,
      sector: stock.sector || 'Unknown',
      industry: stock.industry || 'Unknown'
    }))

    console.log(`Token estimate: Input ~${JSON.stringify(essentialStockData).length * 0.75} tokens`)

    const systemPrompt = `You are a senior financial analyst with 20+ years of experience in equity research and portfolio management. Provide EXTREMELY DETAILED and comprehensive analysis with the following requirements:

ANALYSIS STRUCTURE:
1. Fundamental Analysis - Deep dive into financial metrics, ratios, growth drivers, and valuation
2. Technical Analysis - Comprehensive chart analysis, indicators, support/resistance, and momentum
3. Risk Analysis - Detailed risk assessment including market, sector, company-specific, and macroeconomic risks
4. Competitive Analysis - In-depth competitive positioning, market share, and strategic advantages
5. Investment Recommendation - Detailed buy/hold/sell recommendation with specific price targets and timeframes

DETAILED FORMATTING REQUIREMENTS:
• Use bullet points (•) instead of asterisks (*) for all lists
• Include detailed comparison tables using proper markdown format (| separators)
• Provide specific numbers, percentages, and data points
• Use professional financial terminology and industry jargon
• Include quantitative analysis with calculations where relevant
• Structure each section with clear subsections and bullet points
• Provide actionable insights with specific recommendations
• Include both qualitative and quantitative analysis
• Create side-by-side comparison tables with proper markdown formatting
• Use clear section headers with numbered format
• Use markdown tables with | separators and - for headers

COMPARISON TABLE FORMAT:
Create detailed comparison tables using proper markdown format. CRITICAL FORMATTING RULES:

1. Use proper markdown table syntax with | separators
2. Include header separator line with dashes
3. Align columns properly
4. Use actual stock symbols in headers
5. Format financial data appropriately

Example format:
| Metric | ${stockSymbols.split(', ')[0] || 'STOCK1'} | ${stockSymbols.split(', ')[1] || 'STOCK2'} | ${stockSymbols.split(', ')[2] || 'STOCK3'} | Average |
|--------|---------|---------|---------|---------|
| P/E Ratio | 25.5 | 18.2 | 32.1 | 25.3 |
| Market Cap | $500B | $300B | $800B | $533B |
| Revenue Growth | 15.2% | 8.7% | 22.1% | 15.3% |

FORMATTING STANDARDS:
- Currency: Use $ format ($500B, $1.2T, $50M)
- Percentages: Include % sign (15.2%, -3.4%)
- Ratios: Use decimal format (25.5, 1.8)
- Always include the header separator line with dashes

Make your analysis extremely detailed, professional, and comprehensive.`

    const userPrompt = `Please provide an EXTREMELY DETAILED and comprehensive analysis of the following ${stocks.length} stocks: ${stockSymbols}

DETAILED STOCK DATA:
${JSON.stringify(essentialStockData, null, 2)}

${customPrompt ? `SPECIFIC ANALYSIS REQUEST: ${customPrompt}\n` : ''}

REQUIRED ANALYSIS SECTIONS:

1. FUNDAMENTAL ANALYSIS (EXTREMELY DETAILED):
   ## 1.1 Financial Ratios Comparison
   • Create detailed comparison table with P/E, P/B, ROE, ROA, Debt/Equity, Current Ratio
   
   ## 1.2 Revenue and Earnings Growth Analysis
   • Revenue Growth YoY comparison table
   • Earnings Growth YoY comparison table
   • Growth drivers analysis for each stock
   
   ## 1.3 Profitability Metrics
   • Gross Margin, Operating Margin, Net Margin comparison table
   • Profitability trends and analysis
   
   ## 1.4 Cash Flow and Balance Sheet
   • Cash flow analysis and strength assessment
   • Balance sheet metrics comparison

2. TECHNICAL ANALYSIS (COMPREHENSIVE):
   ## 2.1 Price Action Analysis
   • Support/Resistance levels comparison table
   • Current price vs key levels analysis
   
   ## 2.2 Moving Averages
   • 20-day, 50-day, 200-day moving averages table
   • Trend analysis and signals
   
   ## 2.3 Technical Indicators
   • RSI, MACD, Bollinger Bands comparison table
   • Technical signals and momentum analysis
   
   ## 2.4 Volume and Patterns
   • Volume analysis and trading patterns
   • Chart pattern recognition

3. RISK ANALYSIS (DETAILED ASSESSMENT):
   ## 3.1 Market and Sector Risks
   • Market risk factors comparison
   • Sector-specific risk assessment
   
   ## 3.2 Company-Specific Risks
   • Individual company risk factors
   • Regulatory and operational risks
   
   ## 3.3 Volatility and Correlation
   • Beta and correlation analysis table
   • Risk-adjusted metrics

4. COMPETITIVE ANALYSIS (IN-DEPTH):
   ## 4.1 Market Position
   • Market share and competitive positioning
   • Industry comparison analysis
   
   ## 4.2 Strategic Advantages
   • Competitive moat assessment
   • Strategic initiatives analysis
   
   ## 4.3 SWOT Analysis
   • Strengths, Weaknesses, Opportunities, Threats for each company

5. INVESTMENT RECOMMENDATION (SPECIFIC):
   ## 5.1 Recommendations Summary
   • Buy/Hold/Sell recommendation for each stock
   • Price targets (12-month and 24-month)
   
   ## 5.2 Portfolio Strategy
   • Entry and exit points
   • Portfolio allocation suggestions
   • Risk-adjusted return expectations
   
   ## 5.3 Confidence Assessment
   • Confidence level (0-100) with detailed justification
   • Time horizon recommendations

DETAILED FORMATTING REQUIREMENTS:
• Use bullet points (•) for all lists and key points
• Include detailed comparison tables for all key metrics
• Provide specific numbers, percentages, and calculations
• Use professional financial terminology
• Structure each section with clear subsections
• Include both qualitative and quantitative analysis
• Create side-by-side comparison tables
• Provide specific, actionable recommendations with price targets

Make this analysis extremely comprehensive, detailed, and professional. Include as much quantitative data and comparison tables as possible.`

    console.log('Sending request to OpenAI...')

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 4000
    })

    // Log actual token usage for monitoring
    const tokenUsage = completion.usage
    console.log(`Token usage - Prompt: ${tokenUsage?.prompt_tokens}, Completion: ${tokenUsage?.completion_tokens}, Total: ${tokenUsage?.total_tokens}`)

    const analysis = completion.choices[0]?.message?.content

    if (!analysis) {
      throw new Error('No analysis generated from OpenAI')
    }

    console.log('Analysis received, parsing sections...')

    // Parse the analysis to extract structured data
    const sections = {
      fundamental: formatAnalysisText(extractSection(analysis, 'Fundamental Analysis', 'Technical Analysis')) || 'Fundamental analysis completed. Review the full analysis for detailed insights.',
      technical: formatAnalysisText(extractSection(analysis, 'Technical Analysis', 'Risk Analysis')) || 'Technical analysis completed with trend and momentum evaluation.',
      risk: formatAnalysisText(extractSection(analysis, 'Risk Analysis', 'Competitive Analysis')) || 'Risk assessment completed covering market and company-specific factors.',
      competitive: formatAnalysisText(extractSection(analysis, 'Competitive Analysis', 'Investment Recommendation')) || 'Competitive positioning analysis completed.',
      recommendation: formatAnalysisText(extractSection(analysis, 'Investment Recommendation') || extractRecommendation(analysis)) || 'Investment recommendation provided based on comprehensive analysis.',
      confidence: extractConfidence(analysis) || 75
    }

    console.log('Analysis parsing completed successfully')

    return NextResponse.json({
      success: true,
      data: sections,
      fullAnalysis: analysis,
      stocksAnalyzed: stockSymbols,
      timestamp: new Date().toISOString(),
      model: 'gpt-4o'
    })

  } catch (error) {
    console.error('AI Analysis API Error:', error)
    
    // Provide more specific error messages
    let errorMessage = 'Failed to generate analysis. Please try again.'
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        errorMessage = 'OpenAI API key is invalid or missing. Please check your configuration.'
      } else if (error.message.includes('rate limit')) {
        errorMessage = 'Rate limit exceeded. Please try again in a few minutes.'
      } else if (error.message.includes('quota')) {
        errorMessage = 'API quota exceeded. Please check your OpenAI account.'
      } else {
        errorMessage = error.message
      }
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Helper function to extract sections from the analysis
function extractSection(text: string, startMarker: string, endMarker?: string): string {
  try {
    const startIndex = text.toLowerCase().indexOf(startMarker.toLowerCase())
    if (startIndex === -1) return ''
    
    let endIndex = text.length
    if (endMarker) {
      const endMarkerIndex = text.toLowerCase().indexOf(endMarker.toLowerCase(), startIndex + startMarker.length)
      if (endMarkerIndex !== -1) {
        endIndex = endMarkerIndex
      }
    }
    
    return text.substring(startIndex + startMarker.length, endIndex).trim()
  } catch {
    return ''
  }
}

// Helper function to extract recommendation
function extractRecommendation(text: string): string {
  try {
    const recommendationPatterns = [
      /recommendation[:\s]+(.*?)(?=\n\n|confidence|$)/i,
      /overall[:\s]+(.*?)(?=\n\n|confidence|$)/i,
      /conclusion[:\s]+(.*?)(?=\n\n|confidence|$)/i
    ]
    
    for (const pattern of recommendationPatterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        return match[1].trim()
      }
    }
    
    return ''
  } catch {
    return ''
  }
}

// Helper function to format analysis text for optimal markdown rendering
function formatAnalysisText(text: string): string {
  if (!text) return text
  
  let formattedText = text
  
  // Convert asterisks to proper markdown list format
  formattedText = formattedText.replace(/^\*\s+/gm, '- ') // Convert "* " to "- " for markdown lists
  formattedText = formattedText.replace(/\*\*/g, '**') // Preserve bold formatting
  
  // Ensure proper markdown table formatting
  // Add blank lines before and after tables for proper markdown parsing
  formattedText = formattedText.replace(/(\n|^)(\|[^|\n]*\|.*?)(\n|$)/g, (match, before, table, after) => {
    if (table.includes('---')) {
      return `${before}\n${table}${after}`
    }
    return match
  })
  
  // Clean up table separator artifacts but preserve proper markdown table separators
  formattedText = formattedText.replace(/^\|[\s\-]+\|[\s\-]*$/gm, (match) => {
    // Keep proper markdown table separators (containing dashes in each column)
    if (match.includes('---') && match.split('|').length > 2) {
      return match
    }
    // Remove malformed separators
    return ''
  })
  
  // Ensure proper spacing around headers
  formattedText = formattedText.replace(/^(#{1,6}\s+.*?)$/gm, '\n$1\n')
  
  // Clean up multiple newlines but preserve necessary spacing
  formattedText = formattedText.replace(/\n{3,}/g, '\n\n')
  
  // Ensure bullet points have proper spacing
  formattedText = formattedText.replace(/^-\s+/gm, '• ')
  
  return formattedText.trim()
}

// Helper function to extract confidence level
function extractConfidence(text: string): number {
  try {
    const confidencePatterns = [
      /confidence[:\s]+(\d+)/i,
      /confidence level[:\s]+(\d+)/i,
      /(\d+)%?\s*confidence/i
    ]
    
    for (const pattern of confidencePatterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        const confidence = parseInt(match[1], 10)
        if (confidence >= 0 && confidence <= 100) {
          return confidence
        }
      }
    }
    
    return 75 // Default confidence level
  } catch {
    return 75
  }
}

// Handle GET requests for API information
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      endpoint: '/api/ai-analysis',
      description: 'Comprehensive AI-powered stock comparison analysis',
      method: 'POST',
      requiredFields: {
        stocks: 'Array of stock objects with symbol, price, and other relevant data',
        customPrompt: 'Optional custom analysis prompt (string)'
      },
      responseFormat: {
        success: 'boolean',
        data: {
          fundamental: 'string - Fundamental analysis insights',
          technical: 'string - Technical analysis insights', 
          risk: 'string - Risk analysis insights',
          competitive: 'string - Competitive analysis insights',
          recommendation: 'string - Investment recommendation',
          confidence: 'number - Confidence level (0-100)'
        }
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'API information request failed'
    }, { status: 500 })
  }
}