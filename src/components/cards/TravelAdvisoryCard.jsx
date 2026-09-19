/**
 * TravelAdvisoryCard — Shows a travel safety assessment inside the chat.
 * Three levels: safe | caution | danger
 */
import { CheckCircle2, AlertTriangle, XCircle, Navigation, Phone } from 'lucide-react'

const SAFETY_CONFIG = {
  safe: {
    bg:      'bg-gradient-to-br from-green-500 to-emerald-600',
    icon:    <CheckCircle2 size={28} />,
    label:   'SAFE TO TRAVEL',
    sub:     'bg-green-900/30',
    textCls: 'text-green-50',
    metaCls: 'text-green-200',
  },
  caution: {
    bg:      'bg-gradient-to-br from-amber-500 to-orange-500',
    icon:    <AlertTriangle size={28} />,
    label:   'TRAVEL WITH CAUTION',
    sub:     'bg-orange-900/30',
    textCls: 'text-amber-50',
    metaCls: 'text-amber-200',
  },
  danger: {
    bg:      'bg-gradient-to-br from-red-500 to-red-700',
    icon:    <XCircle size={28} />,
    label:   'AVOID TRAVEL',
    sub:     'bg-red-900/30',
    textCls: 'text-red-50',
    metaCls: 'text-red-200',
  },
}

/** @param {{ data: import('@/data/mockResponses').TravelData }} */
export default function TravelAdvisoryCard({ data }) {
  const cfg = SAFETY_CONFIG[data.safetyLevel] ?? SAFETY_CONFIG.caution

  return (
    <div className={`w-full max-w-sm rounded-3xl text-white shadow-card-hover overflow-hidden animate-slide-up ${cfg.bg}`}>
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center gap-3">
        <span className={cfg.textCls}>{cfg.icon}</span>
        <div>
          <p className={`text-xs font-bold tracking-widest ${cfg.metaCls}`}>{cfg.label}</p>
          <p className="font-semibold mt-0.5 text-sm">{data.timeWindow}</p>
        </div>
      </div>

      {/* Summary */}
      <div className="px-5 pb-3">
        <p className={`text-sm leading-relaxed ${cfg.textCls}`}>{data.summary}</p>
      </div>

      {/* Conditions chips */}
      {data.conditions?.length > 0 && (
        <div className="px-5 pb-3 flex flex-wrap gap-2">
          {data.conditions.map((c) => (
            <span key={c} className={`text-xs px-3 py-1 rounded-full font-medium ${cfg.sub} ${cfg.textCls}`}>
              ⚠️ {c}
            </span>
          ))}
        </div>
      )}

      {/* Recommendation */}
      <div className={`mx-3 mb-3 rounded-2xl px-4 py-3 ${cfg.sub}`}>
        <p className={`text-sm font-medium ${cfg.textCls}`}>
          <Navigation size={14} className="inline mr-1.5" />
          {data.recommendation}
        </p>
      </div>

      {/* Emergency contact */}
      {data.emergencyContact && (
        <div className="px-5 pb-4 flex items-center gap-2">
          <Phone size={14} className={cfg.metaCls} />
          <p className={`text-xs ${cfg.metaCls}`}>
            Emergency: <span className="font-bold text-white">{data.emergencyContact}</span>
          </p>
        </div>
      )}
    </div>
  )
}
