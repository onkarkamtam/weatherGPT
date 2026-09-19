/**
 * SettingsPanel — Slides in below the Header when the settings icon is tapped.
 *
 * Contains:
 *   - Language preference chips (Auto is the default)
 *   - Close button
 *
 * Controlled by ChatScreen via isOpen / onClose props.
 * Language selection is bubbled up via onLanguageChange.
 *
 * Phase 4+: add temperature unit (°C / °F), notification preferences here.
 */
import { X } from 'lucide-react'

/** Supported response languages for Phase 3 */
const LANGUAGES = [
  { code: 'auto', label: 'Auto', title: 'Auto-detect language' },
  { code: 'en',   label: 'EN',   title: 'English' },
  { code: 'hi',   label: 'हि',   title: 'Hindi' },
  { code: 'ta',   label: 'தமி', title: 'Tamil' },
  { code: 'te',   label: 'తె',   title: 'Telugu' },
  { code: 'bn',   label: 'বাং', title: 'Bengali' },
  { code: 'mr',   label: 'मरा', title: 'Marathi' },
]

/**
 * @param {{
 *   isOpen:           boolean,
 *   langPreference:   string,
 *   onLanguageChange: (code: string) => void,
 *   onClose:          () => void,
 * }} props
 */
export default function SettingsPanel({ isOpen, langPreference, onLanguageChange, onClose }) {
  if (!isOpen) return null

  return (
    <div className="bg-white border-b border-sky-100 px-4 pt-3 pb-3.5 animate-fade-in shrink-0">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
          Response Language
        </p>
        <button
          onClick={onClose}
          aria-label="Close settings"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors active:scale-95"
        >
          <X size={14} />
        </button>
      </div>

      {/* Language chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
        {LANGUAGES.map((lang) => {
          const isSelected = langPreference === lang.code
          return (
            <button
              key={lang.code}
              title={lang.title}
              aria-pressed={isSelected}
              onClick={() => { onLanguageChange(lang.code); onClose() }}
              className={[
                'shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95',
                isSelected
                  ? 'bg-brand text-white border-brand shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-brand hover:text-brand',
              ].join(' ')}
            >
              {lang.label}
            </button>
          )
        })}
      </div>

      {langPreference !== 'auto' && (
        <p className="text-xs text-slate-400 mt-2">
          WeatherGPT will respond in {LANGUAGES.find(l => l.code === langPreference)?.title}. Tap <strong>Auto</strong> to restore auto-detection.
        </p>
      )}
    </div>
  )
}
