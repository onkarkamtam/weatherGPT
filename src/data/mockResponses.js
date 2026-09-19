/**
 * mockResponses.js — Static mock AI responses for Phase 1.
 *
 * Structure acts as a clear API contract.
 * Phase 2+: replace this with real calls to the WeatherGPT backend/LLM.
 *
 * Each entry has:
 *  - text: plain text AI reply
 *  - card: optional card data (null = text-only reply)
 *    - type: 'weather' | 'alert' | 'travel' | 'farmer'
 *    - data: card-specific payload
 */

/** Quick prompt → mock response map */
export const QUICK_PROMPT_RESPONSES = {
  'Will it rain today?': {
    text: "Yes, there's a moderate chance of rain this afternoon. Here's the current weather picture for your area:",
    card: {
      type: 'weather',
      data: {
        condition: 'Partly Cloudy',
        conditionCode: 'partly-cloudy',
        temp: 28,
        feelsLike: 32,
        humidity: 74,
        wind: 18,
        windDir: 'SW',
        rainChance: 65,
        summary: 'Expect scattered showers between 3 PM – 7 PM. Carry an umbrella if stepping out.',
      },
    },
  },

  'Are there any weather alerts?': {
    text: 'Yes, the India Meteorological Department has issued an active alert for your district:',
    card: {
      type: 'alert',
      data: {
        severity: 'high',
        title: 'Heavy Rain Warning',
        issuer: 'India Meteorological Department',
        issued: 'Today, 9:00 AM',
        validUntil: 'Today, 11:59 PM',
        description:
          'Extremely heavy rainfall (≥ 204.4 mm/day) expected. Risk of flash flooding in low-lying areas. Avoid unnecessary travel.',
        affectedAreas: ['Vaishali', 'Patna Rural', 'Saran'],
        doList: ['Stay indoors', 'Keep emergency kit ready', 'Monitor local updates'],
        dontList: ['Avoid river banks', 'Do not travel through flooded roads'],
      },
    },
  },

  'Is it safe to travel this evening?': {
    text: "Here's your travel advisory for this evening:",
    card: {
      type: 'travel',
      data: {
        safetyLevel: 'caution', // 'safe' | 'caution' | 'danger'
        route: 'Local travel',
        timeWindow: 'This evening (5 PM – 9 PM)',
        summary: 'Wet roads and reduced visibility expected due to rain. Travel with caution.',
        conditions: ['Wet roads', 'Low visibility', 'Possible waterlogging'],
        recommendation:
          'Prefer public transport or delay travel until after 9 PM when showers are expected to subside.',
        emergencyContact: '112',
      },
    },
  },

  'Give me a farmer advisory': {
    text: "Here's today's farming advisory based on the weather conditions in your area:",
    card: {
      type: 'farmer',
      data: {
        cropFocus: 'Paddy / Kharif Crops',
        riskLevel: 'medium', // 'low' | 'medium' | 'high'
        weatherSummary: 'Heavy rain forecast for next 48 hours with strong southwesterly winds.',
        advisories: [
          'Postpone pesticide / fertiliser application — rain will wash it away.',
          'Ensure proper drainage in paddy fields to prevent waterlogging.',
          'Harvest any mature crops before 2 PM today if possible.',
          'Tie or stake tall crops to prevent lodging from strong winds.',
        ],
        bestActivityWindow: 'Tomorrow morning, 6 AM – 10 AM',
        source: 'IMD Agromet Advisory',
      },
    },
  },
}

/** Fallback response for free-form user messages when AI fails */
export const FALLBACK_RESPONSE = {
  text: "I'm having trouble processing your request right now. Please try again in a moment.",
  card: null,
}

/** Initial greeting message shown on Chat screen load */
export const GREETING_MESSAGE = {
  id: 'greeting',
  role: 'ai',
  text: null, // rendered separately as the greeting card
  isGreeting: true,
}
