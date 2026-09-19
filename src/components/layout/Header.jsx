/**
 * Header — Top bar for the Chat screen.
 * Shows WeatherGPT logo, current location chip, and settings icon.
 */
import { MapPin, Settings, CloudSun } from 'lucide-react'

/**
 * @param {{
 *   locationLabel?: string,
 *   onSettingsClick?: () => void
 * }} props
 */
export default function Header({ locationLabel = 'Your Location', onSettingsClick }) {
  return (
    <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-sky-100 pt-safe shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-brand flex items-center justify-center shrink-0">
          <CloudSun size={17} className="text-white" />
        </div>
        <span className="font-bold text-slate-800 text-base leading-none">
          Weather<span className="text-brand">GPT</span>
        </span>
      </div>

      {/* Location chip */}
      <div className="flex items-center gap-1.5 bg-sky-50 border border-sky-200 rounded-full px-3 py-1.5 max-w-[160px]">
        <MapPin size={13} className="text-brand shrink-0" />
        <span className="text-xs font-medium text-sky-700 truncate">{locationLabel}</span>
      </div>

      {/* Settings */}
      <button
        onClick={onSettingsClick}
        aria-label="Settings"
        className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors active:scale-95"
      >
        <Settings size={18} />
      </button>
    </header>
  )
}
