/**
 * Weather-intent routing — decides whether a user message should receive
 * live Open-Meteo context (and a WeatherCard) before Gemini answers.
 *
 * Three layers (any one is enough):
 *   1. Direct meteorological language (rain, तापमान, पाऊस, …).
 *   2. Outdoor-decision frame: an advice/safety question whose answer depends
 *      on current conditions (clothing, going out, sport, travel, UV),
 *      even if the user never says "weather".
 *   3. [Phase 4] Follow-up detection: user continues a prior weather
 *      conversation with a temporal/pronoun reference — handled by
 *      isWeatherFollowUp(text, history), called separately from ChatScreen.
 *
 * Layer 2 matches *categories* (decision + outdoor topic), not a growing
 * list of every possible noun. Unrelated chat has no outdoor topic, so it
 * stays on the general Gemini path and does not fetch weather.
 */

const LIVE_WEATHER_PROMPTS = new Set([
  'Will it rain today?',
  "What's the weather?",
  'What is the weather?',
  'What is the temperature?',
  'How hot is it?',
  'How cold is it?',
])

const DIRECT_WEATHER_EN = /\b(rain|raining|rainy|drizzle|shower|weather|temperature|temp|hot|cold|warm|humid|humidity|forecast|cloud|cloudy|sunny|sun|wind|windy|snow|fog|foggy|storm|thunder|umbrella|heat|cool|climate|historical|history|last\s+year|past|compare|comparison|trend|pattern)\b/i

const DIRECT_WEATHER_ROMAN = /\b(paus|pavas|barish|baarish|barsaat|barsat|mausam|garmi|thand|thandi|thanda|dhup|dhoop|badal|havaaman|havaman|chatri|chhatri|chhata)\b/i

const DIRECT_WEATHER_INDIAN = [
  'बारिश', 'बरसात', 'बरसेगा', 'बरसेगी', 'मौसम', 'तापमान', 'धूप', 'बादल',
  'गर्मी', 'गर्म', 'ठंड', 'ठण्ड', 'ठंडा', 'ठण्डा', 'तूफान', 'आंधी', 'धुंध',
  'हवा', 'छाता', 'छतरी',
  'বৃষ্টি', 'আবহাওয়া', 'তাপমাত্রা', 'মেঘ', 'গরম', 'ঠান্ডা', 'ছাতা', 'রোদ',
  'மழை', 'வெப்பம்', 'காற்று', 'மேகம்', 'வானிலை', 'குளிர்', 'குடை',
  'వర్షం', 'వాతావరణం', 'ఉష్ణోగ్రత', 'గాలి', 'మేఘం', 'చలి',
  'पाऊस', 'पावसा', 'पावसात', 'पावसाळा', 'पडेल', 'हवामान',
  'ढग', 'उष्णता', 'थंडी', 'थंड', 'गारठा', 'ऊन', 'वारा', 'वादळ', 'धुके',
  'आर्द्रता', 'छत्री',
]

// ─── Layer 2 — English advice frame ──────────────────────────────────────────
/**
 * Advice / "should I…?" framing — not a catalogue of weather nouns.
 *
 * Phase 4 additions (fixing confirmed false negatives):
 *   suitable\s+for, good\s+for, good\s+time\s+to, right\s+(time|day),
 *   would\s+it\s+be\s+(ok|okay|fine|safe|alright),
 *   going\s+to\s+need, am\s+i\s+going, plan(?:ning)?\s+to\s+go,
 *   thinking\s+of\s+going, ok\s+to, okay\s+to
 */
const ADVICE_FRAME_EN = /\b(should\s+i|shall\s+i|do\s+i\s+need|do\s+i\s+have\s+to|need\s+to|can\s+i|could\s+i|may\s+i|is\s+it\s+safe|safe\s+to|is\s+it\s+(ok|okay|fine|good)|good\s+day\s+for|good\s+idea\s+to|postpone|worth\s+(it|going)|wear|carry|take|suitable\s+for|good\s+for|good\s+time\s+to|right\s+(time|day)|would\s+it\s+be\s+(ok|okay|fine|safe|alright)|going\s+to\s+need|am\s+i\s+going|plan(?:ning)?\s+to\s+go|thinking\s+of\s+going|ok\s+to|okay\s+to)\b/i

/** Going out, travel, sport, or dressing for the elements / sun. */
const OUTDOOR_TOPIC_EN = /\b(outside|outdoors|outdoor|go\s+out|going\s+out|go\s+outside|step(?:ping)?\s+out|raincoat|rain\s*coat|jacket|coat|sweater|hoodie|dress|clothes|clothing|outfit|wear|wearing|sunscreen|sun\s*screen|sunblock|hat|cap|cricket|football|soccer|tennis|badminton|picnic|trek(?:king)?|hike|hiking|cycling|bike|bicycle|walk(?:ing)?|jog(?:ging)?|run(?:ning)?|swim(?:ming)?|travel(?:ling|ing)?|trip|commute|drive|driving|journey|flight|outdoor\s+event|garden(?:ing)?|farm(?:ing)?)\b/i

// ─── Layer 2 — Hindi / Marathi advice + outdoor frame ────────────────────────
/**
 * Hindi/Marathi: decision particles + outdoor/clothing/travel/sport topics.
 * "क्या" alone is not enough (most Hindi questions use it).
 *
 * Phase 4 additions: पहनना चाहिए, ठीक है, सही रहेगा, अच्छा रहेगा,
 *   जरूरी है, योग्य आहे, चांगले आहे, उचित आहे, आवश्यक आहे
 */
const ADVICE_FRAME_HI_MR =
  /ठीक\s*रहेगा|ठीक\s*होगा|ठीक\s*है|सही\s*रहेगा|अच्छा\s*रहेगा|जरूरी\s*है|पहनना\s*चाहिए|जाना\s*चाहिए|जाना\s*ठीक|ले\s*जाऊँ|ले\s*जाऊं|पहना|पहनूँ|पहनूं|टालूँ|टालूं|स्थगित|जाऊ\s*का|घेऊन|घ्यायच|न्याव|खेळू|बाहेर\s*जा|बाहर\s*जाना|करू\s*का|सकते\s*हैं|सकते\s*है|योग्य\s*आहे|चांगले\s*आहे|उचित\s*आहे|आवश्यक\s*आहे|चांगला\s*दिवस|योग्य\s*वेळ/

const OUTDOOR_TOPIC_HI_MR =
  /बाहर|बाहेर|घूमने|यात्रा|सफर|प्रवास|रेनकोट|रेन\s*कोट|जैकेट|जॅकेट|कपड़े|कपड़ा|कपडे|पोशाक|पहनना|पहनें|पहनावे|सनस्क्रीन|क्रिकेट|पिकनिक|ट्रिप|साइकिल|पैदल|दौड़|खेल|बाग|शेती|कोट|स्वेटर/

// ─── Layer 3 — Conversation follow-up detector ────────────────────────────────
/**
 * Signals that a prior AI response was about weather.
 * Checked against the last model turn's text content.
 */
const WEATHER_SIGNAL_IN_RESPONSE =
  /\b(rain|temperature|°C|weather|wind|humidity|forecast|umbrella|cloud|sunny|storm|drizzle|shower|snow|fog|heat|barish|mausam|paus|havaaman|बारिश|मौसम|पाऊस|हवामान)\b/i

/**
 * Follow-up temporal / pronoun patterns — signals the user is continuing
 * a prior topic without restating it.
 */
const FOLLOWUP_SIGNAL =
  /\b(tomorrow|tonight|evening|morning|afternoon|next\s+day|then|after\s+that|later|instead|what\s+about|how\s+about|and\s+if|but\s+if|and\s+tomorrow|what\s+if|after|following|next\s+few|कल|शाम|सुबह|रात|दोपहर|बाद\s*में|तो\s*क्या|उद्या|संध्याकाळ|सकाळी|रात्री)\b/i

// ─── Internal helpers ─────────────────────────────────────────────────────────

function hasDirectWeatherLanguage(text) {
  if (LIVE_WEATHER_PROMPTS.has(text)) return true
  if (DIRECT_WEATHER_EN.test(text)) return true
  if (DIRECT_WEATHER_ROMAN.test(text)) return true
  if (DIRECT_WEATHER_INDIAN.some((kw) => text.includes(kw))) return true
  return false
}

/**
 * True when the user is asking for a conditions-dependent decision,
 * not when they merely use a common question word.
 */
function isOutdoorDecisionIntent(text) {
  const enAdvice  = ADVICE_FRAME_EN.test(text)
  const enOutdoor = OUTDOOR_TOPIC_EN.test(text)
  if (enAdvice && enOutdoor) return true

  const indicAdvice  = ADVICE_FRAME_HI_MR.test(text)
  const indicOutdoor = OUTDOOR_TOPIC_HI_MR.test(text)
  if (indicAdvice && indicOutdoor) return true

  return false
}

/**
 * @param {string} text
 * @returns {boolean}
 */
export function isWeatherIntent(text) {
  if (!text || typeof text !== 'string') return false
  const trimmed = text.trim()
  if (!trimmed) return false
  if (hasDirectWeatherLanguage(trimmed)) return true
  if (isOutdoorDecisionIntent(trimmed)) return true
  return false
}

/**
 * Layer 3 — Conversation follow-up detection.
 *
 * Returns true when ALL of the following hold:
 *   1. The current message does NOT already pass isWeatherIntent() on its own
 *      (prevents double-triggering — Layer 1/2 already handle those).
 *   2. The most recent AI model turn contained weather-related language
 *      (the conversation was about weather).
 *   3. The current message contains a temporal or pronoun follow-up signal
 *      ("What about tomorrow?", "Then what?", "And in the evening?").
 *
 * When true, ChatScreen reuses the cached weatherContext and injects it into
 * the Gemini system prompt — even though the message has no direct weather terms.
 *
 * @param {string}   text    - The new user message
 * @param {Array}    history - Gemini-format conversation history
 * @returns {boolean}
 */
export function isWeatherFollowUp(text, history) {
  if (!text || !history?.length) return false
  // Skip if already classified by Layer 1/2 — avoids double-triggering
  if (isWeatherIntent(text)) return false

  // Find the most recent AI (model) response in history
  const lastModelTurn = [...history].reverse().find((h) => h.role === 'model')
  if (!lastModelTurn) return false
  const lastModelText = lastModelTurn.parts?.[0]?.text ?? ''

  // Last AI response must have contained weather-related content
  if (!WEATHER_SIGNAL_IN_RESPONSE.test(lastModelText)) return false

  // Current message must look like a temporal or pronoun follow-up
  return FOLLOWUP_SIGNAL.test(text)
}

export { LIVE_WEATHER_PROMPTS }


// ─── Historical weather intent detection ──────────────────────────────────────
/**
 * Detects queries asking for historical weather comparison or climate analysis.
 * 
 * Examples:
 * - "How does this year compare to last year?"
 * - "Is it warmer than last year?"
 * - "Compare weather with last year"
 * - "Climate trends"
 * 
 * @param {string} text - User message
 * @returns {boolean}
 */
export function isHistoricalWeatherIntent(text) {
  if (!text || typeof text !== 'string') return false
  const trimmed = text.toLowerCase().trim()
  
  // Explicit historical comparison phrases
  const historicalPhrases = [
    /compare.*last\s+year/i,
    /last\s+year.*compare/i,
    /this\s+year.*last\s+year/i,
    /historical.*weather/i,
    /weather.*history/i,
    /climate.*trend/i,
    /climate.*pattern/i,
    /climate.*comparison/i,
    /past\s+\d+\s+days/i,
    /compared?\s+to\s+(last|previous)\s+years?/i,
    /(warmer|cooler|hotter|colder|wetter|drier).*than\s+last\s+year/i,
    /how.*weather.*changed/i,
    /weather.*different.*last\s+year/i,
    // Additional patterns ? previous year(s), same period, today vs history
    /compare.*previous\s+years?/i,
    /previous\s+years?.*compare/i,
    /same\s+period.*previous\s+years?/i,
    /same\s+period.*last\s+years?/i,
    /how.*compare.*previous\s+years?/i,
    /how.*today.*compare.*years?/i,
    /compare.*same\s+period/i,
    /weather.*same\s+period.*year/i,
    /(warmer|cooler|hotter|colder|wetter|drier).*than.*previous\s+years?/i,
    /this\s+(time|period).*last\s+year/i,
    /year[\s-]+over[\s-]+year/i,
    /year\s+on\s+year/i,
  ]
  
  return historicalPhrases.some((pattern) => pattern.test(trimmed))
}

// ─── NWP (Numerical Weather Prediction) intent detection ──────────────────────
/**
 * Detects queries asking for NWP model forecasts.
 * 
 * Examples:
 * - "What does GFS say about tomorrow?"
 * - "Show me the ECMWF forecast"
 * - "What does the weather model predict?"
 * - "Compare GFS and ECMWF"
 * - "NWP forecast for Delhi"
 * - "What do the models say?"
 * 
 * @param {string} text - User message
 * @returns {boolean}
 */
export function isNWPIntent(text) {
  if (!text || typeof text !== 'string') return false
  const trimmed = text.toLowerCase().trim()
  
  // NWP-specific patterns
  const nwpPatterns = [
    /\bnwp\b/i,
    /\bgfs\b/i,
    /\becmwf\b/i,
    /\bgrapes\b/i,
    /\bifs\b/i,
    /weather\s+model/i,
    /numerical\s+weather/i,
    /model\s+forecast/i,
    /model\s+predict/i,
    /what\s+(does|do)\s+(the\s+)?(model|gfs|ecmwf)/i,
    /show.*model/i,
    /compare.*(model|gfs|ecmwf)/i,
    /(gfs|ecmwf).*forecast/i,
    /(gfs|ecmwf).*predict/i,
    /forecast\s+model/i,
    /prediction\s+model/i,
  ]
  
  return nwpPatterns.some((pattern) => pattern.test(trimmed))
}

/**
 * Extract requested NWP model from query.
 * 
 * @param {string} text - User message
 * @returns {{ model: 'gfs'|'ecmwf'|'both'|null, comparison: boolean }}
 */
export function extractNWPModel(text) {
  if (!text || typeof text !== 'string') {
    return { model: null, comparison: false }
  }
  
  const trimmed = text.toLowerCase()
  
  // Check for comparison request
  const isComparison = /compare.*(gfs|ecmwf|model)/i.test(trimmed) ||
                       /(gfs|ecmwf).*and.*(gfs|ecmwf)/i.test(trimmed) ||
                       /both\s+model/i.test(trimmed)
  
  if (isComparison) {
    return { model: 'both', comparison: true }
  }
  
  // Check for specific model
  const hasGFS = /\bgfs\b/i.test(trimmed) || /\bgrapes\b/i.test(trimmed)
  const hasECMWF = /\becmwf\b/i.test(trimmed) || /\bifs\b/i.test(trimmed)
  
  if (hasGFS && !hasECMWF) {
    return { model: 'gfs', comparison: false }
  }
  
  if (hasECMWF && !hasGFS) {
    return { model: 'ecmwf', comparison: false }
  }
  
  // Default to ECMWF for generic model queries
  return { model: 'ecmwf', comparison: false }
}

// ─── Climate trend intent detection ───────────────────────────────────────────
/**
 * Detects queries asking for long-term climate trend analysis.
 * 
 * Examples:
 * - "Temperature trend over 10 years"
 * - "How has rainfall changed in Mumbai?"
 * - "Show 5-year rainfall trend"
 * - "Is average temperature increasing?"
 * 
 * @param {string} text - User message
 * @returns {boolean}
 */
export function isClimateTrendIntent(text) {
  if (!text || typeof text !== 'string') return false
  const trimmed = text.toLowerCase().trim()
  
  const climateTrendPatterns = [
    /climate\s+trend/i,
    /temperature\s+trend/i,
    /rainfall\s+trend/i,
    /\d+[-\s]year\s+trend/i,
    /over\s+(the\s+)?(last|past)\s+\d+\s+year/i,
    /how\s+has.*(temperature|rainfall|weather).*changed/i,
    /(temperature|rainfall).*increasing/i,
    /(temperature|rainfall).*decreasing/i,
    /annual\s+(temperature|rainfall)/i,
    /year.*year.*(temperature|rainfall|climate)/i,
    /long[-\s]term.*(weather|climate|temperature|rainfall)/i,
    /climate\s+analysis/i,
    /climate\s+data/i,
  ]
  
  return climateTrendPatterns.some((pattern) => pattern.test(trimmed))
}

/**
 * Extract climate analysis period from query.
 * 
 * @param {string} text - User message
 * @returns {number} Years to analyze (5 or 10, default 5)
 */
export function extractClimatePeriod(text) {
  if (!text || typeof text !== 'string') return 5
  
  const yearMatch = text.match(/(\d+)[-\s]year/i)
  if (yearMatch) {
    const years = parseInt(yearMatch[1], 10)
    if (years >= 10) return 10
    if (years >= 5) return 5
    return 5
  }
  
  // Default to 5 years
  return 5
}

// ─── IMD-specific intent detection ────────────────────────────────────────────

/**
 * Detects queries asking for official IMD weather warnings
 * 
 * Examples:
 *   - "Are there any weather warnings for my district?"
 *   - "Show me IMD alerts"
 *   - "Any official weather advisory?"
 * 
 * @param {string} text - User message text
 * @returns {boolean}
 */
export function isIMDWarningIntent(text) {
  if (!text || typeof text !== 'string') return false
  const trimmed = text.toLowerCase().trim()

  const warningKeywords = /\b(warning|alert|advisory|caution|notice|bulletin|imd|india\s+meteorological|official|government)\b/i
  const weatherKeywords = /\b(weather|storm|rain|cyclone|flood|heat|cold|wind|fog|thunderstorm)\b/i

  // Direct warning questions
  if (/\b(any|are\s+there|show|check|get)\s+(weather\s+)?(warning|alert|advisory|imd)/i.test(trimmed)) {
    return true
  }

  return warningKeywords.test(trimmed) && weatherKeywords.test(trimmed)
}

/**
 * Detects queries asking for IMD nowcast (short-term forecast)
 * 
 * Examples:
 *   - "What's the weather for the next 3 hours?"
 *   - "Will it rain in the next few hours?"
 *   - "Nowcast for my area"
 * 
 * @param {string} text - User message text
 * @returns {boolean}
 */
export function isIMDNowcastIntent(text) {
  if (!text || typeof text !== 'string') return false
  const trimmed = text.toLowerCase().trim()

  const nowcastKeywords = /\b(nowcast|now\s*cast|short[\s-]?term|next\s+(few\s+)?(hour|2\s*hour|3\s*hour)|coming\s+hour)/i
  // Only explicit sub-hourly windows (NOT "right now", "soon", "shortly" — those are
  // normal current-weather phrases and must NOT trigger the IMD path)
  const subHourlyKeywords = /\b(next\s+(1|2|3)\s+hour|within\s+(the\s+)?(next\s+)?(1|2|3)\s+hour)/i

  if (nowcastKeywords.test(trimmed)) return true

  // Sub-hourly window + weather topic → genuine nowcast intent
  if (subHourlyKeywords.test(trimmed) && /\b(rain|weather|storm|wind)/i.test(trimmed)) {
    return true
  }

  return false
}

/**
 * Detects queries asking for rainfall data or forecasts
 * 
 * Examples:
 *   - "How much rain did we get?"
 *   - "What's the rainfall in my district?"
 *   - "Rainfall forecast for next 5 days"
 *   - "बारिश कितनी हुई?" (Hindi)
 *   - "पाऊस किती पडला?" (Marathi)
 * 
 * @param {string} text - User message text
 * @returns {boolean}
 */
export function isIMDRainfallIntent(text) {
  if (!text || typeof text !== 'string') return false
  const trimmed = text.toLowerCase().trim()

  // English rainfall keywords
  const rainfallKeywords = /\b(rainfall|rain\s+fall|precipitation|rain\s+(data|amount|received|recorded|total))/i
  
  // Romanized Hindi/Marathi
  const rainfallRoman = /\b(barish\s+(kitni|kitna)|paus\s+(kiti|kitna))/i
  
  // District/state rainfall patterns
  const districtRainfall = /\b(district|state|area|region).{0,20}(rainfall|rain)/i
  
  // Indian language rainfall queries
  const rainfallIndian = /(बारिश\s+कितनी|पाऊस\s+किती|వర్షపాతం|மழை\s+அளவு|বৃষ্টি)/
  
  // Rainfall forecast patterns
  const rainfallForecast = /\b(rainfall|rain).{0,20}(forecast|prediction|expected|coming)/i

  return rainfallKeywords.test(trimmed) || 
         rainfallRoman.test(trimmed) ||
         districtRainfall.test(trimmed) ||
         rainfallIndian.test(trimmed) ||
         rainfallForecast.test(trimmed)
}

/**
 * Detects farming/agriculture queries that need IMD data
 * 
 * Examples:
 *   - "Should I irrigate my crops?"
 *   - "Is it good for planting?"
 *   - "When should I harvest?"
 *   - "खेती के लिए मौसम कैसा है?" (Hindi)
 * 
 * @param {string} text - User message text
 * @returns {boolean}
 */
export function isFarmingIntent(text) {
  if (!text || typeof text !== 'string') return false
  const trimmed = text.toLowerCase().trim()

  // Farming activities
  const farmingActivities = /\b(plant|planting|sow|sowing|harvest|harvesting|irrigate|irrigation|spray|spraying|fertiliz|crop|field|farm|agriculture|kheti|sheti)/i
  
  // Decision questions
  const decisionKeywords = /\b(should|can\s+i|safe\s+to|good\s+(for|time)|right\s+time|suitable|okay\s+to)/i
  
  // Indian language farming terms
  const farmingIndian = /(खेती|शेती|వ్యవసాయం|விவசாயம|কৃষি|పంట)/

  return (farmingActivities.test(trimmed) && decisionKeywords.test(trimmed)) ||
         (farmingActivities.test(trimmed) && /\b(weather|rain|mausam|havaaman)/i.test(trimmed)) ||
         farmingIndian.test(trimmed)
}

/**
 * Checks if query needs IMD data (warnings, nowcast, or rainfall)
 * 
 * @param {string} text - User message text
 * @returns {boolean}
 */
export function needsIMDData(text) {
  // ONLY explicit IMD queries should trigger IMD fetch
  // Normal weather queries (including farming decisions) use Open-Meteo
  return isIMDWarningIntent(text) || 
         isIMDNowcastIntent(text) || 
         isIMDRainfallIntent(text)
}


// ─── Time Period Detection ───────────────────────────────────────────────────
/**
 * Detects if query is asking for a specific time period (morning/afternoon/evening/night)
 * These require hourly forecast data instead of generic daily forecasts.
 */
export function isTimePeriodQuery(text) {
  if (!text || typeof text !== 'string') return false
  
  const normalized = text.toLowerCase()
  
  // Time period keywords in multiple languages
  const periodPatterns = /\b(morning|afternoon|evening|night|सुबह|दोपहर|शाम|रात|सकाळ|दुपार|संध्याकाळ|रात्र|ఉదయం|మధ్యాహ్నం|సాయంత్రం|రాత్రి|காலை|மதியம்|மாலை|இரவு|সকাল|দুপুর|সন্ধ্যা|রাত)\b/i
  
  return periodPatterns.test(normalized)
}
