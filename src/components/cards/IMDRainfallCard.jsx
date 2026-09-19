/**
 * IMDRainfallCard — Displays IMD district rainfall data
 * Shows actual vs normal rainfall with departure analysis
 * 
 * Data structure from server/providers/IMDProvider.js _normalizeDistrictRainfall()
 */
import { CloudRain, TrendingUp, TrendingDown, Minus } from 'lucide-react'

const CATEGORY_CONFIG = {
  large_excess: {
    label: 'Large Excess',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
  },
  excess: {
    label: 'Excess',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  normal: {
    label: 'Normal',
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
  },
  deficient: {
    label: 'Deficient',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
  },
  large_deficient: {
    label: 'Large Deficient',
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
  },
}

export default function IMDRainfallCard({ data }) {
  const cfg = CATEGORY_CONFIG[data.category] ?? CATEGORY_CONFIG.normal
  const departure = data.departure || 0
  const departurePercent = data.departurePercent || 0

  return (
    <div className={`w-full max-w-sm rounded-3xl border shadow-card overflow-hidden animate-slide-up ${cfg.bg} ${cfg.border}`}>
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-start gap-3">
          <CloudRain size={22} className={cfg.color} />
          <div className="flex-1">
            <p className={`text-xs font-bold tracking-widest ${cfg.color}`}>
              RAINFALL ANALYSIS
            </p>
            <h3 className="text-lg font-bold mt-0.5 leading-snug text-slate-800">
              {data.district}
            </h3>
            {data.state && (
              <p className="text-xs text-slate-600 mt-0.5">{data.state}</p>
            )}
          </div>
        </div>
      </div>

      {/* Rainfall data */}
      <div className="px-5 pb-4 space-y-3">
        {/* Actual vs Normal */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/60 rounded-2xl px-4 py-3 border border-slate-200">
            <p className="text-xs text-slate-500 font-medium">Actual</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">
              {data.actual.toFixed(1)}
              <span className="text-sm text-slate-500 ml-1">mm</span>
            </p>
          </div>
          
          <div className="bg-white/60 rounded-2xl px-4 py-3 border border-slate-200">
            <p className="text-xs text-slate-500 font-medium">Normal</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">
              {data.normal.toFixed(1)}
              <span className="text-sm text-slate-500 ml-1">mm</span>
            </p>
          </div>
        </div>

        {/* Departure */}
        <div className="bg-white/60 rounded-2xl px-4 py-3 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Departure</p>
              <p className={`text-xl font-bold mt-1 ${cfg.color}`}>
                {departure > 0 ? '+' : ''}{departure.toFixed(1)} mm
              </p>
              <p className={`text-sm font-medium ${cfg.color}`}>
                ({departurePercent > 0 ? '+' : ''}{departurePercent.toFixed(1)}%)
              </p>
            </div>
            <div className={`p-2 rounded-full ${cfg.bg}`}>
              {Math.abs(departurePercent) < 19 ? (
                <Minus size={20} className={cfg.color} />
              ) : departurePercent > 0 ? (
                <TrendingUp size={20} className={cfg.color} />
              ) : (
                <TrendingDown size={20} className={cfg.color} />
              )}
            </div>
          </div>
        </div>

        {/* Category badge */}
        <div className={`rounded-2xl px-4 py-2 border ${cfg.border}`}>
          <p className={`text-sm font-bold text-center ${cfg.color}`}>
            Category: {cfg.label}
          </p>
        </div>

        {/* Period */}
        {data.period && (
          <p className="text-xs text-slate-500 text-center">
            Period: {data.period}
          </p>
        )}
      </div>

      {/* Source */}
      <div className="px-5 pb-4 border-t border-slate-200/50 pt-3">
        <p className="text-xs font-medium text-slate-600">
          🇮🇳 Source: India Meteorological Department (IMD)
        </p>
        <p className="text-xs text-slate-500 mt-0.5">
          Updated: {new Date(data.date).toLocaleDateString('en-IN', { 
            dateStyle: 'medium' 
          })}
        </p>
      </div>
    </div>
  )
}
