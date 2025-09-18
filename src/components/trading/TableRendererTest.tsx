import React from 'react'
import { AnalysisTableRenderer } from './AnalysisTableRenderer'

export function TableRendererTest() {
  const sampleContent = `
# Financial Analysis Test

## 1.1 Financial Ratios Comparison

| Metric | AAPL | MSFT | GOOGL | Average |
|--------|------|------|-------|---------|
| P/E Ratio | 25.5 | 28.2 | 22.1 | 25.3 |
| Market Cap | $2.5T | $2.8T | $1.8T | $2.4T |
| Revenue Growth | 15.2% | 12.7% | 18.1% | 15.3% |
| ROE | 22.5% | 18.9% | 25.3% | 22.2% |

## 1.2 Technical Analysis

• Strong momentum indicators across all stocks
• Support levels identified at key price points
• Volume analysis shows institutional buying

## 1.3 Risk Assessment

| Risk Factor | AAPL | MSFT | GOOGL | Risk Level |
|-------------|------|------|-------|------------|
| Beta | 1.2 | 0.9 | 1.1 | Medium |
| Volatility | 18.5% | 15.2% | 20.1% | Medium-High |
| Debt/Equity | 0.15 | 0.08 | 0.12 | Low |

## Investment Recommendation

Based on comprehensive analysis, **AAPL** shows the strongest fundamentals with:
• Excellent cash flow generation
• Strong brand value
• Consistent dividend growth
• Innovation leadership

**Confidence Level: 85%**
`

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Table Renderer Test</h1>
      <div className="bg-white rounded-lg shadow-lg p-6">
        <AnalysisTableRenderer content={sampleContent} />
      </div>
    </div>
  )
}
