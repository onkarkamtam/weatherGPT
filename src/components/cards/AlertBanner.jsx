/**
 * AlertBanner — Displays weather alerts and warnings with severity-based styling.
 * 
 * Shows alerts generated from real weather conditions (thunderstorms, heavy rain,
 * fog, extreme heat, etc.) Never displays fake or invented warnings.
 * 
 * Phase 6 Final: SIH 2026 enhancement
 */
import { AlertTriangle, AlertCircle, Info } from 'lucide-react'

/**
 * @param {{
 *   alert: {
 *     type: 'severe' | 'moderate' | 'minor',
 *     title: string,
 *     message: string,
 *     recommendations: string[]
 *   } | null
 * }} props
 */
export default function AlertBanner({ alert }) {
  if (!alert) return null

  const { type, title, message, recommendations } = alert

  // Severity-based styling
  const styles = {
    severe: {
      container: 'bg-red-50 border-red-300',
      icon: 'text-red-600',
      title: 'text-red-800',
      message: 'text-red-700',
      badge: 'bg-red-100 text-red-800 border-red-300',
      IconComponent: AlertTriangle,
    },
    moderate: {
      container: 'bg-amber-50 border-amber-300',
      icon: 'text-amber-600',
      title: 'text-amber-900',
      message: 'text-amber-800',
      badge: 'bg-amber-100 text-amber-900 border-amber-300',
      IconComponent: AlertCircle,
    },
    minor: {
      container: 'bg-blue-50 border-blue-300',
      icon: 'text-blue-600',
      title: 'text-blue-900',
      message: 'text-blue-800',
      badge: 'bg-blue-100 text-blue-900 border-blue-300',
      IconComponent: Info,
    },
  }

  const style = styles[type] || styles.moderate
  const Icon = style.IconComponent

  return (
    <div 
      className={`mb-3 rounded-2xl border-2 ${style.container} p-4 shadow-sm animate-fade-in`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-3">
        <div className={`shrink-0 ${style.icon} mt-0.5`}>
          <Icon size={24} strokeWidth={2} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`font-semibold text-base ${style.title}`}>
              {title}
            </h3>
            <span className={`shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-full border ${style.badge}`}>
              {type}
            </span>
          </div>
          
          <p className={`text-sm leading-relaxed mb-2 ${style.message}`}>
            {message}
          </p>
          
          {recommendations && recommendations.length > 0 && (
            <div className="mt-3 pt-3 border-t border-current opacity-60">
              <p className={`text-xs font-semibold mb-1.5 ${style.message}`}>
                Safety Recommendations:
              </p>
              <ul className={`text-xs space-y-1 ${style.message}`}>
                {recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="shrink-0 mt-0.5">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
