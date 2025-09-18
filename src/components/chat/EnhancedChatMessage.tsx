'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  User, 
  Bot, 
  Copy, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Shield,
  Brain,
  Target,
  Clock,
  Star,
  AlertCircle,
  CheckCircle,
  Info,
  Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AIChatMessage } from '@/types'
import ReactMarkdown from 'react-markdown'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface EnhancedChatMessageProps {
  message: AIChatMessage
  onCopy?: (content: string) => void
  isStreaming?: boolean
  streamContent?: string
  showMemory?: boolean
  showGuardrails?: boolean
  userPreferences?: any
}

export function EnhancedChatMessage({ 
  message, 
  onCopy, 
  isStreaming = false, 
  streamContent = '',
  showMemory = true,
  showGuardrails = true,
  userPreferences
}: EnhancedChatMessageProps) {
  const [displayContent, setDisplayContent] = useState(message.content)
  const [showDetails, setShowDetails] = useState(false)
  const isUser = message.role === 'user'
  const hasToolCalls = message.toolCalls && message.toolCalls.length > 0
  const hasToolResults = message.toolResults && message.toolResults.length > 0
  const hasGuardrails = false // message.metadata?.guardrails - not available in current interface
  const hasMemory = false // message.metadata?.memory - not available in current interface

  // Handle streaming content updates
  useEffect(() => {
    if (isStreaming && streamContent) {
      setDisplayContent(streamContent)
    } else {
      setDisplayContent(message.content)
    }
  }, [message.content, isStreaming, streamContent])

  const handleCopy = () => {
    if (onCopy) {
      onCopy(displayContent)
    } else {
      navigator.clipboard.writeText(displayContent)
    }
  }

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'bg-gray-500'
    if (confidence >= 80) return 'bg-green-500'
    if (confidence >= 60) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getRiskLevelColor = (riskLevel?: string) => {
    switch (riskLevel) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getGuardrailIcon = (type: string) => {
    switch (type) {
      case 'risk': return <AlertTriangle className="w-4 h-4" />
      case 'compliance': return <Shield className="w-4 h-4" />
      case 'safety': return <CheckCircle className="w-4 h-4" />
      case 'content': return <Info className="w-4 h-4" />
      case 'rate': return <Clock className="w-4 h-4" />
      case 'protection': return <Shield className="w-4 h-4" />
      default: return <Info className="w-4 h-4" />
    }
  }

  const getGuardrailColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'critical': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`flex items-start space-x-3 max-w-[90%] ${
        isUser ? 'flex-row-reverse space-x-reverse' : ''
      }`}>
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
        }`}>
          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </div>

        {/* Message Content */}
        <div className={`p-4 rounded-lg ${
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-card border shadow-sm'
        }`}>
          {/* Message Content */}
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown
              components={{
                code({ className, children, ...props }) {
                  return (
                    <code className={`${className} bg-muted px-1 py-0.5 rounded text-sm`} {...props}>
                      {children}
                    </code>
                  )
                },
                h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                h2: ({ children }) => <h2 className="text-base font-semibold mb-2">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-medium mb-1">{children}</h3>,
                p: ({ children }) => <p className="mb-2">{children}</p>,
                ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
                li: ({ children }) => <li className="mb-1">{children}</li>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-primary pl-4 italic bg-muted/50 py-2 rounded-r">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {displayContent}
            </ReactMarkdown>
          </div>

          {/* Streaming indicator */}
          {isStreaming && (
            <div className="mt-2 flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-xs text-muted-foreground">AI is typing...</span>
            </div>
          )}

          {/* Tool Calls Indicator */}
          {hasToolCalls && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
              <div className="flex items-center space-x-2">
                <Zap className="w-3 h-3 text-blue-600" />
                <span className="text-blue-700">Fetching real-time data...</span>
              </div>
            </div>
          )}

          {/* Tool Results */}
          {hasToolResults && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-3 h-3 text-green-600" />
                <span className="text-green-700">Data retrieved successfully</span>
              </div>
            </div>
          )}

          {/* Guardrails Display - Disabled for now */}
          {/* {showGuardrails && hasGuardrails && !isUser && (
            <div className="mt-3 space-y-2">
              Guardrails functionality not available in current interface
            </div>
          )} */}

          {/* Memory Context Display - Disabled for now */}
          {/* {showMemory && hasMemory && !isUser && (
            <div className="mt-3 p-2 bg-purple-50 border border-purple-200 rounded text-xs">
              Memory functionality not available in current interface
            </div>
          )} */}

          {/* Message Footer */}
          <div className="flex items-center justify-between mt-3 text-xs">
            <div className="flex items-center space-x-2">
              <span className={isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'}>
                {message.timestamp.toLocaleTimeString()}
              </span>

              {/* Confidence Indicator */}
              {message.metadata?.confidence && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="flex items-center space-x-1">
                        <div className={`w-2 h-2 rounded-full ${getConfidenceColor(message.metadata.confidence)}`} />
                        <span className={isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'}>
                          {message.metadata.confidence}%
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>AI Confidence Level</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* Risk Level Badge */}
              {message.metadata?.riskLevel && (
                <Badge variant="outline" className={`text-xs ${getRiskLevelColor(message.metadata.riskLevel)}`}>
                  {message.metadata.riskLevel} risk
                </Badge>
              )}

              {/* Response Type Badge */}
              {message.metadata?.responseType && message.metadata.responseType !== 'text' && (
                <Badge variant="outline" className="text-xs">
                  {message.metadata.responseType}
                </Badge>
              )}

              {/* Memory Indicator - Disabled for now */}
              {/* {hasMemory && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Brain className="w-3 h-3 text-purple-500" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Personalized with memory</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )} */}

              {/* Guardrail Indicator - Disabled for now */}
              {/* {hasGuardrails && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Shield className={`w-3 h-3 ${
                        hasGuardrails.passed ? 'text-green-500' : 'text-red-500'
                      }`} />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{hasGuardrails.passed ? 'Safety check passed' : 'Safety check failed'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )} */}
            </div>

            {/* Action Buttons */}
            {!isUser && (
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
