/**
 * IMDNowcastCard — Displays IMD short-term (3-hour) weather nowcast
 * Shows immediate weather conditions and categories
 * 
 * Data structure from server/providers/IMDProvider.js _normalizeNowcast()
 */
import { Cloud, Clock, MapPin, AlertCircle } from 'lucide-react'

const SEVERITY_COLORS = {
  severe: 'bg-gradient-to-br from-red-500 to-red-600',
  moderate: 'bg-gradient-to-br from-orange-400 to-orange-500',
  minor: 'bg-gradient-to-br from-yellow-400 to-yellow-500',
  none: 'bg-gradient-to-br from-blue-400 to-blue-500',
}

export default function IMDNowcastCard({ data }) {
  if (!data?.active) {
    return (
      <div className="w-full max-w-sm rounded-3xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 px-5 py-4 shadow-card animate-slide-up">
        <div className="flex items-center gap-2">
          <Cloud size={18} className="text-slate-500" />
          <p className="text-sm font-medium text-slate-600">No active nowcast</p>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Source: India Meteorological Department
        </p>
      </div>
    )
  }

  const bgColor = SEVERITY_COLORS[data.severity] ?? SEVERITY_COLORS.none

  return (
    <div className={`w-full max-w-sm rounded-3xl text-white shadow-card-hover overflow-hidden animate-slide-up ${bgColor}`}>
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-start gap-3">
          <Cloud size={22} className="mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-bold tracking-widest text-white/80">
              3-HOUR NOWCAST
            </p>
            <h3 className="text-lg font-bold mt-0.5 leading-snug">
              {data.station}
            </h3>
          </div>
        </div>
      </div>

      {/* Message */}
      {data.message && (
        <div className="px-5 pb-3">
          <p className="text-sm leading-relaxed text-white/95">
            {data.message}
          </p>
        </div>
      )}

      {/* Meta info */}
      <div className="mx-3 mb-3 rounded-2xl px-4 py-3 space-y-1.5 bg-black/20">
        <MetaRow 
          icon={<Clock size={13} />} 
          text={`Valid: ${data.timeOfIssue} to ${data.validUntil}`} 
        />
        {data.date && (
          <MetaRow 
            icon={<MapPin size={13} />} 
            text={`Date: ${data.date}`} 
          />
        )}
      </div>

      {/* Weather categories */}
      {data.categories?.length > 0 && (
        <div className="px-5 pb-3">
          <p className="text-xs font-bold tracking-wide text-white/80 mb-2">
            EXPECTED CONDITIONS:
          </p>
          <div className="space-y-1">
            {data.categories.map((cat, i) => (
              <div key={i} className="flex items-start gap-2">
                <AlertCircle size={14} className="mt-0.5 shrink-0 text-white/90" />
                <p className="text-xs text-white/95 leading-relaxed">
                  {cat.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Source */}
      <div className="px-5 pb-4">
        <p className="text-xs font-medium text-white/70">
          🇮🇳 Source: India Meteorological Department (IMD)
        </p>
      </div>
    </div>
  )
}

function MetaRow({ icon, text }) {
  if (!text) return null
  return (
    <div className="flex items-start gap-1.5">
      <span className="mt-0.5 shrink-0 text-white/80">{icon}</span>
      <p className="text-xs leading-relaxed text-white/90">{text}</p>
    </div>
  )
}
