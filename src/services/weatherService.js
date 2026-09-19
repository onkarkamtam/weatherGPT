/**
 * weatherService.js — Fetches and normalizes real weather data. No React imports.
 *
 * Provider: Open-Meteo (https://open-meteo.com) — free, no API key required.
 * Data sources: ECMWF, IMD-backed models.
 *
 * Exports:
 *   fetchCurrentWeather({ lat, lon }) → Promise<NormalizedWeatherData>
 *
 * Phase 3+: swap provider here without touching UI components.
 */

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast'
const OPEN_METEO_HISTORICAL = 'https://archive-api.open-meteo.com/v1/archive'

/**
 * Custom error type for weather fetch failures.
 */
export class WeatherFetchError extends Error {
  /** @param {string} message - User-readable message */
  constructor(message) {
    super(message)
    this.name = 'WeatherFetchError'
  }
}

// ─── WMO Weather Code → WeatherGPT conditionCode ────────────────────────────
// WMO interpretation codes used by Open-Meteo
// Reference: https://open-meteo.com/en/docs (WMO Code table)
const WMO_TO_CONDITION = {
  0:  { code: 'sunny',        label: 'Clear Sky',        severity: 'none'     },
  1:  { code: 'sunny',        label: 'Mainly Clear',     severity: 'none'     },
  2:  { code: 'partly-cloudy', label: 'Partly Cloudy',   severity: 'none'     },
  3:  { code: 'cloudy',       label: 'Overcast',         severity: 'none'     },
  45: { code: 'fog',          label: 'Foggy',            severity: 'moderate' },
  48: { code: 'fog',          label: 'Icy Fog',          severity: 'moderate' },
  51: { code: 'rain',         label: 'Light Drizzle',    severity: 'none'     },
  53: { code: 'rain',         label: 'Drizzle',          severity: 'none'     },
  55: { code: 'rain',         label: 'Heavy Drizzle',    severity: 'minor'    },
  56: { code: 'rain',         label: 'Freezing Drizzle', severity: 'moderate' },
  57: { code: 'rain',         label: 'Heavy Freezing Drizzle', severity: 'moderate' },
  61: { code: 'rain',         label: 'Light Rain',       severity: 'none'     },
  63: { code: 'rain',         label: 'Rain',             severity: 'minor'    },
  65: { code: 'rain',         label: 'Heavy Rain',       severity: 'moderate' },
  66: { code: 'rain',         label: 'Freezing Rain',    severity: 'moderate' },
  67: { code: 'rain',         label: 'Heavy Freezing Rain', severity: 'severe' },
  71: { code: 'snow',         label: 'Light Snow',       severity: 'minor'    },
  73: { code: 'snow',         label: 'Snow',             severity: 'moderate' },
  75: { code: 'snow',         label: 'Heavy Snow',       severity: 'severe'   },
  77: { code: 'snow',         label: 'Snow Grains',      severity: 'minor'    },
  80: { code: 'rain',         label: 'Light Showers',    severity: 'none'     },
  81: { code: 'rain',         label: 'Rain Showers',     severity: 'minor'    },
  82: { code: 'rain',         label: 'Heavy Showers',    severity: 'moderate' },
  85: { code: 'snow',         label: 'Snow Showers',     severity: 'moderate' },
  86: { code: 'snow',         label: 'Heavy Snow Showers', severity: 'severe' },
  95: { code: 'thunderstorm', label: 'Thunderstorm',     severity: 'severe'   },
  96: { code: 'thunderstorm', label: 'Thunderstorm with Hail', severity: 'severe' },
  99: { code: 'thunderstorm', label: 'Thunderstorm with Heavy Hail', severity: 'severe' },
}

/** Converts WMO code to our internal condition. Falls back gracefully. */
function wmoToCondition(code) {
  return WMO_TO_CONDITION[code] ?? { code: 'partly-cloudy', label: 'Variable Conditions', severity: 'none' }
}

// Export for use in time period aggregation
export { wmoToCondition }

// ─── Alert generation based on weather conditions ────────────────────────────
/**
 * Generates weather alert/warning information based on current conditions.
 * Returns null if no significant alert conditions are present.
 * 
 * @param {object} weatherData - Current weather data with severity, rain, wind, etc.
 * @returns {object|null} Alert object with type, title, message, and recommendations
 */
function generateWeatherAlert(weatherData) {
  const { severity, conditionCode, condition, rainChance, wind, temp, precipMm } = weatherData
  
  // Severe weather alerts (thunderstorms, heavy rain/snow, freezing conditions)
  if (severity === 'severe') {
    if (conditionCode === 'thunderstorm') {
      return {
        type: 'severe',
        title: 'Thunderstorm Warning',
        message: `${condition} conditions detected. Lightning and heavy rain expected.`,
        recommendations: [
          'Stay indoors and avoid travel if possible',
          'Avoid open areas and tall objects',
          'Unplug sensitive electronics',
          'Do not use electrical appliances',
        ],
      }
    }
    if (condition.includes('Heavy Rain') || condition.includes('Heavy Freezing Rain')) {
      return {
        type: 'severe',
        title: 'Heavy Rainfall Warning',
        message: `${condition} detected with ${precipMm}mm precipitation. Flooding risk.`,
        recommendations: [
          'Avoid low-lying areas and river banks',
          'Do not attempt to cross flooded roads',
          'Keep emergency supplies ready',
          'Monitor local weather updates',
        ],
      }
    }
    if (condition.includes('Heavy Snow')) {
      return {
        type: 'severe',
        title: 'Heavy Snowfall Warning',
        message: `${condition} conditions. Significant accumulation expected.`,
        recommendations: [
          'Avoid unnecessary travel',
          'Keep warm clothing and supplies ready',
          'Check on elderly neighbors',
          'Clear snow from roofs if safe to do so',
        ],
      }
    }
  }
  
  // Moderate weather alerts (fog, freezing conditions, heavy showers)
  if (severity === 'moderate') {
    if (conditionCode === 'fog') {
      return {
        type: 'moderate',
        title: 'Fog Advisory',
        message: `${condition} causing reduced visibility. Drive with extreme caution.`,
        recommendations: [
          'Use fog lights and reduce speed',
          'Increase following distance',
          'Avoid overtaking vehicles',
          'Delay travel if visibility is very poor',
        ],
      }
    }
    if (condition.includes('Freezing')) {
      return {
        type: 'moderate',
        title: 'Freezing Conditions Alert',
        message: `${condition} detected. Icy surfaces likely.`,
        recommendations: [
          'Watch for ice on roads and walkways',
          'Drive slowly and brake gently',
          'Wear warm, layered clothing',
          'Protect exposed pipes from freezing',
        ],
      }
    }
    if (condition.includes('Heavy')) {
      return {
        type: 'moderate',
        title: 'Adverse Weather Alert',
        message: `${condition} expected. Travel may be affected.`,
        recommendations: [
          'Check weather updates before traveling',
          'Carry rain gear or appropriate clothing',
          'Allow extra travel time',
          'Drive carefully in wet conditions',
        ],
      }
    }
  }
  
  // High wind alert
  if (wind >= 40) {
    return {
      type: 'moderate',
      title: 'Strong Wind Advisory',
      message: `High winds detected (${wind} km/h). Secure loose objects.`,
      recommendations: [
        'Secure outdoor furniture and loose items',
        'Avoid parking under trees',
        'Be cautious of falling branches',
        'High-sided vehicles should drive with extra care',
      ],
    }
  }
  
  // Very high rain probability with significant precipitation
  if (rainChance >= 80 && precipMm >= 20) {
    return {
      type: 'moderate',
      title: 'Heavy Rain Expected',
      message: `${rainChance}% chance of rain with ${precipMm}mm expected. Plan accordingly.`,
      recommendations: [
        'Carry umbrella and raincoat',
        'Avoid waterlogged areas',
        'Check drainage around your home',
        'Keep valuables away from windows',
      ],
    }
  }
  
  // Extreme heat (for India context)
  if (temp >= 42) {
    return {
      type: 'moderate',
      title: 'Extreme Heat Alert',
      message: `Very high temperature (${temp}°C). Heat stress risk.`,
      recommendations: [
        'Stay hydrated - drink plenty of water',
        'Avoid going out during peak afternoon hours',
        'Wear light, loose-fitting clothes',
        'Check on vulnerable family members',
      ],
    }
  }
  
  // No alert conditions
  return null
}

// ─── Wind direction degrees → compass label ──────────────────────────────────
const COMPASS = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW']
function degreesToCompass(deg) {
  if (typeof deg !== 'number') return '—'
  return COMPASS[Math.round(deg / 22.5) % 16]
}

// ─── Build a plain-language summary sentence ─────────────────────────────────
function buildSummary({ conditionCode, condition, rainChance, precipMm, tempMin, tempMax, wind }) {
  const rainPart =
    rainChance >= 70 ? `High chance of rain (${rainChance}%). ` :
    rainChance >= 40 ? `Moderate rain possible (${rainChance}%). ` :
    rainChance >= 20 ? `Small chance of light rain (${rainChance}%). ` :
    'Dry conditions expected. '

  const tempPart = `Temperatures between ${tempMin}°C and ${tempMax}°C.`

  const windPart = wind >= 40 ? ` Windy — ${wind} km/h.` :
                   wind >= 20 ? ` Breezy at ${wind} km/h.` : ''

  const conditionPart = ['thunderstorm', 'heavy-rain'].includes(conditionCode)
    ? ' Stay safe and avoid unnecessary travel.'
    : conditionCode === 'fog'
    ? ' Low visibility — drive carefully.'
    : ''

  return `${rainPart}${tempPart}${windPart}${conditionPart}`.trim()
}

/**
 * @typedef {Object} NormalizedWeatherData
 * @property {string}  condition      - Human-readable label e.g. "Partly Cloudy"
 * @property {string}  conditionCode  - Internal key matching WeatherCard CONDITION_EMOJI
 * @property {number}  temp           - Current temperature °C (integer)
 * @property {number}  feelsLike      - Apparent temperature °C (integer)
 * @property {number}  humidity       - Relative humidity %
 * @property {number}  wind           - Wind speed km/h (integer)
 * @property {string}  windDir        - Compass direction e.g. "NE"
 * @property {number}  rainChance     - Today's precipitation probability %
 * @property {number}  precipMm       - Today's total precipitation mm
 * @property {number}  tempMin        - Today's minimum temperature °C
 * @property {number}  tempMax        - Today's maximum temperature °C
 * @property {string}  summary        - Plain-language description sentence
 * @property {string}  fetchedAt      - ISO timestamp — confirms data is live
 * @property {boolean} isLive         - Always true — distinguishes from mock data
 */

/**
 * Fetches current weather conditions from Open-Meteo.
 *
 * @param {{ lat: number, lon: number }} location
 * @returns {Promise<NormalizedWeatherData>}
 * @throws {WeatherFetchError} with a user-readable message on any failure
 */
export async function fetchCurrentWeather({ lat, lon }) {
  if (typeof lat !== 'number' || typeof lon !== 'number') {
    throw new WeatherFetchError(
      'Unable to get weather without location coordinates. Please go back and re-enter your location.'
    )
  }

  const url = new URL(OPEN_METEO_BASE)
  url.searchParams.set('latitude',  String(lat))
  url.searchParams.set('longitude', String(lon))
  url.searchParams.set('current', [
    'temperature_2m',
    'relative_humidity_2m',
    'apparent_temperature',
    'precipitation',
    'weather_code',
    'wind_speed_10m',
    'wind_direction_10m',
  ].join(','))
  url.searchParams.set('daily', [
    'temperature_2m_max',
    'temperature_2m_min',
    'precipitation_sum',
    'precipitation_probability_max',
    'weather_code',
  ].join(','))
  url.searchParams.set('timezone',      'auto')
  url.searchParams.set('forecast_days', '1')
  url.searchParams.set('wind_speed_unit', 'kmh')

  let data
  try {
    const res = await fetch(url.toString())
    if (!res.ok) {
      throw new WeatherFetchError(
        `Unable to fetch weather data (service error ${res.status}). Please try again in a moment.`
      )
    }
    data = await res.json()
  } catch (err) {
    if (err instanceof WeatherFetchError) throw err
    throw new WeatherFetchError(
      'Cannot connect to weather service. Check your internet connection and try again.'
    )
  }

  // Validate expected shape
  const cur   = data?.current
  const daily = data?.daily

  if (!cur || !daily) {
    throw new WeatherFetchError(
      'Weather service returned incomplete data. Please try again.'
    )
  }

  // ── Extract current values ──────────────────────────────────────────────
  const temp      = Math.round(cur.temperature_2m      ?? 0)
  const feelsLike = Math.round(cur.apparent_temperature ?? temp)
  const humidity  = Math.round(cur.relative_humidity_2m ?? 0)
  const wind      = Math.round(cur.wind_speed_10m       ?? 0)
  const windDeg   = cur.wind_direction_10m
  const wmoCode   = cur.weather_code ?? 0

  // ── Extract daily values (first day = today) ────────────────────────────
  const tempMax    = Math.round(daily.temperature_2m_max?.[0]              ?? temp)
  const tempMin    = Math.round(daily.temperature_2m_min?.[0]              ?? temp)
  const precipMm   = Math.round((daily.precipitation_sum?.[0]              ?? 0) * 10) / 10
  const rainChance = Math.round(daily.precipitation_probability_max?.[0]   ?? 0)

  // ── Normalize condition ─────────────────────────────────────────────────
  const { code: conditionCode, label: condition, severity } = wmoToCondition(wmoCode)
  const windDir = degreesToCompass(windDeg)

  // ── Build conversational summary ────────────────────────────────────────
  const summary = buildSummary({ conditionCode, condition, rainChance, precipMm, tempMin, tempMax, wind })

  // ── Generate alert if applicable ────────────────────────────────────────
  const alert = generateWeatherAlert({ 
    severity, conditionCode, condition, rainChance, wind, temp, precipMm 
  })

  return {
    condition,
    conditionCode,
    severity,
    temp,
    feelsLike,
    humidity,
    wind,
    windDir,
    rainChance,
    precipMm,
    tempMin,
    tempMax,
    summary,
    alert,
    fetchedAt: new Date().toISOString(),
    isLive: true,
  }
}

// ─── Phase 3: 3-day weather context for AI grounding ─────────────────────────

/**
 * @typedef {Object} ForecastDay
 * @property {string} date          - Formatted date string e.g. "Mon, 1 Sep"
 * @property {string} condition     - Human-readable condition label
 * @property {string} conditionCode - Internal code matching WeatherCard CONDITION_EMOJI
 * @property {number} tempMin       - Minimum temperature °C
 * @property {number} tempMax       - Maximum temperature °C
 * @property {number} rainChance    - Precipitation probability %
 */

/**
 * @typedef {Object} WeatherContext
 * @property {NormalizedWeatherData} today    - Full current conditions (same shape as fetchCurrentWeather)
 * @property {ForecastDay[]}         forecast - Next 2 days of simplified forecast data
 */

/**
 * Fetches a 3-day weather context in a single Open-Meteo request.
 * Used by Phase 3 to give the AI temporal context for follow-up questions
 * ("what about tomorrow?", "will it rain this week?").
 *
 * `today` is identical in shape to `fetchCurrentWeather()` output, so
 * WeatherCard can consume it without any changes.
 *
 * @param {{ lat: number, lon: number }} location
 * @returns {Promise<WeatherContext>}
 * @throws {WeatherFetchError}
 */
export async function fetchWeatherContext({ lat, lon }) {
  if (typeof lat !== 'number' || typeof lon !== 'number') {
    throw new WeatherFetchError(
      'Unable to get weather without location coordinates. Please go back and re-enter your location.'
    )
  }

  const url = new URL(OPEN_METEO_BASE)
  url.searchParams.set('latitude',  String(lat))
  url.searchParams.set('longitude', String(lon))
  url.searchParams.set('current', [
    'temperature_2m',
    'relative_humidity_2m',
    'apparent_temperature',
    'precipitation',
    'weather_code',
    'wind_speed_10m',
    'wind_direction_10m',
  ].join(','))
  // NOTE: 'time' is automatically included in every Open-Meteo daily response.
  // Do NOT add it to this list — it is not a requestable variable and causes a 400 error.
  url.searchParams.set('daily', [
    'temperature_2m_max',
    'temperature_2m_min',
    'precipitation_sum',
    'precipitation_probability_max',
    'weather_code',
  ].join(','))
  url.searchParams.set('timezone',        'auto')
  url.searchParams.set('forecast_days',   '3')
  url.searchParams.set('wind_speed_unit', 'kmh')

  let data
  try {
    const res = await fetch(url.toString())
    if (!res.ok) {
      throw new WeatherFetchError(
        `Unable to fetch weather data (service error ${res.status}). Please try again in a moment.`
      )
    }
    data = await res.json()
  } catch (err) {
    if (err instanceof WeatherFetchError) throw err
    throw new WeatherFetchError(
      'Cannot connect to weather service. Check your internet connection and try again.'
    )
  }

  const cur   = data?.current
  const daily = data?.daily

  if (!cur || !daily) {
    throw new WeatherFetchError('Weather service returned incomplete data. Please try again.')
  }

  // ── Today: identical to fetchCurrentWeather output ──────────────────────
  const temp      = Math.round(cur.temperature_2m      ?? 0)
  const feelsLike = Math.round(cur.apparent_temperature ?? temp)
  const humidity  = Math.round(cur.relative_humidity_2m ?? 0)
  const wind      = Math.round(cur.wind_speed_10m       ?? 0)
  const windDeg   = cur.wind_direction_10m
  const wmoCode   = cur.weather_code ?? 0

  const tempMax    = Math.round(daily.temperature_2m_max?.[0]            ?? temp)
  const tempMin    = Math.round(daily.temperature_2m_min?.[0]            ?? temp)
  const precipMm   = Math.round((daily.precipitation_sum?.[0]            ?? 0) * 10) / 10
  const rainChance = Math.round(daily.precipitation_probability_max?.[0] ?? 0)

  const { code: conditionCode, label: condition, severity } = wmoToCondition(wmoCode)
  const windDir = degreesToCompass(windDeg)
  const summary = buildSummary({ conditionCode, condition, rainChance, precipMm, tempMin, tempMax, wind })
  
  const alert = generateWeatherAlert({ 
    severity, conditionCode, condition, rainChance, wind, temp, precipMm 
  })

  const today = {
    condition, conditionCode, severity, temp, feelsLike, humidity,
    wind, windDir, rainChance, precipMm, tempMin, tempMax,
    summary, alert, fetchedAt: new Date().toISOString(), isLive: true,
  }

  // ── Forecast: next 2 days (indices 1 and 2 of daily arrays) ─────────────
  const forecast = [1, 2].map((i) => {
    const dateStr  = daily.time?.[i]
    const fmtDate  = dateStr
      ? new Date(dateStr + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
      : `Day +${i}`
    const dayWmo   = daily.weather_code?.[i] ?? 0
    const { code: fCode, label: fLabel } = wmoToCondition(dayWmo)
    return {
      date:          fmtDate,
      condition:     fLabel,
      conditionCode: fCode,
      tempMin:       Math.round(daily.temperature_2m_min?.[i]            ?? 0),
      tempMax:       Math.round(daily.temperature_2m_max?.[i]            ?? 0),
      rainChance:    Math.round(daily.precipitation_probability_max?.[i] ?? 0),
    }
  })

  return { lat, lon, today, forecast }
}


// ─── Phase 6: Historical weather comparison for climate insights ─────────────

/**
 * @typedef {Object} HistoricalComparison
 * @property {Object} thisYear    - Data for the same period this year
 * @property {Object} lastYear    - Data for the same period last year
 * @property {Object} comparison  - Comparative analysis (differences, trends)
 */

/**
 * Fetches historical weather data for comparison analysis.
 * Compares current period with same period last year for climate insights.
 * 
 * Uses Open-Meteo Historical Weather API (ERA5 reanalysis data back to 1959).
 * 
 * @param {{ lat: number, lon: number, daysBack?: number }} params
 * @returns {Promise<HistoricalComparison>}
 * @throws {WeatherFetchError}
 */
export async function fetchHistoricalComparison({ lat, lon, daysBack = 30 }) {
  if (typeof lat !== 'number' || typeof lon !== 'number') {
    throw new WeatherFetchError(
      'Unable to get historical data without location coordinates.'
    )
  }

  // Calculate date ranges
  // NOTE: ERA5 reanalysis data has a 5-day delay. We need to end the comparison
  // at least 5 days ago to ensure data availability.
  const today = new Date()
  const thisYearEnd = new Date(today)
  thisYearEnd.setHours(0, 0, 0, 0)
  // Subtract 5 days to account for ERA5 data availability delay
  thisYearEnd.setDate(thisYearEnd.getDate() - 5)
  
  const thisYearStart = new Date(thisYearEnd)
  thisYearStart.setDate(thisYearStart.getDate() - daysBack)

  const lastYearEnd = new Date(thisYearEnd)
  lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1)
  const lastYearStart = new Date(thisYearStart)
  lastYearStart.setFullYear(lastYearStart.getFullYear() - 1)

  // Format dates as YYYY-MM-DD
  const formatDate = (date) => date.toISOString().split('T')[0]

  console.log('[fetchHistoricalComparison] Date ranges calculated:', {
    thisYearPeriod: `${formatDate(thisYearStart)} to ${formatDate(thisYearEnd)}`,
    lastYearPeriod: `${formatDate(lastYearStart)} to ${formatDate(lastYearEnd)}`,
    location: { lat, lon },
    daysBack,
  })

  try {
    // Fetch this year's data
    const thisYearUrl = new URL(OPEN_METEO_HISTORICAL)
    thisYearUrl.searchParams.set('latitude', String(lat))
    thisYearUrl.searchParams.set('longitude', String(lon))
    thisYearUrl.searchParams.set('start_date', formatDate(thisYearStart))
    thisYearUrl.searchParams.set('end_date', formatDate(thisYearEnd))
    thisYearUrl.searchParams.set('daily', [
      'temperature_2m_max',
      'temperature_2m_min',
      'temperature_2m_mean',
      'precipitation_sum',
      'rain_sum',
      'weather_code',
    ].join(','))
    thisYearUrl.searchParams.set('timezone', 'auto')

    // Fetch last year's data
    const lastYearUrl = new URL(OPEN_METEO_HISTORICAL)
    lastYearUrl.searchParams.set('latitude', String(lat))
    lastYearUrl.searchParams.set('longitude', String(lon))
    lastYearUrl.searchParams.set('start_date', formatDate(lastYearStart))
    lastYearUrl.searchParams.set('end_date', formatDate(lastYearEnd))
    lastYearUrl.searchParams.set('daily', [
      'temperature_2m_max',
      'temperature_2m_min',
      'temperature_2m_mean',
      'precipitation_sum',
      'rain_sum',
      'weather_code',
    ].join(','))
    lastYearUrl.searchParams.set('timezone', 'auto')

    console.log('[fetchHistoricalComparison] Fetching from URLs...')

    const [thisYearRes, lastYearRes] = await Promise.all([
      fetch(thisYearUrl.toString()),
      fetch(lastYearUrl.toString()),
    ])

    console.log('[fetchHistoricalComparison] HTTP Status:', {
      thisYear: thisYearRes.status,
      lastYear: lastYearRes.status,
    })

    if (!thisYearRes.ok || !lastYearRes.ok) {
      const thisYearError = !thisYearRes.ok ? await thisYearRes.text().catch(() => `HTTP ${thisYearRes.status}`) : null
      const lastYearError = !lastYearRes.ok ? await lastYearRes.text().catch(() => `HTTP ${lastYearRes.status}`) : null
      
      console.error('[fetchHistoricalComparison] API Error:', {
        thisYear: { status: thisYearRes.status, error: thisYearError },
        lastYear: { status: lastYearRes.status, error: lastYearError },
      })
      
      throw new WeatherFetchError(
        'Unable to fetch historical weather data. The archive may not have recent data available yet.'
      )
    }

    const [thisYearData, lastYearData] = await Promise.all([
      thisYearRes.json(),
      lastYearRes.json(),
    ])

    console.log('[fetchHistoricalComparison] Got response data')

    // Calculate statistics
    const calculateStats = (daily, label) => {
      if (!daily) {
        console.error(`[calculateStats] No daily data for ${label}`)
        return null
      }
      
      const temps = daily.temperature_2m_mean || []
      const maxTemps = daily.temperature_2m_max || []
      const minTemps = daily.temperature_2m_min || []
      const precip = daily.precipitation_sum || []
      const rain = daily.rain_sum || []

      const validTemps = temps.filter(t => t != null && !isNaN(t))
      
      if (validTemps.length === 0) {
        console.error(`[calculateStats] No valid temperature data for ${label}`)
        return null
      }

      const avgTemp = Math.round(
        validTemps.reduce((sum, t) => sum + t, 0) / validTemps.length
      )
      const validMaxTemps = maxTemps.filter(t => t != null && !isNaN(t))
      const avgMax = validMaxTemps.length > 0 
        ? Math.round(validMaxTemps.reduce((sum, t) => sum + t, 0) / validMaxTemps.length)
        : avgTemp
      const validMinTemps = minTemps.filter(t => t != null && !isNaN(t))
      const avgMin = validMinTemps.length > 0
        ? Math.round(validMinTemps.reduce((sum, t) => sum + t, 0) / validMinTemps.length)
        : avgTemp
      const totalPrecip = Math.round(
        precip.reduce((sum, p) => sum + (p || 0), 0) * 10
      ) / 10
      const totalRain = Math.round(
        rain.reduce((sum, r) => sum + (r || 0), 0) * 10
      ) / 10
      const rainyDays = precip.filter((p) => p > 1).length

      // Most common weather condition
      const weatherCodes = (daily.weather_code || []).filter(c => c != null)
      const codeFreq = {}
      weatherCodes.forEach((code) => {
        codeFreq[code] = (codeFreq[code] || 0) + 1
      })
      const mostCommonCode = Object.keys(codeFreq).length > 0
        ? Object.keys(codeFreq).reduce((a, b) => (codeFreq[a] > codeFreq[b] ? a : b), 0)
        : 0
      const mostCommonCondition = wmoToCondition(Number(mostCommonCode))

      const result = {
        avgTemp,
        avgMax,
        avgMin,
        totalPrecip,
        totalRain,
        rainyDays,
        daysAnalyzed: validTemps.length,
        mostCommonCondition: mostCommonCondition.label,
      }

      console.log(`[calculateStats] ${label}: ${result.daysAnalyzed} days, avg ${result.avgTemp}°C`)
      
      return result
    }

    const thisYear = calculateStats(thisYearData.daily, 'This Year')
    const lastYear = calculateStats(lastYearData.daily, 'Last Year')

    if (!thisYear || !lastYear) {
      console.error('[fetchHistoricalComparison] Could not calculate statistics')
      throw new WeatherFetchError('Historical data is incomplete for this location.')
    }

    // Calculate comparison
    const tempDiff = thisYear.avgTemp - lastYear.avgTemp
    const precipDiff = thisYear.totalPrecip - lastYear.totalPrecip
    const rainyDaysDiff = thisYear.rainyDays - lastYear.rainyDays

    return {
      thisYear: {
        ...thisYear,
        period: `${formatDate(thisYearStart)} to ${formatDate(thisYearEnd)}`,
        year: thisYearEnd.getFullYear(),
      },
      lastYear: {
        ...lastYear,
        period: `${formatDate(lastYearStart)} to ${formatDate(lastYearEnd)}`,
        year: lastYearEnd.getFullYear(),
      },
      comparison: {
        tempDiff: Math.round(tempDiff * 10) / 10,
        tempTrend: tempDiff > 1 ? 'warmer' : tempDiff < -1 ? 'cooler' : 'similar',
        precipDiff: Math.round(precipDiff * 10) / 10,
        precipTrend: precipDiff > 20 ? 'wetter' : precipDiff < -20 ? 'drier' : 'similar',
        rainyDaysDiff,
        summary: buildComparisonSummary(thisYear, lastYear, tempDiff, precipDiff, rainyDaysDiff),
      },
      fetchedAt: new Date().toISOString(),
    }
  } catch (err) {
    if (err instanceof WeatherFetchError) throw err
    console.error('[fetchHistoricalComparison] Error:', err)
    throw new WeatherFetchError(
      'Cannot retrieve historical weather data. Check your internet connection and try again.'
    )
  }
}

/**
 * Builds a human-readable summary of the comparison.
 */
function buildComparisonSummary(thisYear, lastYear, tempDiff, precipDiff, rainyDaysDiff) {
  const parts = []

  // Helper to format numbers to 1 decimal place
  const fmt = (val) => Number(val.toFixed(1))

  // Temperature comparison
  if (Math.abs(tempDiff) >= 1) {
    const direction = tempDiff > 0 ? 'warmer' : 'cooler'
    parts.push(`${fmt(Math.abs(tempDiff))}°C ${direction} than last year`)
  } else {
    parts.push('temperatures are similar to last year')
  }

  // Precipitation comparison
  if (Math.abs(precipDiff) >= 20) {
    const direction = precipDiff > 0 ? 'more' : 'less'
    parts.push(`${fmt(Math.abs(precipDiff))}mm ${direction} rainfall`)
  }

  // Rainy days comparison
  if (Math.abs(rainyDaysDiff) >= 3) {
    const direction = rainyDaysDiff > 0 ? 'more' : 'fewer'
    parts.push(`${Math.abs(rainyDaysDiff)} ${direction} rainy days`)
  }

  return parts.length > 0 ? parts.join(', ') : 'Weather patterns are similar to last year'
}


// ─── Hourly Forecast for Specific Time Periods ──────────────────────────────
/**
 * Fetch hourly forecast data for time period queries (morning/afternoon/evening/night)
 *
 * @param {{ lat: number, lon: number, days?: number }} params
 * @returns {Promise<{ hourly: Array, timezone: string }>}
 * @throws {WeatherFetchError}
 */
export async function fetchHourlyForecast({ lat, lon, days = 2 }) {
  if (typeof lat !== 'number' || typeof lon !== 'number') {
    throw new WeatherFetchError(
      'Unable to get hourly forecast without location coordinates.'
    )
  }

  const url = new URL(OPEN_METEO_BASE)
  url.searchParams.set('latitude', String(lat))
  url.searchParams.set('longitude', String(lon))
  url.searchParams.set('hourly', [
    'temperature_2m',
    'relative_humidity_2m',
    'precipitation',
    'precipitation_probability',
    'weather_code',
    'wind_speed_10m',
    'wind_direction_10m',
  ].join(','))
  url.searchParams.set('timezone', 'auto')
  url.searchParams.set('forecast_days', String(days))
  url.searchParams.set('wind_speed_unit', 'kmh')

  let data
  try {
    const res = await fetch(url.toString())
    if (!res.ok) {
      throw new WeatherFetchError(
        `Unable to fetch hourly forecast (service error ${res.status}). Please try again.`
      )
    }
    data = await res.json()
  } catch (err) {
    if (err instanceof WeatherFetchError) throw err
    throw new WeatherFetchError(
      'Cannot connect to weather service for hourly data. Check your connection.'
    )
  }

  const hourly = data?.hourly
  const timezone = data?.timezone

  if (!hourly || !hourly.time) {
    throw new WeatherFetchError(
      'Weather service returned incomplete hourly data. Please try again.'
    )
  }

  // Transform to array of hourly objects
  const hourlyArray = hourly.time.map((time, i) => ({
    time,
    temperature_2m: hourly.temperature_2m?.[i],
    relative_humidity_2m: hourly.relative_humidity_2m?.[i],
    precipitation: hourly.precipitation?.[i],
    precipitation_probability: hourly.precipitation_probability?.[i],
    weather_code: hourly.weather_code?.[i],
    wind_speed_10m: hourly.wind_speed_10m?.[i],
    wind_direction_10m: hourly.wind_direction_10m?.[i],
  }))

  return {
    hourly: hourlyArray,
    timezone: timezone || 'UTC',
  }
}
