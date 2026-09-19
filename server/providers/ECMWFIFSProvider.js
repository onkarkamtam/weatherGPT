/**
 * ECMWFIFSProvider - ECMWF IFS Model Integration
 * 
 * Implements access to the European Centre for Medium-Range Weather Forecasts
 * Integrated Forecasting System (IFS) - the global industry standard for
 * medium-range weather prediction.
 * 
 * Model characteristics:
 * - Provider: European Centre for Medium-Range Weather Forecasts (ECMWF)
 * - Resolution: 9 km (IFS HRES) / 25 km (IFS open-data)
 * - Update frequency: 4 times daily (00, 06, 12, 18 UTC)
 * - Forecast horizon: 15 days
 * - Temporal resolution: 1-hourly (0-90h), 3-hourly (90-144h), 6-hourly (144h+)
 * 
 * Official documentation verified: https://open-meteo.com/en/docs/ecmwf-api
 */

import { NWPProvider } from './NWPProvider.js'
import { ProviderError } from './BaseWeatherProvider.js'

const ECMWF_API_BASE = 'https://api.open-meteo.com/v1/ecmwf'
const REQUEST_TIMEOUT = 30000 // 30 seconds

export class ECMWFIFSProvider extends NWPProvider {
  constructor() {
    super()
    this.modelName = 'ECMWF IFS'
    this.modelFullName = 'ECMWF Integrated Forecasting System'
    this.provider = 'European Centre for Medium-Range Weather Forecasts'
    this.resolution = '9 km (IFS HRES) / 25 km (IFS open-data)'
    this.forecastHorizon = 15
    this.updateFrequency = '4 times daily (00, 06, 12, 18 UTC)'
    this.temporalResolution = '1-hourly (0-90h), 3-hourly (90-144h), 6-hourly (144h+)'
  }

  /**
   * Fetch ECMWF IFS forecast
   * @param {Object} params
   * @param {number} params.lat - Latitude
   * @param {number} params.lon - Longitude
   * @param {number} params.days - Forecast days (max 15)
   * @param {string[]} params.variables - Weather variables
   * @param {string} params.model - Model variant ('ifs04' or 'aifs025')
   * @returns {Promise<Object>} Normalized forecast data
   */
  async fetchForecast({ lat, lon, days = 7, variables = [], model = 'ifs04' }) {
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
    const url = new URL(ECMWF_API_BASE)
    url.searchParams.set('latitude', String(lat))
    url.searchParams.set('longitude', String(lon))
    url.searchParams.set('hourly', requestVariables.join(','))
    url.searchParams.set('forecast_days', String(forecastDays))
    url.searchParams.set('timezone', 'auto')
    url.searchParams.set('wind_speed_unit', 'kmh')
    
    // Note: Model selection removed - ECMWF API uses default model automatically
    // The 'models' parameter is not required and causes errors if specified incorrectly

    console.log(`[ECMWF IFS] Fetching forecast: ${url.toString()}`)

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
          `ECMWF IFS API error: ${errorText}`,
          this.getName()
        )
      }

      const data = await response.json()
      console.log(`[ECMWF IFS] Successfully fetched ${data.hourly?.time?.length || 0} hourly forecasts`)

      return this.normalizeResponse(data, lat, lon)
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new ProviderError(
          'Request timeout: ECMWF IFS API did not respond in time',
          this.getName(),
          error
        )
      }

      if (error instanceof ProviderError) {
        throw error
      }

      throw new ProviderError(
        `Failed to fetch ECMWF IFS forecast: ${error.message}`,
        this.getName(),
        error
      )
    }
  }

  /**
   * Fetch pressure level data (ECMWF IFS specialty)
   * @param {Object} params
   * @param {number} params.lat - Latitude
   * @param {number} params.lon - Longitude
   * @param {number[]} params.levels - Pressure levels in hPa
   * @returns {Promise<Object>} Pressure level forecast
   */
  async fetchPressureLevels({ lat, lon, levels = [850, 500, 250] }) {
    // ECMWF IFS supports extensive pressure level data
    // Available levels: 1000, 975, 950, 925, 900, 850, 800, 700, 600, 500, 400, 
    //                   300, 250, 200, 150, 100, 70, 50, 30, 20, 10 hPa
    
    const variables = levels.flatMap(p => [
      `temperature_${p}hPa`,
      `wind_speed_${p}hPa`,
      `wind_direction_${p}hPa`,
      `geopotential_height_${p}hPa`,
      `relative_humidity_${p}hPa`,
    ])

    return this.fetchForecast({ lat, lon, days: 7, variables })
  }

  /**
   * Get variables available in ECMWF IFS
   * Extended set including pressure levels
   */
  getAvailableVariables() {
    return [
      // Surface variables
      'temperature_2m',
      'relative_humidity_2m',
      'dew_point_2m',
      'apparent_temperature',
      'precipitation',
      'precipitation_type',
      'rain',
      'snowfall',
      'weather_code',
      'snow_depth',
      'runoff',
      
      // Wind
      'wind_speed_10m',
      'wind_direction_10m',
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
      'direct_normal_irradiance',
      'diffuse_radiation',
      'global_tilted_irradiance',
      
      // Other surface
      'surface_temperature',
      'visibility',
      'boundary_layer_height',
      'total_column_integrated_water_vapour',
      
      // Soil (multiple depths)
      'soil_temperature_0_7cm',
      'soil_temperature_7_to_28cm',
      'soil_temperature_28_to_100cm',
      'soil_temperature_100_to_255cm',
      'soil_moisture_0_to_7cm',
      'soil_moisture_7_to_28cm',
      'soil_moisture_28_to_100cm',
      'soil_moisture_100_to_255cm',
      
      // Pressure levels (example - full list available in docs)
      'temperature_1000hPa',
      'temperature_850hPa',
      'temperature_500hPa',
      'temperature_250hPa',
      'geopotential_height_1000hPa',
      'geopotential_height_500hPa',
      'wind_speed_1000hPa',
      'wind_speed_850hPa',
      'wind_speed_500hPa',
    ]
  }
}

