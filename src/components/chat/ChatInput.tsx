'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Send, Mic, MicOff, Paperclip, Smile } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useHotkeys } from 'react-hotkeys-hook'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  isLoading?: boolean
  placeholder?: string
}

export function ChatInput({ 
  value, 
  onChange, 
  onSend, 
  isLoading = false,
  placeholder = "Ask me anything about trading, stocks, or just chat..."
}: ChatInputProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Keyboard shortcuts
  useHotkeys('ctrl+enter', (e) => {
    e.preventDefault()
    if (!isLoading && value.trim()) {
      onSend()
    }
  })

  useHotkeys('enter', (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      if (!isLoading && value.trim()) {
        onSend()
      }
    }
  })

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [value])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isLoading && value.trim()) {
      onSend()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!isLoading && value.trim()) {
        onSend()
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="flex items-end space-x-2 p-3 border border-border rounded-lg bg-background focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary">
        <div className="flex-1 min-h-[20px] max-h-32 overflow-y-auto">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            className="w-full resize-none border-none bg-transparent outline-none placeholder:text-muted-foreground text-sm"
            rows={1}
            style={{ minHeight: '20px', maxHeight: '128px' }}
          />
        </div>
        
        <div className="flex items-center space-x-1">
          {/* Voice Input Button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsRecording(!isRecording)}
            disabled={isLoading}
            className="h-8 w-8 p-0"
          >
            {isRecording ? (
              <MicOff className="h-4 w-4 text-red-500" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>

          {/* Send Button */}
          <Button
            type="submit"
            size="sm"
            disabled={isLoading || !value.trim()}
            className="h-8 w-8 p-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Recording indicator */}
      {isRecording && (
        <div className="absolute -top-2 -right-2">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span>AI is thinking...</span>
          </div>
        </div>
      )}
    </form>
  )
}
