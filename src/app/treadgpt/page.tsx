'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Send, Plus, Upload, FileText, Image, BarChart, X, ArrowLeft } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChartMessage } from '@/components/chat/ChartMessage'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  metadata?: {
    responseType?: string
    fileAnalysis?: any
    fileName?: string
    fileType?: string
    chartData?: any
  }
}

interface FileUpload {
  file: File
  preview?: string
  analysisMode: 'financial' | 'general'
}



export default function TradeGPTPage() {
  // Initialize messages from localStorage or default
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== 'undefined') {
      const savedMessages = localStorage.getItem('treadgpt-messages')
      if (savedMessages) {
        try {
          const parsed = JSON.parse(savedMessages)
          // Convert timestamp strings back to Date objects
          return parsed.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        } catch (error) {
          console.warn('Failed to parse saved messages:', error)
        }
      }
    }
    
    // Default welcome message
    return [
      {
        id: '1',
        role: 'assistant',
        content: 'Hello! I\'m your AI trading assistant. I can help you analyze stocks, create strategies, explain concepts, and more. I can also analyze uploaded images, PDFs, and documents for financial insights.\n\nWhat would you like to know?',
        timestamp: new Date(),
        metadata: {
          responseType: 'welcome'
        }
      }
    ]
  })
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [fileUpload, setFileUpload] = useState<FileUpload | null>(null)
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [showPrivacyDetails, setShowPrivacyDetails] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const exampleToPrompt = (text: string): string => {
    try {
      let s = text.replace(/^e\.g\.,\s*/i, '')
      s = s.replace(/^['"“”‘’]\s*|\s*['"“”‘’]$/g, '')
      return s.trim()
    } catch {
      return text
    }
  }

  const clearChatHistory = () => {
    const defaultMessage: Message = {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your AI trading assistant. I can help you analyze stocks, create strategies, explain concepts, and more. I can also analyze uploaded images, PDFs, and documents for financial insights.\n\nWhat would you like to know?',
      timestamp: new Date(),
      metadata: {
        responseType: 'welcome'
      }
    }
    setMessages([defaultMessage])
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])
  
  // Sanitize assistant content to hide change metrics
  const sanitizeAssistantContent = (content: string): string => {
    try {
      const lines = content.split('\n')
      const filtered = lines.filter((line) => {
        const l = line.trim().toLowerCase()
        // Hide any explicit change metrics
        if (l.startsWith('- change:')) return false
        if (l.startsWith('- change percent:')) return false
        if (l.startsWith('- price change:')) return false
        if (l.startsWith('change:')) return false
        if (l.startsWith('change percent:')) return false
        if (l.startsWith('price change:')) return false
        return true
      })
      return filtered.join('\n')
    } catch {
      return content
    }
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() && !fileUpload) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: fileUpload ? `${inputValue || 'Please analyze this file'} [File: ${fileUpload.file.name}]` : inputValue,
      timestamp: new Date(),
      metadata: fileUpload ? {
        fileName: fileUpload.file.name,
        fileType: fileUpload.file.type
      } : undefined
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      let assistantMessage: Message

      if (fileUpload) {
        // Handle file upload and analysis
        const formData = new FormData()
        formData.append('file', fileUpload.file)
        // Force financial-only analysis mode for production
        formData.append('analysisMode', 'financial')
        formData.append('prompt', inputValue || 'Please analyze this file')

        const response = await fetch('/api/ai/file-analysis', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        
        if (data.error) {
          throw new Error(data.error)
        }

        assistantMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: formatFileAnalysisResponse(data.analysis),
          timestamp: new Date(),
          metadata: {
            responseType: 'file-analysis',
            fileAnalysis: data.analysis,
            fileName: fileUpload.file.name,
            fileType: fileUpload.file.type
          }
        }

        // Clear file upload and revoke preview URL to avoid memory leaks
        if (fileUpload.preview) {
          try { URL.revokeObjectURL(fileUpload.preview) } catch {}
        }
        setFileUpload(null)
        setShowFileUpload(false)
      } else {
        // Handle regular text message
        const messagesForAPI = [
          ...messages,
          userMessage
        ]

        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-session-id': 'default',
            'x-user-id': 'user123'
          },
          body: JSON.stringify({
            messages: messagesForAPI,
            stream: false
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        
        if (data.error) {
          throw new Error(data.error)
        }

        // Check if response contains chart data
        let chartData = null
        let responseContent = data.message.content || data.message

        // Try to parse chart data from tool calls and results
        if (data.message?.toolCalls && data.message?.toolResults && Array.isArray(data.message.toolCalls) && Array.isArray(data.message.toolResults)) {
          // Find generate_chart tool call
          const chartToolCallIndex = data.message.toolCalls.findIndex((tool: any) => 
            tool.function?.name === 'generate_chart'
          )
          
          if (chartToolCallIndex !== -1 && data.message.toolResults[chartToolCallIndex]) {
            try {
              const toolResult = data.message.toolResults[chartToolCallIndex]
              const parsed = JSON.parse(toolResult.content)
              
              if (parsed.type === 'chart' && !parsed.error) {
                chartData = parsed
                responseContent = `Here's the ${parsed.symbol} chart you requested:\n\n${parsed.analysis}`
              }
            } catch (e) {
              console.error('Error parsing chart data:', e)
            }
          }
        }

        // Sanitize content before displaying
        responseContent = typeof responseContent === 'string' ? sanitizeAssistantContent(responseContent) : responseContent

        assistantMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: responseContent,
          timestamp: new Date(),
          metadata: {
            responseType: chartData ? 'chart' : (data.message.metadata?.responseType || 'text'),
            chartData
          }
        }
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      
      let errorContent = 'Sorry, I encountered an error while processing your request.'
      
      if (error instanceof Error) {
        if (error.message.includes('OpenAI API key')) {
          errorContent = `Sorry, I encountered an error: ${error.message}. Please check your OpenAI API key configuration and try again.`
        } else if (error.message.includes('HTTP 404')) {
          errorContent = `Sorry, I encountered an error: ${error.message}. Please check your OpenAI API key configuration and try again.`
        } else {
          errorContent = `Sorry, I encountered an error: ${error.message}. Please try again.`
        }
      }
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorContent,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'text/csv',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]

    if (!allowedTypes.includes(file.type)) {
      alert('Unsupported file type. Please upload images (PNG, JPG, JPEG, GIF, WebP), PDFs, or documents (DOC, DOCX, TXT, CSV, XLS, XLSX).')
      return
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      alert('File too large. Maximum size is 10MB.')
      return
    }

    // Create preview for images
    let preview: string | undefined
    if (file.type.startsWith('image/')) {
      preview = URL.createObjectURL(file)
    }

    // Force financial-only mode in production
    const analysisMode = 'financial'

    setFileUpload({
      file,
      preview,
      analysisMode
    })

    setShowFileUpload(false)
    // Clear the input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeFileUpload = () => {
    if (fileUpload?.preview) {
      URL.revokeObjectURL(fileUpload.preview)
    }
    setFileUpload(null)
  }

  const isFinancialFile = (file: File): boolean => {
    const fileName = file.name.toLowerCase()
    const financialKeywords = ['chart', 'graph', 'stock', 'trading', 'financial', 'analysis', 'report', 'earnings', 'market']
    return financialKeywords.some(keyword => fileName.includes(keyword))
  }

  const formatFileAnalysisResponse = (analysis: any): string => {
    let response = `📊 File Analysis Results\n\n`
    
    // Hide content type to avoid showing generic/general labels
    response += `Summary: ${analysis.summary}\n\n`
    
    if (analysis.keyInsights && analysis.keyInsights.length > 0) {
      response += `Key Insights:\n`
      analysis.keyInsights.forEach((insight: string, index: number) => {
        response += `${index + 1}. ${insight}\n`
      })
      response += '\n'
    }

    if (analysis.chartAnalysis) {
      response += `Chart Analysis:\n`
      response += `• Chart Type: ${analysis.chartAnalysis.chartType}\n`
      if (analysis.chartAnalysis.trends && analysis.chartAnalysis.trends.length > 0) {
        response += `• Trends: ${analysis.chartAnalysis.trends.map((t: any) => `${t.direction} (${t.strength})`).join(', ')}\n`
      }
      response += '\n'
    }

    if (analysis.recommendations && analysis.recommendations.length > 0) {
      response += `Recommendations:\n`
      analysis.recommendations.forEach((rec: string, index: number) => {
        response += `${index + 1}. ${rec}\n`
      })
      response += '\n'
    }

    if (analysis.extractedText && analysis.extractedText.length > 0) {
      response += `Extracted Text Preview:\n`
      response += `${analysis.extractedText.substring(0, 300)}${analysis.extractedText.length > 300 ? '...' : ''}\n\n`
    }

    // Do not display confidence or processing metadata in production

    return response
  }



  const startNewConversation = () => {
    const defaultMessage: Message = {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your AI trading assistant. I can help you analyze stocks, create strategies, explain concepts, and more. I can also analyze uploaded images, PDFs, and documents for financial insights.\n\nWhat would you like to know?',
      timestamp: new Date(),
      metadata: {
        responseType: 'welcome'
      }
    }
    setMessages([defaultMessage])
    setInputValue('')
    localStorage.removeItem('treadgpt-messages')
  }

  const quickActions = [
    {
      title: 'Analyze a stock',
      example: 'e.g., "What\'s the outlook for AAPL?"',
      icon: '📈'
    },
    {
      title: 'Show me a chart',
      example: 'e.g., "Show me GOOGL chart"',
      icon: '📊'
    },
    {
      title: 'Upload a chart',
      example: 'Analyze financial charts and graphs',
      icon: '📸',
      action: () => setShowFileUpload(true)
    },
    {
      title: 'Upload documents',
      example: 'Analyze PDFs, reports, and files',
      icon: '📄',
      action: () => setShowFileUpload(true)
    }
  ]

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
          <h1 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">TradeGPT</h1>
          <button
            onClick={startNewConversation}
            className="flex items-center space-x-1 sm:space-x-2 px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>
        </div>
      </div>

      {/* Privacy Banner (always visible) */}
      <div className="bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-200 dark:border-emerald-800">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm text-emerald-900 dark:text-emerald-100 leading-relaxed truncate">
              <span className="font-semibold">TradGPT: Zero‑Trace Intelligence</span> — Your Trades • Your Secrets • Your Edge • Private by design: no chat storage • no logs • no tracking
            </p>
          </div>
          <button
            className="w-full sm:w-auto text-xs px-3 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600"
            onClick={() => setShowPrivacyDetails(true)}
          >
            See Why We Never Store Your Chat
          </button>
        </div>
      </div>

      {showPrivacyDetails && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowPrivacyDetails(false)} />
          {/* Panel */}
          <div className="absolute inset-x-0 top-0 sm:inset-0 sm:m-auto sm:max-w-2xl bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-xl shadow-xl h-full sm:h-auto flex flex-col">
            {/* Top bar */}
            <div className="sticky top-0 flex items-center justify-between px-3 sm:px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <button
                  className="sm:hidden inline-flex items-center justify-center w-10 h-10 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200"
                  onClick={() => setShowPrivacyDetails(false)}
                  aria-label="Back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Why We Never Store Your Chat</h3>
              </div>
              <button
                className="inline-flex items-center justify-center w-10 h-10 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                onClick={() => setShowPrivacyDetails(false)}
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Content */}
            <div className="p-4 sm:p-5 space-y-4 text-sm text-gray-800 dark:text-gray-100 overflow-y-auto">
              <p className="font-medium">At TradGPT, your privacy isn’t an option — it’s a principle.</p>
              <p>We believe traders deserve full control over their data, strategies, and conversations. That’s why our system is built in Zero-Trace Mode.</p>

              <div>
                <h4 className="font-semibold mb-2">🔒 What It Means</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>No Chat Logs: Every message you send is processed instantly and then deleted.</li>
                  <li>No Storage: We don’t save your trading data, preferences, or history.</li>
                  <li>No Tracking: We don’t monitor, analyze, or sell your usage behavior.</li>
                  <li>No Learning from You: TradGPT doesn’t train or improve using your personal data.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">⚡ Why We Do It</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Protect Your Strategy – Your trading edge should remain yours alone.</li>
                  <li>Build Real Trust – Transparency is our foundation; we have nothing to hide.</li>
                  <li>Comply with Privacy Standards – Zero storage means zero data risk.</li>
                  <li>Empower the Trader – You own your knowledge and your results.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">🛡️ The Result</h4>
                <p>Every session is temporary, secure, and untraceable. When you leave, your chats vanish — only your insights remain.</p>
              </div>

              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <p className="font-medium">TradGPT: Where Intelligence Meets True Privacy.</p>
                <p>Your Trades. Your Secrets. Your Edge.</p>
              </div>
            </div>
            {/* Bottom actions for mobile */}
            <div className="sticky bottom-0 p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
              <button
                className="w-full py-2.5 text-sm rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={() => setShowPrivacyDetails(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-3 sm:p-4 space-y-4 sm:space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`${message.metadata?.responseType === 'chart' ? 'w-full' : 'max-w-3xl'} rounded-lg p-4 ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                }`}
              >
                {/* Chart Message */}
                {message.metadata?.responseType === 'chart' && message.metadata?.chartData ? (
                  <div>
                    <div className="mb-4 prose prose-sm max-w-none">
                      <div className="whitespace-pre-wrap">{message.content}</div>
                    </div>
                    <ChartMessage chartData={message.metadata.chartData} />
                  </div>
                ) : (
                  <>
                    <div className="prose prose-sm max-w-none">
                      <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
                    </div>
                    {message.metadata?.fileName && (
                      <div className="mt-2 flex items-center space-x-2 text-xs opacity-75">
                        <FileText className="w-3 h-3" />
                        <span>{message.metadata.fileName}</span>
                      </div>
                    )}
                    {message.metadata?.responseType && message.metadata.responseType !== 'text' && message.metadata.responseType !== 'chart' && (
                      <div className="mt-2 flex items-center space-x-2 text-xs opacity-75">
                        <span className={`px-2 py-1 rounded ${
                          message.metadata.responseType === 'file-analysis' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        }`}>
                          {message.metadata.responseType === 'file-analysis' ? '📊 File Analysis' : message.metadata.responseType}
                        </span>
                        {/* Confidence hidden in production */}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">AI is analyzing...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Quick Actions */}
      {messages.length === 1 && (
        <div className="max-w-4xl mx-auto p-3 sm:p-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 sm:mb-3">Quick Actions</h3>
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 gap-2 sm:gap-3">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => action.action ? action.action() : setInputValue(exampleToPrompt(action.example))}
                className="text-left p-2 sm:p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors min-h-[56px] sm:min-h-[72px]"
              >
                <div className="text-base sm:text-lg mb-0.5">{action.icon}</div>
                <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">{action.title}</div>
                <div className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">{action.example}</div>
              </button>
            ))}
          </div>
        </div>
      )}
      {showFileUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Upload File</h3>
              <button
                onClick={() => setShowFileUpload(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Upload images, PDFs, or documents for AI analysis. Supported formats:
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center space-x-1">
                  <Image className="w-3 h-3" />
                  <span>Images</span>
                </div>
                <div className="flex items-center space-x-1">
                  <FileText className="w-3 h-3" />
                  <span>PDFs</span>
                </div>
                <div className="flex items-center space-x-1">
                  <BarChart className="w-3 h-3" />
                  <span>Charts</span>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx"
                className="hidden"
              />
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
              >
                <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Click to upload file
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Max 10MB
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-3 sm:p-4" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <div className="max-w-4xl mx-auto">
          {/* File Upload Preview */}
          {fileUpload && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {fileUpload.preview ? (
                    <img src={fileUpload.preview} alt="Preview" className="w-12 h-12 object-cover rounded" />
                  ) : (
                    <FileText className="w-12 h-12 text-blue-500" />
                  )}
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {fileUpload.file.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {(fileUpload.file.size / 1024 / 1024).toFixed(2)} MB • Financial analysis
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={removeFileUpload}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Text Input */}
          <div className="flex items-end space-x-3 sm:space-x-4">
            <div className="flex-1">
              <div className="relative">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={fileUpload ? "Add a note about this file..." : "Ask about trading or stocks..."}
                  className="w-full resize-none overflow-hidden border border-gray-300 dark:border-gray-600 rounded-lg p-3 pr-12 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  rows={1}
                  style={{ minHeight: '44px', maxHeight: '120px' }}
                />
                <button
                  onClick={() => setShowFileUpload(true)}
                  className="absolute right-2 top-2 p-2 sm:p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  title="Upload file"
                >
                  <Upload className="w-4 h-4" />
                </button>
              </div>
            </div>
            <button
              onClick={handleSendMessage}
              disabled={(!inputValue.trim() && !fileUpload) || isLoading}
              className="p-3 sm:p-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center h-12 w-12 shadow-sm border border-blue-400"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}