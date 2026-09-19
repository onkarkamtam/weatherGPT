/**
 * NWPProvider - Base class for Numerical Weather Prediction models
 * 
 * Provides interface for accessing explicit NWP model forecasts with
 * full model attribution and metadata.
 * 
 * Subclasses: GFSGRAPESProvider, ECMWFIFSProvider
 */

import { BaseWeatherProvider, ProviderError } from './BaseWeatherProvider.js'

export class NWPProvider extends BaseWeatherProvider {
  constructor() {
    super()
    this.modelName = ''
    this.modelFullName = ''
    this.provider = ''
    this.resolution = ''
    this.forecastHorizon = 0
    this.updateFrequency = ''
    this.temporalResolution = ''
  }

  /**
   * Fetch NWP model forecast
   * @param {Object} params
   * @param {number} params.lat - Latitude
   * @param {number} params.lon - Longitude
   * @param {number} params.days - Forecast days
   * @param {string[]} params.variables - Weather variables to fetch
   * @returns {Promise<Object>} Normalized NWP forecast
   */
  async fetchForecast({ lat, lon, days = 7, variables = [] }) {
    throw new Error('fetchForecast() must be implemented by subclass')
  }

  /**
   * Fetch pressure level data (optional, for advanced NWP)
   * @param {Object} params
   * @param {number} params.lat - Latitude
   * @param {number} params.lon - Longitude
   * @param {number[]} params.levels - Pressure levels in hPa (e.g., [850, 500, 250])
   * @returns {Promise<Object>} Pressure level data
   */
  async fetchPressureLevels({ lat, lon, levels = [850, 500] }) {
    throw new ProviderError(
      'Pressure level data not supported by this model',
      this.getName()
    )
  }

  /**
   * Get model metadata
   * @returns {Object} Model information
   */
  getModelMetadata() {
    return {
      name: this.modelName,
      fullName: this.modelFullName,
      provider: this.provider,
      resolution: this.resolution,
      forecastHorizon: this.forecastHorizon,
      updateFrequency: this.updateFrequency,
      temporalResolution: this.temporalResolution,
    }
  }

  /**
   * Default variable set for NWP forecasts
   * @returns {string[]} Default weather variables
   */
  getDefaultVariables() {
    return [
      'temperature_2m',
      'relative_humidity_2m',
      'precipitation',
      'weather_code',
      'wind_speed_10m',
      'wind_direction_10m',
      'pressure_msl',
      'cloud_cover',
    ]
  }

  /**
   * Normalize API response to consistent format
   * @param {Object} data - Raw API response
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @returns {Object} Normalized forecast data
   */
  normalizeResponse(data, lat, lon) {
    if (!data || !data.hourly) {
      throw new ProviderError(
        'Invalid API response structure',
        this.getName()
      )
    }

    const hourly = data.hourly
    const times = hourly.time || []

    // Extract hourly forecast data
    const forecast = times.map((time, i) => ({
      time: time,
      temperature: hourly.temperature_2m?.[i] ?? null,
      humidity: hourly.relative_humidity_2m?.[i] ?? null,
      precipitation: hourly.precipitation?.[i] ?? null,
      weatherCode: hourly.weather_code?.[i] ?? null,
      windSpeed: hourly.wind_speed_10m?.[i] ?? null,
      windDirection: hourly.wind_direction_10m?.[i] ?? null,
      pressure: hourly.pressure_msl?.[i] ?? null,
      cloudCover: hourly.cloud_cover?.[i] ?? null,
    }))

    return {
      location: {
        latitude: lat,
        longitude: lon,
      },
      model: this.getModelMetadata(),
      forecast,
      generatedAt: new Date().toISOString(),
      timezone: data.timezone || 'UTC',
      units: {
        temperature: '°C',
        precipitation: 'mm',
        windSpeed: 'km/h',
        pressure: 'hPa',
      },
    }
  }

  // BaseWeatherProvider interface (NWP-specific implementations)
  getName() {
    return this.modelName
  }

  getAttribution() {
    return `${this.modelFullName} (${this.provider}) via Open-Meteo.com`
  }

  async getForecast({ lat, lon, days = 7 }) {
    return this.fetchForecast({ lat, lon, days, variables: this.getDefaultVariables() })
  }
}

