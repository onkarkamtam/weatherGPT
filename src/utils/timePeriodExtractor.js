/**
 * timePeriodExtractor.js — Extracts time period mentions from user queries
 * 
 * Detects specific time periods like "tomorrow morning", "today afternoon", etc.
 * to enable hourly weather forecast lookups instead of generic daily forecasts.
 */

// Time period definitions (24-hour format)
export const TIME_PERIODS = {
  morning:   { start: 6,  end: 12, label: 'Morning'   },
  afternoon: { start: 12, end: 17, label: 'Afternoon' },
  evening:   { start: 17, end: 21, label: 'Evening'   },
  night:     { start: 21, end: 6,  label: 'Night'     }, // Wraps around midnight
}

// Pattern matchers for different languages
const PERIOD_PATTERNS = {
  // English
  en: {
    morning:   /\b(morning|सुबह|सकाळ|ఉదయం|காலை|সকাল)\b/i,
    afternoon: /\b(afternoon|दोपहर|दुपार|మధ్యాహ్నం|மதியம்|দুপুর)\b/i,
    evening:   /\b(evening|शाम|संध्याकाळ|సాయంత్రం|மாலை|সন্ধ্যা)\b/i,
    night:     /\b(night|रात|रात्र|రాత్రి|இரவு|রাত)\b/i,
  },
}

// Day markers
const DAY_PATTERNS = {
  today:    /\b(today|आज|आज|ఈరోజు|இன்று|আজ)\b/i,
  tomorrow: /\b(tomorrow|कल|उद्या|రేపు|நாளை|আগামীকাল)\b/i,
}

/**
 * Extracts time period and day from user query
 * 
 * @param {string} query - User's message
 * @returns {Object|null} - { day: 'today'|'tomorrow', period: 'morning'|'afternoon'|'evening'|'night' } or null
 */
export function extractTimePeriod(query) {
  if (!query || typeof query !== 'string') return null
  
  const normalized = query.trim().toLowerCase()
  
  // Detect day (today/tomorrow)
  let day = null
  if (DAY_PATTERNS.today.test(normalized)) {
    day = 'today'
  } else if (DAY_PATTERNS.tomorrow.test(normalized)) {
    day = 'tomorrow'
  }
  
  // Detect period (morning/afternoon/evening/night)
  let period = null
  for (const [periodName, pattern] of Object.entries(PERIOD_PATTERNS.en)) {
    if (pattern.test(normalized)) {
      period = periodName
      break
    }
  }
  
  // If we found a period but no explicit day, assume "today" for current queries,
  // or infer from context (e.g., "what about morning" in isolation defaults to tomorrow)
  if (period && !day) {
    // Check if query is a follow-up (contains "what about", "how about")
    if (/\b(what|how)\s+(about|of)\b/i.test(normalized)) {
      // Follow-up likely refers to next period, assume tomorrow
      day = 'tomorrow'
    } else {
      // Direct question without day marker - assume today
      day = 'today'
    }
  }
  
  // Return null if neither day nor period detected
  if (!day && !period) return null
  
  return { day, period }
}

/**
 * Checks if query mentions a specific time period
 * 
 * @param {string} query - User's message
 * @returns {boolean}
 */
export function hasTimePeriod(query) {
  return extractTimePeriod(query) !== null
}

/**
 * Get hour range for a given time period
 * 
 * @param {string} period - 'morning'|'afternoon'|'evening'|'night'
 * @returns {Object} - { start: number, end: number, label: string }
 */
export function getPeriodHours(period) {
  return TIME_PERIODS[period] || null
}

/**
 * Filter hourly forecast data for a specific time period
 * 
 * @param {Array} hourlyData - Array of hourly forecast objects with 'time' field
 * @param {string} targetDate - ISO date string (YYYY-MM-DD)
 * @param {string} period - 'morning'|'afternoon'|'evening'|'night'
 * @returns {Array} - Filtered hourly data for the period
 */
export function filterHourlyByPeriod(hourlyData, targetDate, period) {
  if (!hourlyData || !Array.isArray(hourlyData) || !targetDate || !period) {
    return []
  }
  
  const periodDef = TIME_PERIODS[period]
  if (!periodDef) return []
  
  return hourlyData.filter(hour => {
    try {
      const hourTime = new Date(hour.time)
      const hourDate = hourTime.toISOString().split('T')[0]
      const hourOfDay = hourTime.getHours()
      
      // Check if hour belongs to target date
      if (hourDate !== targetDate) return false
      
      // Check if hour falls within period
      if (period === 'night') {
        // Night wraps around midnight: 21:00-23:59 OR 00:00-05:59
        return hourOfDay >= periodDef.start || hourOfDay < periodDef.end
      } else {
        // Regular period: start <= hour < end
        return hourOfDay >= periodDef.start && hourOfDay < periodDef.end
      }
    } catch (error) {
      return false
    }
  })
}

/**
 * Calculate average/aggregate values for a time period from hourly data
 * 
 * @param {Array} periodHours - Filtered hourly data for the period
 * @returns {Object} - Aggregated values
 */
export function aggregatePeriodData(periodHours) {
  if (!periodHours || periodHours.length === 0) {
    return null
  }
  
  // Calculate averages
  const temps = periodHours.map(h => h.temperature_2m).filter(t => t != null)
  const humidity = periodHours.map(h => h.relative_humidity_2m).filter(h => h != null)
  const wind = periodHours.map(h => h.wind_speed_10m).filter(w => w != null)
  const precip = periodHours.map(h => h.precipitation).filter(p => p != null)
  const precipProb = periodHours.map(h => h.precipitation_probability).filter(p => p != null)
  const weatherCodes = periodHours.map(h => h.weather_code).filter(c => c != null)
  
  if (temps.length === 0) return null
  
  const avgTemp = Math.round(temps.reduce((sum, t) => sum + t, 0) / temps.length)
  const minTemp = Math.round(Math.min(...temps))
  const maxTemp = Math.round(Math.max(...temps))
  const avgHumidity = Math.round(humidity.reduce((sum, h) => sum + h, 0) / humidity.length)
  const avgWind = Math.round(wind.reduce((sum, w) => sum + w, 0) / wind.length)
  const totalPrecip = Math.round(precip.reduce((sum, p) => sum + p, 0) * 10) / 10
  const maxPrecipProb = precipProb.length > 0 ? Math.max(...precipProb) : 0
  
  // Use most common weather code
  const codeFreq = {}
  weatherCodes.forEach(code => {
    codeFreq[code] = (codeFreq[code] || 0) + 1
  })
  const mostCommonCode = Object.entries(codeFreq)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || weatherCodes[0] || 0
  
  return {
    temperature: avgTemp,
    minTemperature: minTemp,
    maxTemperature: maxTemp,
    humidity: avgHumidity,
    windSpeed: avgWind,
    precipitation: totalPrecip,
    precipitationProbability: Math.round(maxPrecipProb),
    weatherCode: parseInt(mostCommonCode),
    hoursAnalyzed: periodHours.length,
  }
}
