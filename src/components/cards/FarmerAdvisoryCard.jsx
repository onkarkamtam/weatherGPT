/**
 * FarmerAdvisoryCard — Agriculture-focused weather impact card.
 * Plain language, actionable bullet list, best activity window.
 */
import { Sprout, Clock, AlertTriangle, CheckCircle2, Info } from 'lucide-react'

const RISK_CONFIG = {
  low: {
    bg:      'bg-gradient-to-br from-emerald-500 to-green-600',
    badge:   '🟢 Low Risk',
    textCls: 'text-green-50',
    metaCls: 'text-green-200',
    sub:     'bg-green-900/25',
  },
  medium: {
    bg:      'bg-gradient-to-br from-amber-500 to-orange-500',
    badge:   '🟡 Moderate Risk',
    textCls: 'text-amber-50',
    metaCls: 'text-amber-200',
    sub:     'bg-orange-900/25',
  },
  high: {
    bg:      'bg-gradient-to-br from-red-500 to-rose-600',
    badge:   '🔴 High Risk',
    textCls: 'text-red-50',
    metaCls: 'text-red-200',
    sub:     'bg-red-900/25',
  },
}

/** @param {{ data: import('@/data/mockResponses').FarmerData }} */
export default function FarmerAdvisoryCard({ data }) {
  const cfg = RISK_CONFIG[data.riskLevel] ?? RISK_CONFIG.medium

  return (
    <div className={`w-full max-w-sm rounded-3xl text-white shadow-card-hover overflow-hidden animate-slide-up ${cfg.bg}`}>
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-start gap-3">
        <Sprout size={26} className={cfg.textCls} />
        <div>
          <p className={`text-xs font-bold tracking-widest ${cfg.metaCls}`}>FARMING ADVISORY</p>
          <h3 className="font-bold text-base mt-0.5">{data.cropFocus}</h3>
          <span className={`text-xs font-medium mt-1 inline-block ${cfg.metaCls}`}>{cfg.badge}</span>
        </div>
      </div>

      {/* Weather summary */}
      <div className={`mx-3 mb-3 rounded-2xl px-4 py-3 ${cfg.sub}`}>
        <p className={`text-sm leading-relaxed ${cfg.textCls}`}>{data.weatherSummary}</p>
      </div>

      {/* Advisory list */}
      {data.advisories?.length > 0 && (
        <div className="px-5 pb-3 space-y-2">
          {data.advisories.map((adv, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-base shrink-0">•</span>
              <p className={`text-sm leading-relaxed ${cfg.textCls}`}>{adv}</p>
            </div>
          ))}
        </div>
      )}

      {/* Best activity window */}
      {data.bestActivityWindow && (
        <div className={`mx-3 mb-3 rounded-2xl px-4 py-2.5 flex items-center gap-2 ${cfg.sub}`}>
          <Clock size={15} className={`${cfg.metaCls} shrink-0`} />
          <p className={`text-sm font-semibold ${cfg.textCls}`}>
            Best time: {data.bestActivityWindow}
          </p>
        </div>
      )}

      {/* Source */}
      <div className="px-5 pb-4">
        <p className={`text-xs ${cfg.metaCls}`}>Source: {data.source}</p>
      </div>
    </div>
  )
}
