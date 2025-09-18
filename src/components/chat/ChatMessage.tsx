'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { User, Bot, Copy, Download, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AIChatMessage } from '@/types'
import ReactMarkdown from 'react-markdown'

interface ChatMessageProps {
  message: AIChatMessage
  onCopy?: (content: string) => void
  isStreaming?: boolean
  streamContent?: string
}

export function ChatMessage({ message, onCopy, isStreaming = false, streamContent = '' }: ChatMessageProps) {
  const [displayContent, setDisplayContent] = useState(message.content)
  const isUser = message.role === 'user'
  const hasToolCalls = message.toolCalls && message.toolCalls.length > 0
  const hasToolResults = message.toolResults && message.toolResults.length > 0

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
      case 'low': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'high': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`flex items-start space-x-3 max-w-[85%] ${
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
                // Custom components for trading data
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
                <TrendingUp className="w-3 h-3 text-blue-600" />
                <span className="text-blue-700">Fetching real-time data...</span>
              </div>
            </div>
          )}

          {/* Tool Results */}
          {hasToolResults && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-3 h-3 text-green-600" />
                <span className="text-green-700">Data retrieved successfully</span>
              </div>
            </div>
          )}

          {/* Message Footer */}
          <div className="flex items-center justify-between mt-3 text-xs">
            <div className="flex items-center space-x-2">
              <span className={isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'}>
                {message.timestamp.toLocaleTimeString()}
              </span>

              {/* Confidence Indicator */}
              {message.metadata?.confidence && (
                <div className="flex items-center space-x-1">
                  <div className={`w-2 h-2 rounded-full ${getConfidenceColor(message.metadata.confidence)}`} />
                  <span className={isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'}>
                    {message.metadata.confidence}% confidence
                  </span>
                </div>
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
