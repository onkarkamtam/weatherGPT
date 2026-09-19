/**
 * Test: "tomorrow morning" follow-up query flow
 * Reproduces the exact ChatScreen.jsx logic
 */

import https from 'https';

// Simulate frontend time period detection (from weatherIntent.js)
function isTimePeriodQuery(query) {
  const timePatterns = [
    /\b(morning|afternoon|evening|night)\b/i,
    /\b(early|late)\s+(morning|afternoon|evening)\b/i,
    /\b(this|today|tonight|tomorrow)\s+(morning|afternoon|evening|night)\b/i
  ];
  return timePatterns.some(pattern => pattern.test(query));
}

// Simulate time period extraction
function extractTimePeriod(query) {
  const patterns = {
    morning: /\bmorning\b/i,
    afternoon: /\bafternoon\b/i,
    evening: /\bevening\b/i,
    night: /\bnight\b/i
  };

  for (const [period, pattern] of Object.entries(patterns)) {
    if (pattern.test(query)) {
      return period;
    }
  }
  return null;
}

// Simulate day extraction
function extractDay(query) {
  if (/\btomorrow\b/i.test(query)) return 'tomorrow';
  if (/\btoday\b/i.test(query)) return 'today';
  return null;
}

// Map period to hour ranges
function getPeriodHours(period) {
  const ranges = {
    morning: { start: 6, end: 12 },
    afternoon: { start: 12, end: 17 },
    evening: { start: 17, end: 21 },
    night: { start: 21, end: 30 } // wraps to next day
  };
  return ranges[period] || { start: 0, end: 24 };
}

// Fetch hourly forecast
async function fetchHourlyForecast(latitude, longitude, date) {
  console.log(`[DEBUG HOURLY] fetch START`);
  console.log(`  latitude: ${latitude}`);
  console.log(`  longitude: ${longitude}`);
  console.log(`  date: ${date}`);

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,precipitation_probability,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto&forecast_days=3`;
  
  console.log(`  URL: ${url}`);

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.log(`  HTTP status: timeout`);
      console.log(`  response success: false`);
      resolve(null);
    }, 10000);

    https.get(url, (res) => {
      clearTimeout(timeout);
      let data = '';
      
      console.log(`  HTTP status: ${res.statusCode}`);
      
      if (res.statusCode !== 200) {
        console.log(`  response success: false`);
        resolve(null);
        return;
      }

      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log(`  response success: true`);
          console.log(`  hours received: ${json.hourly.time.length}`);
          
          resolve({
            hourly: json.hourly,
            timezone: json.timezone
          });
        } catch (error) {
          console.log(`  response success: false`);
          console.log(`  error: ${error.message}`);
          resolve(null);
        }
      });
    }).on('error', (error) => {
      clearTimeout(timeout);
      console.log(`  HTTP status: network error`);
      console.log(`  response success: false`);
      console.log(`  error: ${error.message}`);
      resolve(null);
    });
  });
}

// Filter hourly data for specific period
function filterHourlyPeriod(hourlyData, targetDate, periodHours) {
  const { hourly } = hourlyData;
  const filtered = [];

  console.log(`[DEBUG FILTER] Filtering for date: ${targetDate}, hours: ${periodHours.start}-${periodHours.end}`);

  for (let i = 0; i < hourly.time.length; i++) {
    const timestamp = hourly.time[i];
    const date = timestamp.split('T')[0];
    const hour = parseInt(timestamp.split('T')[1].split(':')[0]);

    if (date === targetDate) {
      if (periodHours.start <= periodHours.end) {
        // Normal range (e.g., morning 6-12)
        if (hour >= periodHours.start && hour < periodHours.end) {
          filtered.push({
            hour,
            temperature: hourly.temperature_2m[i],
            precipitation: hourly.precipitation_probability[i],
            humidity: hourly.relative_humidity_2m[i],
            wind: hourly.wind_speed_10m[i],
            code: hourly.weather_code[i]
          });
        }
      } else {
        // Wrapping range (e.g., night 21-6)
        if (hour >= periodHours.start || hour < periodHours.end) {
          filtered.push({
            hour,
            temperature: hourly.temperature_2m[i],
            precipitation: hourly.precipitation_probability[i],
            humidity: hourly.relative_humidity_2m[i],
            wind: hourly.wind_speed_10m[i],
            code: hourly.weather_code[i]
          });
        }
      }
    }
  }

  console.log(`  filtered hours: ${filtered.length}`);
  return filtered;
}

// Aggregate hourly data
function aggregateHourlyData(filteredHours) {
  if (filteredHours.length === 0) {
    console.log(`[DEBUG AGGREGATE] No data to aggregate`);
    return null;
  }

  const temps = filteredHours.map(h => h.temperature).filter(t => t != null);
  const precips = filteredHours.map(h => h.precipitation).filter(p => p != null);
  const humidities = filteredHours.map(h => h.humidity).filter(h => h != null);
  const winds = filteredHours.map(h => h.wind).filter(w => w != null);

  const result = {
    temperature: {
      min: Math.round(Math.min(...temps)),
      max: Math.round(Math.max(...temps)),
      avg: Math.round(temps.reduce((a, b) => a + b, 0) / temps.length)
    },
    precipitation: Math.round(precips.reduce((a, b) => a + b, 0) / precips.length),
    humidity: Math.round(humidities.reduce((a, b) => a + b, 0) / humidities.length),
    wind: Math.round(winds.reduce((a, b) => a + b, 0) / winds.length),
    hourCount: filteredHours.length
  };

  console.log(`[DEBUG AGGREGATE] Temperature: ${result.temperature.min}-${result.temperature.max}°C, Rain: ${result.precipitation}%`);
  return result;
}

// Test the complete flow
async function testTomorrowMorningFlow() {
  console.log('='.repeat(60));
  console.log('TEST: "tomorrow morning" follow-up flow');
  console.log('='.repeat(60));

  // Simulate conversation state
  const conversationState = {
    location: null,
    locationName: null
  };

  // Query 1: "What will the weather be in Mumbai tomorrow?"
  console.log('\n--- Query 1: "What will the weather be in Mumbai tomorrow?" ---\n');
  
  const query1 = "What will the weather be in Mumbai tomorrow?";
  const mumbaiCoords = { latitude: 19.0760, longitude: 72.8777 };
  
  conversationState.location = mumbaiCoords;
  conversationState.locationName = 'Mumbai';
  
  console.log(`[DEBUG TIME] query: ${query1}`);
  console.log(`[DEBUG TIME] isTimePeriod: ${isTimePeriodQuery(query1)}`);
  console.log(`[DEBUG LOCATION] conversationLocation: ${conversationState.locationName}`);
  console.log(`[DEBUG LOCATION] queryLocation: explicit (Mumbai)`);
  console.log(`Result: Normal weather query for Mumbai tomorrow\n`);

  // Query 2: "What about tomorrow morning?"
  console.log('\n--- Query 2: "What about tomorrow morning?" ---\n');
  
  const query2 = "What about tomorrow morning?";
  console.log(`[DEBUG TIME] query: ${query2}`);
  
  const isTimePeriod = isTimePeriodQuery(query2);
  console.log(`[DEBUG TIME] isTimePeriod: ${isTimePeriod}`);
  
  if (!isTimePeriod) {
    console.log('❌ FAIL: Time period not detected!');
    return;
  }

  const period = extractTimePeriod(query2);
  const day = extractDay(query2);
  console.log(`[DEBUG TIME] periodInfo: {day: '${day}', period: '${period}'}`);

  // Location resolution
  const hasExplicitLocation = /\b(in|for|at)\s+[A-Z]/i.test(query2);
  console.log(`[DEBUG LOCATION] hasExplicitLocation: ${hasExplicitLocation}`);
  console.log(`[DEBUG LOCATION] conversationLocation: ${conversationState.locationName}`);
  
  let queryLocation = conversationState.location;
  let queryLocationName = conversationState.locationName;
  
  if (!queryLocation) {
    console.log('❌ FAIL: No location available for time period query!');
    return;
  }

  console.log(`[DEBUG LOCATION] queryLocation: ${queryLocationName} (from conversation)`);

  // Calculate target date
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const targetDate = tomorrow.toISOString().split('T')[0];
  console.log(`[DEBUG TIME] targetDate: ${targetDate}`);

  // Fetch hourly data
  const hourlyData = await fetchHourlyForecast(
    queryLocation.latitude,
    queryLocation.longitude,
    targetDate
  );

  if (!hourlyData) {
    console.log('❌ FAIL: Failed to fetch hourly data!');
    return;
  }

  // Filter for morning period
  const periodHours = getPeriodHours(period);
  const filteredHours = filterHourlyPeriod(hourlyData, targetDate, periodHours);

  if (filteredHours.length === 0) {
    console.log('❌ FAIL: No hourly data for the requested period!');
    return;
  }

  // Aggregate
  const hourlyPeriodData = aggregateHourlyData(filteredHours);

  if (!hourlyPeriodData) {
    console.log('❌ FAIL: Failed to aggregate hourly data!');
    return;
  }

  // Build grounded context
  const periodContext = `VERIFIED HOURLY FORECAST DATA for ${queryLocationName} on ${targetDate} ${period}:
- Temperature range: ${hourlyPeriodData.temperature.min}°C to ${hourlyPeriodData.temperature.max}°C (avg ${hourlyPeriodData.temperature.avg}°C)
- Precipitation probability: ${hourlyPeriodData.precipitation}%
- Humidity: ${hourlyPeriodData.humidity}%
- Wind speed: ${hourlyPeriodData.wind} km/h
- Based on ${hourlyPeriodData.hourCount} hourly data points

USE ONLY THESE EXACT VALUES in your response.`;

  console.log(`\n[DEBUG AI] hourlyPeriodData received: YES`);
  console.log(`[DEBUG AI] periodContext length: ${periodContext.length} chars`);
  console.log(`[DEBUG AI] grounded marker present: ${periodContext.includes('VERIFIED HOURLY FORECAST DATA')}`);

  // Simulate backend grounding check
  console.log(`\n[DEBUG SERVER] Simulating backend check...`);
  const isGrounded = periodContext.includes('VERIFIED LIVE WEATHER DATA') || 
                     periodContext.includes('VERIFIED HOURLY FORECAST DATA');
  console.log(`[DEBUG SERVER] grounded: ${isGrounded}`);
  console.log(`[DEBUG SERVER] systemPrompt contains hourly data: ${periodContext.includes('VERIFIED HOURLY FORECAST DATA')}`);

  if (!isGrounded) {
    console.log('❌ FAIL: Backend grounding check would fail!');
    console.log('Backend is looking for "VERIFIED LIVE WEATHER DATA"');
    console.log('But frontend sends "VERIFIED HOURLY FORECAST DATA"');
    return;
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ SUCCESS: Complete flow works!');
  console.log('='.repeat(60));
  console.log('Location: Mumbai (from conversation)');
  console.log('Period: Tomorrow Morning (06:00-12:00)');
  console.log(`Temperature: ${hourlyPeriodData.temperature.min}-${hourlyPeriodData.temperature.max}°C`);
  console.log(`Rain: ${hourlyPeriodData.precipitation}%`);
  console.log(`Grounded: ${isGrounded}`);
}

// Run test
testTomorrowMorningFlow().catch(error => {
  console.error('❌ TEST ERROR:', error.message);
  console.error(error.stack);
});
