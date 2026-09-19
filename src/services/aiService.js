/**
 * aiService.js — Frontend Gemini client. No API keys here.
 * All calls go to POST /api/chat (Express proxy — key lives server-side only).
 *
 * Exports:
 *   buildGroundedSystemPrompt(location, weatherContext, langPreference) → string
 *   askGemini({ userMessage, history, systemPrompt })                   → Promise<string>
 *
 * Grounding principle: real weather data injected as a verified fact block.
 * Gemini is explicitly instructed never to invent values beyond what is provided.
 *
 * Phase 4+: add structured output (JSON mode) for machine-readable responses.
 */
import { supabaseClient } from '@/lib/supabase'

const CHAT_ENDPOINT    = '/api/chat'
// Marathi grounded replies on gemini-3.6-flash measured ~11s with a 450-token cap
// (thinking + generation). 15s left little headroom and aborted into fallback.
const REQUEST_TIMEOUT  = 30_000

/**
 * Custom error type — distinguishes AI failures from weather/network errors.
 */
export class AIServiceError extends Error {
  constructor(message) {
    super(message)
    this.name = 'AIServiceError'
  }
}

// ─── Language instruction map ─────────────────────────────────────────────────
const LANG_INSTRUCTIONS = {
  auto: `Reply-language (Auto): detect the language of the user's LATEST message and write ALL conversational prose in that same language (Marathi, Hindi, Tamil, Telugu, Bengali, English, or another language they used). Script is a strong signal — Devanagari Marathi must be answered in Marathi, Devanagari Hindi in Hindi. Do NOT switch to English just because this prompt or the weather fact block is in English.`,
  en:   'Always respond in English, regardless of the language the user writes in.',
  hi:   'Always respond in Hindi (हिन्दी), regardless of the language the user writes in.',
  ta:   'Always respond in Tamil (தமிழ்), regardless of the language the user writes in.',
  te:   'Always respond in Telugu (తెలుగు), regardless of the language the user writes in.',
  bn:   'Always respond in Bengali (বাংলা), regardless of the language the user writes in.',
  mr:   'Always respond in Marathi (मराठी), regardless of the language the user writes in.',
}

// ─── Grounded system prompt builder ──────────────────────────────────────────
/**
 * Builds the system prompt that grounds Gemini in verified weather facts.
 * Weather data is injected as a structured block; Gemini cannot invent beyond it.
 *
 * @param {{ label: string }}                                              location
 * @param {{ today: object, forecast: object[] } | null}                  weatherContext
 * @param {'auto'|'en'|'hi'|'ta'|'te'|'bn'|'mr'}                         langPreference
 * @param {string|null}                                                   customContext - Optional custom verified data block (e.g. hourly period data)
 * @returns {string}
 */
export function buildGroundedSystemPrompt(location, weatherContext, langPreference = 'auto', customContext = null) {
  const langInstruction = LANG_INSTRUCTIONS[langPreference] ?? LANG_INSTRUCTIONS.auto
  // Guard: location may be null if React Router state was lost (e.g. hard refresh).
  // Use a safe label so the function never throws a TypeError.
  const locationLabel = location?.label ?? 'your area'

  let weatherSection = ''

  // If custom context provided (e.g. hourly period data), use it instead of weatherContext
  if (customContext) {
    weatherSection = `
${customContext}

STRICT RULES — follow without exception:
1. Use ONLY the values above for any weather claim. Never estimate, round differently, or fabricate figures.
2. The user will SEE a visual weather card displaying the forecast data shown above.
3. DO NOT restate these exact numbers in your reply — the user can already see them on the card.
4. Instead, give ONE clear actionable recommendation based on the conditions (umbrella? safe to travel? good for outdoor activity? clothing advice?).
5. Be concise — 2 to 4 sentences maximum. No bullet lists unless the user explicitly asks for details.
6. If asked about data not in the block (e.g. specific hours outside the period, next week), say honestly that you don't have that detail right now.
7. Do NOT say you cannot access real-time data — you HAVE received current data above.
8. LANGUAGE: The verified weather block above is in English (internal grounding only). Translate condition labels naturally in your reply language, but never change the numeric facts if you reference them.
9. DECISION FORMAT: For decision questions ("Should I…?", "Can I…?", "Is it safe…?", "Is it suitable…?"):
   • Open with a clear verdict: Yes / No / With caution — and ONE short weather-based reason.
   • Optionally add 1 sentence of practical advice.
   • Total: 2–3 sentences. No long explanations.
   Example: "Yes, cycling looks good for tomorrow morning — rain chance is low and the weather is calm. Carry water as it may feel warm."
10. AVOID: Do not say "The temperature is X and humidity is Y" — that repeats the card. Instead say "It feels warm" or "Conditions are cool" or focus on the impact ("You'll stay dry", "Expect hot sun", "Roads may be wet").
11. PROBABILISTIC LANGUAGE: Weather forecasts are inherently uncertain. Use appropriate conditional language:
   • For rain probability 70%+: "Rain is very likely" or "There's a high chance of rain" (NOT "It will definitely rain")
   • For rain probability 40-69%: "Rain is possible" or "There's a moderate chance"
   • For rain probability <40%: "Rain is unlikely" or "Low chance of rain"
   • Never use "definitely", "certainly", "guaranteed" for weather predictions
   • For recommendations: "would be advisable", "recommended", "consider bringing" (NOT "definitely bring", "must carry")
12. DATA ACCURACY: When referencing weather values, use EXACTLY the numbers from the verified data block above. If the card shows 88% rain chance, you must also say 88%, not 98% or any other rounded value. The card and your response must be perfectly consistent.
`
  } else if (weatherContext?.today) {
    const t = weatherContext.today
    const forecastLines = (weatherContext.forecast ?? [])
      .map((day, i) =>
        `  Day +${i + 1} (${day.date}): ${day.condition}, ${day.tempMin}°C–${day.tempMax}°C, Rain: ${day.rainChance}%`
      )
      .join('\n')
    
    // Alert context for AI
    const alertContext = t.alert ? `
⚠️ ACTIVE WEATHER ALERT:
  Type: ${t.alert.type.toUpperCase()}
  Title: ${t.alert.title}
  Message: ${t.alert.message}
  
  The user will SEE this alert prominently displayed above your response.
  You should acknowledge the alert in your answer and provide relevant context or advice.
  Keep your alert-related advice brief since detailed recommendations are already shown.
` : ''

    weatherSection = `
=== VERIFIED LIVE WEATHER DATA FOR ${locationLabel.toUpperCase()} ===
Data fetched: ${new Date(t.fetchedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

TODAY (current conditions):
  Sky:           ${t.condition}
  Severity:      ${t.severity ?? 'none'}
  Temperature:   ${t.temp}°C  (feels like ${t.feelsLike}°C)
  Range today:   ${t.tempMin}°C to ${t.tempMax}°C
  Humidity:      ${t.humidity}%
  Wind:          ${t.wind} km/h ${t.windDir}
  Rain chance:   ${t.rainChance}%
  Precipitation: ${t.precipMm} mm
${alertContext}
FORECAST:
${forecastLines || '  No multi-day forecast available.'}
=== END OF VERIFIED WEATHER DATA ===

STRICT RULES — follow without exception:
1. Use ONLY the values above for any weather claim. Never estimate, round differently, or fabricate figures.
2. The user will SEE a visual weather card displaying: temperature (${t.temp}°C), feels like (${t.feelsLike}°C), humidity (${t.humidity}%), wind (${t.wind} km/h), and rain chance (${t.rainChance}%).
3. DO NOT restate these exact numbers in your reply — the user can already see them on the card.
4. Instead, give ONE clear actionable recommendation based on the conditions (umbrella? safe to travel? good for outdoor activity? clothing advice?).
5. Be concise — 2 to 4 sentences maximum. No bullet lists unless the user explicitly asks for details.
6. If asked about data not in the block (e.g. specific hours, next week), say honestly that you don't have that detail right now.
7. Do NOT say you cannot access real-time data — you HAVE received current data above.
8. LANGUAGE: The verified weather block above is in English (internal grounding only). Translate condition labels naturally in your reply language, but never change the numeric facts if you reference them.
9. DECISION FORMAT: For decision questions ("Should I…?", "Can I…?", "Is it safe…?", "Is it suitable…?"):
   • Open with a clear verdict: Yes / No / With caution — and ONE short weather-based reason.
   • Optionally add 1 sentence of practical advice.
   • Total: 2–3 sentences. No long explanations.
   Example: "Yes, cycling looks good today — rain chance is low and the weather is calm. Carry water as it may feel warm."
10. AVOID: Do not say "The temperature is X and humidity is Y" — that repeats the card. Instead say "It feels warm" or "Conditions are cool" or focus on the impact ("You'll stay dry", "Expect hot sun", "Roads may be wet").
11. PROBABILISTIC LANGUAGE: Weather forecasts are inherently uncertain. Use appropriate conditional language:
   • For rain probability 70%+: "Rain is very likely" or "There's a high chance of rain" (NOT "It will definitely rain")
   • For rain probability 40-69%: "Rain is possible" or "There's a moderate chance"
   • For rain probability <40%: "Rain is unlikely" or "Low chance of rain"
   • Never use "definitely", "certainly", "guaranteed" for weather predictions
   • For recommendations: "would be advisable", "recommended", "consider bringing" (NOT "definitely bring", "must carry")
12. DATA ACCURACY: When referencing weather values, use EXACTLY the numbers from the verified data block above. If the card shows 88% rain chance, you must also say 88%, not 98% or any other rounded value. The card and your response must be perfectly consistent.

SPECIALIZED DECISION SUPPORT:

🌾 FARMING & AGRICULTURE:
When asked about farming, planting, harvesting, or crop management:
• Planting: Avoid if heavy rain expected (${t.rainChance}%+ and soil waterlogging risk). Best in dry, moderate temps.
• Irrigation: Not needed if rain >40% or recent precipitation (${t.precipMm}mm). Save water resources.
• Harvesting: Avoid in rain, fog (visibility), or strong winds (${t.wind}+ km/h grain loss). Best in dry, stable conditions.
• Spraying: Avoid if wind >15 km/h (drift) or rain expected within 24hrs. Current: ${t.wind} km/h, rain ${t.rainChance}%.
• Livestock: Provide shelter if extreme heat (>${40}°C), cold (<10°C), or heavy rain. Ensure water in heat.

🚗 TRAVEL & TRANSPORTATION:
When asked about travel, driving, commuting, or journey planning:
• Road safety: Fog (${t.condition}) = slow, lights on. Heavy rain = flooded roads risk. Wind ${t.wind}+ km/h = high vehicle caution.
• Flight delays: Thunderstorms, heavy rain, strong winds likely cause delays. Check with airline.
• Long-distance: Check forecast for next 2-3 days. Avoid travel during severe weather (${t.severity}).
• Timing: Early morning fog common. Afternoon thunderstorms in monsoon. Plan accordingly.

🏃 OUTDOOR ACTIVITIES:
When asked about sports, exercise, picnics, or outdoor events:
• Exercise: Avoid peak heat (>38°C, 12-3pm). Avoid thunderstorms, heavy rain. Best: cool, dry conditions.
• Water activities: No swimming during thunderstorms, strong winds, or poor visibility.
• Sports events: Rain ${t.rainChance}%+ may affect play. Wind ${t.wind}+ km/h affects ball sports (cricket, football).
• Picnics/Camping: Rain >60% = postpone or shelter. Check for sudden weather changes in hills/coasts.`
  } else {
    // NO WEATHER DATA MODE: This is a general/non-weather query
    // Do NOT mention weather data unavailability - just be a helpful assistant
    weatherSection = ``
  }

  // Build final system prompt based on mode
  if (weatherContext?.today) {
    // WEATHER MODE: Strict grounding with weather data
    return `You are WeatherGPT — a friendly, trustworthy Indian weather assistant helping users in ${locationLabel}.
${langInstruction}
${weatherSection}`
  } else {
    // GENERAL MODE: Helpful conversational assistant
    return `You are WeatherGPT — a friendly, knowledgeable AI assistant helping users in ${locationLabel}.
${langInstruction}

You can help with:
• General knowledge questions (science, technology, education, etc.)
• Programming and coding help
• Explanations and how-to guides
• Math and problem-solving
• General conversation

Be helpful, clear, and concise. Answer questions directly without mentioning weather data availability unless the user specifically asks about weather.

If a user asks about weather conditions, temperatures, or forecasts, politely let them know you need their location to provide accurate weather information, and they should ask a weather-specific question.

If a user asks about weather on other planets or fictional scenarios, acknowledge the question honestly and explain the limitations (e.g., "I can only provide Earth weather data").`
  }
}

// ─── Gemini API caller ────────────────────────────────────────────────────────
/**
 * Sends a message to the Gemini proxy and returns the AI text response.
 *
 * @param {{
 *   userMessage: string,
 *   history:     Array<{ role: 'user'|'model', parts: Array<{ text: string }> }>,
 *   systemPrompt: string,
 *   conversationId?: string,
 *   location?: { label: string, lat: number, lon: number },
 *   enableGoogleSearch?: boolean
 * }} params
 * @returns {Promise<{ text: string, conversationId?: string }>}
 * @throws {AIServiceError}
 */
export async function askGemini({ userMessage, history, systemPrompt, conversationId, location, enableGoogleSearch = false }) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

  try {
    // Get auth token from Supabase
    let authToken = null
    if (supabaseClient?.auth) {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession()
        authToken = session?.access_token
        if (authToken) {
          console.log('[askGemini] Using authenticated session')
        } else {
          console.warn('[askGemini] No active session - messages will not persist')
        }
      } catch (authErr) {
        console.warn('[askGemini] Could not get auth token:', authErr)
        // Continue without auth token
      }
    } else {
      console.warn('[askGemini] Supabase not configured - messages will not persist')
    }

    const res = await fetch(CHAT_ENDPOINT, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` })
      },
      body:    JSON.stringify({ userMessage, history, systemPrompt, conversationId, location, enableGoogleSearch }),
      signal:  controller.signal,
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      console.error('[askGemini] HTTP', res.status, body.error ?? body)
      
      // Provide user-friendly messages based on error type
      if (res.status === 401) {
        throw new AIServiceError(
          'Your session has expired. Please log in again.'
        )
      }
      if (res.status === 429) {
        throw new AIServiceError(
          'Our AI is busy right now due to high demand. Please try again in a moment.'
        )
      }
      if (res.status >= 500) {
        throw new AIServiceError(
          'The AI service is temporarily unavailable. Please try again shortly.'
        )
      }
      throw new AIServiceError(
        body.error ?? 'Unable to get AI response right now. Please try again.'
      )
    }

    const data = await res.json()
    if (typeof data.text !== 'string' || !data.text.trim()) {
      throw new AIServiceError(
        'The AI response was empty. Please try asking your question again.'
      )
    }

    return {
      text: data.text,
      conversationId: data.conversationId
    }
  } catch (err) {
    if (err instanceof AIServiceError) throw err
    if (err.name === 'AbortError') {
      throw new AIServiceError(
        'The AI is taking longer than expected. Please try again or simplify your question.'
      )
    }
    throw new AIServiceError(
      'Cannot connect to the AI service. Check your internet connection and try again.'
    )
  } finally {
    clearTimeout(timer)
  }
}
