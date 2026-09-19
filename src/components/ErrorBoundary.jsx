/**
 * ErrorBoundary — Catches unhandled React errors to prevent full app crashes.
 * Shows a friendly fallback UI with recovery options.
 *
 * Phase 5: Production safety net — single component error shouldn't blank the entire screen.
 */
import { Component } from 'react'
import { CloudOff, RefreshCw } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    // Log to console for debugging (in production, send to error tracking service)
    console.error('[ErrorBoundary] Caught error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    // Reload the page to reset application state
    window.location.reload()
  }

  handleGoHome = () => {
    this.setState({ hasError: false, error: null })
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-sky-50 to-slate-50 px-6">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-card p-8 text-center animate-fade-in">
            {/* Icon */}
            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-50 flex items-center justify-center mb-4">
              <CloudOff size={32} className="text-red-500" />
            </div>

            {/* Heading */}
            <h1 className="text-2xl font-bold text-slate-800 mb-2">
              Something went wrong
            </h1>

            {/* Message */}
            <p className="text-slate-600 text-sm leading-relaxed mb-6">
              WeatherGPT encountered an unexpected error. Don't worry — your location and data are safe.
              Try refreshing to continue.
            </p>

            {/* Actions */}
            <div className="space-y-2">
              <button
                onClick={this.handleReset}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-brand text-white rounded-2xl font-semibold hover:bg-brand-dark transition-colors active:scale-95"
              >
                <RefreshCw size={18} />
                Refresh WeatherGPT
              </button>
              <button
                onClick={this.handleGoHome}
                className="w-full px-6 py-3 bg-slate-100 text-slate-700 rounded-2xl font-semibold hover:bg-slate-200 transition-colors active:scale-95"
              >
                Go to Home
              </button>
            </div>

            {/* Technical details (collapsed by default, for debugging) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">
                  Technical details (dev only)
                </summary>
                <pre className="mt-2 p-3 bg-slate-50 rounded-xl text-xs text-red-600 overflow-auto max-h-32">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
