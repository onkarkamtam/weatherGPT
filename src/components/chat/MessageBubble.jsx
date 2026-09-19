/**
 * MessageBubble — Renders a single chat message (user or AI).
 * AI messages can contain an embedded weather response card.
 *
 * Phase 3: AI message text is run through renderMarkdown() to display
 * **bold**, *italic*, paragraphs, and • bullets from Gemini responses.
 * 
 * Phase 6 Final: Added AlertBanner for weather warnings
 */
import WeatherCard        from '@/components/cards/WeatherCard'
import AlertCard          from '@/components/cards/AlertCard'
import TravelAdvisoryCard from '@/components/cards/TravelAdvisoryCard'
import FarmerAdvisoryCard from '@/components/cards/FarmerAdvisoryCard'
import AlertBanner        from '@/components/cards/AlertBanner'
import HistoricalComparisonCard from '@/components/cards/HistoricalComparisonCard'
import NWPDisplayCard     from '@/components/cards/NWPDisplayCard'
import ClimateTrendCard   from '@/components/cards/ClimateTrendCard'
import IMDWarningCard     from '@/components/cards/IMDWarningCard'
import IMDNowcastCard     from '@/components/cards/IMDNowcastCard'
import IMDRainfallCard    from '@/components/cards/IMDRainfallCard'
import { CloudSun }       from 'lucide-react'

// ─── Lightweight inline markdown renderer ────────────────────────────────────
/**
 * Converts a subset of markdown to React elements.
 * Handles: **bold**, *italic*, newline paragraphs, and • / - bullet lines.
 * No external library — keeps bundle size minimal.
 */
function renderInline(text) {
  // Split on **bold** and *italic* markers
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i}>{part.slice(1, -1)}</em>
    }
    return part
  })
}

function renderMarkdown(text) {
  if (!text) return null
  const paragraphs = text.split(/\n\n+/)
  return paragraphs.map((para, pi) => {
    const lines = para.split('\n')
    const isBulletBlock = lines.every((l) => /^[•\-\*]\s/.test(l.trim()) || l.trim() === '')
    if (isBulletBlock) {
      return (
        <ul key={pi} className="list-disc list-inside space-y-0.5 mt-1">
          {lines.filter(Boolean).map((line, li) => (
            <li key={li}>{renderInline(line.replace(/^[•\-\*]\s/, ''))}</li>
          ))}
        </ul>
      )
    }
    return (
      <p key={pi} className={pi > 0 ? 'mt-2' : ''}>
        {lines.map((line, li) => (
          <span key={li}>
            {li > 0 && <br />}
            {renderInline(line)}
          </span>
        ))}
      </p>
    )
  })
}

// ─── Card renderer ────────────────────────────────────────────────────────────
function ResponseCard({ card }) {
  if (!card) return null
  const { type, data, location } = card
  if (type === 'weather') return <WeatherCard data={data} />
  if (type === 'period-weather') return <WeatherCard data={data} isPeriod={true} />
  if (type === 'alert')   return <AlertCard   data={data} />
  if (type === 'travel')  return <TravelAdvisoryCard data={data} />
  if (type === 'farmer')  return <FarmerAdvisoryCard data={data} />
  if (type === 'historical') return <HistoricalComparisonCard data={data} />
  if (type === 'nwp') return <NWPDisplayCard data={data} comparison={false} />
  if (type === 'nwp-comparison') return <NWPDisplayCard data={data} comparison={true} />
  if (type === 'climate') return <ClimateTrendCard data={data} location={location} />
  if (type === 'imd-warning') return <IMDWarningCard data={data} />
  if (type === 'imd-nowcast') return <IMDNowcastCard data={data} />
  if (type === 'imd-rainfall') return <IMDRainfallCard data={data} />
  return null
}

/**
 * @param {{
 *   message: {
 *     id: string,
 *     role: 'user'|'ai',
 *     text: string|null,
 *     card?: { type: string, data: object }|null,
 *     timestamp?: string,
 *     isTyping?: boolean,
 *     loadingMessage?: string,
 *   }
 * }} props
 */
export default function MessageBubble({ message }) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end px-4 py-1 animate-slide-up">
        <div className="flex flex-col items-end gap-1 max-w-[80%]">
          <div className="chat-bubble bg-brand text-white rounded-tr-sm">
            {message.text}
          </div>
          {message.timestamp && (
            <p className="text-xs text-slate-400 px-1">{message.timestamp}</p>
          )}
        </div>
      </div>
    )
  }

  // AI message
  return (
    <div className="flex items-start gap-2.5 px-4 py-1 animate-slide-up">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-xl bg-brand flex items-center justify-center shrink-0 mt-1 shadow-sm">
        <CloudSun size={16} className="text-white" />
      </div>

      <div className="flex flex-col gap-2 max-w-[85%]">
        {/* Typing indicator with optional loading message */}
        {message.isTyping ? (
          <div className="flex flex-col gap-1">
            {message.loadingMessage && (
              <p className="text-xs text-sky-600 font-medium px-1">
                {message.loadingMessage}
              </p>
            )}
            <div className="chat-bubble bg-white border border-slate-100 shadow-input rounded-tl-sm">
              <div className="flex gap-1 items-center h-4">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Show alert banner if weather data contains alert */}
            {message.card?.type === 'weather' && message.card?.data?.alert && (
              <AlertBanner alert={message.card.data.alert} />
            )}
            
            {message.text && (
              <div className="chat-bubble bg-white border border-slate-100 shadow-input rounded-tl-sm text-slate-700">
                {/* Phase 3: AI text rendered as markdown; user text stays plain */}
                {renderMarkdown(message.text)}
              </div>
            )}
            {message.card && <ResponseCard card={message.card} />}
          </>
        )}

        {message.timestamp && !message.isTyping && (
          <p className="text-xs text-slate-400 px-1">{message.timestamp}</p>
        )}
      </div>
    </div>
  )
}
