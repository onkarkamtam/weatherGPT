/**
 * Test harness to reproduce "tomorrow morning" flow
 * Simulates the exact frontend logic without browser
 */

import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Simulate frontend functions
async function isTimePeriodQuery(text) {
  const periodPatterns = /\b(morning|afternoon|evening|night|सुबह|दोपहर|शाम|रात|सकाळ|दुपार|संध्याकाळ|रात्र)\b/i
  return periodPatterns.test(text.toLowerCase())
}

function extractTimePeriod(text) {
  const normalized = text.trim().toLowerCase()
  
  const dayPatterns = {
    today: /\b(today|आज|आज)\b/i,
    tomorrow: /\b(tomorrow|कल|उद्या)\b/i,
  }
  
  const periodPatterns = {
    morning: /\b(morning|सुबह|सकाळ)\b/i,
    afternoon: /\b(afternoon|दोपहर|दुपार)\b/i,
    evening: /\b(evening|शाम|संध्याकाळ)\b/i,
    night: /\b(night|रात|रात्र)\b/i,
  }
  
  let day = null
  if (dayPatterns.today.test(normalized)) day = 'today'
  else if (dayPatterns.tomorrow.test(normalized)) day = 'tomorrow'
  else if (/\b(what|how)\s+(about|of)\b/i.test(normalized)) day = 'tomorrow'
  else day = 'today'
  
  let period = null
  for (const [periodName, pattern] of Object.entries(periodPatterns)) {
    if (pattern.test(normalized)) {
      period = periodName
      break
    }
  }
  
  if (!period) return null
  
  return { day, period }
}

async function fetchHourlyForecast({ lat, lon, days = 2 }) {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
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

  console.log('[DEBUG HOURLY] Fetch URL:', url.toString())
  
  const res = await fetch(url.toString())
  console.log('[DEBUG HOURLY] HTTP Status:', res.status)
  
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }
  
  const data = await res.json()
  console.log('[DEBUG HOURLY] Response keys:', Object.keys(data))
  console.log('[DEBUG HOURLY] Hourly data length:', data.hourly?.time?.length)
  
  const hourly = data?.hourly
  const timezone = data?.timezone

  if (!hourly || !hourly.time) {
    throw new Error('Incomplete hourly data')
  }

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

function filterHourlyByPeriod(hourlyData, targetDate, period) {
  const TIME_PERIODS = {
    morning: { start: 6, end: 12 },
    afternoon: { start: 12, end: 17 },
    evening: { start: 17, end: 21 },
    night: { start: 21, end: 6 },
  }
  
  const periodDef = TIME_PERIODS[period]
  if (!periodDef) return []
  
  return hourlyData.filter(hour => {
    try {
      const hourTime = new Date(hour.time)
      const hourDate = hourTime.toISOString().split('T')[0]
      const hourOfDay = hourTime.getHours()
      
      if (hourDate !== targetDate) return false
      
      if (period === 'night') {
        return hourOfDay >= periodDef.start || hourOfDay < periodDef.end
      } else {
        return hourOfDay >= periodDef.start && hourOfDay < periodDef.end
      }
    } catch (error) {
      return false
    }
  })
}

function aggregatePeriodData(periodHours) {
  if (!periodHours || periodHours.length === 0) return null
  
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

// Test the flow
async function testHourlyFlow() {
  console.log('========== TESTING HOURLY FLOW ==========\n')
  
  // Simulate Mumbai location
  const mumbaiLocation = {
    label: 'Mumbai, Maharashtra, India',
    lat: 19.0760,
    lon: 72.8777
  }
  
  const query = 'What about tomorrow morning?'
  
  console.log('[DEBUG TIME] Query:', query)
  
  const isTimePeriod = await isTimePeriodQuery(query)
  console.log('[DEBUG TIME] isTimePeriod:', isTimePeriod)
  
  if (!isTimePeriod) {
    console.log('❌ FAIL: Query not detected as time period')
    return
  }
  
  const periodInfo = extractTimePeriod(query)
  console.log('[DEBUG TIME] periodInfo:', periodInfo)
  
  if (!periodInfo) {
    console.log('❌ FAIL: Could not extract period info')
    return
  }
  
  console.log('[DEBUG TIME] conversationLocation:', mumbaiLocation.label)
  console.log('[DEBUG TIME] queryLocation:', mumbaiLocation.label, mumbaiLocation.lat, mumbaiLocation.lon)
  
  const needsHourlyFetch = isTimePeriod && mumbaiLocation?.lat
  console.log('[DEBUG TIME] needsHourlyFetch:', needsHourlyFetch)
  
  if (!needsHourlyFetch) {
    console.log('❌ FAIL: needsHourlyFetch is false')
    return
  }
  
  console.log('\n[DEBUG HOURLY] Fetching hourly forecast...')
  console.log('[DEBUG HOURLY] latitude:', mumbaiLocation.lat)
  console.log('[DEBUG HOURLY] longitude:', mumbaiLocation.lon)
  console.log('[DEBUG HOURLY] days: 2')
  
  try {
    const hourlyResult = await fetchHourlyForecast({
      lat: mumbaiLocation.lat,
      lon: mumbaiLocation.lon,
      days: 2,
    })
    
    console.log('[DEBUG HOURLY] Fetch SUCCESS')
    console.log('[DEBUG HOURLY] Hours received:', hourlyResult.hourly.length)
    console.log('[DEBUG HOURLY] Timezone:', hourlyResult.timezone)
    
    // Calculate target date
    const today = new Date()
    const targetDate = periodInfo.day === 'tomorrow' 
      ? new Date(today.getTime() + 24 * 60 * 60 * 1000)
      : today
    const targetDateStr = targetDate.toISOString().split('T')[0]
    
    console.log('\n[DEBUG FILTER] Target date:', targetDateStr)
    console.log('[DEBUG FILTER] Period:', periodInfo.period)
    
    const periodHours = filterHourlyByPeriod(
      hourlyResult.hourly,
      targetDateStr,
      periodInfo.period
    )
    
    console.log('[DEBUG FILTER] Filtered hours:', periodHours.length)
    
    if (periodHours.length === 0) {
      console.log('❌ FAIL: No hours found for period')
      console.log('Sample hourly times:', hourlyResult.hourly.slice(0, 5).map(h => h.time))
      return
    }
    
    console.log('[DEBUG FILTER] Sample filtered times:', periodHours.slice(0, 3).map(h => h.time))
    
    const aggregated = aggregatePeriodData(periodHours)
    console.log('\n[DEBUG AGGREGATE] Result:', aggregated)
    
    if (!aggregated) {
      console.log('❌ FAIL: Aggregation returned null')
      return
    }
    
    const hourlyPeriodData = {
      location: mumbaiLocation,
      period: periodInfo,
      periodLabel: 'Morning',
      day: periodInfo.day,
      ...aggregated,
      condition: 'Clear',
      conditionCode: 'clear',
      severity: 'none',
    }
    
    console.log('\n[DEBUG AI] hourlyPeriodData prepared:', {
      location: hourlyPeriodData.location.label,
      period: hourlyPeriodData.period,
      temperature: hourlyPeriodData.temperature,
      precipitationProbability: hourlyPeriodData.precipitationProbability,
    })
    
    const dayLabel = hourlyPeriodData.day === 'tomorrow' ? 'Tomorrow' : 'Today'
    const fullPeriodLabel = `${dayLabel} ${hourlyPeriodData.periodLabel}`
    
    const periodContext = `
VERIFIED HOURLY FORECAST DATA FOR ${fullPeriodLabel.toUpperCase()} IN ${mumbaiLocation.label.toUpperCase()}:

Temperature: ${hourlyPeriodData.minTemperature}°C - ${hourlyPeriodData.maxTemperature}°C (avg ${hourlyPeriodData.temperature}°C)
Condition: ${hourlyPeriodData.condition}
Precipitation probability: ${hourlyPeriodData.precipitationProbability}%
Humidity: ${hourlyPeriodData.humidity}%
Wind speed: ${hourlyPeriodData.windSpeed} km/h
Period: ${fullPeriodLabel}`.trim()
    
    console.log('\n[DEBUG AI] periodContext length:', periodContext.length)
    console.log('[DEBUG AI] Contains "VERIFIED HOURLY FORECAST DATA":', periodContext.includes('VERIFIED HOURLY FORECAST DATA'))
    console.log('[DEBUG AI] Sample context:', periodContext.substring(0, 150) + '...')
    
    console.log('\n✅ SUCCESS: Hourly flow complete')
    console.log('Final period data ready for Gemini')
    
  } catch (err) {
    console.log('\n❌ FAIL: Hourly fetch error:', err.message)
    console.log('Error stack:', err.stack)
  }
}

testHourlyFlow().catch(console.error)
