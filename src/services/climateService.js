/**
 * climateService.js — Long-term climate trend analysis
 * 
 * Uses Open-Meteo Historical Weather API / ERA5 data
 * Analyzes 5-year and 10-year temperature and rainfall trends
 * 
 * IMPORTANT: Does NOT make causal climate change claims
 * Only reports observable trends in historical data
 */

const HISTORICAL_API = 'https://archive-api.open-meteo.com/v1/archive'
const REQUEST_TIMEOUT = 60000 // 60 seconds for large historical requests

/**
 * Climate service error class
 */
export class ClimateServiceError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ClimateServiceError'
  }
}

/**
 * Fetch annual climate data for a given year
 * 
 * @param {Object} params
 * @param {number} params.lat - Latitude
 * @param {number} params.lon - Longitude
 * @param {number} params.year - Year to fetch
 * @returns {Promise<Object>} Annual climate data
 */
async function fetchAnnualData({ lat, lon, year }) {
  const startDate = `${year}-01-01`
  const endDate = `${year}-12-31`

  const url = new URL(HISTORICAL_API)
  url.searchParams.set('latitude', String(lat))
  url.searchParams.set('longitude', String(lon))
  url.searchParams.set('start_date', startDate)
  url.searchParams.set('end_date', endDate)
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_sum')
  url.searchParams.set('timezone', 'auto')

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

    const response = await fetch(url.toString(), { signal: controller.signal })
    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new ClimateServiceError(`Failed to fetch climate data for ${year}: HTTP ${response.status}`)
    }

    const data = await response.json()

    // Calculate annual statistics
    const temps = data.daily.temperature_2m_max.filter(t => t != null)
    const minTemps = data.daily.temperature_2m_min.filter(t => t != null)
    const precip = data.daily.precipitation_sum.filter(p => p != null)

    if (temps.length === 0 || minTemps.length === 0 || precip.length === 0) {
      throw new ClimateServiceError(`Incomplete data for ${year}`)
    }

    const avgMaxTemp = temps.reduce((sum, t) => sum + t, 0) / temps.length
    const avgMinTemp = minTemps.reduce((sum, t) => sum + t, 0) / minTemps.length
    const avgTemp = (avgMaxTemp + avgMinTemp) / 2
    const totalPrecip = precip.reduce((sum, p) => sum + p, 0)
    const rainyDays = precip.filter(p => p > 1.0).length // Days with > 1mm rain

    return {
      year,
      avgTemp: Math.round(avgTemp * 10) / 10,
      avgMaxTemp: Math.round(avgMaxTemp * 10) / 10,
      avgMinTemp: Math.round(avgMinTemp * 10) / 10,
      totalPrecip: Math.round(totalPrecip),
      rainyDays,
      daysAnalyzed: temps.length,
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new ClimateServiceError(`Request timeout for ${year}`)
    }
    if (error instanceof ClimateServiceError) {
      throw error
    }
    throw new ClimateServiceError(`Failed to fetch climate data for ${year}: ${error.message}`)
  }
}

/**
 * Fetch climate trend analysis for multiple years
 * 
 * OPTIMIZED: Single API request for entire date range
 * Aggregates data locally by year to avoid rate limiting
 * 
 * @param {Object} params
 * @param {number} params.lat - Latitude
 * @param {number} params.lon - Longitude
 * @param {number} params.years - Number of years to analyze (5 or 10)
 * @returns {Promise<Object>} Climate trend analysis
 */
export async function fetchClimateTrend({ lat, lon, years = 5 }) {
  if (typeof lat !== 'number' || typeof lon !== 'number') {
    throw new ClimateServiceError('Invalid coordinates')
  }

  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    throw new ClimateServiceError('Coordinates out of range')
  }

  if (years !== 5 && years !== 10) {
    throw new ClimateServiceError('Years must be 5 or 10')
  }

  const currentYear = new Date().getFullYear()
  const startYear = currentYear - years

  console.log(`[Climate Service] Fetching ${years}-year trend for (${lat}, ${lon})`)
  console.log(`[Climate Service] Date range: ${startYear}-01-01 to ${currentYear - 1}-12-31`)

  try {
    // SINGLE API REQUEST for entire date range
    const startDate = `${startYear}-01-01`
    const endDate = `${currentYear - 1}-12-31`

    const url = new URL(HISTORICAL_API)
    url.searchParams.set('latitude', String(lat))
    url.searchParams.set('longitude', String(lon))
    url.searchParams.set('start_date', startDate)
    url.searchParams.set('end_date', endDate)
    url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_sum')
    url.searchParams.set('timezone', 'auto')

    console.log('[Climate Service] Fetching full range from Open-Meteo Historical API...')

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

    const response = await fetch(url.toString(), { signal: controller.signal })
    clearTimeout(timeoutId)

    if (!response.ok) {
      // Handle rate limiting with retry
      if (response.status === 429) {
        console.warn('[Climate Service] Rate limited - waiting 2 seconds and retrying...')
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        const retryResponse = await fetch(url.toString())
        if (!retryResponse.ok) {
          throw new ClimateServiceError(`Failed to fetch climate data after retry: HTTP ${retryResponse.status}`)
        }
        const data = await retryResponse.json()
        return processHistoricalData(data, startYear, currentYear)
      }
      
      throw new ClimateServiceError(`Failed to fetch climate data: HTTP ${response.status}`)
    }

    const data = await response.json()
    console.log(`[Climate Service] ✓ Received ${data.daily.time.length} days of data`)

    return processHistoricalData(data, startYear, currentYear)
    
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new ClimateServiceError('Request timeout fetching climate data')
    }
    console.error('[Climate Service] Error:', error)
    throw error instanceof ClimateServiceError ? error : new ClimateServiceError(error.message)
  }
}

/**
 * Process historical data and aggregate by year
 * 
 * @param {Object} data - Open-Meteo historical response
 * @param {number} startYear - First year of range
 * @param {number} currentYear - Current year
 * @returns {Object} Climate trend analysis
 */
function processHistoricalData(data, startYear, currentYear) {
  // Group daily data by year
  const yearlyDataMap = {}

  for (let i = 0; i < data.daily.time.length; i++) {
    const date = data.daily.time[i]
    const year = parseInt(date.split('-')[0])
    
    if (year >= currentYear) continue // Skip current year (incomplete)
    
    if (!yearlyDataMap[year]) {
      yearlyDataMap[year] = {
        year,
        maxTemps: [],
        minTemps: [],
        precips: [],
      }
    }
    
    const maxTemp = data.daily.temperature_2m_max[i]
    const minTemp = data.daily.temperature_2m_min[i]
    const precip = data.daily.precipitation_sum[i]
    
    if (maxTemp != null) yearlyDataMap[year].maxTemps.push(maxTemp)
    if (minTemp != null) yearlyDataMap[year].minTemps.push(minTemp)
    if (precip != null) yearlyDataMap[year].precips.push(precip)
  }

  // Calculate annual statistics
  const yearlyData = []
  
  for (let year = startYear; year < currentYear; year++) {
    const yearData = yearlyDataMap[year]
    
    if (!yearData || yearData.maxTemps.length === 0) {
      console.warn(`[Climate Service] No data for year ${year}`)
      continue
    }
    
    const avgMaxTemp = yearData.maxTemps.reduce((sum, t) => sum + t, 0) / yearData.maxTemps.length
    const avgMinTemp = yearData.minTemps.reduce((sum, t) => sum + t, 0) / yearData.minTemps.length
    const avgTemp = (avgMaxTemp + avgMinTemp) / 2
    const totalPrecip = yearData.precips.reduce((sum, p) => sum + p, 0)
    const rainyDays = yearData.precips.filter(p => p > 1.0).length
    
    yearlyData.push({
      year,
      avgTemp: Math.round(avgTemp * 10) / 10,
      avgMaxTemp: Math.round(avgMaxTemp * 10) / 10,
      avgMinTemp: Math.round(avgMinTemp * 10) / 10,
      totalPrecip: Math.round(totalPrecip),
      rainyDays,
      daysAnalyzed: yearData.maxTemps.length,
    })
  }
  
  const years = currentYear - startYear
  const minRequiredYears = Math.ceil(years * 0.6)
  
  if (yearlyData.length < minRequiredYears) {
    throw new ClimateServiceError(
      `Insufficient data: only ${yearlyData.length}/${years} years available`
    )
  }
  
  console.log(`[Climate Service] ✓ Aggregated ${yearlyData.length}/${years} years`)

  // Calculate trend statistics
  const temps = yearlyData.map(d => d.avgTemp)
  const precips = yearlyData.map(d => d.totalPrecip)

  // Simple linear trend (slope)
  const n = temps.length
  const years_arr = yearlyData.map(d => d.year)
  const x_mean = years_arr.reduce((a, b) => a + b, 0) / n
  const y_temp_mean = temps.reduce((a, b) => a + b, 0) / n
  const y_precip_mean = precips.reduce((a, b) => a + b, 0) / n

  let numerator_temp = 0
  let numerator_precip = 0
  let denominator = 0

  for (let i = 0; i < n; i++) {
    const x_diff = years_arr[i] - x_mean
    numerator_temp += x_diff * (temps[i] - y_temp_mean)
    numerator_precip += x_diff * (precips[i] - y_precip_mean)
    denominator += x_diff * x_diff
  }

  const tempSlope = denominator !== 0 ? numerator_temp / denominator : 0
  const precipSlope = denominator !== 0 ? numerator_precip / denominator : 0

  // Determine trend direction
  const tempTrend = tempSlope > 0.1 ? 'increasing' : tempSlope < -0.1 ? 'decreasing' : 'stable'
  const precipTrend = precipSlope > 10 ? 'increasing' : precipSlope < -10 ? 'decreasing' : 'stable'

  console.log(`[Climate Service] ✓ ${years}-year trend calculated: temp ${tempTrend}, precip ${precipTrend}`)

  return {
    period: {
      startYear,
      endYear: currentYear - 1,
      years,
    },
    yearlyData,
    trends: {
      temperature: {
        slope: Math.round(tempSlope * 100) / 100, // °C per year
        direction: tempTrend,
        change: Math.round((temps[temps.length - 1] - temps[0]) * 10) / 10, // Total change
      },
      precipitation: {
        slope: Math.round(precipSlope), // mm per year
        direction: precipTrend,
        change: Math.round(precips[precips.length - 1] - precips[0]), // Total change
      },
    },
    summary: {
      avgTemp: Math.round(y_temp_mean * 10) / 10,
      avgPrecip: Math.round(y_precip_mean),
      minYear: yearlyData.reduce((min, d) => d.avgTemp < min.avgTemp ? d : min),
      maxYear: yearlyData.reduce((max, d) => d.avgTemp > max.avgTemp ? d : max),
      wettest: yearlyData.reduce((max, d) => d.totalPrecip > max.totalPrecip ? d : max),
      driest: yearlyData.reduce((min, d) => d.totalPrecip < min.totalPrecip ? d : min),
    },
  }
}

