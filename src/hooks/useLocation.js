/**
 * useLocation — Browser Geolocation hook
 * Phase 1: wraps navigator.geolocation with loading/error states.
 * Phase 2: adds reverse geocoding for GPS label + setResolvedLocation for
 *           callers that resolve coordinates externally (e.g. WelcomeScreen geocoding).
 * Phase 3+: accept a locale/timezone parameter from user profile.
 */
import { useState, useCallback } from 'react'
import { reverseGeocode } from '@/services/locationService'

/**
 * @typedef {{ lat: number|null, lon: number|null, label: string }} LocationObj
 */

/** @returns {{ location, loading, error, requestLocation, setManualLocation, setResolvedLocation }} */
export function useLocation() {
  const [location, setLocation] = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  /**
   * Triggers browser geolocation permission prompt.
   * On success, attempts reverse geocoding to get a readable label.
   * Falls back to coordinate-pair label if reverse geocoding fails.
   */
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      return
    }

    setLoading(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords

        // Fallback label if reverse geocoding fails
        const fallbackLabel = `${lat.toFixed(3)}, ${lon.toFixed(3)}`

        let label = fallbackLabel
        try {
          // Phase 2: resolve a human-readable place name from coordinates
          const result = await reverseGeocode(lat, lon)
          if (result?.label) label = result.label
        } catch {
          // Non-fatal — use coordinate pair as label
          label = fallbackLabel
        }

        setLocation({ lat, lon, label })
        setLoading(false)
      },
      (err) => {
        const messages = {
          1: 'Location access was denied. Please allow location or enter it manually.',
          2: 'Your location could not be determined right now.',
          3: 'Location request timed out. Please try again.',
        }
        setError(messages[err.code] || 'An unknown error occurred.')
        setLoading(false)
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300_000 },
    )
  }, [])

  /**
   * Set a fully-resolved location object (lat + lon + label).
   * Used by WelcomeScreen after forward geocoding completes.
   * @param {{ lat: number, lon: number, label: string }} resolved
   */
  const setResolvedLocation = useCallback((resolved) => {
    setLocation(resolved)
    setError(null)
  }, [])

  /**
   * Fallback: set a manual location with no coordinates.
   * Preserved from Phase 1 for backward compatibility.
   * In Phase 2, WelcomeScreen uses setResolvedLocation instead.
   * @param {string} label - Human-readable place name
   */
  const setManualLocation = useCallback((label) => {
    setLocation({ lat: null, lon: null, label })
    setError(null)
  }, [])

  return { location, loading, error, requestLocation, setManualLocation, setResolvedLocation }
}
