/**
 * IMDWarningCard — Displays official IMD weather warnings
 * Shows district-wise warnings with severity, event type, and affected areas
 * 
 * Data structure from server/providers/IMDProvider.js _normalizeWarnings()
 */
import { AlertTriangle, ShieldAlert, Info, Calendar, MapPin } from 'lucide-react'

const SEVERITY_CONFIG = {
  severe: {
    bg: 'bg-gradient-to-br from-red-500 to-red-700',
    icon: <ShieldAlert size={22} />,
    label: 'SEVERE WARNING',
    textCls: 'text-red-50',
    metaCls: 'text-red-200',
    subBg: 'bg-red-900/30',
  },
  moderate: {
    bg: 'bg-gradient-to-br from-orange-500 to-orange-600',
    icon: <AlertTriangle size={22} />,
    label: 'MODERATE WARNING',
    textCls: 'text-orange-50',
    metaCls: 'text-orange-200',
    subBg: 'bg-orange-900/30',
  },
  minor: {
    bg: 'bg-gradient-to-br from-yellow-400 to-yellow-600',
    icon: <Info size={22} />,
    label: 'MINOR ADVISORY',
    textCls: 'text-yellow-900',
    metaCls: 'text-yellow-700',
    subBg: 'bg-yellow-900/20',
  },
}

export default function IMDWarningCard({ data }) {
  if (!data?.hasActiveWarnings || !data.warnings?.length) {
    return (
      <div className="w-full max-w-sm rounded-3xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 px-5 py-4 shadow-card animate-slide-up">
        <div className="flex items-center gap-2">
          <Info size={18} className="text-green-600" />
          <p className="text-sm font-medium text-green-700">No active weather warnings</p>
        </div>
        <p className="text-xs text-green-600 mt-1">
          Source: India Meteorological Department
        </p>
      </div>
    )
  }

  // Take the most severe warning for card display
  const warning = data.warnings[0]
  const cfg = SEVERITY_CONFIG[warning.severity] ?? SEVERITY_CONFIG.moderate

  return (
    <div className={`w-full max-w-sm rounded-3xl text-white shadow-card-hover overflow-hidden animate-slide-up ${cfg.bg}`}>
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-start gap-3">
        <span className={cfg.textCls}>{cfg.icon}</span>
        <div className="flex-1">
          <p className={`text-xs font-bold tracking-widest ${cfg.metaCls}`}>{cfg.label}</p>
          <h3 className="text-lg font-bold mt-0.5 leading-snug">{warning.event}</h3>
        </div>
      </div>

      {/* Meta: district, date */}
      <div className={`mx-3 mb-3 rounded-2xl px-4 py-3 space-y-1.5 ${cfg.subBg}`}>
        <MetaRow icon={<MapPin size={13} />} text={`District: ${data.district}`} cls={cfg.metaCls} />
        <MetaRow icon={<Calendar size={13} />} text={`Day ${warning.day} - ${warning.date}`} cls={cfg.metaCls} />
      </div>

      {/* Multiple warnings */}
      {data.warnings.length > 1 && (
        <div className="px-5 pb-3">
          <p className={`text-sm font-medium ${cfg.textCls}`}>
            {data.warnings.length} active warnings for this district
          </p>
          <div className="mt-2 space-y-1">
            {data.warnings.slice(1, 3).map((w, i) => (
              <p key={i} className={`text-xs ${cfg.metaCls}`}>
                • Day {w.day}: {w.event}
              </p>
            ))}
            {data.warnings.length > 3 && (
              <p className={`text-xs ${cfg.metaCls}`}>
                + {data.warnings.length - 3} more
              </p>
            )}
          </div>
        </div>
      )}

      {/* Source */}
      <div className="px-5 pb-4">
        <p className={`text-xs font-medium ${cfg.metaCls}`}>
          🇮🇳 Source: India Meteorological Department (IMD)
        </p>
        <p className={`text-xs ${cfg.metaCls} mt-0.5`}>
          Issued: {new Date(warning.issuedAt).toLocaleString('en-IN', { 
            dateStyle: 'medium', 
            timeStyle: 'short' 
          })}
        </p>
      </div>
    </div>
  )
}

function MetaRow({ icon, text, cls }) {
  if (!text) return null
  return (
    <div className="flex items-start gap-1.5">
      <span className={`mt-0.5 shrink-0 ${cls}`}>{icon}</span>
      <p className={`text-xs leading-relaxed ${cls}`}>{text}</p>
    </div>
  )
}
