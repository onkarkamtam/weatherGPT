/**
 * locationService.js — Pure geocoding functions. No React imports.
 *
 * Exports:
 *   geocodePlace(placeName)   → Promise<{ lat, lon, label }>
 *   reverseGeocode(lat, lon)  → Promise<{ label }>
 *
 * Providers:
 *   Forward geocoding  — Open-Meteo Geocoding API (free, no key)
 *   Reverse geocoding  — Nominatim / OpenStreetMap (free, rate-limited to 1 req/s)
 *
 * Phase 3+: swap providers here without touching any UI component.
 */

const GEOCODING_BASE = 'https://geocoding-api.open-meteo.com/v1/search'
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/reverse'
const GEOCODING_TIMEOUT = 5000 // 5 seconds max for location resolution
const REVERSE_GEOCODING_TIMEOUT = 8000 // 8 seconds for Nominatim (can be slower)

// Identify app to Nominatim per their usage policy
const NOMINATIM_HEADERS = {
  'User-Agent': 'WeatherGPT-SIH/1.0 (educational prototype)',
  'Accept-Language': 'en',
}

// In-memory cache for geocoded locations (session lifetime)
const geocodeCache = new Map()
const CACHE_MAX_SIZE = 50

/**
 * Custom error type so callers can distinguish geocoding failures
 * from generic network errors.
 */
export class GeocodingError extends Error {
  /** @param {string} message - User-readable message */
  constructor(message) {
    super(message)
    this.name = 'GeocodingError'
  }
}

/**
 * Forward geocode: convert a place name to coordinates.
 *
 * @param {string} placeName - e.g. "Patna", "Varanasi, UP", "Mumbai"
 * @returns {Promise<{ lat: number, lon: number, label: string }>}
 * @throws {GeocodingError} if no results or network failure
 */
export async function geocodePlace(placeName) {
  if (!placeName?.trim()) {
    throw new GeocodingError('Please enter a location name.')
  }

  const normalizedName = placeName.trim().toLowerCase()
  
  // Check cache first
  if (geocodeCache.has(normalizedName)) {
    console.log('[Geocoding] Cache hit for:', placeName)
    return geocodeCache.get(normalizedName)
  }

  const url = new URL(GEOCODING_BASE)
  url.searchParams.set('name', placeName.trim())
  url.searchParams.set('count', '1')
  url.searchParams.set('language', 'en')
  url.searchParams.set('format', 'json')

  let data
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), GEOCODING_TIMEOUT)
    
    const startTime = performance.now()
    const res = await fetch(url.toString(), { signal: controller.signal })
    clearTimeout(timeoutId)
    
    const duration = Math.round(performance.now() - startTime)
    console.log(`[Geocoding] Forward geocode took ${duration}ms for: ${placeName}`)
    
    if (!res.ok) {
      throw new GeocodingError(`Unable to search for location (service error ${res.status}). Please try again.`)
    }
    data = await res.json()
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new GeocodingError(`Location search timed out after ${GEOCODING_TIMEOUT / 1000}s. Please try again.`)
    }
    if (err instanceof GeocodingError) throw err
    throw new GeocodingError('Cannot connect to location service. Check your internet connection and try again.')
  }

  const results = data?.results
  if (!Array.isArray(results) || results.length === 0) {
    throw new GeocodingError(
      `Cannot find "${placeName}". Try a nearby city or district name, or use your current location instead.`
    )
  }

  const place = results[0]
  const lat = place.latitude
  const lon = place.longitude

  if (typeof lat !== 'number' || typeof lon !== 'number') {
    throw new GeocodingError('Location service returned incomplete data. Please try again.')
  }

  // Build a readable label from available fields
  const parts = [place.name, place.admin1, place.country].filter(Boolean)
  const label = parts.join(', ')

  const result = { lat, lon, label }
  
  // Cache the result
  geocodeCache.set(normalizedName, result)
  
  // Limit cache size (LRU-style: delete oldest entry if full)
  if (geocodeCache.size > CACHE_MAX_SIZE) {
    const firstKey = geocodeCache.keys().next().value
    geocodeCache.delete(firstKey)
  }

  return result
}

/**
 * Reverse geocode: convert coordinates to a readable place name.
 * Used after GPS permission is granted.
 *
 * Falls back gracefully — callers should not throw to the user if this fails.
 *
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<{ label: string }>}
 * @throws {GeocodingError} on network or parse failure (caller should catch + use fallback)
 */
export async function reverseGeocode(lat, lon) {
  const cacheKey = `${lat.toFixed(3)},${lon.toFixed(3)}`
  
  // Check cache first
  if (geocodeCache.has(cacheKey)) {
    console.log('[Geocoding] Reverse geocode cache hit for:', cacheKey)
    return geocodeCache.get(cacheKey)
  }

  const url = new URL(NOMINATIM_BASE)
  url.searchParams.set('lat', String(lat))
  url.searchParams.set('lon', String(lon))
  url.searchParams.set('format', 'json')
  url.searchParams.set('zoom', '10')          // city-level detail
  url.searchParams.set('addressdetails', '1')

  let data
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REVERSE_GEOCODING_TIMEOUT)
    
    const startTime = performance.now()
    const res = await fetch(url.toString(), { 
      headers: NOMINATIM_HEADERS,
      signal: controller.signal 
    })
    clearTimeout(timeoutId)
    
    const duration = Math.round(performance.now() - startTime)
    console.log(`[Geocoding] Reverse geocode took ${duration}ms`)
    
    if (!res.ok) {
      throw new GeocodingError(`Unable to identify location name (service error ${res.status}).`)
    }
    data = await res.json()
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new GeocodingError(`Reverse geocoding timed out after ${REVERSE_GEOCODING_TIMEOUT / 1000}s.`)
    }
    if (err instanceof GeocodingError) throw err
    throw new GeocodingError('Cannot determine location name.')
  }

  const addr = data?.address
  if (!addr) {
    throw new GeocodingError('Location service returned incomplete data.')
  }

  // Build a compact, readable label from Nominatim's address object
  const city =
    addr.city ||
    addr.town ||
    addr.village ||
    addr.suburb ||
    addr.county ||
    addr.state_district ||
    null

  const state   = addr.state   || null
  const country = addr.country || null

  const parts = [city, state, country].filter(Boolean)
  const label = parts.length > 0 ? parts.join(', ') : data.display_name || `${lat.toFixed(3)}, ${lon.toFixed(3)}`

  const result = { label }
  
  // Cache the result
  geocodeCache.set(cacheKey, result)
  if (geocodeCache.size > CACHE_MAX_SIZE) {
    const firstKey = geocodeCache.keys().next().value
    geocodeCache.delete(firstKey)
  }

  return result
}
