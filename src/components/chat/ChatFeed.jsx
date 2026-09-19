/**
 * ChatFeed — Scrollable list of chat messages.
 * Auto-scrolls to bottom when new messages arrive.
 */
import { useEffect, useRef } from 'react'
import MessageBubble from './MessageBubble'

/**
 * @param {{
 *   messages: Array<import('./MessageBubble').Message>,
 *   className?: string
 * }} props
 */
export default function ChatFeed({ messages, className = '' }) {
  const bottomRef = useRef(null)

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div
      className={`flex-1 overflow-y-auto py-3 space-y-1 scrollbar-hide ${className}`}
      role="log"
      aria-live="polite"
      aria-label="Conversation"
    >
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
