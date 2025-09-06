'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Send, Plus, Upload, FileText, Image, BarChart, X } from 'lucide-react'
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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
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
    localStorage.removeItem('treadgpt-messages')
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined' && messages.length > 0) {
      localStorage.setItem('treadgpt-messages', JSON.stringify(messages))
    }
  }, [messages])

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
        formData.append('analysisMode', fileUpload.analysisMode)
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

        // Clear file upload
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

    // Default to financial mode for financial files, general for others
    const analysisMode = isFinancialFile(file) ? 'financial' : 'general'

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
    
    response += `Content Type: ${analysis.contentType}\n\n`
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

    response += `Confidence Level: ${analysis.confidence}/10\n`
    response += `Processing Time: ${analysis.processingTime}ms`

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
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">TradeGPT</h1>
        <button
          onClick={startNewConversation}
          className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Chat</span>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4 space-y-6">
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
                        {message.metadata.fileAnalysis?.confidence && (
                          <span className="text-gray-600 dark:text-gray-400">
                            Confidence: {message.metadata.fileAnalysis.confidence}/10
                          </span>
                        )}
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
        <div className="max-w-4xl mx-auto p-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => action.action ? action.action() : setInputValue(action.example)}
                className="text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="text-lg mb-1">{action.icon}</div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">{action.title}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{action.example}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* File Upload Modal */}
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
      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
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
                      {(fileUpload.file.size / 1024 / 1024).toFixed(2)} MB • {fileUpload.analysisMode} analysis
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <select
                    value={fileUpload.analysisMode}
                    onChange={(e) => setFileUpload(prev => prev ? {...prev, analysisMode: e.target.value as 'financial' | 'general'} : null)}
                    className="text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1"
                  >
                    <option value="financial">Financial</option>
                    <option value="general">General</option>
                  </select>
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
          <div className="flex items-end space-x-4">
            <div className="flex-1">
              <div className="relative">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={fileUpload ? "Add a message about this file (optional)..." : "Ask me anything about trading, stocks, or market analysis..."}
                  className="w-full resize-none border border-gray-300 dark:border-gray-600 rounded-lg p-3 pr-12 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={1}
                  style={{ minHeight: '44px', maxHeight: '120px' }}
                />
                <button
                  onClick={() => setShowFileUpload(true)}
                  className="absolute right-2 top-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  title="Upload file"
                >
                  <Upload className="w-4 h-4" />
                </button>
              </div>
            </div>
            <button
              onClick={handleSendMessage}
              disabled={(!inputValue.trim() && !fileUpload) || isLoading}
              className="p-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center h-12 w-12 shadow-sm border border-blue-400 transform -translate-y-1"
            >
              <Send className="w-5 h-5 transform -translate-y-0.5 rotate-12" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}