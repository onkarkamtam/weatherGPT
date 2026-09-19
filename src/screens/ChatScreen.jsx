/**
 * ChatScreen — Primary WeatherGPT conversational interface.
 *
 * Phase 3 changes:
 *  - Conversation history maintained via useConversation hook
 *  - Weather intent â†’ fetchWeatherContext (3-day) cached in ref â†’ AI with grounded prompt
 *  - Non-weather exact prompts â†’ existing mock responses (alert/travel/farmer cards preserved)
 *  - Free-form non-weather questions â†’ AI without weather card
 *  - SettingsPanel (language selector) behind the Header settings icon
 *  - All AI calls have a fallback — live WeatherCard always shown on weather intent
 *  - Multilingual: Indic weather keywords + language-aware Gemini/fallback replies
 *  - Indirect outdoor-decision questions also get live weather context
 *
 * Phase 4+: replace mock alert/travel/farmer responses with real AI + data.
 */
import { useState, useCallback, useRef, useEffect } from 'react'
import { useLocation as useRouterLocation, useNavigate } from 'react-router-dom'

import AppShell      from '@/components/layout/AppShell'
import Header        from '@/components/layout/Header'
import ChatFeed      from '@/components/chat/ChatFeed'
import ChatInput     from '@/components/chat/ChatInput'
import QuickPrompts  from '@/components/chat/QuickPrompts'
import SettingsPanel from '@/components/ui/SettingsPanel'
import ConversationSidebar from '@/components/sidebar/ConversationSidebar'

import { QUICK_PROMPT_RESPONSES, FALLBACK_RESPONSE } from '@/data/mockResponses'
import { fetchWeatherContext, fetchHistoricalComparison,
         WeatherFetchError }                             from '@/services/weatherService'
import { askGemini, buildGroundedSystemPrompt,
         AIServiceError }                             from '@/services/aiService'
import { fetchNWPForecast, fetchBothModels, 
         NWPServiceError }                            from '@/services/nwpService'
import { fetchClimateTrend, 
         ClimateServiceError }                        from '@/services/climateService'
import { useConversation }                            from '@/hooks/useConversation'
import { useConversations }                           from '@/hooks/useConversations'
import { getGreeting, nowTimestamp, formatDate }      from '@/utils/dateTime'
import { isWeatherIntent, isWeatherFollowUp, 
         isHistoricalWeatherIntent, isNWPIntent,
         extractNWPModel, isClimateTrendIntent,
         extractClimatePeriod, needsIMDData,
         isIMDWarningIntent, isIMDNowcastIntent,
         isIMDRainfallIntent, isTimePeriodQuery }                        from '@/utils/weatherIntent'
import { extractLocationFromQuery }                   from '@/utils/locationExtractor'
import { extractTimePeriod, filterHourlyByPeriod,
         aggregatePeriodData, getPeriodHours }        from '@/utils/timePeriodExtractor'
import { geocodePlace }                               from '@/services/locationService'
import { fetchIMDCAPWarnings, formatCAPAlertForAI }  from '@/services/imdCapService'

/** Generate unique-ish IDs for messages */
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

// â”€â”€â”€ Greeting â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function buildGreeting(locationLabel) {
  return {
    id:        'greeting',
    role:      'ai',
    text:      `${getGreeting()}! 👋 I’m **WeatherGPT**, your personal weather assistant.\n\n📍 Showing weather for **${locationLabel}** – ${formatDate()}.\n\nAsk me anything about the weather — in English or your preferred Indian language!`,
    card:      null,
    timestamp: nowTimestamp(),
  }
}

/** Settings override, else script / distinctive terms. */
function detectReplyLanguage(text, langPreference) {
  if (langPreference && langPreference !== 'auto') return langPreference

  if (/[\u0980-\u09FF]/.test(text)) return 'bn'
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta'
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te'

  const isMarathi =
    /[à¤³à¤±]/.test(text) ||
    /à¤ªà¤¾à¤Šà¤¸|à¤ªà¤¾à¤µà¤¸à¤¾|à¤¹à¤µà¤¾à¤®à¤¾à¤¨|à¤—à¤¾à¤°à¤ à¤¾|à¤›à¤¤à¥à¤°à¥€|à¤¥à¤‚à¤¡à¥€|à¤Šà¤¨|à¤µà¤¾à¤°à¤¾|à¤ªà¤¡à¥‡à¤²|à¤µà¤¾à¤¦à¤³|à¤§à¥à¤•à¥‡|à¤˜à¥‡à¤Šà¤¨|à¤œà¤¾à¤Š|à¤†à¤¹à¥‡|à¤¨à¤¾à¤¹à¥€|à¤²à¤¾à¤—à¥‡à¤²|à¤•à¤°à¤¾à¤µà¥‡|à¤•à¤°à¤¾à¤¯à¤šà¥‡|à¤œà¤¾à¤£à¥‡|à¤¯à¥‹à¤—à¥à¤¯|à¤•à¤¾|à¤¨à¤•à¥‹|à¤…à¤¸à¥‡à¤²|à¤¹à¥‹à¤ˆà¤²|à¤•à¤¸à¤¾|à¤•à¤¶à¥€|à¤•à¤¸à¥‡|à¤•à¤¾à¤¯|à¤†à¤¹à¥‡à¤¤|à¤¶à¤•à¤¤à¥‹|à¤¶à¤•à¤¤à¥‡|à¤ªà¤¾à¤¹à¤¿à¤œà¥‡|à¤œà¤¾à¤¯à¤šà¥‡|à¤¨à¥à¤¯à¤¾à¤µà¥‡|à¤–à¥‡à¤³à¥‚|à¤¸à¤«à¤°|à¤ªà¥à¤°à¤µà¤¾à¤¸|à¤¬à¤¾à¤¹à¥‡à¤°/.test(text) ||
    /\b(paus|pavas|havaaman|havaman|chatri|kaay|kasa|kase|ahe|nahi|jaau|gheun)\b/i.test(text)

  if (isMarathi) return 'mr'
  if (/[\u0900-\u097F]/.test(text)) return 'hi'
  if (/\b(barish|baarish|barsaat|barsat|mausam|garmi|thand|thandi|dhup|dhoop|chhata|chhatri|kya|hoga|rahega)\b/i.test(text)) {
    return 'hi'
  }
  return 'en'
}

const WEATHER_FAIL_FALLBACK = {
  hi: 'à¤à¤†à¤ˆ à¤‰à¤¤à¥à¤¤à¤° à¤…à¤­à¥€ à¤¨à¤¹à¥€à¤‚ à¤† à¤ªà¤¾à¤¯à¤¾, à¤²à¥‡à¤•à¤¿à¤¨ à¤¨à¥€à¤šà¥‡ à¤†à¤ªà¤•à¥‡ à¤‡à¤²à¤¾à¤•à¥‡ à¤•à¤¾ à¤²à¤¾à¤‡à¤µ à¤®à¥Œà¤¸à¤® à¤¦à¤¿à¤¯à¤¾ à¤—à¤¯à¤¾ à¤¹à¥ˆà¥¤',
  mr: 'à¤à¤†à¤¯ à¤‰à¤¤à¥à¤¤à¤° à¤†à¤²à¥‡ à¤¨à¤¾à¤¹à¥€, à¤ªà¤£ à¤–à¤¾à¤²à¥€ à¤¤à¥à¤®à¤šà¥à¤¯à¤¾ à¤­à¤¾à¤—à¤¾à¤¤à¥€à¤² à¤²à¤¾à¤‡à¤µà¥à¤¹ à¤¹à¤µà¤¾à¤®à¤¾à¤¨ à¤¦à¤¿à¤²à¥‡ à¤†à¤¹à¥‡.',
  ta: 'AI à®ªà®¤à®¿à®²à¯ à®‡à®ªà¯à®ªà¯‹à®¤à¯ à®µà®°à®µà®¿à®²à¯à®²à¯ˆ, à®†à®©à®¾à®²à¯ à®•à¯€à®´à¯‡ à®‰à®™à¯à®•à®³à¯ à®¨à¯‡à®°à®Ÿà®¿ à®µà®¾à®©à®¿à®²à¯ˆ à®‰à®³à¯à®³à®¤à¯.',
  te: 'AI à°¸à°®à°¾à°§à°¾à°¨à°‚ à°°à°¾à°²à±‡à°¦à±, à°•à°¾à°¨à±€ à°•à°¿à°‚à°¦ à°®à±€ à°ªà±à°°à°¾à°‚à°¤ à°²à±ˆà°µà± à°µà°¾à°¤à°¾à°µà°°à°£à°‚ à°‰à°‚à°¦à°¿.',
  bn: 'à¦à¦†à¦‡ à¦‰à¦¤à§à¦¤à¦° à¦†à¦¸à§‡à¦¨à¦¿, à¦¤à¦¬à§‡ à¦¨à¦¿à¦šà§‡ à¦†à¦ªà¦¨à¦¾à¦° à¦à¦²à¦¾à¦•à¦¾à¦° à¦²à¦¾à¦‡à¦­ à¦†à¦¬à¦¹à¦¾à¦“à¦¯à¦¼à¦¾ à¦¦à§‡à¦“à¦¯à¦¼à¦¾ à¦¹à¦¯à¦¼à§‡à¦›à§‡à¥¤',
}

const WEATHER_FAIL_NO_DATA = {
  en: 'Unable to get AI response right now. Weather data is also unavailable — please check your connection and try again.',
  hi: 'एआई उत्तर नहीं आ पाया। मौसम डेटा भी उपलब्ध नहीं है — कृपया अपना कनेक्शन जांचें।',
  mr: 'एआय उत्तर आले नाही. हवामान डेटा उपलब्ध नाही — कृपया तà¥?à¤®à¤े कनेक्शन तपासा.',
  ta: 'AI பதில் வரவில்லை. வானிலை தரவà¯?à®®à¯ இல்லை — உங்கள் இணைப்பை சரிபார்க்கவà¯?à®®à¯.',
  te: 'AI సమాధానం రాలేదà±?. వాతావరణ డేటా కూడా లేదà±? — మీ కనెక్షన్ తనిఖీ చేయండి.',
  bn: 'এআই উত্তর আসেনি। আবহাওয়ার তথ্যও নেই — আপনার সংযোগ পরীক্ষা করà§?à¦¨à¥¤',
}

const GENERAL_FAIL_FALLBACK = {
  en: 'Sorry, I couldn\'t process your request right now. Please try again.',
  hi: 'à¤•à¥à¤·à¤®à¤¾ à¤•à¤°à¥‡à¤‚, à¤®à¥ˆà¤‚ à¤…à¤­à¥€ à¤†à¤ªà¤•à¤¾ à¤…à¤¨à¥à¤°à¥‹à¤§ à¤¸à¤‚à¤¸à¤¾à¤§à¤¿à¤¤ à¤¨à¤¹à¥€à¤‚ à¤•à¤° à¤¸à¤•à¤¾à¥¤ à¤•à¥ƒà¤ªà¤¯à¤¾ à¤ªà¥à¤¨à¤ƒ à¤ªà¥à¤°à¤¯à¤¾à¤¸ à¤•à¤°à¥‡à¤‚à¥¤',
  mr: 'à¤®à¤¾à¤« à¤•à¤°à¤¾, à¤®à¥€ à¤†à¤¤à¥à¤¤à¤¾ à¤¤à¥à¤®à¤šà¥€ à¤µà¤¿à¤¨à¤‚à¤¤à¥€ à¤ªà¥à¤°à¤•à¥à¤°à¤¿à¤¯à¤¾ à¤•à¤°à¥‚ à¤¶à¤•à¤²à¥‹ à¤¨à¤¾à¤¹à¥€. à¤•à¥ƒà¤ªà¤¯à¤¾ à¤ªà¥à¤¨à¥à¤¹à¤¾ à¤ªà¥à¤°à¤¯à¤¤à¥à¤¨ à¤•à¤°à¤¾.',
  ta: 'à®®à®©à¯à®©à®¿à®•à¯à®•à®µà¯à®®à¯, à®‡à®ªà¯à®ªà¯‹à®¤à¯ à®‰à®™à¯à®•à®³à¯ à®•à¯‹à®°à®¿à®•à¯à®•à¯ˆà®¯à¯ˆ à®šà¯†à®¯à®²à®¾à®•à¯à®• à®®à¯à®Ÿà®¿à®¯à®µà®¿à®²à¯à®²à¯ˆ. à®®à¯€à®£à¯à®Ÿà¯à®®à¯ à®®à¯à®¯à®±à¯à®šà®¿à®•à¯à®•à®µà¯à®®à¯.',
  te: 'à°•à±à°·à°®à°¿à°‚à°šà°‚à°¡à°¿, à°‡à°ªà±à°ªà±à°¡à± à°®à±€ à°…à°­à±à°¯à°°à±à°¥à°¨à°¨à± à°ªà±à°°à°¾à°¸à±†à°¸à± à°šà±‡à°¯à°²à±‡à°•à°ªà±‹à°¯à°¾à°¨à±. à°¦à°¯à°šà±‡à°¸à°¿ à°®à°³à±à°³à±€ à°ªà±à°°à°¯à°¤à±à°¨à°¿à°‚à°šà°‚à°¡à°¿.',
  bn: 'à¦¦à§à¦ƒà¦–à¦¿à¦¤, à¦à¦–à¦¨ à¦†à¦ªà¦¨à¦¾à¦° à¦…à¦¨à§à¦°à§‹à¦§ à¦ªà§à¦°à¦•à§à¦°à¦¿à¦¯à¦¼à¦¾ à¦•à¦°à¦¤à§‡ à¦ªà¦¾à¦°à¦¿à¦¨à¦¿à¥¤ à¦†à¦¬à¦¾à¦° à¦šà§‡à¦·à§à¦Ÿà¦¾ à¦•à¦°à§à¦¨à¥¤',
}

const NEED_LOCATION_FALLBACK = {
  en: 'Weather data requires your location. Please go back and re-enter your location using GPS or a city name.',
  hi: 'à¤®à¥Œà¤¸à¤® à¤•à¥‡ à¤²à¤¿à¤ à¤¸à¥à¤¥à¤¾à¤¨ à¤šà¤¾à¤¹à¤¿à¤à¥¤ à¤µà¤¾à¤ªà¤¸ à¤œà¤¾à¤•à¤° GPS à¤¯à¤¾ à¤¶à¤¹à¤° à¤•à¤¾ à¤¨à¤¾à¤® à¤¦à¤°à¥à¤œ à¤•à¤°à¥‡à¤‚à¥¤',
  mr: 'à¤¹à¤µà¤¾à¤®à¤¾à¤¨à¤¾à¤¸à¤¾à¤ à¥€ à¤¸à¥à¤¥à¤¾à¤¨ à¤¹à¤µà¥‡ à¤†à¤¹à¥‡. à¤ªà¤°à¤¤ à¤œà¤¾à¤Šà¤¨ GPS à¤•à¤¿à¤‚à¤µà¤¾ à¤¶à¤¹à¤° à¤¨à¤¾à¤µ à¤¦à¥à¤¯à¤¾.',
  ta: 'à®µà®¾à®©à®¿à®²à¯ˆà®•à¯à®•à¯ à®‰à®™à¯à®•à®³à¯ à®‡à®Ÿà®®à¯ à®¤à¯‡à®µà¯ˆ. GPS à®…à®²à¯à®²à®¤à¯ à®¨à®•à®°à®ªà¯ à®ªà¯†à®¯à®°à¯ˆ à®‰à®³à¯à®³à®¿à®Ÿà®µà¯à®®à¯.',
  te: 'à°µà°¾à°¤à°¾à°µà°°à°£à°¾à°¨à°¿à°•à°¿ à°®à±€ à°¸à±à°¥à°¾à°¨à°‚ à°•à°¾à°µà°¾à°²à°¿. GPS à°²à±‡à°¦à°¾ à°¨à°—à°°à°‚ à°ªà±‡à°°à± à°‡à°µà±à°µà°‚à°¡à°¿.',
  bn: 'à¦†à¦¬à¦¹à¦¾à¦“à¦¯à¦¼à¦¾à¦° à¦œà¦¨à§à¦¯ à¦†à¦ªà¦¨à¦¾à¦° à¦…à¦¬à¦¸à§à¦¥à¦¾à¦¨ à¦²à¦¾à¦—à¦¬à§‡à¥¤ GPS à¦¬à¦¾ à¦¶à¦¹à¦°à§‡à¦° à¦¨à¦¾à¦® à¦¦à¦¿à¦¨à¥¤',
}

// ─── Phase 2 fallback text builder — used ONLY when Gemini fails ─────────────
// Generates a short actionable answer from raw weather data for English queries.
// For Indic languages, WEATHER_FAIL_FALLBACK is used instead.
function buildWeatherIntroText(text, weatherData, locationLabel) {
  const { condition, temp, feelsLike, rainChance, wind, humidity } = weatherData
  const q = text.toLowerCase()

  const isRainQuery     = /rain|drizzle|shower|umbrella|raincoat/.test(q)
  const isTempQuery     = /temperature|temp\b|hot|cold|warm|cool|heat/.test(q)
  const isSunQuery      = /sun|sunscreen|uv|sunny|sunblock/.test(q)
  const isActivityQuery = /bike|ride|cycle|cricket|walk|jog|run|picnic|outdoor|outside|play|garden/.test(q)
  const isDecisionQuery = /should|can i|safe|okay|ok|suitable|good (for|day)|travel|jacket|coat|wear/.test(q)

  // Outdoor activity / decision queries — give an actionable recommendation
  if (isActivityQuery || isDecisionQuery) {
    if (rainChance >= 70) {
      return `⚠️ **${rainChance}% chance of rain** in ${locationLabel} right now — not ideal conditions. It's ${temp}°C (${condition.toLowerCase()}). You may want to postpone or carry rain gear.`
    }
    if (rainChance >= 40) {
      return `There's a **${rainChance}% chance of rain** in ${locationLabel}. Current conditions: ${temp}°C, ${condition.toLowerCase()}. Carry a light jacket or raincoat just in case.`
    }
    return `Conditions look manageable in ${locationLabel}: ${temp}°C, ${condition.toLowerCase()}, rain chance only ${rainChance}%. Go ahead, but check back before heading out.`
  }

  // Sunscreen / UV query
  if (isSunQuery) {
    if (/cloud|overcast|rain/i.test(condition)) {
      return `Skies are ${condition.toLowerCase()} in ${locationLabel} (${temp}°C) — sunscreen is less critical today, but UV can still pass through clouds.`
    }
    return `It's ${condition.toLowerCase()} and ${temp}°C in ${locationLabel} — sunscreen is recommended if you'll be outdoors.`
  }

  // Rain-specific query
  if (isRainQuery) {
    if (rainChance >= 70) return `Yes, rain is very likely today in ${locationLabel} (${rainChance}%). Here are the current conditions:`
    if (rainChance >= 40) return `Rain is possible in ${locationLabel} (${rainChance}% chance). Here's the full picture:`
    return `Rain is unlikely in ${locationLabel} (only ${rainChance}% chance). It's looking mostly ${condition.toLowerCase()}:`
  }

  // Temperature query
  if (isTempQuery) {
    return `It's currently **${temp}°C** in ${locationLabel}, feeling like ${feelsLike}°C. Here are today's conditions:`
  }

  // Generic fallback — at least show rain and temp
  return `In ${locationLabel}: ${temp}°C, ${condition.toLowerCase()}, rain chance ${rainChance}%.`
}

// â”€â”€â”€ Response resolver â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
/**
 * Determines the correct response for a user message.
 *
 * Priority:
 *  1. Weather intent (direct terms OR outdoor-decision frame)
 *     â†’ AI with grounded prompt + WeatherCard
 *     (English fallback: Phase 2 intro; Indic: short native line + live card)
 *  2. Historical weather intent â†’ fetch comparison data + HistoricalComparisonCard
 *  3. Exact-match quick prompt â†’ preserved mock response (alert/travel/farmer cards)
 *  4. Free-form â†’ AI without weather data (language-aware fallback)
 *
 * @param {string}            text
 * @param {object|null}       location        - { lat, lon, label }
 * @param {object|null}       weatherContext  - { today, forecast } — may be null if fetch failed
 * @param {string}            langPreference  - 'auto' | 'en' | 'hi' | 'ta' | 'te' | 'bn' | 'mr'
 * @param {object[]}          history         - Gemini conversation history
 * @param {boolean}           isWeather       - Pre-computed weather intent
 * @param {boolean}           isHistorical    - Pre-computed historical intent
 * @param {string|null}       conversationId  - Active conversation ID (for persistence)
 * @param {object|null}       hourlyPeriodData - Hourly period forecast data (for morning/afternoon/evening/night queries)
 * @returns {Promise<{ text: string, card: object|null, conversationId?: string }>}
 */
async function resolveResponseWithAI(text, location, weatherContext, langPreference, history, isWeather, isHistorical, conversationId, hourlyPeriodData = null) {
  console.log('[resolveResponseWithAI] ========== START ==========')
  console.log('[resolveResponseWithAI] Called with:', {
    text,
    location: location?.label,
    hasWeatherContext: !!weatherContext,
    isWeather,
    isHistorical,
    hasHourlyPeriodData: !!hourlyPeriodData
  })

  const replyLang = detectReplyLanguage(text, langPreference)
  // Always pass the per-query detected language to Gemini (not the raw 'auto' preference).
  // This prevents previous Marathi/Hindi turns from causing an English query to get a
  // Marathi/Hindi response — replyLang is freshly computed from the current message script/keywords.
  const promptLang = replyLang

  // â”€â”€ 0. Time Period Queries (morning/afternoon/evening/night) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Priority: Handle specific time period requests with hourly data
  if (hourlyPeriodData) {
    const { periodLabel, day, temperature, minTemperature, maxTemperature, 
            precipitationProbability, condition, humidity, windSpeed } = hourlyPeriodData
    
    const dayLabel = day === 'tomorrow' ? 'Tomorrow' : 'Today'
    const fullPeriodLabel = `${dayLabel} ${periodLabel}`
    
    // Build grounded context for Gemini
    const periodContext = `
VERIFIED HOURLY FORECAST DATA FOR ${fullPeriodLabel.toUpperCase()} IN ${location.label.toUpperCase()}:

Temperature: ${minTemperature}°C - ${maxTemperature}°C (avg ${temperature}°C)
Condition: ${condition}
Precipitation probability: ${precipitationProbability}%
Humidity: ${humidity}%
Wind speed: ${windSpeed} km/h
Period: ${fullPeriodLabel}

IMPORTANT: This is ${fullPeriodLabel.toLowerCase()} forecast data, NOT current weather. The user specifically asked about "${fullPeriodLabel.toLowerCase()}". Reference this exact period in your response.
`.trim()

    const systemPrompt = buildGroundedSystemPrompt(location, null, promptLang, periodContext)
    const aiResponse = await askGemini({
      userMessage: text,
      history,
      systemPrompt,
      conversationId,
      location,
      enableGoogleSearch: false, // Use weather data, not search
    })

    // Build period weather card
    const periodCard = {
      type: 'period-weather',
      data: {
        location: location.label,
        period: fullPeriodLabel,
        condition,
        temperature,
        minTemperature,
        maxTemperature,
        humidity,
        windSpeed,
        precipitationProbability,
      },
    }

    return {
      text: aiResponse.text,
      card: periodCard,
      conversationId: aiResponse.conversationId,
    }
  }

  // â”€â”€ 1. IMD (India Meteorological Department) official data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Priority order:
  //   • isIMDWarningIntent  → IMD CAP RSS feed (real data) → Gemini synthesis
  //   • isIMDNowcastIntent  → Google Search grounding (CAP has no nowcast)
  //   • isIMDRainfallIntent → Google Search grounding
  // Normal weather ("right now", "currently") does NOT reach here (fixed in weatherIntent.js)
  const isIMDWarning  = isIMDWarningIntent(text)
  const isIMDNowcast  = isIMDNowcastIntent(text)
  const isIMDRainfall = isIMDRainfallIntent(text)
  const needsIMD      = isIMDWarning || isIMDNowcast || isIMDRainfall

  console.log('[resolveResponseWithAI] IMD Intent Check:', {
    query: text,
    isIMDWarning,
    isIMDNowcast,
    isIMDRainfall,
    needsIMD
  })

  if (needsIMD) {
    console.log('[resolveResponseWithAI] â–¶ Entering IMD block (isWarning=' + isIMDWarning + ' isNowcast=' + isIMDNowcast + ' isRainfall=' + isIMDRainfall + ')')
    if (!location?.lat) {
      return {
        text: NEED_LOCATION_FALLBACK[replyLang] ?? NEED_LOCATION_FALLBACK.en,
        card: null,
      }
    }

    // â”€â”€ IMD WARNING â†’ try CAP feed first â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (isIMDWarning) {
      console.log('[WeatherGPT] IMD warning query — trying CAP feed for:', location.label)
      try {
        const capResult = await fetchIMDCAPWarnings({ location: location.label })
        const alerts    = capResult.alerts || []
        const state     = capResult.resolvedState || null
        const matchCount = capResult.matchCount ?? alerts.length

        console.log('[IMD CAP] Location:', location.label)
        console.log('[IMD CAP] State:', state || '(unmapped)')
        console.log('[IMD CAP] Matching alerts:', matchCount)

        // Build a grounded context block for Gemini
        let capContext = ''
        if (alerts.length > 0) {
          const alertSummaries = alerts.map((a, i) =>
            `[Alert ${i + 1}]\n${formatCAPAlertForAI(a)}`
          ).join('\n\n')

          capContext = `
=== VERIFIED IMD OFFICIAL ALERTS FROM CAP FEED ===
Source: India Meteorological Department (IMD) — Common Alerting Protocol
Feed: https://cap-sources.s3.amazonaws.com/in-imd-en/rss.xml
Fetched: ${capResult.fetchedAt}
Status: ${capResult.sourceStatus}

${alertSummaries}

=== END IMD ALERTS ===

IMPORTANT RULES FOR YOUR RESPONSE:
1. These are VERIFIED, real IMD alerts from the official CAP feed.
2. The user asked about: ${location.label} — resolved to state: ${state || 'unknown'}.
3. CAP alerts are typically state/subdivision level — do NOT claim a specific city has/doesn't have a warning unless the alert text specifically names it.
4. If alerts are present: summarize what IMD has issued, the area, severity, onset/expiry.
5. Clearly state: "Source: India Meteorological Department (IMD) CAP feed"
6. Be concise — 3-4 sentences maximum.
7. Do NOT invent alert details beyond what is in the data above.
`.trim()
        } else {
          // No matching alerts in feed
          const stateNote = `No active IMD alert for ${location.label} is currently visible in the IMD CAP feed (checked ${state ? `${state} region` : 'all regions'}).`

          capContext = `
IMD CAP STATUS FOR ${location.label.toUpperCase()}:
${stateNote}
The CAP feed currently contains ${capResult.allAlerts?.length ?? 0} total alert(s), none matching this region.
Feed fetched: ${capResult.fetchedAt}

IMPORTANT RULES FOR YOUR RESPONSE:
1. Do NOT say there are definitely no warnings — CAP coverage may be incomplete.
2. Use wording like: "No active IMD warning for ${location.label} is currently visible in the available CAP feed."
   - Always refer to the user's requested location (${location.label}), NOT to the state name (${state || 'unknown'}).
   - The state resolution is internal — users only care about the city they asked about.
3. Mention that users may wish to check mausam.imd.gov.in for the latest official advisories.
4. Do NOT apologize or mention technical limitations.
5. Be concise — 2-3 sentences.
6. End with: "Source: IMD CAP feed."
`.trim()
        }

        const capSystemPrompt = buildGroundedSystemPrompt(location, weatherContext, promptLang)
          + '\n\n' + capContext

        const aiResponse = await askGemini({
          userMessage: text,
          history: history.slice(-4),
          systemPrompt: capSystemPrompt,
          conversationId,
          location,
          enableGoogleSearch: false,
        })

        return {
          text: aiResponse.text,
          card: null,
          conversationId: aiResponse.conversationId,
        }
      } catch (capErr) {
        console.warn('[WeatherGPT] CAP fetch failed, falling back to Google Search:', capErr.message)
        // Fall through to Google Search grounding below
      }
    }

    // â”€â”€ NOWCAST / RAINFALL / CAP fallback â†’ Google Search grounding â”€â”€â”€â”€â”€â”€â”€
    try {
      console.log('[WeatherGPT] IMD query — using Google Search grounding for:', location.label)

      const imdSearchPrompt = `
You are searching for the latest official India Meteorological Department (IMD) information for ${location.label}.

IMPORTANT INSTRUCTIONS:
1. Use Google Search to find CURRENT publicly available IMD information from:
   - mausam.imd.gov.in (primary official source)
   - imd.gov.in (official IMD website)
2. Look for the MOST RECENT weather warnings, nowcasts, advisories, or rainfall bulletins
3. If you find current IMD information:
   - Clearly state what IMD has issued
   - Include the date/time of the bulletin
   - Add relevant safety recommendations
4. If NO current IMD information is found:
   - Say "No active IMD weather advisory matching ${location.label} is currently visible in available sources"
   - Do NOT say "No warnings" unless official sources confirm this
5. NEVER fabricate or invent IMD data
6. NEVER present Open-Meteo data as IMD data
7. Source: cite the IMD source if found

Reply in ${replyLang === 'en' ? 'English' : replyLang === 'hi' ? 'Hindi' : "the user's language"}.
Keep response concise (2-4 sentences).`.trim()

      const imdSystemPrompt = buildGroundedSystemPrompt(location, null, promptLang)
        + '\n\n' + imdSearchPrompt

      const aiResponse = await askGemini({
        userMessage: text,
        history: history.slice(-4),
        systemPrompt: imdSystemPrompt,
        conversationId,
        location,
        enableGoogleSearch: true,
      })

      return {
        text: aiResponse.text,
        card: null,
        conversationId: aiResponse.conversationId,
      }
    } catch (searchErr) {
      console.error('[WeatherGPT] IMD Google Search also failed:', searchErr.message)

      // Ultimate deterministic fallback — always use the city the user asked about

      return {
        text: replyLang === 'en'
          ? `No active IMD weather advisory for ${location.label} is currently visible in the available data. For the latest official warnings, you may check mausam.imd.gov.in directly.`
          : `\${location.label} \u0915\u0947 \u0932\u093f\u090f \u0935\u0930\u094d\u0924\u092e\u093e\u0928 \u0921\u0947\u091f\u093e \u092e\u0947\u0902 \u0915\u094b\u0908 \u0938\u0915\u094d\u0930\u093f\u092f IMD \u092e\u094c\u0938\u092e \u091a\u0947\u0924\u093e\u0935\u0928\u0940 \u0928\u0939\u0940\u0902 \u0926\u093f\u0916 \u0930\u0939\u0940 \u0939\u0948\u0964 \u0928\u0935\u0940\u0928\u0924\u092e \u091c\u093e\u0928\u0915\u093e\u0930\u0940 \u0915\u0947 \u0932\u093f\u090f mausam.imd.gov.in \u0926\u0947\u0916\u0947\u0902\u0964`,
        card: null,
      }
    }
  }

  console.log('[resolveResponseWithAI] âœ“âœ“âœ“ PASSED IMD CHECK âœ“âœ“âœ“ Continuing to normal weather handling...')

  // â”€â”€ 2. NWP (Numerical Weather Prediction) model forecast â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const isNWP = isNWPIntent(text)
  if (isNWP) {
    if (!location?.lat) {
      return {
        text: NEED_LOCATION_FALLBACK[replyLang] ?? NEED_LOCATION_FALLBACK.en,
        card: null,
      }
    }

    try {
      const { model, comparison } = extractNWPModel(text)
      console.log('[WeatherGPT] NWP request detected:', { model, comparison, location: location.label })

      if (comparison || model === 'both') {
        // Fetch both models for comparison
        const { gfs, ecmwf, errors } = await fetchBothModels({
          lat: location.lat,
          lon: location.lon,
          days: 7,
        })

        if (!gfs && !ecmwf) {
          throw new NWPServiceError('Both NWP models failed to fetch data')
        }

        // Build compact context for AI
        const contextParts = []
        if (gfs) {
          const gfsSummary = gfs.forecast.slice(0, 24)
          const gfsAvgTemp = Math.round(gfsSummary.reduce((sum, f) => sum + (f.temperature || 0), 0) / gfsSummary.length)
          const gfsTotalPrecip = gfsSummary.reduce((sum, f) => sum + (f.precipitation || 0), 0).toFixed(1)
          contextParts.push(`GFS GRAPES: avg ${gfsAvgTemp}°C, ${gfsTotalPrecip}mm precip (24h)`)
        } else {
          contextParts.push(`GFS GRAPES: unavailable (${errors.gfs})`)
        }

        if (ecmwf) {
          const ecmwfSummary = ecmwf.forecast.slice(0, 24)
          const ecmwfAvgTemp = Math.round(ecmwfSummary.reduce((sum, f) => sum + (f.temperature || 0), 0) / ecmwfSummary.length)
          const ecmwfTotalPrecip = ecmwfSummary.reduce((sum, f) => sum + (f.precipitation || 0), 0).toFixed(1)
          contextParts.push(`ECMWF IFS: avg ${ecmwfAvgTemp}°C, ${ecmwfTotalPrecip}mm precip (24h)`)
        } else {
          contextParts.push(`ECMWF IFS: unavailable (${errors.ecmwf})`)
        }

        const contextMessage = `${contextParts.join('. ')}. User sees both model cards. Explain differences are due to different model physics/resolution, NOT one being "correct". Reply in 2 sentences.`

        const systemPrompt = buildGroundedSystemPrompt(location, weatherContext, promptLang)
        const aiResponse = await askGemini({
          userMessage: text + '\n\n' + contextMessage,
          history,
          systemPrompt,
          conversationId,
          location
        })

        return {
          text: aiResponse.text,
          card: { type: 'nwp-comparison', data: { gfs, ecmwf, errors } },
          conversationId: aiResponse.conversationId
        }
      } else {
        // Fetch single model
        const modelKey = model || 'ecmwf'
        const nwpData = await fetchNWPForecast({
          lat: location.lat,
          lon: location.lon,
          model: modelKey,
          days: modelKey === 'gfs' ? 3 : 7,
        })

        // Build compact context for AI
        const summary24h = nwpData.forecast.slice(0, 24)
        const avgTemp = Math.round(summary24h.reduce((sum, f) => sum + (f.temperature || 0), 0) / summary24h.length)
        const totalPrecip = summary24h.reduce((sum, f) => sum + (f.precipitation || 0), 0).toFixed(1)
        const maxWind = Math.round(Math.max(...summary24h.map(f => f.windSpeed || 0)))

        const contextMessage = `${nwpData.model.name}: avg ${avgTemp}°C, ${totalPrecip}mm precip, max wind ${maxWind}km/h (24h). User sees model card. Explain forecast conversationally. Reply in 2-3 sentences.`

        const systemPrompt = buildGroundedSystemPrompt(location, weatherContext, promptLang)
        const aiResponse = await askGemini({
          userMessage: text + '\n\n' + contextMessage,
          history,
          systemPrompt,
          conversationId,
          location
        })

        return {
          text: aiResponse.text,
          card: { type: 'nwp', data: nwpData, model: modelKey },
          conversationId: aiResponse.conversationId
        }
      }
    } catch (err) {
      console.error('[WeatherGPT] NWP forecast failed:', err)
      return {
        text: replyLang === 'en'
          ? `I cannot retrieve NWP model forecasts right now: ${err.message}`
          : `à¤à¤¨à¤¡à¤¬à¥à¤²à¥à¤¯à¥‚à¤ªà¥€ à¤®à¥‰à¤¡à¤² à¤ªà¥‚à¤°à¥à¤µà¤¾à¤¨à¥à¤®à¤¾à¤¨ à¤…à¤­à¥€ à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¹à¥€à¤‚ à¤¹à¥ˆ: ${err.message}`,
        card: null,
      }
    }
  }

  // â”€â”€ 3. Climate trend analysis (long-term) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const isClimate = isClimateTrendIntent(text)
  if (isClimate) {
    if (!location?.lat) {
      return {
        text: NEED_LOCATION_FALLBACK[replyLang] ?? NEED_LOCATION_FALLBACK.en,
        card: null,
      }
    }

    try {
      const years = extractClimatePeriod(text)
      console.log(`[WeatherGPT] Climate trend request: ${years} years for ${location.label}`)

      const climateData = await fetchClimateTrend({
        lat: location.lat,
        lon: location.lon,
        years,
      })

      // Build compact context for AI
      const tempTrend = climateData.trends.temperature.direction
      const precipTrend = climateData.trends.precipitation.direction
      const tempChange = climateData.trends.temperature.change
      const precipChange = climateData.trends.precipitation.change

      const contextMessage = 
        `Climate analysis (${years} years): Temperature ${tempTrend} (${tempChange > 0 ? '+' : ''}${tempChange}°C total), ` +
        `rainfall ${precipTrend} (${precipChange > 0 ? '+' : ''}${precipChange}mm total). ` +
        `User sees charts. Explain trends WITHOUT causal claims. Say "observed trend" not "climate change caused". Reply in 2-3 sentences.`

      const systemPrompt = buildGroundedSystemPrompt(location, weatherContext, promptLang)
      const aiResponse = await askGemini({
        userMessage: text + '\n\n' + contextMessage,
        history,
        systemPrompt,
        conversationId,
        location
      })

      return {
        text: aiResponse.text,
        card: { type: 'climate', data: climateData, location: location.label },
        conversationId: aiResponse.conversationId
      }
    } catch (err) {
      console.error('[WeatherGPT] Climate trend failed:', err)
      return {
        text: replyLang === 'en'
          ? `I cannot retrieve climate trend data right now: ${err.message}`
          : `à¤œà¤²à¤µà¤¾à¤¯à¥ à¤°à¥à¤à¤¾à¤¨ à¤¡à¥‡à¤Ÿà¤¾ à¤…à¤­à¥€ à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¹à¥€à¤‚ à¤¹à¥ˆ: ${err.message}`,
        card: null,
      }
    }
  }

  // â”€â”€ 4. Historical weather comparison (short-term) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (isHistorical) {
    if (!location?.lat) {
      return {
        text: NEED_LOCATION_FALLBACK[replyLang] ?? NEED_LOCATION_FALLBACK.en,
        card: null,
      }
    }

    try {
      const historicalData = await fetchHistoricalComparison({
        lat: location.lat,
        lon: location.lon,
        daysBack: 30, // Compare past 30 days
      })

      const systemPrompt = buildGroundedSystemPrompt(location, weatherContext, promptLang)
      
      // Compact historical summary for AI (must stay well under 600 char limit)
      const tempDiff = historicalData.comparison.tempDiff
      const precipDiff = historicalData.comparison.precipDiff
      const rainyDiff = historicalData.comparison.rainyDaysDiff
      
      const contextMessage = 
        `Historical: ${historicalData.thisYear.year} avg ${historicalData.thisYear.avgTemp}°C, ` +
        `${historicalData.thisYear.totalPrecip}mm rain (${historicalData.thisYear.rainyDays}d). ` +
        `${historicalData.lastYear.year} was ${historicalData.lastYear.avgTemp}°C, ` +
        `${historicalData.lastYear.totalPrecip}mm (${historicalData.lastYear.rainyDays}d). ` +
        `Diff: ${tempDiff > 0 ? '+' : ''}${tempDiff}°C, ${precipDiff > 0 ? '+' : ''}${precipDiff}mm, ` +
        `${rainyDiff > 0 ? '+' : ''}${rainyDiff} rainy days. ` +
        `User sees card. Reply in 2 sentences max.`

      const aiResponse = await askGemini({
        userMessage: text + '\n\n' + contextMessage,
        history,
        systemPrompt,
        conversationId,
        location
      })

      return {
        text: aiResponse.text,
        card: { type: 'historical', data: historicalData },
        conversationId: aiResponse.conversationId
      }
    } catch (err) {
      console.error('[WeatherGPT] Historical comparison failed:', err)
      console.error('[WeatherGPT] Error details:', {
        message: err?.message,
        name: err?.name,
        location: { lat: location.lat, lon: location.lon, label: location.label }
      })
      
      // Check if historical data was successfully fetched
      // If fetchHistoricalComparison threw, historicalData won't exist
      // If only AI failed, historicalData exists - use deterministic fallback
      if (typeof historicalData !== 'undefined' && historicalData) {
        console.log('[WeatherGPT] Historical data exists, AI failed. Using deterministic fallback.')
        
        // Generate deterministic insight from the data
        const tempDiff = historicalData.comparison.tempDiff
        const precipDiff = historicalData.comparison.precipDiff
        const rainyDiff = historicalData.comparison.rainyDaysDiff
        const trend = historicalData.comparison.tempTrend
        
        let fallbackText = ''
        if (replyLang === 'en') {
          const tempPhrase = trend === 'warmer' 
            ? `${Math.abs(tempDiff)}°C warmer`
            : trend === 'cooler'
            ? `${Math.abs(tempDiff)}°C cooler`
            : 'about the same temperature'
          
          const rainPhrase = precipDiff > 20
            ? `with ${Math.abs(precipDiff)}mm more rainfall`
            : precipDiff < -20
            ? `with ${Math.abs(precipDiff)}mm less rainfall`
            : 'with similar rainfall'
          
          fallbackText = `The past ${historicalData.thisYear.daysAnalyzed} days were ${tempPhrase} than the same period last year, ${rainPhrase}.`
        } else {
          // Hindi fallback
          fallbackText = `पिछले ${historicalData.thisYear.daysAnalyzed} दिन पिछले साल की तà¥?à¤²à¤¨ा में ${Math.abs(tempDiff)}°C अलग थे।`
        }
        
        return {
          text: fallbackText,
          card: { type: 'historical', data: historicalData },
        }
      }
      
      // Historical data fetch itself failed
      return {
        text: replyLang === 'en'
          ? 'I cannot retrieve historical weather data right now. Try asking about current weather conditions instead.'
          : 'à¤à¤¤à¤¿à¤¹à¤¾à¤¸à¤¿à¤• à¤®à¥Œà¤¸à¤® à¤¡à¥‡à¤Ÿà¤¾ à¤…à¤­à¥€ à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¹à¥€à¤‚ à¤¹à¥ˆà¥¤ à¤•à¥ƒà¤ªà¤¯à¤¾ à¤µà¤°à¥à¤¤à¤®à¤¾à¤¨ à¤®à¥Œà¤¸à¤® à¤•à¥‡ à¤¬à¤¾à¤°à¥‡ à¤®à¥‡à¤‚ à¤ªà¥‚à¤›à¥‡à¤‚à¥¤',
        card: null,
      }
    }
  }

  // â”€â”€ 5. Weather intent (Layer 1+2+3 pre-computed by caller) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  console.log('[resolveResponseWithAI] 🔄 Checking isWeather:', isWeather)
  if (isWeather) {
    console.log('[resolveResponseWithAI] âœ… isWeather = true, entering normal weather path')
    if (!location?.lat) {
      console.log('[resolveResponseWithAI] âŒ No location, returning fallback')
      return {
        text: NEED_LOCATION_FALLBACK[replyLang] ?? NEED_LOCATION_FALLBACK.en,
        card: null,
      }
    }

    console.log('[resolveResponseWithAI] 🔄 Building grounded system prompt...')
    const systemPrompt = buildGroundedSystemPrompt(location, weatherContext, promptLang)

    try {
      console.log('[resolveResponseWithAI] 🔄 Calling askGemini for normal weather...')
      const aiResponse = await askGemini({ 
        userMessage: text, 
        history, 
        systemPrompt,
        conversationId,
        location
      })
      console.log('[resolveResponseWithAI] âœ… askGemini returned successfully for normal weather')
      return {
        text: aiResponse.text,
        card: weatherContext ? { type: 'weather', data: weatherContext.today } : null,
        conversationId: aiResponse.conversationId
      }
    } catch (err) {
      console.error('[resolveResponseWithAI] âŒ Gemini weather path failed:', err?.message ?? err)
      console.error('[WeatherGPT] Gemini weather path failed — using backup:', err?.message ?? err)
      const weatherCard = weatherContext ? { type: 'weather', data: weatherContext.today } : null
      if (replyLang === 'en') {
        const fallbackText = weatherContext
          ? buildWeatherIntroText(text, weatherContext.today, location.label)
          : WEATHER_FAIL_NO_DATA.en
        return { text: fallbackText, card: weatherCard }
      }
      const fallbackText = weatherContext
        ? (WEATHER_FAIL_FALLBACK[replyLang] ?? WEATHER_FAIL_FALLBACK.hi)
        : (WEATHER_FAIL_NO_DATA[replyLang] ?? WEATHER_FAIL_NO_DATA.hi)
      return { text: fallbackText, card: weatherCard }
    }
  }

  // â”€â”€ 6. Exact-match quick prompts â†’ preserve mock cards (alert/travel/farmer) â”€
  if (QUICK_PROMPT_RESPONSES[text]) {
    return QUICK_PROMPT_RESPONSES[text]
  }

  // â”€â”€ 7. Free-form general question â†’ AI without weather data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  console.log('[resolveResponseWithAI] 🔄 No specific intent matched, using general path')
  const systemPrompt = buildGroundedSystemPrompt(location, null, promptLang)
  try {
    console.log('[resolveResponseWithAI] 🔄 Calling askGemini for general query...')
    const aiResponse = await askGemini({ 
      userMessage: text, 
      history, 
      systemPrompt,
      conversationId,
      location
    })
    console.log('[resolveResponseWithAI] âœ… askGemini returned successfully for general query')
    return { 
      text: aiResponse.text, 
      card: null,
      conversationId: aiResponse.conversationId
    }
  } catch (err) {
    console.error('[resolveResponseWithAI] âŒ Gemini general path failed:', err?.message ?? err)
    console.error('[WeatherGPT] Gemini general path failed — using backup:', err?.message ?? err)
    if (replyLang === 'en') return FALLBACK_RESPONSE
    return {
      text: GENERAL_FAIL_FALLBACK[replyLang] ?? FALLBACK_RESPONSE.text,
      card: null,
    }
  }
}

// â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function ChatScreen() {
  const routerLocation = useRouterLocation()

  // React Router state is in-memory and is lost on a hard page refresh.
  // Persist location in sessionStorage as a fallback so the chat session
  // survives a browser refresh without breaking Gemini (null location â†’ TypeError).
  const routerStateLocation = routerLocation.state?.location
  let locationState = routerStateLocation

  if (routerStateLocation) {
    // Save to sessionStorage every time Router has fresh state
    try { sessionStorage.setItem('wgpt_location', JSON.stringify(routerStateLocation)) } catch (_) {}
  } else {
    // Router state lost (e.g. hard refresh) — try to recover from sessionStorage
    try {
      const saved = sessionStorage.getItem('wgpt_location')
      if (saved) locationState = JSON.parse(saved)
    } catch (_) {}
  }

  const navigate = useNavigate()

  const locationLabel = locationState?.label ?? 'Your Location'

  const [messages, setMessages]             = useState(() => [buildGreeting(locationLabel)])
  const [isTyping, setIsTyping]             = useState(false)
  const [settingsOpen, setSettingsOpen]     = useState(false)
  const [langPreference, setLangPreference] = useState('auto')

  // Conversation history management
  const {
    conversations,
    activeConversationId,
    loading: historyLoading,
    error: historyError,
    loadConversation,
    createNewConversation,
    removeConversation,
    updateConversation,
    addConversation,
    setActiveConversationId: setActiveConvId
  } = useConversations()

  // Redirect guard: if location could not be recovered at all (user navigated
  // directly to /chat without going through WelcomeScreen), send them back.
  useEffect(() => {
    if (!locationState) {
      navigate('/', { replace: true })
    }
  }, [locationState, navigate])

  // Cache 3-day weather context for the session — fetched lazily on first weather query
  const weatherContextRef = useRef(null)
  
  // Track the location used in conversation (for follow-up queries)
  // This allows: "Weather in Mumbai?" â†’ "Will it rain tomorrow?" to use Mumbai
  const conversationLocationRef = useRef(null)

  // Clear weather context cache when location changes to ensure fresh data
  useEffect(() => {
    weatherContextRef.current = null
  }, [locationState?.lat, locationState?.lon])

  const { getHistory, addTurn } = useConversation()

  const addMessage = useCallback((msg) => {
    setMessages((prev) => [...prev, msg])
  }, [])

  /**
   * Handle selecting an existing conversation from sidebar
   */
  const handleSelectConversation = useCallback(async (id) => {
    if (id === activeConversationId) return // Already active

    try {
      console.log('[ChatScreen] Loading conversation:', id)
      const savedMessages = await loadConversation(id)
      
      // Convert saved messages to chat format
      const chatMessages = savedMessages.map(msg => ({
        id: msg.id,
        role: msg.role === 'assistant' ? 'ai' : msg.role,
        text: msg.content,
        card: null, // Cards not saved in DB, only text
        timestamp: new Date(msg.created_at).toLocaleTimeString('en-IN', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      }))

      setMessages(chatMessages)
      setActiveConvId(id) // Set as active conversation
      console.log('[ChatScreen] Loaded', chatMessages.length, 'messages')
    } catch (err) {
      console.error('[ChatScreen] Failed to load conversation:', err)
      alert('Failed to load conversation: ' + err.message)
    }
  }, [activeConversationId, loadConversation, setActiveConvId])

  /**
   * Handle starting a new conversation
   */
  const handleNewChat = useCallback(() => {
    console.log('[ChatScreen] Starting new chat')
    createNewConversation()
    setMessages([buildGreeting(locationLabel)])
    // Clear conversation context
    conversationLocationRef.current = null
    weatherContextRef.current = null
  }, [createNewConversation, locationLabel])

  const handleSend = useCallback(async (text) => {
    // 1. Add user message immediately
    addMessage({ id: uid(), role: 'user', text, card: null, timestamp: nowTimestamp() })

    console.log('[WeatherGPT DEBUG] ========== NEW QUERY ==========')
    console.log('[WeatherGPT DEBUG] Query:', text)
    console.log('[WeatherGPT DEBUG] UI Location:', locationState?.label, locationState?.lat, locationState?.lon)
    console.log('[WeatherGPT DEBUG] Conversation Location:', conversationLocationRef.current?.label)

    // 2. Classify intent first to determine loading message
    const currentHistory = getHistory()
    
    // DEBUG: Log individual intent checks
    console.log('[WeatherGPT DEBUG] Intent Detection for:', text)
    console.log('[WeatherGPT DEBUG]   isIMDWarningIntent:', isIMDWarningIntent(text))
    console.log('[WeatherGPT DEBUG]   isIMDNowcastIntent:', isIMDNowcastIntent(text))
    console.log('[WeatherGPT DEBUG]   isIMDRainfallIntent:', isIMDRainfallIntent(text))
    console.log('[WeatherGPT DEBUG]   needsIMDData (combined):', needsIMDData(text))
    
    const isIMD = needsIMDData(text)
    const isNWP = isNWPIntent(text)
    const isClimate = isClimateTrendIntent(text)
    const isHistorical = isHistoricalWeatherIntent(text) && !isClimate // Climate is long-term, historical is short-term
    const isTimePeriod = isTimePeriodQuery(text)
    const isWeather = isWeatherIntent(text) || isWeatherFollowUp(text, currentHistory) || isNWP

    console.log('[WeatherGPT DEBUG] Intent Detection:')
    console.log('[WeatherGPT DEBUG]   query:', text)
    console.log('[WeatherGPT DEBUG]   isTimePeriod:', isTimePeriod)
    console.log('[WeatherGPT DEBUG]   isWeather:', isWeather)
    console.log('[WeatherGPT DEBUG]   isIMD:', isIMD)
    console.log('[WeatherGPT DEBUG]   isNWP:', isNWP)
    console.log('[WeatherGPT DEBUG]   isClimate:', isClimate)
    console.log('[WeatherGPT DEBUG]   isHistorical:', isHistorical)

    // 3. Extract explicit location from query (if any)
    const explicitLocationName = extractLocationFromQuery(text)
    let queryLocation = locationState // Default to UI-selected location
    
    console.log('[WeatherGPT DEBUG] Explicit location from query:', explicitLocationName)
    
    // If user mentioned a specific city, resolve it to coordinates
    if (explicitLocationName && (isWeather || isIMD || isTimePeriod)) {
      try {
        console.log('[WeatherGPT] Explicit location detected:', explicitLocationName)
        const resolved = await geocodePlace(explicitLocationName)
        queryLocation = resolved
        conversationLocationRef.current = resolved // Remember for follow-ups
        console.log('[WeatherGPT] Resolved to:', resolved.label, `(${resolved.lat}, ${resolved.lon})`)
      } catch (err) {
        console.warn('[WeatherGPT] Could not resolve explicit location:', explicitLocationName, err.message)
        // Fall back to UI location or conversation location
        queryLocation = conversationLocationRef.current || locationState
      }
    } else if ((isWeather || isIMD || isTimePeriod) && conversationLocationRef.current) {
      // Follow-up query without explicit location - use conversation context
      queryLocation = conversationLocationRef.current
      console.log('[WeatherGPT] Using conversation location:', queryLocation.label)
    } else if (!isWeather && !isIMD && !isTimePeriod) {
      // Non-weather query - reset conversation location
      conversationLocationRef.current = null
    }
    
    // Remember location for follow-up queries if this is a weather/period query
    if ((isWeather || isIMD || isTimePeriod) && queryLocation && !conversationLocationRef.current) {
      conversationLocationRef.current = queryLocation
      console.log('[WeatherGPT] Saved location for follow-ups:', queryLocation.label)
    }

    console.log('[WeatherGPT DEBUG] Final queryLocation:', queryLocation?.label, queryLocation?.lat, queryLocation?.lon)

    // 4. Show contextual loading state
    const typingId = uid()
    
    // Invalidate weather cache if query location differs from previously cached location
    const cachedLocationKey = weatherContextRef.current 
      ? `${weatherContextRef.current.lat},${weatherContextRef.current.lon}` 
      : null
    const queryLocationKey = queryLocation 
      ? `${queryLocation.lat},${queryLocation.lon}` 
      : null
    
    if (cachedLocationKey && queryLocationKey && cachedLocationKey !== queryLocationKey) {
      console.log('[WeatherGPT] Location changed - invalidating weather cache')
      weatherContextRef.current = null
    }
    
    const needsWeatherFetch = (isWeather && !isIMD && !isNWP && !isClimate && !isTimePeriod) && !weatherContextRef.current && queryLocation?.lat
    const needsHourlyFetch = isTimePeriod && queryLocation?.lat
    const needsHistoricalFetch = isHistorical
    const needsNWPFetch = isNWP
    const needsClimateFetch = isClimate
    const needsIMDFetch = isIMD
    
    console.log('[WeatherGPT DEBUG] Fetch Decisions:')
    console.log('[WeatherGPT DEBUG]   needsWeatherFetch:', needsWeatherFetch)
    console.log('[WeatherGPT DEBUG]   needsHourlyFetch:', needsHourlyFetch)
    console.log('[WeatherGPT DEBUG]   needsHistoricalFetch:', needsHistoricalFetch)
    console.log('[WeatherGPT DEBUG]   needsNWPFetch:', needsNWPFetch)
    console.log('[WeatherGPT DEBUG]   needsClimateFetch:', needsClimateFetch)
    console.log('[WeatherGPT DEBUG]   needsIMDFetch:', needsIMDFetch)
    
    if (needsIMDFetch) {
      // Show "Fetching IMD data..." message
      setMessages((prev) => [...prev, { 
        id: typingId, 
        role: 'ai', 
        text: null, 
        isTyping: true,
        loadingMessage: `Searching for latest public IMD information for ${queryLocation.label}...`
      }])
    } else if (needsClimateFetch) {
      // Show "Analyzing climate data..." message
      const years = extractClimatePeriod(text)
      setMessages((prev) => [...prev, { 
        id: typingId, 
        role: 'ai', 
        text: null, 
        isTyping: true,
        loadingMessage: `Analyzing ${years}-year climate trends for ${queryLocation.label}...`
      }])
    } else if (needsNWPFetch) {
      // Show "Fetching NWP forecast..." message
      const { model, comparison } = extractNWPModel(text)
      const modelLabel = comparison ? 'GFS & ECMWF' : model === 'gfs' ? 'GFS GRAPES' : 'ECMWF IFS'
      setMessages((prev) => [...prev, { 
        id: typingId, 
        role: 'ai', 
        text: null, 
        isTyping: true,
        loadingMessage: `Fetching ${modelLabel} forecast for ${queryLocation.label}...`
      }])
    } else if (needsHistoricalFetch) {
      // Show "Analyzing historical data..." message
      setMessages((prev) => [...prev, { 
        id: typingId, 
        role: 'ai', 
        text: null, 
        isTyping: true,
        loadingMessage: `Analyzing historical weather data...`
      }])
    } else if (needsHourlyFetch) {
      // Show "Fetching hourly forecast..." message
      const periodInfo = extractTimePeriod(text)
      const periodLabel = periodInfo?.period ? getPeriodHours(periodInfo.period)?.label : 'time period'
      setMessages((prev) => [...prev, { 
        id: typingId, 
        role: 'ai', 
        text: null, 
        isTyping: true,
        loadingMessage: `Fetching hourly forecast for ${periodLabel.toLowerCase()}...`
      }])
    } else if (needsWeatherFetch) {
      // Show "Fetching weather data..." message with ACTUAL query location
      setMessages((prev) => [...prev, { 
        id: typingId, 
        role: 'ai', 
        text: null, 
        isTyping: true,
        loadingMessage: `Fetching weather data for ${queryLocation.label}...`
      }])
    } else {
      // Show standard typing indicator
      setMessages((prev) => [...prev, { 
        id: typingId, 
        role: 'ai', 
        text: null, 
        isTyping: true 
      }])
    }
    setIsTyping(true)

    // 5. Fetch hourly data for time period queries
    let hourlyPeriodData = null
    if (needsHourlyFetch) {
      try {
        const periodInfo = extractTimePeriod(text)
        console.log('[WeatherGPT HOURLY] Step 1: Time period extracted:', JSON.stringify(periodInfo))
        console.log('[WeatherGPT HOURLY] Step 1: Location:', queryLocation?.label, queryLocation?.lat, queryLocation?.lon)
        
        if (!queryLocation?.lat || !queryLocation?.lon) {
          console.error('[WeatherGPT HOURLY] âŒ Step 1 FAIL: No location coordinates')
          throw new Error('No location available for hourly forecast')
        }
        
        if (!periodInfo?.period) {
          console.error('[WeatherGPT HOURLY] âŒ Step 1 FAIL: No period extracted')
          throw new Error('Unable to determine time period')
        }
        
        console.log('[WeatherGPT HOURLY] âœ“ Step 1: Validation passed')
        
        // Import hourly forecast function
        console.log('[WeatherGPT HOURLY] Step 2: Importing weatherService...')
        const { fetchHourlyForecast, wmoToCondition } = await import('@/services/weatherService')
        console.log('[WeatherGPT HOURLY] âœ“ Step 2: Import successful')
        
        console.log('[WeatherGPT HOURLY] Step 3: Fetching hourly forecast...')
        const hourlyResult = await fetchHourlyForecast({
          lat: queryLocation.lat,
          lon: queryLocation.lon,
          days: 2, // Today + tomorrow
        })
        console.log('[WeatherGPT HOURLY] âœ“ Step 3: Fetch successful, hours:', hourlyResult?.hourly?.length)
        
        // Calculate target date
        const today = new Date()
        const targetDate = periodInfo.day === 'tomorrow' 
          ? new Date(today.getTime() + 24 * 60 * 60 * 1000)
          : today
        const targetDateStr = targetDate.toISOString().split('T')[0]
        
        console.log('[WeatherGPT HOURLY] Step 4: Filtering hours...')
        console.log('[WeatherGPT HOURLY] Step 4: Target date:', targetDateStr)
        console.log('[WeatherGPT HOURLY] Step 4: Period:', periodInfo.period)
        
        // Filter hours for the specific period
        const periodHours = filterHourlyByPeriod(
          hourlyResult.hourly,
          targetDateStr,
          periodInfo.period
        )
        
        console.log('[WeatherGPT HOURLY] âœ“ Step 4: Filter complete, hours:', periodHours?.length)
        
        if (!periodHours || periodHours.length === 0) {
          console.error('[WeatherGPT HOURLY] âŒ Step 4 FAIL: No hours matched period')
          throw new Error(`No hourly data available for ${periodInfo.day} ${periodInfo.period}`)
        }
        
        console.log('[WeatherGPT HOURLY] Step 5: Aggregating period data...')
        const aggregated = aggregatePeriodData(periodHours)
        console.log('[WeatherGPT HOURLY] Step 5: Aggregated:', JSON.stringify(aggregated))
        
        if (!aggregated) {
          console.error('[WeatherGPT HOURLY] âŒ Step 5 FAIL: Aggregation returned null')
          throw new Error('Unable to process hourly forecast data')
        }
        
        console.log('[WeatherGPT HOURLY] âœ“ Step 5: Aggregation successful')
        
        console.log('[WeatherGPT HOURLY] Step 6: Converting weather code...')
        const conditionInfo = wmoToCondition(aggregated.weatherCode)
        console.log('[WeatherGPT HOURLY] âœ“ Step 6: Condition:', conditionInfo?.label)
        
        console.log('[WeatherGPT HOURLY] Step 7: Building hourly period data object...')
        const periodLabel = getPeriodHours(periodInfo.period)?.label
        if (!periodLabel) {
          console.error('[WeatherGPT HOURLY] âŒ Step 7 FAIL: No period label')
          throw new Error('Invalid time period')
        }
        
        hourlyPeriodData = {
          location: queryLocation,
          period: periodInfo,
          periodLabel,
          day: periodInfo.day,
          ...aggregated,
          condition: conditionInfo.label,
          conditionCode: conditionInfo.code,
          severity: conditionInfo.severity,
        }
        
        console.log('[WeatherGPT HOURLY] âœ“ Step 7: Complete object built')
        console.log('[WeatherGPT HOURLY] âœ… SUCCESS: All steps completed')
        console.log('[WeatherGPT HOURLY] Final data:', {
          location: hourlyPeriodData.location.label,
          period: `${hourlyPeriodData.day} ${hourlyPeriodData.periodLabel}`,
          temp: `${hourlyPeriodData.minTemperature}-${hourlyPeriodData.maxTemperature}°C`,
          condition: hourlyPeriodData.condition,
          precipitation: `${hourlyPeriodData.precipitationProbability}%`
        })
        
        // Update loading message
        setMessages((prev) =>
          prev.map((m) =>
            m.id === typingId
              ? { ...m, loadingMessage: undefined }
              : m
          )
        )
      } catch (err) {
        console.error('[WeatherGPT HOURLY] âŒ EXCEPTION:', err?.message ?? err)
        console.error('[WeatherGPT HOURLY] Stack:', err?.stack)
        hourlyPeriodData = null
        // Don't throw - let it fall through to normal flow with hourlyPeriodData = null
      }
    }

    // 6. Lazily fetch and cache weather context using QUERY LOCATION (not UI location)
    if (needsWeatherFetch) {
      try {
        console.log('[WeatherGPT DEBUG] 🔄 Step 6: needsWeatherFetch = true, fetching weather context...')
        console.debug('[WeatherGPT] Fetching 3-day weather context for', queryLocation.label, `(${queryLocation.lat}, ${queryLocation.lon})`)
        weatherContextRef.current = await fetchWeatherContext({
          lat: queryLocation.lat,
          lon: queryLocation.lon,
        })
        console.log('[WeatherGPT DEBUG] âœ… Step 6: Weather context fetched successfully')
        console.debug('[WeatherGPT] Weather context fetched ✓ — temp:', weatherContextRef.current.today.temp, '°C, rain:', weatherContextRef.current.today.rainChance, '%')
        
        // Update loading message to show thinking state
        setMessages((prev) =>
          prev.map((m) =>
            m.id === typingId
              ? { ...m, loadingMessage: undefined }
              : m
          )
        )
      } catch (err) {
        console.error('[WeatherGPT DEBUG] âŒ Step 6: fetchWeatherContext failed:', err?.message ?? err)
        console.error('[WeatherGPT] ⚠️ fetchWeatherContext failed — AI will respond without live data:', err?.message ?? err)
        // weatherContextRef.current stays null; resolveResponseWithAI handles this gracefully
      }
    } else {
      console.log('[WeatherGPT DEBUG] â­ï¸ Step 6: Skipping weather fetch (needsWeatherFetch = false)')
    }

    // 7. Resolve response (AI with grounded prompt, or historical, or hourly period, or fallback)
    // Pass QUERY LOCATION (not UI location) so AI knows what location was requested
    console.log('[WeatherGPT DEBUG] 🔄 Step 7: Calling resolveResponseWithAI...')
    let response
    try {
      response = await resolveResponseWithAI(
        text,
        queryLocation, // Use resolved query location
        weatherContextRef.current,
        langPreference,
        currentHistory,
        isWeather,
        isHistorical,
        activeConversationId, // Pass current conversation ID
        hourlyPeriodData, // Pass hourly period data if available
      )
      console.log('[WeatherGPT DEBUG] âœ… Step 7: resolveResponseWithAI returned successfully')
      console.log('[WeatherGPT DEBUG] Response text length:', response?.text?.length)
      console.log('[WeatherGPT DEBUG] Response card type:', response?.card?.type)
    } catch (err) {
      console.error('[WeatherGPT DEBUG] âŒ Step 7: resolveResponseWithAI error:', err)
      console.error('[WeatherGPT] resolveResponseWithAI error:', err)
      const msg = err instanceof WeatherFetchError
        ? err.message
        : err instanceof AIServiceError
        ? 'AI service temporarily unavailable. Please try again.'
        : 'Something went wrong. Please try again.'
      response = { text: `âš ï¸ ${msg}`, card: null }
    }

    // 8. Handle returned conversationId (update sidebar state)
    if (response.conversationId) {
      if (response.conversationId !== activeConversationId) {
        // New conversation created by backend
        console.log('[ChatScreen] New conversation created:', response.conversationId)
        
        // Extract title from user message (first 50 chars)
        const title = text.length > 50 ? text.substring(0, 50) + '...' : text
        
        // Add to conversations list
        addConversation({
          id: response.conversationId,
          title,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        
        // Set as active conversation
        setActiveConvId(response.conversationId)
      } else {
        // Continuing existing conversation - update timestamp
        updateConversation(activeConversationId, {
          updated_at: new Date().toISOString()
        })
      }
    }

    // 8. Replace typing indicator with the response
    setMessages((prev) =>
      prev.map((m) =>
        m.id === typingId
          ? {
              id:        typingId,
              role:      'ai',
              text:      response.text,
              card:      response.card ?? null,
              timestamp: nowTimestamp(),
              isTyping:  false,
            }
          : m,
      ),
    )
    setIsTyping(false)

    // 9. Store this exchange in conversation history for follow-up context
    addTurn(text, response.text)
  }, [addMessage, locationState, langPreference, getHistory, addTurn, activeConversationId, addConversation, updateConversation, setActiveConvId])

  return (
    <AppShell expanded>
      {/* Conversation History Sidebar - Desktop only */}
      <ConversationSidebar
        conversations={conversations}
        activeId={activeConversationId}
        loading={historyLoading}
        error={historyError}
        onSelect={handleSelectConversation}
        onNewChat={handleNewChat}
        onDelete={removeConversation}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header
          locationLabel={locationLabel}
          onSettingsClick={() => setSettingsOpen((o) => !o)}
        />

        {/* Language selector — shown only when settings icon is tapped */}
        <SettingsPanel
          isOpen={settingsOpen}
          langPreference={langPreference}
          onLanguageChange={setLangPreference}
          onClose={() => setSettingsOpen(false)}
        />

        {/* Chat area */}
        <ChatFeed messages={messages} />

        {/* Quick prompts — hidden after first user message */}
        {messages.filter((m) => m.role === 'user').length === 0 && (
          <QuickPrompts onSelect={(prompt) => handleSend(prompt)} />
        )}

        {/* Input bar */}
        <ChatInput
          onSend={handleSend}
          disabled={isTyping}
          placeholder="Ask anything — in English or your language…"
          language={langPreference}
        />
      </div>
    </AppShell>
  )
}
