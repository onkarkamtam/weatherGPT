/**
 * ChatInput — Sticky bottom bar with text input, mic button, and send button.
 * Phase 6: Integrated Web Speech API for voice input.
 */
import { useState, useRef, useEffect } from 'react'
import { Send, Mic, MicOff } from 'lucide-react'
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition'

/**
 * @param {{
 *   onSend: (message: string) => void,
 *   disabled?: boolean,
 *   placeholder?: string,
 *   language?: string,
 * }} props
 */
export default function ChatInput({
  onSend,
  disabled     = false,
  placeholder  = 'Ask about the weather…',
  language     = 'auto',
}) {
  const [value, setValue]   = useState('')
  const [voiceError, setVoiceError] = useState(null)
  const textareaRef          = useRef(null)

  // Voice recognition hook
  const {
    isListening,
    transcript,
    error: voiceRecognitionError,
    isSupported: isVoiceSupported,
    start: startListening,
    stop: stopListening,
  } = useVoiceRecognition({
    language,
    onTranscript: (text, isFinal) => {
      // Update input with live transcript
      setValue(text)
      
      // Focus textarea so user can see/edit
      if (textareaRef.current && isFinal) {
        textareaRef.current.focus()
      }
    },
    onError: (errorMsg) => {
      setVoiceError(errorMsg)
      // Clear error after 5 seconds
      setTimeout(() => setVoiceError(null), 5000)
    },
  })

  // Update value when transcript changes
  useEffect(() => {
    if (transcript) {
      setValue(transcript)
    }
  }, [transcript])

  // Ensure textarea has focus when listening stops and we have content
  useEffect(() => {
    if (!isListening && value && textareaRef.current) {
      // Small delay to ensure state has updated
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 10)
    }
  }, [isListening, value])

  // Clear voice error when user starts typing
  useEffect(() => {
    if (value && voiceError) {
      setVoiceError(null)
    }
  }, [value, voiceError])

  const handleSend = () => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    
    // Clear any voice errors when successfully sending a message
    if (voiceError) {
      setVoiceError(null)
    }
    
    onSend(trimmed)
    setValue('')
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e) => {
    // Send on Enter (not Shift+Enter)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      // Don't send if still listening (textarea should be disabled, but double-check)
      if (isListening) return
      handleSend()
    }
  }

  // Auto-grow textarea
  const handleInput = (e) => {
    setValue(e.target.value)
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`
    }
  }

  // Handle mic button click
  const handleMicClick = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  const canSend = value.trim().length > 0 && !disabled && !isListening

  return (
    <div className="shrink-0 px-3 py-3 pb-safe bg-white border-t border-slate-100">
      {/* Voice error message */}
      {voiceError && (
        <div className="mb-2 px-4 py-2 bg-red-50 border border-red-200 rounded-2xl animate-fade-in">
          <p className="text-xs text-red-600">{voiceError}</p>
        </div>
      )}

      {/* Voice recognition error */}
      {voiceRecognitionError && !voiceError && (
        <div className="mb-2 px-4 py-2 bg-red-50 border border-red-200 rounded-2xl animate-fade-in">
          <p className="text-xs text-red-600">{voiceRecognitionError}</p>
        </div>
      )}
      
      <div className={[
        'flex items-end gap-2 bg-slate-50 border rounded-3xl px-4 py-2.5 shadow-input transition-all',
        isListening 
          ? 'border-brand ring-2 ring-brand/20' 
          : 'border-slate-200 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20'
      ].join(' ')}>
        {/* Mic button */}
        <button
          type="button"
          onClick={handleMicClick}
          onKeyDown={(e) => {
            // Prevent Enter/Space from activating mic button
            // Mic should only be activated by explicit click/tap
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              e.stopPropagation()
            }
          }}
          disabled={disabled}
          aria-label={isListening ? 'Stop listening' : 'Start voice input'}
          title={
            !isVoiceSupported 
              ? 'Voice input not supported in this browser' 
              : isListening 
                ? 'Stop listening'
                : 'Start voice input'
          }
          className={[
            'shrink-0 w-9 h-9 flex items-center justify-center rounded-xl transition-colors active:scale-90 mb-0.5',
            isListening
              ? 'text-brand bg-brand/10 animate-pulse'
              : isVoiceSupported && !disabled
                ? 'text-slate-400 hover:text-brand hover:bg-sky-50'
                : 'text-slate-300 cursor-not-allowed'
          ].join(' ')}
        >
          {isListening ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        {/* Text input */}
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={disabled || isListening}
          placeholder={isListening ? 'Listening...' : placeholder}
          aria-label="Type your weather question"
          className="flex-1 bg-transparent text-slate-800 placeholder-slate-400 text-base resize-none outline-none leading-relaxed max-h-[120px] py-0.5 disabled:opacity-50"
        />

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          onKeyDown={(e) => {
            // Prevent Enter/Space from activating send button via keyboard
            // Send should happen via Enter in textarea or explicit click
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              e.stopPropagation()
            }
          }}
          disabled={!canSend}
          aria-label="Send message"
          className={[
            'shrink-0 w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-90 mb-0.5',
            canSend
              ? 'bg-brand text-white shadow-sm hover:bg-brand-dark'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed',
          ].join(' ')}
        >
          <Send size={17} />
        </button>
      </div>

      {/* Status hints */}
      <div className="flex items-center justify-between mt-1.5 px-1">
        <p className="text-[10px] text-slate-400">
          {isListening ? (
            <span className="text-brand font-medium">🎤 Listening...</span>
          ) : isVoiceSupported ? (
            '🎙️ Tap mic for voice input'
          ) : (
            'Voice input not available in this browser'
          )}
        </p>
        
        {isListening && (
          <button
            onClick={stopListening}
            className="text-[10px] text-brand hover:text-brand-dark font-medium"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
