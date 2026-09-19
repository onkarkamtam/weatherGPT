/**
 * GFSGRAPESProvider - CMA GFS GRAPES Model Integration
 * 
 * Implements access to China Meteorological Administration's
 * Global/Regional Assimilation and Prediction Enhanced System (GFS GRAPES).
 * 
 * Model characteristics:
 * - Provider: China Meteorological Administration (CMA)
 * - Resolution: ~25 km global
 * - Update frequency: 4 times daily (00, 06, 12, 18 UTC)
 * - Forecast horizon: 10 days
 * - Temporal resolution: 3-hourly
 * 
 * Official documentation verified: https://open-meteo.com/en/docs/cma-api
 */

import { NWPProvider } from './NWPProvider.js'
import { ProviderError } from './BaseWeatherProvider.js'

const CMA_API_BASE = 'https://api.open-meteo.com/v1/cma'
const REQUEST_TIMEOUT = 30000 // 30 seconds

export class GFSGRAPESProvider extends NWPProvider {
  constructor() {
    super()
    this.modelName = 'GFS GRAPES'
    this.modelFullName = 'CMA Global/Regional Assimilation and Prediction Enhanced System'
    this.provider = 'China Meteorological Administration (CMA)'
    this.resolution = '~25 km'
    this.forecastHorizon = 10
    this.updateFrequency = '4 times daily (00, 06, 12, 18 UTC)'
    this.temporalResolution = '3-hourly'
  }

  /**
   * Fetch GFS GRAPES forecast
   * @param {Object} params
   * @param {number} params.lat - Latitude
   * @param {number} params.lon - Longitude
   * @param {number} params.days - Forecast days (max 10)
   * @param {string[]} params.variables - Weather variables
   * @returns {Promise<Object>} Normalized forecast data
   */
  async fetchForecast({ lat, lon, days = 7, variables = [] }) {
    // Validate inputs
    if (typeof lat !== 'number' || typeof lon !== 'number') {
      throw new ProviderError(
        'Invalid coordinates: latitude and longitude must be numbers',
        this.getName()
      )
    }

    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      throw new ProviderError(
        'Invalid coordinates: latitude must be -90 to 90, longitude -180 to 180',
        this.getName()
      )
    }

    // Enforce model constraints
    const forecastDays = Math.min(Math.max(1, days), this.forecastHorizon)
    const requestVariables = variables.length > 0 ? variables : this.getDefaultVariables()

    // Build API URL
    const url = new URL(CMA_API_BASE)
    url.searchParams.set('latitude', String(lat))
    url.searchParams.set('longitude', String(lon))
    url.searchParams.set('hourly', requestVariables.join(','))
    url.searchParams.set('forecast_days', String(forecastDays))
    url.searchParams.set('timezone', 'auto')
    url.searchParams.set('wind_speed_unit', 'kmh')

    console.log(`[GFS GRAPES] Fetching forecast: ${url.toString()}`)

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

      const response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text().catch(() => `HTTP ${response.status}`)
        throw new ProviderError(
          `CMA GFS API error: ${errorText}`,
          this.getName()
        )
      }

      const data = await response.json()
      console.log(`[GFS GRAPES] Successfully fetched ${data.hourly?.time?.length || 0} hourly forecasts`)

      return this.normalizeResponse(data, lat, lon)
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new ProviderError(
          'Request timeout: CMA GFS API did not respond in time',
          this.getName(),
          error
        )
      }

      if (error instanceof ProviderError) {
        throw error
      }

      throw new ProviderError(
        `Failed to fetch GFS GRAPES forecast: ${error.message}`,
        this.getName(),
        error
      )
    }
  }

  /**
   * Get variables available in CMA GFS GRAPES
   * Extended set including model-specific variables
   */
  getAvailableVariables() {
    return [
      // Surface variables
      'temperature_2m',
      'relative_humidity_2m',
      'dew_point_2m',
      'apparent_temperature',
      'precipitation',
      'rain',
      'snowfall',
      'weather_code',
      'snow_depth',
      
      // Wind (multiple heights available: 10m, 30m, 50m, 70m, 100m, 120m, 140m, 160m, 180m, 200m)
      'wind_speed_10m',
      'wind_speed_100m',
      'wind_direction_10m',
      'wind_direction_100m',
      'wind_gusts_10m',
      
      // Pressure and clouds
      'pressure_msl',
      'surface_pressure',
      'cloud_cover',
      'cloud_cover_low',
      'cloud_cover_mid',
      'cloud_cover_high',
      
      // Radiation
      'shortwave_radiation',
      'direct_radiation',
      'diffuse_radiation',
      'sunshine_duration',
      
      // Other
      'visibility',
      'cape',
      'lifted_index',
      'et0_fao_evapotranspiration',
      'vapour_pressure_deficit',
      
      // Soil
      'soil_temperature_0_to_10cm',
      'soil_moisture_0_to_10cm',
    ]
  }
}

