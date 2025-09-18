// Enhanced Streaming Manager for ChatGPT-like Experience
import { AIChatMessage } from '@/types'

export interface StreamingState {
  isTyping: boolean
  typingSpeed: number
  partialResponse: string
  confidence: number
  suggestedActions: string[]
  error?: string
}

export interface StreamingOptions {
  typingSpeed?: number
  enableTypingIndicator?: boolean
  enableSuggestions?: boolean
  enableErrorRecovery?: boolean
}

export class EnhancedStreamingManager {
  private stream: ReadableStream | null = null
  private controller: ReadableStreamDefaultController | null = null
  private options: StreamingOptions
  private state: StreamingState

  constructor(options: StreamingOptions = {}) {
    this.options = {
      typingSpeed: 50, // ms per character
      enableTypingIndicator: true,
      enableSuggestions: true,
      enableErrorRecovery: true,
      ...options
    }
    
    this.state = {
      isTyping: false,
      typingSpeed: this.options.typingSpeed!,
      partialResponse: '',
      confidence: 0,
      suggestedActions: []
    }
  }

  async startStream(messages: AIChatMessage[], onUpdate?: (state: StreamingState) => void) {
    try {
      this.state.isTyping = true
      this.state.partialResponse = ''
      this.state.confidence = 0
      this.state.suggestedActions = []
      
      onUpdate?.(this.state)

      const response = await fetch('/api/ai/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages })
      })

      if (!response.ok) {
        throw new Error(`Streaming failed: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No reader available')
      }

      let accumulatedContent = ''
      let lastUpdate = Date.now()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = new TextDecoder().decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            
            if (data === '[DONE]') {
              this.state.isTyping = false
              this.state.confidence = 95
              onUpdate?.(this.state)
              return accumulatedContent
            }

            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                accumulatedContent += parsed.content
                this.state.partialResponse = accumulatedContent
                
                // Update confidence based on content length
                this.state.confidence = Math.min(95, 50 + (accumulatedContent.length * 2))
                
                // Add typing delay for realistic experience
                if (this.options.enableTypingIndicator) {
                  await this.simulateTyping(parsed.content)
                }
                
                onUpdate?.(this.state)
              }
            } catch (e) {
              // Ignore parsing errors for incomplete chunks
            }
          }
        }
      }

      return accumulatedContent
    } catch (error) {
      this.state.error = error instanceof Error ? error.message : 'Unknown error'
      this.state.isTyping = false
      onUpdate?.(this.state)
      
      if (this.options.enableErrorRecovery) {
        return this.handleErrorRecovery(error)
      }
      
      throw error
    }
  }

  private async simulateTyping(content: string) {
    // Simulate realistic typing speed
    const delay = content.length * this.options.typingSpeed!
    await new Promise(resolve => setTimeout(resolve, Math.min(delay, 100)))
  }

  private async handleErrorRecovery(error: any): Promise<string> {
    // Attempt to recover from streaming errors
    console.warn('Streaming error, attempting recovery:', error)
    
    return `I apologize, but I encountered an issue while processing your request. Here's what I can tell you based on the information I have:

**Error Details:**
- ${error.message || 'Unknown error occurred'}
- Time: ${new Date().toLocaleTimeString()}

**What you can do:**
1. Try rephrasing your question
2. Check your internet connection
3. Wait a moment and try again

If the problem persists, please let me know and I'll help you troubleshoot! 😊`
  }

  getState(): StreamingState {
    return { ...this.state }
  }

  stop() {
    this.state.isTyping = false
    this.state.error = 'Stream stopped by user'
  }
}

// Enhanced typing indicator component
export class TypingIndicator {
  private dots = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
  private currentDot = 0
  private interval: NodeJS.Timeout | null = null

  start(onUpdate?: (indicator: string) => void) {
    this.interval = setInterval(() => {
      this.currentDot = (this.currentDot + 1) % this.dots.length
      onUpdate?.(this.dots[this.currentDot])
    }, 100)
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
  }
}

// Smart suggestions generator
export class SmartSuggestions {
  private context: string[] = []
  private userHistory: string[] = []

  addContext(context: string) {
    this.context.push(context)
  }

  addUserHistory(message: string) {
    this.userHistory.push(message)
  }

  generateSuggestions(currentMessage: string): string[] {
    const suggestions: string[] = []
    
    // Context-aware suggestions
    if (currentMessage.toLowerCase().includes('stock') || currentMessage.toLowerCase().includes('price')) {
      suggestions.push(
        'What\'s the current price of AAPL?',
        'Show me the market sentiment',
        'Analyze TSLA stock',
        'Give me a trading strategy'
      )
    } else if (currentMessage.toLowerCase().includes('analysis') || currentMessage.toLowerCase().includes('technical')) {
      suggestions.push(
        'Calculate RSI for MSFT',
        'Show me MACD indicators',
        'Analyze support and resistance',
        'Check volume analysis'
      )
    } else if (currentMessage.toLowerCase().includes('strategy') || currentMessage.toLowerCase().includes('trade')) {
      suggestions.push(
        'Risk management tips',
        'Position sizing guide',
        'Stop-loss strategies',
        'Portfolio diversification'
      )
    } else {
      // General suggestions
      suggestions.push(
        'What\'s the market sentiment today?',
        'Show me top gainers',
        'Analyze a stock for me',
        'Trading strategy recommendations'
      )
    }

    return suggestions.slice(0, 4) // Return top 4 suggestions
  }
}
