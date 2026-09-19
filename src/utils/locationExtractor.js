/**
 * locationExtractor.js — Extracts explicit location mentions from user queries
 * 
 * Detects city names in English, Hindi, Marathi, Telugu, Tamil, and Bengali queries
 * to override the default UI-selected location.
 * 
 * Priority:
 * 1. Explicit location in current query
 * 2. Conversation location context
 * 3. UI-selected location
 */

// Common Indian cities in English (extensible list)
const INDIAN_CITIES = [
  // Major metros
  'mumbai', 'delhi', 'bangalore', 'bengaluru', 'kolkata', 'chennai', 'hyderabad',
  'ahmedabad', 'pune', 'surat', 'jaipur', 'lucknow', 'kanpur', 'nagpur', 'indore',
  'thane', 'bhopal', 'visakhapatnam', 'vizag', 'pimpri-chinchwad', 'patna',
  'vadodara', 'ghaziabad', 'ludhiana', 'agra', 'nashik', 'faridabad', 'meerut',
  'rajkot', 'kalyan-dombivali', 'vasai-virar', 'varanasi', 'srinagar', 'aurangabad',
  'dhanbad', 'amritsar', 'navi mumbai', 'allahabad', 'prayagraj', 'ranchi',
  'howrah', 'coimbatore', 'jabalpur', 'gwalior', 'vijayawada', 'jodhpur',
  'madurai', 'raipur', 'kota', 'guwahati', 'chandigarh', 'solapur', 'hubballi',
  'tiruchirappalli', 'tiruppur', 'moradabad', 'mysore', 'mysuru', 'bareilly',
  'gurgaon', 'gurugram', 'aligarh', 'jalandhar', 'bhubaneswar', 'salem', 'mira-bhayandar',
  'warangal', 'guntur', 'bhiwandi', 'saharanpur', 'gorakhpur', 'bikaner', 'amravati',
  'noida', 'jamshedpur', 'bhilai', 'cuttack', 'firozabad', 'kochi', 'cochin',
  'nellore', 'bhavnagar', 'dehradun', 'durgapur', 'asansol', 'rourkela', 'nanded',
  'kolhapur', 'ajmer', 'akola', 'gulbarga', 'jamnagar', 'ujjain', 'loni', 'siliguri',
  'jhansi', 'ulhasnagar', 'jammu', 'sangli-miraj-kupwad', 'mangalore', 'erode',
  'belgaum', 'belagavi', 'ambattur', 'tirunelveli', 'malegaon', 'gaya', 'jalgaon',
  'udaipur', 'maheshtala', 'davanagere', 'kozhikode', 'calicut', 'kurnool',
  'satara', 'shimla', 'panaji', 'goa', 'pondicherry', 'puducherry',
]

// Hindi/Marathi/Telugu transliterations and native scripts
const CITY_TRANSLITERATIONS = {
  // Hindi/Marathi romanization
  'mumbai': ['मुंबई', 'mumbai', 'bombay'],
  'delhi': ['दिल्ली', 'दिल्ली', 'delhi', 'dilli'],
  'pune': ['पुणे', 'pune', 'poona'],
  'bangalore': ['बेंगलुरु', 'बेंगलूरु', 'bangalore', 'bengaluru', 'बैंगलोर'],
  'hyderabad': ['हैदराबाद', 'हैदराबाद్', 'hyderabad', 'haiderabad'],
  'chennai': ['चेन्नई', 'சென்னை', 'chennai', 'madras'],
  'kolkata': ['कोलकाता', 'কলকাতা', 'kolkata', 'calcutta'],
  'ahmedabad': ['अहमदाबाद', 'ahmedabad', 'amdavad'],
  'surat': ['सूरत', 'surat'],
  'jaipur': ['जयपुर', 'jaipur'],
  'lucknow': ['लखनऊ', 'lucknow', 'lakhnau'],
  'nagpur': ['नागपुर', 'nagpur'],
  'indore': ['इंदौर', 'indore'],
  'patna': ['पटना', 'patna'],
  'bhopal': ['भोपाल', 'bhopal'],
  'agra': ['आगरा', 'agra'],
  'nashik': ['नाशिक', 'nashik', 'nasik'],
  'varanasi': ['वाराणसी', 'varanasi', 'banaras', 'kashi'],
  'solapur': ['सोलापूर', 'solapur', 'sholapur'],
  'thane': ['ठाणे', 'thane'],
  'kalyan': ['कल्याण', 'kalyan'],
}

// Location indicators in multiple languages
const LOCATION_PATTERNS = {
  // English patterns
  en: /\b(?:in|at|for|near|around|from)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/gi,
  
  // Hindi: में (mein), का (ka), की (ki), के (ke), पर (par)
  hi: /\b([A-Za-z\u0900-\u097F]+)\s*(?:में|का|की|के|पर|से)\b/gi,
  
  // Marathi: मध्ये (madhye), च्या (chya), ला (la)
  mr: /\b([A-Za-z\u0900-\u097F]+)\s*(?:मध्ये|च्या|ला|येथे|येथील)\b/gi,
  
  // Telugu: లో (lo), కి (ki), లొ (lo)
  te: /\b([A-Za-z\u0C00-\u0C7F]+)\s*(?:లో|కి|లొ|వద్ద)\b/gi,
  
  // Tamil: இல் (il), க்கு (kku)
  ta: /\b([A-Za-z\u0B80-\u0BFF]+)\s*(?:இல்|க்கு|இன்|ல்)\b/gi,
  
  // Bengali: এ (e), তে (te), র (r)
  bn: /\b([A-Za-z\u0980-\u09FF]+)\s*(?:এ|তে|এর|য়|তে)\b/gi,
}

/**
 * Extracts explicit location mention from user query
 * 
 * @param {string} query - User's message
 * @returns {string|null} - Extracted location name or null
 */
export function extractLocationFromQuery(query) {
  if (!query || typeof query !== 'string') return null
  
  const normalized = query.trim().toLowerCase()
  
  // Try English pattern first (most common)
  const enMatches = [...normalized.matchAll(LOCATION_PATTERNS.en)]
  if (enMatches.length > 0) {
    const candidate = enMatches[0][1].toLowerCase()
    if (INDIAN_CITIES.includes(candidate)) {
      return candidate
    }
  }
  
  // Check for direct city name mentions (without prepositions)
  for (const city of INDIAN_CITIES) {
    // Word boundary check for exact city name
    const regex = new RegExp(`\\b${city}\\b`, 'i')
    if (regex.test(normalized)) {
      return city
    }
  }
  
  // Check Hindi/Marathi patterns
  const hiMatches = [...query.matchAll(LOCATION_PATTERNS.hi)]
  for (const match of hiMatches) {
    const candidate = match[1].toLowerCase()
    for (const [city, variants] of Object.entries(CITY_TRANSLITERATIONS)) {
      if (variants.some(v => v.toLowerCase() === candidate || query.includes(v))) {
        return city
      }
    }
  }
  
  // Check Marathi patterns
  const mrMatches = [...query.matchAll(LOCATION_PATTERNS.mr)]
  for (const match of mrMatches) {
    const candidate = match[1].toLowerCase()
    for (const [city, variants] of Object.entries(CITY_TRANSLITERATIONS)) {
      if (variants.some(v => v.toLowerCase() === candidate || query.includes(v))) {
        return city
      }
    }
  }
  
  // Check Telugu patterns
  const teMatches = [...query.matchAll(LOCATION_PATTERNS.te)]
  for (const match of teMatches) {
    const candidate = match[1].toLowerCase()
    for (const [city, variants] of Object.entries(CITY_TRANSLITERATIONS)) {
      if (variants.some(v => query.includes(v))) {
        return city
      }
    }
  }
  
  // Check native script city names directly in query
  for (const [city, variants] of Object.entries(CITY_TRANSLITERATIONS)) {
    for (const variant of variants) {
      if (query.includes(variant)) {
        return city
      }
    }
  }
  
  return null
}

/**
 * Checks if query mentions a specific location
 * 
 * @param {string} query - User's message
 * @returns {boolean}
 */
export function hasExplicitLocation(query) {
  return extractLocationFromQuery(query) !== null
}

