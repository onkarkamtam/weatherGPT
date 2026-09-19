/**
 * AlertCard — Displays an IMD or agency weather alert / warning.
 * Color-coded by severity. Clear do/don't action lists.
 */
import { AlertTriangle, ShieldAlert, Info, Clock, MapPin } from 'lucide-react'
import Chip from '@/components/ui/Chip'

const SEVERITY_CONFIG = {
  high: {
    bg:      'bg-gradient-to-br from-red-500 to-red-700',
    badge:   'danger',
    icon:    <ShieldAlert size={22} />,
    label:   'HIGH ALERT',
    textCls: 'text-red-50',
    metaCls: 'text-red-200',
    subBg:   'bg-red-900/30',
  },
  medium: {
    bg:      'bg-gradient-to-br from-amber-500 to-orange-600',
    badge:   'warning',
    icon:    <AlertTriangle size={22} />,
    label:   'MODERATE WARNING',
    textCls: 'text-amber-50',
    metaCls: 'text-amber-200',
    subBg:   'bg-orange-900/30',
  },
  low: {
    bg:      'bg-gradient-to-br from-yellow-400 to-yellow-600',
    badge:   'muted',
    icon:    <Info size={22} />,
    label:   'ADVISORY',
    textCls: 'text-yellow-900',
    metaCls: 'text-yellow-700',
    subBg:   'bg-yellow-900/20',
  },
}

/** @param {{ data: import('@/data/mockResponses').AlertData }} */
export default function AlertCard({ data }) {
  const cfg = SEVERITY_CONFIG[data.severity] ?? SEVERITY_CONFIG.medium

  return (
    <div className={`w-full max-w-sm rounded-3xl text-white shadow-card-hover overflow-hidden animate-slide-up ${cfg.bg}`}>
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-start gap-3">
        <span className={cfg.textCls}>{cfg.icon}</span>
        <div className="flex-1">
          <p className={`text-xs font-bold tracking-widest ${cfg.metaCls}`}>{cfg.label}</p>
          <h3 className="text-lg font-bold mt-0.5 leading-snug">{data.title}</h3>
        </div>
      </div>

      {/* Meta: issuer, time, areas */}
      <div className={`mx-3 mb-3 rounded-2xl px-4 py-3 space-y-1.5 ${cfg.subBg}`}>
        <MetaRow icon={<Clock size={13} />}  text={`Valid until: ${data.validUntil}`}  cls={cfg.metaCls} />
        <MetaRow icon={<MapPin size={13} />} text={data.affectedAreas?.join(', ')}     cls={cfg.metaCls} />
      </div>

      {/* Description */}
      <div className="px-5 pb-3">
        <p className={`text-sm leading-relaxed ${cfg.textCls}`}>{data.description}</p>
      </div>

      {/* Do / Don't lists */}
      {(data.doList?.length || data.dontList?.length) && (
        <div className={`mx-3 mb-4 rounded-2xl px-4 py-3 space-y-2 ${cfg.subBg}`}>
          {data.doList?.map((item) => (
            <p key={item} className={`text-sm ${cfg.textCls}`}>
              <span className="font-bold">✅ </span>{item}
            </p>
          ))}
          {data.dontList?.map((item) => (
            <p key={item} className={`text-sm ${cfg.textCls}`}>
              <span className="font-bold">🚫 </span>{item}
            </p>
          ))}
        </div>
      )}

      {/* Source */}
      <div className="px-5 pb-4">
        <p className={`text-xs ${cfg.metaCls}`}>Source: {data.issuer}</p>
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
