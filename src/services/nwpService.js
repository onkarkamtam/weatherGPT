/**
 * nwpService.js — NWP (Numerical Weather Prediction) Model Service
 * 
 * Provides access to explicit NWP model forecasts:
 * - CMA GFS GRAPES (Global/Regional Assimilation and Prediction Enhanced System)
 * - ECMWF IFS (Integrated Forecasting System)
 * 
 * All requests go through the Express backend at /api/nwp-forecast
 * to ensure proper error handling, rate limiting, and security.
 * 
 * In development: Vite proxy forwards /api/* to http://localhost:3001
 * In production: Express serves the React build and handles /api/* directly
 * 
 * DO NOT call Open-Meteo APIs directly from the frontend.
 */

const REQUEST_TIMEOUT = 45000 // 45 seconds

/**
 * NWP model identifiers
 */
export const NWP_MODELS = {
  GFS_GRAPES: 'gfs',
  ECMWF_IFS: 'ecmwf',
}

/**
 * NWP service error class
 */
export class NWPServiceError extends Error {
  constructor(message, statusCode = null) {
    super(message)
    this.name = 'NWPServiceError'
    this.statusCode = statusCode
  }
}

/**
 * Fetch NWP model forecast
 * 
 * @param {Object} params
 * @param {number} params.lat - Latitude
 * @param {number} params.lon - Longitude
 * @param {string} params.model - Model name: 'gfs' or 'ecmwf'
 * @param {number} params.days - Forecast days (1-15)
 * @returns {Promise<Object>} NWP forecast data
 * @throws {NWPServiceError}
 */
export async function fetchNWPForecast({ lat, lon, model = NWP_MODELS.ECMWF_IFS, days = 7 }) {
  // Validate inputs
  if (typeof lat !== 'number' || typeof lon !== 'number') {
    throw new NWPServiceError('Invalid coordinates: latitude and longitude must be numbers')
  }

  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    throw new NWPServiceError('Invalid coordinates: latitude must be -90 to 90, longitude -180 to 180')
  }

  if (!Object.values(NWP_MODELS).includes(model)) {
    throw new NWPServiceError(`Invalid model: must be 'gfs' or 'ecmwf'`)
  }

  if (typeof days !== 'number' || days < 1 || days > 15) {
    throw new NWPServiceError('Invalid days: must be between 1 and 15')
  }

  // Build request URL (relative, proxied by Vite in dev, served by Express in prod)
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    model,
    days: String(days),
  })
  const url = `/api/nwp-forecast?${params.toString()}`

  console.log(`[NWP Service] Fetching ${model.toUpperCase()} forecast:`, { lat, lon, days })

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
      throw new NWPServiceError(
        errorData.error || `Failed to fetch NWP forecast (${response.status})`,
        response.status
      )
    }

    const data = await response.json()
    console.log(`[NWP Service] ✓ Received ${data.model.name} forecast: ${data.forecast.length} hours`)

    return data
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new NWPServiceError('Request timeout: NWP service took too long to respond')
    }

    if (error instanceof NWPServiceError) {
      throw error
    }

    throw new NWPServiceError(
      `Cannot connect to weather service: ${error.message}`,
      null
    )
  }
}

/**
 * Fetch both GFS and ECMWF forecasts for comparison
 * 
 * @param {Object} params
 * @param {number} params.lat - Latitude
 * @param {number} params.lon - Longitude
 * @param {number} params.days - Forecast days
 * @returns {Promise<Object>} Both forecasts: { gfs, ecmwf, errors }
 */
export async function fetchBothModels({ lat, lon, days = 7 }) {
  console.log('[NWP Service] Fetching both models for comparison')

  const results = await Promise.allSettled([
    fetchNWPForecast({ lat, lon, model: NWP_MODELS.GFS_GRAPES, days }),
    fetchNWPForecast({ lat, lon, model: NWP_MODELS.ECMWF_IFS, days }),
  ])

  return {
    gfs: results[0].status === 'fulfilled' ? results[0].value : null,
    ecmwf: results[1].status === 'fulfilled' ? results[1].value : null,
    errors: {
      gfs: results[0].status === 'rejected' ? results[0].reason.message : null,
      ecmwf: results[1].status === 'rejected' ? results[1].reason.message : null,
    },
  }
}

/**
 * Get model display information
 * 
 * @param {string} modelKey - Model key ('gfs' or 'ecmwf')
 * @returns {Object} Model display info
 */
export function getModelInfo(modelKey) {
  const info = {
    gfs: {
      key: 'gfs',
      name: 'GFS GRAPES',
      fullName: 'CMA Global/Regional Assimilation and Prediction Enhanced System',
      provider: 'China Meteorological Administration',
      shortProvider: 'CMA',
      color: 'blue',
      description: 'Global NWP model with GFS designation',
    },
    ecmwf: {
      key: 'ecmwf',
      name: 'ECMWF IFS',
      fullName: 'ECMWF Integrated Forecasting System',
      provider: 'European Centre for Medium-Range Weather Forecasts',
      shortProvider: 'ECMWF',
      color: 'purple',
      description: 'Industry-standard global NWP model',
    },
  }

  return info[modelKey] || info.ecmwf
}

