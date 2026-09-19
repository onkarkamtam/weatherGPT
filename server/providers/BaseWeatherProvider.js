/**
 * BaseWeatherProvider - Abstract base class for weather data providers
 * 
 * All weather providers (Open-Meteo, IMD, NWP models) implement this interface
 * to ensure consistent data access patterns across the application.
 */

export class BaseWeatherProvider {
  /**
   * Get current weather for a location
   * @param {Object} params
   * @param {number} params.lat - Latitude
   * @param {number} params.lon - Longitude
   * @returns {Promise<Object>} Normalized weather data
   */
  async getCurrentWeather({ lat, lon }) {
    throw new Error('getCurrentWeather() must be implemented by subclass')
  }

  /**
   * Get weather forecast
   * @param {Object} params
   * @param {number} params.lat - Latitude
   * @param {number} params.lon - Longitude
   * @param {number} params.days - Forecast days
   * @returns {Promise<Object>} Normalized forecast data
   */
  async getForecast({ lat, lon, days = 7 }) {
    throw new Error('getForecast() must be implemented by subclass')
  }

  /**
   * Get historical weather data
   * @param {Object} params
   * @param {number} params.lat - Latitude
   * @param {number} params.lon - Longitude
   * @param {string} params.startDate - Start date (YYYY-MM-DD)
   * @param {string} params.endDate - End date (YYYY-MM-DD)
   * @returns {Promise<Object>} Historical weather data
   */
  async getHistorical({ lat, lon, startDate, endDate }) {
    throw new Error('getHistorical() must be implemented by subclass')
  }

  /**
   * Get weather warnings for a location
   * @param {Object} params
   * @param {number} params.lat - Latitude
   * @param {number} params.lon - Longitude
   * @param {string} params.district - District name (optional)
   * @param {string} params.state - State name (optional)
   * @returns {Promise<Object>} Warnings data
   */
  async getWarnings({ lat, lon, district, state }) {
    throw new Error('getWarnings() must be implemented by subclass')
  }

  /**
   * Get nowcast (short-term forecast) for a location
   * @param {Object} params
   * @param {number} params.lat - Latitude
   * @param {number} params.lon - Longitude
   * @param {string} params.district - District name (optional)
   * @returns {Promise<Object>} Nowcast data
   */
  async getNowcast({ lat, lon, district }) {
    throw new Error('getNowcast() must be implemented by subclass')
  }

  /**
   * Get the provider name
   * @returns {string} Provider name
   */
  getName() {
    throw new Error('getName() must be implemented by subclass')
  }

  /**
   * Get the provider source attribution
   * @returns {string} Source attribution text
   */
  getAttribution() {
    throw new Error('getAttribution() must be implemented by subclass')
  }

  /**
   * Check if provider is available/configured
   * @returns {boolean} True if provider can be used
   */
  isAvailable() {
    return true
  }
}

/**
 * Provider error class
 */
export class ProviderError extends Error {
  constructor(message, providerName, originalError = null) {
    super(message)
    this.name = 'ProviderError'
    this.providerName = providerName
    this.originalError = originalError
  }
}
