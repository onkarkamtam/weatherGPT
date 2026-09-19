const BASE = process.env.CHAT_BASE || 'http://localhost:5173'

function weatherPrompt(langLine, location, t, forecastLines) {
  return `You are WeatherGPT — a friendly, trustworthy Indian weather assistant helping users in ${location}.
${langLine}

=== VERIFIED LIVE WEATHER DATA FOR ${location.toUpperCase()} ===
TODAY (current conditions):
  Sky:           ${t.condition}
  Temperature:   ${t.temp}°C  (feels like ${t.feelsLike}°C)
  Range today:   ${t.tempMin}°C to ${t.tempMax}°C
  Humidity:      ${t.humidity}%
  Wind:          ${t.wind} km/h ${t.windDir}
  Rain chance:   ${t.rainChance}%
  Precipitation: ${t.precipMm} mm

FORECAST:
${forecastLines}
=== END OF VERIFIED WEATHER DATA ===

STRICT RULES — follow without exception:
1. Use ONLY the values above for any weather claim. Never estimate or fabricate figures.
2. Do NOT say you cannot access real-time data.
3. Give one clear actionable recommendation.
4. Be concise — 2 to 4 sentences maximum.
5. LANGUAGE: The verified weather block is in English on purpose. Reply in the required language.`
}

async function postChat(userMessage, systemPrompt) {
  const t0 = Date.now()
  const res = await fetch(`${BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userMessage, history: [], systemPrompt }),
  })
  const body = await res.json().catch(() => ({}))
  return { status: res.status, elapsedMs: Date.now() - t0, body }
}

const health = await fetch(`${BASE}/api/health`).then((r) => r.json())
console.log('HEALTH', JSON.stringify(health))

const simple = await postChat('Say hello in one short sentence.', 'You are WeatherGPT. Reply in English.')
console.log('SIMPLE', simple.status, simple.elapsedMs, simple.body.text?.slice(0, 200) || simple.body)

const wxUrl = new URL('https://api.open-meteo.com/v1/forecast')
wxUrl.searchParams.set('latitude', '25.5941')
wxUrl.searchParams.set('longitude', '85.1376')
wxUrl.searchParams.set('current', 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m')
wxUrl.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weather_code')
wxUrl.searchParams.set('timezone', 'auto')
wxUrl.searchParams.set('forecast_days', '3')
wxUrl.searchParams.set('wind_speed_unit', 'kmh')
const wx = await fetch(wxUrl).then((r) => r.json())
const t = {
  condition: 'Live',
  temp: Math.round(wx.current.temperature_2m),
  feelsLike: Math.round(wx.current.apparent_temperature),
  tempMin: Math.round(wx.daily.temperature_2m_min[0]),
  tempMax: Math.round(wx.daily.temperature_2m_max[0]),
  humidity: Math.round(wx.current.relative_humidity_2m),
  wind: Math.round(wx.current.wind_speed_10m),
  windDir: 'E',
  rainChance: Math.round(wx.daily.precipitation_probability_max[0]),
  precipMm: Math.round((wx.daily.precipitation_sum[0] ?? 0) * 10) / 10,
}
console.log('LIVE_WX', JSON.stringify(t))
const forecastLines = '  Day +1: (live)\n  Day +2: (live)'

const cases = [
  {
    name: 'MR',
    msg: 'आज छत्री घेऊन जाऊ का?',
    lang: 'Always respond in Marathi (मराठी), regardless of the language the user writes in.',
    fallbackNeedle: 'एआय उत्तर आले नाही',
  },
  {
    name: 'HI',
    msg: 'क्या आज बारिश होने की संभावना है?',
    lang: 'Always respond in Hindi (हिन्दी), regardless of the language the user writes in.',
    fallbackNeedle: 'एआई उत्तर अभी नहीं आ पाया',
  },
  {
    name: 'EN',
    msg: 'Should I carry an umbrella today?',
    lang: 'Always respond in English, regardless of the language the user writes in.',
    fallbackNeedle: 'Rain is unlikely today',
  },
]

for (const c of cases) {
  const result = await postChat(c.msg, weatherPrompt(c.lang, 'Patna', t, forecastLines))
  const text = result.body.text ?? ''
  const isFallback = text.includes(c.fallbackNeedle) || text.includes('AI service is temporarily unavailable')
  const mentionsRain = text.includes(String(t.rainChance)) || text.includes(`${t.rainChance}%`)
  console.log(
    `\n${c.name} status=${result.status} ms=${result.elapsedMs} fallback=${isFallback} mentionsRainPct=${mentionsRain}`
  )
  console.log(text)
}
