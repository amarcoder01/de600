'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Volume2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// TypeScript declarations for SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

interface VoiceInputProps {
  onTranscript: (text: string) => void
  disabled?: boolean
}

export function VoiceInput({ onTranscript, disabled = false }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState(false)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    // Check if speech recognition is supported
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setIsSupported(true)
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true
      recognitionRef.current.lang = 'en-US'

      recognitionRef.current.onstart = () => {
        setIsListening(true)
        setError(null)
        setTranscript('')
      }

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = ''
        let interimTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript
          } else {
            interimTranscript += transcript
          }
        }

        setTranscript(finalTranscript + interimTranscript)
      }

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        setError(`Speech recognition error: ${event.error}`)
        setIsListening(false)
      }

      recognitionRef.current.onend = () => {
        setIsListening(false)
        if (transcript.trim()) {
          onTranscript(transcript.trim())
          setTranscript('')
        }
      }
    } else {
      setIsSupported(false)
      setError('Speech recognition is not supported in this browser')
    }
  }, [onTranscript, transcript])

  const startListening = () => {
    if (!isSupported || disabled) return
    
    try {
      recognitionRef.current?.start()
    } catch (error) {
      console.error('Error starting speech recognition:', error)
      setError('Failed to start voice input')
    }
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }

  const handleToggle = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  if (!isSupported) {
    return (
      <div className="flex items-center space-x-2 text-muted-foreground">
        <AlertCircle className="w-4 h-4" />
        <span className="text-sm">Voice input not supported</span>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-2">
      <Button
        variant={isListening ? "destructive" : "outline"}
        size="sm"
        onClick={handleToggle}
        disabled={disabled}
        className="relative"
      >
        <AnimatePresence>
          {isListening && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute inset-0 bg-red-500/20 rounded-md"
            />
          )}
        </AnimatePresence>
        
        {isListening ? (
          <MicOff className="w-4 h-4" />
        ) : (
          <Mic className="w-4 h-4" />
        )}
      </Button>

      {isListening && (
        <div className="flex items-center space-x-2">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="w-2 h-2 bg-red-500 rounded-full"
          />
          <Badge variant="outline" className="text-xs">
            Listening...
          </Badge>
        </div>
      )}

      {transcript && (
        <div className="flex-1">
          <div className="text-sm text-muted-foreground">
            <Volume2 className="w-3 h-3 inline mr-1" />
            {transcript}
          </div>
        </div>
      )}

      {error && (
        <div className="text-xs text-red-600">
          {error}
        </div>
      )}
    </div>
  )
}
