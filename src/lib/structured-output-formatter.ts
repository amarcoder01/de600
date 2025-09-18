import { AnalysisResult, ChartAnalysis } from './file-analysis-service'

export interface FormattedOutput {
  html: string
  markdown: string
  plain: string
  structured: any
}

export class StructuredOutputFormatter {
  static formatAnalysisResult(analysis: AnalysisResult): FormattedOutput {
    switch (analysis.contentType) {
      case 'financial-chart':
        return this.formatFinancialChart(analysis)
      case 'financial-document':
        return this.formatFinancialDocument(analysis)
      case 'general-document':
        return this.formatGeneralDocument(analysis)
      case 'general-image':
        return this.formatGeneralImage(analysis)
      case 'table-data':
        return this.formatTableData(analysis)
      default:
        return this.formatDefault(analysis)
    }
  }

  private static formatFinancialChart(analysis: AnalysisResult): FormattedOutput {
    const { chartAnalysis, keyInsights, recommendations, confidence } = analysis

    // HTML Format
    const html = `
      <div class="financial-chart-analysis">
        <div class="analysis-header">
          <h2>📊 Financial Chart Analysis</h2>
          <div class="confidence-badge">Confidence: ${confidence}/10</div>
        </div>
        
        <div class="summary-section">
          <h3>Executive Summary</h3>
          <p>${analysis.summary}</p>
        </div>

        ${chartAnalysis ? this.formatChartAnalysisHTML(chartAnalysis) : ''}

        <div class="insights-section">
          <h3>Key Insights</h3>
          <ul>
            ${keyInsights.map(insight => `<li>${insight}</li>`).join('')}
          </ul>
        </div>

        ${recommendations && recommendations.length > 0 ? `
          <div class="recommendations-section">
            <h3>Trading Recommendations</h3>
            <ul>
              ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        <div class="analysis-footer">
          <small>Analysis completed in ${analysis.processingTime}ms</small>
        </div>
      </div>
    `

    // Markdown Format
    const markdown = `
# 📊 Financial Chart Analysis

**Confidence Level:** ${confidence}/10  
**Processing Time:** ${analysis.processingTime}ms

## Executive Summary
${analysis.summary}

${chartAnalysis ? this.formatChartAnalysisMarkdown(chartAnalysis) : ''}

## Key Insights
${keyInsights.map((insight, i) => `${i + 1}. ${insight}`).join('\n')}

${recommendations && recommendations.length > 0 ? `
## Trading Recommendations
${recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}
` : ''}
    `

    // Plain Text Format
    const plain = `
FINANCIAL CHART ANALYSIS
========================

Confidence Level: ${confidence}/10
Processing Time: ${analysis.processingTime}ms

EXECUTIVE SUMMARY:
${analysis.summary}

${chartAnalysis ? this.formatChartAnalysisPlain(chartAnalysis) : ''}

KEY INSIGHTS:
${keyInsights.map((insight, i) => `${i + 1}. ${insight}`).join('\n')}

${recommendations && recommendations.length > 0 ? `
TRADING RECOMMENDATIONS:
${recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}
` : ''}
    `

    return {
      html: html.trim(),
      markdown: markdown.trim(),
      plain: plain.trim(),
      structured: {
        type: 'financial-chart',
        summary: analysis.summary,
        confidence,
        processingTime: analysis.processingTime,
        chartAnalysis,
        keyInsights,
        recommendations
      }
    }
  }

  private static formatFinancialDocument(analysis: AnalysisResult): FormattedOutput {
    const { keyInsights, recommendations, confidence, extractedText } = analysis

    const html = `
      <div class="financial-document-analysis">
        <div class="analysis-header">
          <h2>📄 Financial Document Analysis</h2>
          <div class="confidence-badge">Confidence: ${confidence}/10</div>
        </div>
        
        <div class="summary-section">
          <h3>Document Summary</h3>
          <p>${analysis.summary}</p>
        </div>

        <div class="insights-section">
          <h3>Key Financial Insights</h3>
          <ul>
            ${keyInsights.map(insight => `<li>${insight}</li>`).join('')}
          </ul>
        </div>

        ${recommendations && recommendations.length > 0 ? `
          <div class="recommendations-section">
            <h3>Investment Recommendations</h3>
            <ul>
              ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        ${extractedText && extractedText.length > 0 ? `
          <div class="extracted-text-section">
            <h3>Extracted Content Preview</h3>
            <div class="text-preview">
              ${extractedText.substring(0, 500)}${extractedText.length > 500 ? '...' : ''}
            </div>
          </div>
        ` : ''}
      </div>
    `

    const markdown = `
# 📄 Financial Document Analysis

**Confidence Level:** ${confidence}/10

## Document Summary
${analysis.summary}

## Key Financial Insights
${keyInsights.map((insight, i) => `${i + 1}. ${insight}`).join('\n')}

${recommendations && recommendations.length > 0 ? `
## Investment Recommendations
${recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}
` : ''}

${extractedText && extractedText.length > 0 ? `
## Extracted Content Preview
\`\`\`
${extractedText.substring(0, 500)}${extractedText.length > 500 ? '...' : ''}
\`\`\`
` : ''}
    `

    const plain = `
FINANCIAL DOCUMENT ANALYSIS
===========================

Confidence Level: ${confidence}/10

DOCUMENT SUMMARY:
${analysis.summary}

KEY FINANCIAL INSIGHTS:
${keyInsights.map((insight, i) => `${i + 1}. ${insight}`).join('\n')}

${recommendations && recommendations.length > 0 ? `
INVESTMENT RECOMMENDATIONS:
${recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}
` : ''}

${extractedText && extractedText.length > 0 ? `
EXTRACTED CONTENT PREVIEW:
${extractedText.substring(0, 500)}${extractedText.length > 500 ? '...' : ''}
` : ''}
    `

    return {
      html: html.trim(),
      markdown: markdown.trim(),
      plain: plain.trim(),
      structured: {
        type: 'financial-document',
        summary: analysis.summary,
        confidence,
        keyInsights,
        recommendations,
        extractedTextLength: extractedText?.length || 0
      }
    }
  }

  private static formatGeneralDocument(analysis: AnalysisResult): FormattedOutput {
    const { keyInsights, confidence, extractedText } = analysis

    const html = `
      <div class="general-document-analysis">
        <div class="analysis-header">
          <h2>📋 Document Analysis</h2>
          <div class="confidence-badge">Confidence: ${confidence}/10</div>
        </div>
        
        <div class="summary-section">
          <h3>Document Summary</h3>
          <p>${analysis.summary}</p>
        </div>

        <div class="insights-section">
          <h3>Key Points</h3>
          <ul>
            ${keyInsights.map(insight => `<li>${insight}</li>`).join('')}
          </ul>
        </div>

        ${extractedText && extractedText.length > 0 ? `
          <div class="extracted-text-section">
            <h3>Content Preview</h3>
            <div class="text-preview">
              ${extractedText.substring(0, 500)}${extractedText.length > 500 ? '...' : ''}
            </div>
          </div>
        ` : ''}
      </div>
    `

    const markdown = `
# 📋 Document Analysis

**Confidence Level:** ${confidence}/10

## Document Summary
${analysis.summary}

## Key Points
${keyInsights.map((insight, i) => `${i + 1}. ${insight}`).join('\n')}

${extractedText && extractedText.length > 0 ? `
## Content Preview
\`\`\`
${extractedText.substring(0, 500)}${extractedText.length > 500 ? '...' : ''}
\`\`\`
` : ''}
    `

    const plain = `
DOCUMENT ANALYSIS
=================

Confidence Level: ${confidence}/10

DOCUMENT SUMMARY:
${analysis.summary}

KEY POINTS:
${keyInsights.map((insight, i) => `${i + 1}. ${insight}`).join('\n')}

${extractedText && extractedText.length > 0 ? `
CONTENT PREVIEW:
${extractedText.substring(0, 500)}${extractedText.length > 500 ? '...' : ''}
` : ''}
    `

    return {
      html: html.trim(),
      markdown: markdown.trim(),
      plain: plain.trim(),
      structured: {
        type: 'general-document',
        summary: analysis.summary,
        confidence,
        keyInsights,
        extractedTextLength: extractedText?.length || 0
      }
    }
  }

  private static formatGeneralImage(analysis: AnalysisResult): FormattedOutput {
    const { keyInsights, confidence } = analysis

    const html = `
      <div class="general-image-analysis">
        <div class="analysis-header">
          <h2>🖼️ Image Analysis</h2>
          <div class="confidence-badge">Confidence: ${confidence}/10</div>
        </div>
        
        <div class="summary-section">
          <h3>Image Description</h3>
          <p>${analysis.summary}</p>
        </div>

        <div class="insights-section">
          <h3>Key Observations</h3>
          <ul>
            ${keyInsights.map(insight => `<li>${insight}</li>`).join('')}
          </ul>
        </div>
      </div>
    `

    const markdown = `
# 🖼️ Image Analysis

**Confidence Level:** ${confidence}/10

## Image Description
${analysis.summary}

## Key Observations
${keyInsights.map((insight, i) => `${i + 1}. ${insight}`).join('\n')}
    `

    const plain = `
IMAGE ANALYSIS
==============

Confidence Level: ${confidence}/10

IMAGE DESCRIPTION:
${analysis.summary}

KEY OBSERVATIONS:
${keyInsights.map((insight, i) => `${i + 1}. ${insight}`).join('\n')}
    `

    return {
      html: html.trim(),
      markdown: markdown.trim(),
      plain: plain.trim(),
      structured: {
        type: 'general-image',
        summary: analysis.summary,
        confidence,
        keyInsights
      }
    }
  }

  private static formatTableData(analysis: AnalysisResult): FormattedOutput {
    const { keyInsights, confidence, structuredData } = analysis

    const html = `
      <div class="table-data-analysis">
        <div class="analysis-header">
          <h2>📊 Table Data Analysis</h2>
          <div class="confidence-badge">Confidence: ${confidence}/10</div>
        </div>
        
        <div class="summary-section">
          <h3>Data Summary</h3>
          <p>${analysis.summary}</p>
        </div>

        <div class="insights-section">
          <h3>Data Insights</h3>
          <ul>
            ${keyInsights.map(insight => `<li>${insight}</li>`).join('')}
          </ul>
        </div>

        ${structuredData ? `
          <div class="structured-data-section">
            <h3>Structured Data</h3>
            <pre><code>${JSON.stringify(structuredData, null, 2)}</code></pre>
          </div>
        ` : ''}
      </div>
    `

    const markdown = `
# 📊 Table Data Analysis

**Confidence Level:** ${confidence}/10

## Data Summary
${analysis.summary}

## Data Insights
${keyInsights.map((insight, i) => `${i + 1}. ${insight}`).join('\n')}

${structuredData ? `
## Structured Data
\`\`\`json
${JSON.stringify(structuredData, null, 2)}
\`\`\`
` : ''}
    `

    const plain = `
TABLE DATA ANALYSIS
===================

Confidence Level: ${confidence}/10

DATA SUMMARY:
${analysis.summary}

DATA INSIGHTS:
${keyInsights.map((insight, i) => `${i + 1}. ${insight}`).join('\n')}

${structuredData ? `
STRUCTURED DATA:
${JSON.stringify(structuredData, null, 2)}
` : ''}
    `

    return {
      html: html.trim(),
      markdown: markdown.trim(),
      plain: plain.trim(),
      structured: {
        type: 'table-data',
        summary: analysis.summary,
        confidence,
        keyInsights,
        structuredData
      }
    }
  }

  private static formatDefault(analysis: AnalysisResult): FormattedOutput {
    const { keyInsights, confidence } = analysis

    const html = `
      <div class="default-analysis">
        <div class="analysis-header">
          <h2>🔍 Content Analysis</h2>
          <div class="confidence-badge">Confidence: ${confidence}/10</div>
        </div>
        
        <div class="summary-section">
          <h3>Summary</h3>
          <p>${analysis.summary}</p>
        </div>

        <div class="insights-section">
          <h3>Key Insights</h3>
          <ul>
            ${keyInsights.map(insight => `<li>${insight}</li>`).join('')}
          </ul>
        </div>
      </div>
    `

    const markdown = `
# 🔍 Content Analysis

**Confidence Level:** ${confidence}/10

## Summary
${analysis.summary}

## Key Insights
${keyInsights.map((insight, i) => `${i + 1}. ${insight}`).join('\n')}
    `

    const plain = `
CONTENT ANALYSIS
================

Confidence Level: ${confidence}/10

SUMMARY:
${analysis.summary}

KEY INSIGHTS:
${keyInsights.map((insight, i) => `${i + 1}. ${insight}`).join('\n')}
    `

    return {
      html: html.trim(),
      markdown: markdown.trim(),
      plain: plain.trim(),
      structured: {
        type: 'default',
        summary: analysis.summary,
        confidence,
        keyInsights
      }
    }
  }

  private static formatChartAnalysisHTML(chartAnalysis: ChartAnalysis): string {
    return `
      <div class="chart-analysis-section">
        <h3>Technical Analysis</h3>
        
        <div class="chart-info">
          <p><strong>Chart Type:</strong> ${chartAnalysis.chartType}</p>
          ${chartAnalysis.timeframe ? `<p><strong>Timeframe:</strong> ${chartAnalysis.timeframe}</p>` : ''}
        </div>

        ${chartAnalysis.trends && chartAnalysis.trends.length > 0 ? `
          <div class="trends-subsection">
            <h4>Trend Analysis</h4>
            <ul>
              ${chartAnalysis.trends.map(trend => `
                <li>
                  <strong>${trend.direction.toUpperCase()}</strong> trend - 
                  ${trend.strength} strength - ${trend.description}
                  ${trend.supportLevels ? `<br><small>Support: ${trend.supportLevels.join(', ')}</small>` : ''}
                  ${trend.resistanceLevels ? `<br><small>Resistance: ${trend.resistanceLevels.join(', ')}</small>` : ''}
                </li>
              `).join('')}
            </ul>
          </div>
        ` : ''}

        ${chartAnalysis.technicalIndicators && chartAnalysis.technicalIndicators.length > 0 ? `
          <div class="indicators-subsection">
            <h4>Technical Indicators</h4>
            <ul>
              ${chartAnalysis.technicalIndicators.map(indicator => `
                <li>
                  <strong>${indicator.name}:</strong> ${indicator.value} 
                  <span class="signal-${indicator.signal}">(${indicator.signal.toUpperCase()})</span>
                  <br><small>${indicator.description}</small>
                </li>
              `).join('')}
            </ul>
          </div>
        ` : ''}

        ${chartAnalysis.riskAssessment ? `
          <div class="risk-subsection">
            <h4>Risk Assessment</h4>
            <p><strong>Level:</strong> ${chartAnalysis.riskAssessment.level.toUpperCase()}</p>
            <p><strong>Volatility:</strong> ${chartAnalysis.riskAssessment.volatility}</p>
            ${chartAnalysis.riskAssessment.factors.length > 0 ? `
              <p><strong>Risk Factors:</strong></p>
              <ul>
                ${chartAnalysis.riskAssessment.factors.map(factor => `<li>${factor}</li>`).join('')}
              </ul>
            ` : ''}
          </div>
        ` : ''}

        ${chartAnalysis.priceTargets && chartAnalysis.priceTargets.length > 0 ? `
          <div class="targets-subsection">
            <h4>Price Targets</h4>
            <ul>
              ${chartAnalysis.priceTargets.map(target => `
                <li>
                  <strong>$${target.target}</strong> (${target.timeframe}) - 
                  ${target.probability}% probability - ${target.type}
                  <br><small>${target.rationale}</small>
                </li>
              `).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `
  }

  private static formatChartAnalysisMarkdown(chartAnalysis: ChartAnalysis): string {
    let markdown = `
## Technical Analysis

**Chart Type:** ${chartAnalysis.chartType}  
${chartAnalysis.timeframe ? `**Timeframe:** ${chartAnalysis.timeframe}` : ''}

`

    if (chartAnalysis.trends && chartAnalysis.trends.length > 0) {
      markdown += `
### Trend Analysis
${chartAnalysis.trends.map(trend => `
- **${trend.direction.toUpperCase()}** trend - ${trend.strength} strength - ${trend.description}
  ${trend.supportLevels ? `  - Support: ${trend.supportLevels.join(', ')}` : ''}
  ${trend.resistanceLevels ? `  - Resistance: ${trend.resistanceLevels.join(', ')}` : ''}
`).join('')}
`
    }

    if (chartAnalysis.technicalIndicators && chartAnalysis.technicalIndicators.length > 0) {
      markdown += `
### Technical Indicators
${chartAnalysis.technicalIndicators.map(indicator => `
- **${indicator.name}:** ${indicator.value} **(${indicator.signal.toUpperCase()})**
  - ${indicator.description}
`).join('')}
`
    }

    return markdown
  }

  private static formatChartAnalysisPlain(chartAnalysis: ChartAnalysis): string {
    let plain = `
TECHNICAL ANALYSIS:
Chart Type: ${chartAnalysis.chartType}
${chartAnalysis.timeframe ? `Timeframe: ${chartAnalysis.timeframe}` : ''}

`

    if (chartAnalysis.trends && chartAnalysis.trends.length > 0) {
      plain += `
TREND ANALYSIS:
${chartAnalysis.trends.map((trend, i) => `
${i + 1}. ${trend.direction.toUpperCase()} trend - ${trend.strength} strength
   ${trend.description}
   ${trend.supportLevels ? `Support: ${trend.supportLevels.join(', ')}` : ''}
   ${trend.resistanceLevels ? `Resistance: ${trend.resistanceLevels.join(', ')}` : ''}
`).join('')}
`
    }

    if (chartAnalysis.technicalIndicators && chartAnalysis.technicalIndicators.length > 0) {
      plain += `
TECHNICAL INDICATORS:
${chartAnalysis.technicalIndicators.map((indicator, i) => `
${i + 1}. ${indicator.name}: ${indicator.value} (${indicator.signal.toUpperCase()})
   ${indicator.description}
`).join('')}
`
    }

    return plain
  }

  static getAnalysisCSS(): string {
    return `
      .financial-chart-analysis, .financial-document-analysis, 
      .general-document-analysis, .general-image-analysis,
      .table-data-analysis, .default-analysis {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        line-height: 1.6;
        color: #333;
      }

      .analysis-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
        padding-bottom: 0.5rem;
        border-bottom: 2px solid #e5e7eb;
      }

      .confidence-badge {
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        padding: 0.25rem 0.75rem;
        border-radius: 1rem;
        font-size: 0.875rem;
        font-weight: 600;
      }

      .summary-section, .insights-section, .recommendations-section,
      .extracted-text-section, .chart-analysis-section,
      .trends-subsection, .indicators-subsection, .risk-subsection,
      .targets-subsection, .structured-data-section {
        margin-bottom: 1.5rem;
      }

      .summary-section h3, .insights-section h3, .recommendations-section h3,
      .extracted-text-section h3, .chart-analysis-section h3 {
        color: #1f2937;
        font-size: 1.25rem;
        font-weight: 600;
        margin-bottom: 0.75rem;
      }

      .trends-subsection h4, .indicators-subsection h4, 
      .risk-subsection h4, .targets-subsection h4 {
        color: #374151;
        font-size: 1.1rem;
        font-weight: 600;
        margin-bottom: 0.5rem;
      }

      .text-preview, .structured-data-section pre {
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 0.5rem;
        padding: 1rem;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 0.875rem;
        overflow-x: auto;
      }

      .signal-buy { color: #10b981; font-weight: 600; }
      .signal-sell { color: #ef4444; font-weight: 600; }
      .signal-hold { color: #f59e0b; font-weight: 600; }
      .signal-neutral { color: #6b7280; font-weight: 600; }

      .analysis-footer {
        margin-top: 2rem;
        padding-top: 1rem;
        border-top: 1px solid #e5e7eb;
        color: #6b7280;
        font-size: 0.875rem;
      }

      ul {
        padding-left: 1.5rem;
      }

      li {
        margin-bottom: 0.5rem;
      }
    `
  }
}
