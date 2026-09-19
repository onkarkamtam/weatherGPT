/**
 * WelcomeScreen — Onboarding screen for WeatherGPT.
 * Step 1: Introduction + location selection
 * Step 2: Manual location entry (if user chooses)
 *
 * Phase 2 change: manual submit now runs forward geocoding via
 * locationService.geocodePlace() to resolve real lat/lon before navigating.
 * GPS flow is unchanged.
 *
 * Navigates to /chat on success, passing location via router state.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Search, CloudSun, ChevronRight, AlertCircle } from 'lucide-react'
import { useLocation } from '@/hooks/useLocation'
import { geocodePlace, GeocodingError } from '@/services/locationService'
import Button  from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'

export default function WelcomeScreen() {
  const navigate = useNavigate()
  const {
    location,
    loading,       // GPS loading state
    error,         // GPS error state
    requestLocation,
    setResolvedLocation,
  } = useLocation()

  const [showManual, setShowManual]         = useState(false)
  const [manualInput, setManualInput]       = useState('')
  const [inputError, setInputError]         = useState('')
  const [geocoding, setGeocoding]           = useState(false)  // Phase 2: geocoding loading state

  // Navigate once location is set (GPS or geocoded manual)
  if (location) {
    navigate('/chat', { state: { location }, replace: true })
    return null
  }

  // GPS button handler — unchanged from Phase 1
  const handleGeoLocation = () => {
    requestLocation()
  }

  // Phase 2: manual submit resolves coordinates via geocoding before navigating
  const handleManualSubmit = async (e) => {
    e.preventDefault()
    const trimmed = manualInput.trim()

    if (!trimmed) {
      setInputError('Please enter a city, village, or district name.')
      return
    }

    setInputError('')
    setGeocoding(true)

    try {
      const resolved = await geocodePlace(trimmed)
      // setResolvedLocation triggers navigation (location becomes non-null)
      setResolvedLocation(resolved)
    } catch (err) {
      const msg = err instanceof GeocodingError
        ? err.message
        : 'Unable to find that location. Check your internet connection and try again.'
      setInputError(msg)
    } finally {
      setGeocoding(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col welcome-bg">
      {/* ── Hero area ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8 text-center animate-fade-in">
        {/* Logo mark */}
        <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center mb-6 shadow-lg">
          <CloudSun size={40} className="text-white" />
        </div>

        {/* Brand */}
        <h1 className="text-4xl font-extrabold text-white tracking-tight mb-1">
          WeatherGPT
        </h1>
        <p className="text-sky-200 text-sm font-medium tracking-widest uppercase mb-6">
          Hyperlocal Weather Intelligence
        </p>

        {/* Tagline */}
        <div className="max-w-xs">
          <p className="text-white text-xl font-semibold leading-snug mb-2">
            Ask anything about the weather.
          </p>
          <p className="text-sky-200 text-sm leading-relaxed">
            Get simple, plain-language forecasts, alerts, and impact advisories —
            tailored exactly for your location.
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2 mt-6">
          {['Rain forecasts', 'Weather alerts', 'Travel safety', 'Farm advisories'].map((f) => (
            <span key={f} className="text-xs px-3 py-1 rounded-full bg-white/15 text-sky-100 border border-white/20">
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* ── Action card ── */}
      <div className="bg-white rounded-t-3xl px-6 pt-8 pb-10 pb-safe shadow-2xl animate-slide-up">
        {!showManual ? (
          /* Location choice */
          <div className="space-y-3">
            <p className="text-slate-500 text-sm text-center mb-5">
              To get started, WeatherGPT needs to know where you are.
            </p>

            {/* GPS option */}
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleGeoLocation}
              loading={loading}
              disabled={loading}
              className="gap-3"
            >
              {!loading && <MapPin size={20} />}
              {loading ? 'Finding your location…' : 'Use my current location'}
            </Button>

            {/* GPS error message */}
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 animate-fade-in">
                <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Divider */}
            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400 font-medium">or</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* Manual option */}
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              onClick={() => setShowManual(true)}
              className="gap-3"
            >
              <Search size={20} />
              Enter location manually
            </Button>

            <p className="text-center text-xs text-slate-400 pt-2">
              🔒 Your location is only used to fetch local weather data.
            </p>
          </div>
        ) : (
          /* Manual input — Phase 2: async geocoding on submit */
          <form onSubmit={handleManualSubmit} className="space-y-4 animate-fade-in">
            <button
              type="button"
              onClick={() => { setShowManual(false); setInputError('') }}
              className="flex items-center gap-1 text-sm text-brand font-medium mb-2 -mt-1"
            >
              ← Back
            </button>

            <p className="text-slate-700 font-semibold text-base">
              Enter your location
            </p>
            <p className="text-slate-500 text-sm">
              Type your city, village, taluk, or district name.
            </p>

            <div className="relative">
              <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={manualInput}
                onChange={(e) => { setManualInput(e.target.value); setInputError('') }}
                placeholder="e.g. Patna, Bihar"
                autoFocus
                disabled={geocoding}
                className="w-full pl-11 pr-4 py-4 rounded-2xl border border-slate-200 bg-slate-50 text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all disabled:opacity-60"
              />
            </div>

            {/* Geocoding error */}
            {inputError && (
              <p className="text-sm text-red-500 flex items-center gap-1.5">
                <AlertCircle size={14} />
                {inputError}
              </p>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={geocoding}
              disabled={geocoding}
              className="gap-3"
            >
              {geocoding ? 'Finding location…' : (
                <>
                  Continue
                  <ChevronRight size={20} />
                </>
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
