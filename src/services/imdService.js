/**
 * imdService.js — Frontend client for IMD (India Meteorological Department) data
 * 
 * Fetches official weather data from IMD through backend API routes.
 * All API keys remain server-side — frontend never sees credentials.
 * 
 * Exports:
 *   fetchIMDWarnings({ lat, lon, district, state })
 *   fetchIMDNowcast({ lat, lon, district })
 *   fetchIMDCurrent({ lat, lon })
 *   fetchIMDForecast({ city, lat, lon })
 *   fetchIMDRainfall({ district, state })
 *   fetchIMDRainfallForecast({ state, district })
 */

const IMD_API_BASE = '/api/imd'
const REQUEST_TIMEOUT = 15000 // 15 seconds

/**
 * Custom error type for IMD service failures
 */
export class IMDServiceError extends Error {
  constructor(message, statusCode = null) {
    super(message)
    this.name = 'IMDServiceError'
    this.statusCode = statusCode
  }
}

/**
 * Fetch district-wise weather warnings from IMD
 * 
 * @param {Object} params
 * @param {number} [params.lat] - Latitude (optional)
 * @param {number} [params.lon] - Longitude (optional)
 * @param {string} [params.district] - District name (optional)
 * @param {string} [params.state] - State name (optional)
 * @returns {Promise<Object>} Warnings data with severity and events
 * @throws {IMDServiceError}
 */
export async function fetchIMDWarnings({ lat, lon, district, state } = {}) {
  try {
    const params = new URLSearchParams()
    if (lat) params.set('lat', String(lat))
    if (lon) params.set('lon', String(lon))
    if (district) params.set('district', district)
    if (state) params.set('state', state)

    const url = `${IMD_API_BASE}/warnings?${params.toString()}`
    console.log('[IMDService] Fetching warnings:', { district, state })

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new IMDServiceError(
        errorData.error || `Failed to fetch IMD warnings (${response.status})`,
        response.status
      )
    }

    const data = await response.json()
    console.log('[IMDService] ✓ Warnings fetched:', data.hasActiveWarnings ? `${data.warnings.length} active` : 'none')
    return data
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new IMDServiceError('Request timeout - IMD service took too long to respond')
    }
    if (error instanceof IMDServiceError) {
      throw error
    }
    console.error('[IMDService] Warnings fetch error:', error)
    throw new IMDServiceError('Cannot connect to IMD service. Check your connection.')
  }
}

/**
 * Fetch district-wise nowcast (3-hour forecast) from IMD
 * 
 * @param {Object} params
 * @param {number} [params.lat] - Latitude (optional)
 * @param {number} [params.lon] - Longitude (optional)
 * @param {string} [params.district] - District name (optional)
 * @returns {Promise<Object>} Nowcast data with categories and severity
 * @throws {IMDServiceError}
 */
export async function fetchIMDNowcast({ lat, lon, district } = {}) {
  try {
    const params = new URLSearchParams()
    if (lat) params.set('lat', String(lat))
    if (lon) params.set('lon', String(lon))
    if (district) params.set('district', district)

    const url = `${IMD_API_BASE}/nowcast?${params.toString()}`
    console.log('[IMDService] Fetching nowcast:', { district })

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new IMDServiceError(
        errorData.error || `Failed to fetch IMD nowcast (${response.status})`,
        response.status
      )
    }

    const data = await response.json()
    console.log('[IMDService] ✓ Nowcast fetched:', data.active ? `${data.severity} severity` : 'no active nowcast')
    return data
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new IMDServiceError('Request timeout - IMD service took too long to respond')
    }
    if (error instanceof IMDServiceError) {
      throw error
    }
    console.error('[IMDService] Nowcast fetch error:', error)
    throw new IMDServiceError('Cannot connect to IMD service. Check your connection.')
  }
}

/**
 * Fetch current weather observations from IMD
 * 
 * @param {Object} params
 * @param {number} params.lat - Latitude (required)
 * @param {number} params.lon - Longitude (required)
 * @returns {Promise<Object>} Current weather data
 * @throws {IMDServiceError}
 */
export async function fetchIMDCurrent({ lat, lon }) {
  if (typeof lat !== 'number' || typeof lon !== 'number') {
    throw new IMDServiceError('Latitude and longitude are required')
  }

  try {
    const params = new URLSearchParams()
    params.set('lat', String(lat))
    params.set('lon', String(lon))

    const url = `${IMD_API_BASE}/current?${params.toString()}`
    console.log('[IMDService] Fetching current weather:', { lat, lon })

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new IMDServiceError(
        errorData.error || `Failed to fetch IMD current weather (${response.status})`,
        response.status
      )
    }

    const data = await response.json()
    console.log('[IMDService] ✓ Current weather fetched:', data.available ? `${data.temperature}°C` : 'unavailable')
    return data
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new IMDServiceError('Request timeout - IMD service took too long to respond')
    }
    if (error instanceof IMDServiceError) {
      throw error
    }
    console.error('[IMDService] Current weather fetch error:', error)
    throw new IMDServiceError('Cannot connect to IMD service. Check your connection.')
  }
}

/**
 * Fetch 7-day city forecast from IMD
 * 
 * @param {Object} params
 * @param {string} [params.city] - City name (optional if lat/lon provided)
 * @param {number} [params.lat] - Latitude (optional if city provided)
 * @param {number} [params.lon] - Longitude (optional if city provided)
 * @returns {Promise<Object>} 7-day forecast data
 * @throws {IMDServiceError}
 */
export async function fetchIMDForecast({ city, lat, lon } = {}) {
  if (!city && (!lat || !lon)) {
    throw new IMDServiceError('Either city name or coordinates (lat/lon) are required')
  }

  try {
    const params = new URLSearchParams()
    if (city) {
      params.set('city', city)
    } else {
      params.set('lat', String(lat))
      params.set('lon', String(lon))
    }

    const url = `${IMD_API_BASE}/forecast?${params.toString()}`
    console.log('[IMDService] Fetching forecast:', city ? { city } : { lat, lon })

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new IMDServiceError(
        errorData.error || `Failed to fetch IMD forecast (${response.status})`,
        response.status
      )
    }

    const data = await response.json()
    console.log('[IMDService] ✓ Forecast fetched:', `${data.days.length} days for ${data.city}`)
    return data
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new IMDServiceError('Request timeout - IMD service took too long to respond')
    }
    if (error instanceof IMDServiceError) {
      throw error
    }
    console.error('[IMDService] Forecast fetch error:', error)
    throw new IMDServiceError('Cannot connect to IMD service. Check your connection.')
  }
}

/**
 * Fetch district rainfall data from IMD
 * 
 * @param {Object} params
 * @param {string} params.district - District name (required)
 * @param {string} [params.state] - State name (optional)
 * @returns {Promise<Object>} Rainfall data with actual, normal, and departure
 * @throws {IMDServiceError}
 */
export async function fetchIMDRainfall({ district, state } = {}) {
  if (!district) {
    throw new IMDServiceError('District name is required')
  }

  try {
    const params = new URLSearchParams()
    params.set('district', district)
    if (state) params.set('state', state)

    const url = `${IMD_API_BASE}/rainfall?${params.toString()}`
    console.log('[IMDService] Fetching rainfall:', { district, state })

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new IMDServiceError(
        errorData.error || `Failed to fetch IMD rainfall data (${response.status})`,
        response.status
      )
    }

    const data = await response.json()
    console.log('[IMDService] ✓ Rainfall fetched:', `${data.actual}mm (${data.category})`)
    return data
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new IMDServiceError('Request timeout - IMD service took too long to respond')
    }
    if (error instanceof IMDServiceError) {
      throw error
    }
    console.error('[IMDService] Rainfall fetch error:', error)
    throw new IMDServiceError('Cannot connect to IMD service. Check your connection.')
  }
}

/**
 * Fetch 5-day district rainfall forecast from IMD
 * 
 * @param {Object} params
 * @param {string} params.state - State name (required)
 * @param {string} [params.district] - District name (optional - filters results)
 * @returns {Promise<Object>} Rainfall forecast for districts in state
 * @throws {IMDServiceError}
 */
export async function fetchIMDRainfallForecast({ state, district } = {}) {
  if (!state) {
    throw new IMDServiceError('State name is required')
  }

  try {
    const params = new URLSearchParams()
    params.set('state', state)
    if (district) params.set('district', district)

    const url = `${IMD_API_BASE}/rainfall-forecast?${params.toString()}`
    console.log('[IMDService] Fetching rainfall forecast:', { state, district })

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new IMDServiceError(
        errorData.error || `Failed to fetch IMD rainfall forecast (${response.status})`,
        response.status
      )
    }

    const data = await response.json()
    console.log('[IMDService] ✓ Rainfall forecast fetched:', `${data.count} districts`)
    return data
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new IMDServiceError('Request timeout - IMD service took too long to respond')
    }
    if (error instanceof IMDServiceError) {
      throw error
    }
    console.error('[IMDService] Rainfall forecast fetch error:', error)
    throw new IMDServiceError('Cannot connect to IMD service. Check your connection.')
  }
}
