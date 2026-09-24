/**
 * useVoiceRecognition — Web Speech API wrapper for voice input.
 * 
 * Provides:
 *  - Start/stop voice recognition
 *  - Live transcript updates
 *  - Error handling
 *  - Browser compatibility detection
 *  - Language support (EN, HI, MR where available)
 * 
 * Phase 6: Voice input integration for WeatherGPT
 */
import { useState, useRef, useCallback, useEffect } from 'react'

// Language code mapping for Web Speech API
const LANG_CODES = {
  auto: 'en-IN',  // Default to English (India)
  en:   'en-IN',
  hi:   'hi-IN',
  mr:   'mr-IN',
  ta:   'ta-IN',
  te:   'te-IN',
  bn:   'bn-IN',
}

/**
 * Check if browser supports Web Speech API
 */
export function isSpeechRecognitionSupported() {
  return !!(
    typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition)
  )
}

/**
 * @param {{
 *   onTranscript?: (text: string, isFinal: boolean) => void,
 *   onError?: (error: string) => void,
 *   language?: string,
 * }} options
 * 
 * @returns {{
 *   isListening: boolean,
 *   transcript: string,
 *   error: string | null,
 *   isSupported: boolean,
 *   start: () => void,
 *   stop: () => void,
 * }}
 */
export function useVoiceRecognition({
  onTranscript,
  onError,
  language = 'auto',
} = {}) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript]   = useState('')
  const [error, setError]             = useState(null)
  const [isSupported]                 = useState(isSpeechRecognitionSupported())
  
  const recognitionRef = useRef(null)
  const callbacksRef = useRef({ onTranscript, onError })
  const hadSuccessfulTranscriptRef = useRef(false)

  // Update callbacks ref when they change (without reinitializing recognition)
  useEffect(() => {
    callbacksRef.current = { onTranscript, onError }
  }, [onTranscript, onError])

  // Initialize speech recognition instance once
  useEffect(() => {
    if (!isSupported) return

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    // Configuration
    recognition.continuous = false          // Stop after one phrase
    recognition.interimResults = true       // Show live transcription
    recognition.maxAlternatives = 1
    recognition.lang = LANG_CODES[language] || LANG_CODES.en

    // Event handlers
    recognition.onstart = () => {
      console.log('[VoiceRecognition] Started')
      setIsListening(true)
      setError(null)
      setTranscript('')
      hadSuccessfulTranscriptRef.current = false
    }

    recognition.onresult = (event) => {
      const results = event.results
      const lastResult = results[results.length - 1]
      const transcriptText = lastResult[0].transcript
      const isFinal = lastResult.isFinal

      console.log('[VoiceRecognition] Result:', transcriptText, 'isFinal:', isFinal)
      setTranscript(transcriptText)
      
      // Mark that we had a successful transcription
      if (transcriptText.trim().length > 0) {
        hadSuccessfulTranscriptRef.current = true
      }
      
      // Use callback ref to avoid stale closures
      if (callbacksRef.current.onTranscript) {
        callbacksRef.current.onTranscript(transcriptText, isFinal)
      }

      // Auto-stop after final result
      if (isFinal) {
        recognition.stop()
      }
    }

    recognition.onerror = (event) => {
      console.error('[VoiceRecognition] Error:', event.error)
      
      let errorMessage = 'Voice recognition failed. Please try again.'
      
      switch (event.error) {
        case 'no-speech':
          // Don't show "no speech" error if we already captured a successful transcript
          // This prevents the error from appearing when user presses Enter after speech is recognized
          if (hadSuccessfulTranscriptRef.current) {
            console.log('[VoiceRecognition] Suppressing no-speech error - transcript was captured')
            errorMessage = null
          } else {
            errorMessage = 'No speech detected. Please try speaking again.'
          }
          break
        case 'audio-capture':
          errorMessage = 'Microphone not available. Check your device settings.'
          break
        case 'not-allowed':
          errorMessage = 'Microphone permission denied. Enable it in browser settings.'
          break
        case 'network':
          errorMessage = 'Network error. Check your internet connection.'
          break
        case 'aborted':
          // User cancelled - not an error
          errorMessage = null
          break
      }

      if (errorMessage) {
        setError(errorMessage)
        // Use callback ref
        if (callbacksRef.current.onError) {
          callbacksRef.current.onError(errorMessage)
        }
      }
      
      setIsListening(false)
    }

    recognition.onend = () => {
      console.log('[VoiceRecognition] Ended')
      setIsListening(false)
    }

    recognitionRef.current = recognition

    // Cleanup on unmount
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }
  }, [isSupported, language])

  // Start recognition
  const start = useCallback(() => {
    if (!isSupported) {
      const msg = 'Voice input is not supported in this browser. Try Chrome, Edge, or Safari.'
      setError(msg)
      if (callbacksRef.current.onError) {
        callbacksRef.current.onError(msg)
      }
      return
    }

    try {
      setError(null)
      setTranscript('')
      hadSuccessfulTranscriptRef.current = false
      console.log('[VoiceRecognition] Attempting to start...')
      recognitionRef.current?.start()
    } catch (err) {
      console.error('[VoiceRecognition] Start failed:', err)
      const msg = 'Could not start voice recognition. Please try again.'
      setError(msg)
      if (callbacksRef.current.onError) {
        callbacksRef.current.onError(msg)
      }
    }
  }, [isSupported])

  // Stop recognition
  const stop = useCallback(() => {
    try {
      console.log('[VoiceRecognition] Stopping...')
      recognitionRef.current?.stop()
    } catch (err) {
      console.error('[VoiceRecognition] Stop failed:', err)
    }
  }, [])

  return {
    isListening,
    transcript,
    error,
    isSupported,
    start,
    stop,
  }
}
