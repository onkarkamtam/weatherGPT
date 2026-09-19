/**
 * WeatherGPT Express server — secure Gemini AI proxy + conversation persistence.
 *
 * Endpoints:
 *   GET  /api/health           → liveness check
 *   POST /api/chat             → calls Gemini with grounded system prompt + history
 *   POST /api/auth/signup      → create new user account
 *   POST /api/auth/login       → login with email/password
 *   POST /api/auth/logout      → logout user
 *   GET  /api/auth/me          → get current user info
 *   GET  /api/conversations    → list user's conversations
 *   POST /api/conversations    → create new conversation
 *   GET  /api/conversations/:id → get conversation with messages
 *   PATCH /api/conversations/:id → update conversation title
 *   DELETE /api/conversations/:id → delete conversation
 *
 * In production: also serves the React build from /dist via express.static.
 *
 * Environment: loaded by loader.js which reads server/.env
 * Dev:  npm run dev (runs via loader.js)
 * Prod: node server/loader.js (also serves dist/)
 * 
 * NOTE: This file MUST be imported via loader.js to ensure environment variables
 * are loaded before ES module static imports execute.
 */
import express from 'express'
import { GoogleGenAI } from '@google/genai'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

// Import routes
import authRoutes from './routes/auth.js'
import conversationRoutes from './routes/conversations.js'
import { setupIMDRoutes } from './routes/imd_disabled.js'
import { authenticate, optionalAuth } from './middleware/auth.js'
import { supabaseAdmin } from './database/supabase.js'

// Import NWP providers
import { GFSGRAPESProvider } from './providers/GFSGRAPESProvider.js'
import { ECMWFIFSProvider } from './providers/ECMWFIFSProvider.js'

// Import IMD CAP provider (public RSS feed — no API key required)
import { fetchIMDCAPAlerts, resolveLocationToState, filterAlertsByState } from './providers/IMDCAPProvider.js'

// Import cache (IMD providers disabled - no public source available)
import cache, { TTL } from './cache.js'
import { ProviderError } from './providers/BaseWeatherProvider.js'

// Resolve __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const { GEMINI_API_KEY, PORT = 3001 } = process.env

// Only validate on startup, not on import (for Vercel compatibility)
if (process.env.VERCEL !== '1') {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your_gemini_api_key_here') {
    console.error('\n❌ GEMINI_API_KEY is missing or is still the placeholder.')
    console.error('   Add your key to server/.env → GEMINI_API_KEY=<your_key>')
    process.exit(1)
  }
}

// Initialise the Gen AI client
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })

const app = express()
app.use(express.json({ limit: '16kb' }))

// ─── Mount routes ─────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes)
app.use('/api/conversations', conversationRoutes)

// Setup IMD routes (all disabled - return unavailable)
setupIMDRoutes(app)

// ─── Health check ─────────────────────────────────────────────────────────────
// Primary is the model with the most available quota/capacity.
// Fallbacks are tried in order if the primary returns 429 or 503.
const PRIMARY_MODEL   = 'gemini-3.5-flash-lite'
const FALLBACK_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-3.6-flash']

// ─── NWP Forecast Endpoint ────────────────────────────────────────────────────
/**
 * GET /api/nwp-forecast
 * 
 * Fetch explicit NWP model forecast (GFS GRAPES or ECMWF IFS)
 * 
 * Query parameters:
 *   - lat: Latitude (required)
 *   - lon: Longitude (required)
 *   - model: Model name - 'gfs'|'grapes'|'ecmwf'|'ifs' (default: 'ecmwf')
 *   - days: Forecast days 1-15 (default: 7)
 * 
 * Returns:
 *   - location: { latitude, longitude }
 *   - model: { name, fullName, provider, resolution, forecastHorizon, ... }
 *   - forecast: [ { time, temperature, humidity, precipitation, ... }, ... ]
 *   - generatedAt: ISO timestamp
 *   - timezone: Location timezone
 *   - units: { temperature, precipitation, windSpeed, pressure }
 */
app.get('/api/nwp-forecast', async (req, res) => {
  try {
    const { lat, lon, model = 'ecmwf', days = '7' } = req.query

    // Validate required parameters
    if (!lat || !lon) {
      return res.status(400).json({
        error: 'Missing required parameters: lat and lon are required',
      })
    }

    const latitude = parseFloat(lat)
    const longitude = parseFloat(lon)
    const forecastDays = parseInt(days)

    // Validate coordinates
    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        error: 'Invalid coordinates: lat and lon must be valid numbers',
      })
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        error: 'Invalid coordinates: latitude must be -90 to 90, longitude -180 to 180',
      })
    }

    // Validate forecast days
    if (isNaN(forecastDays) || forecastDays < 1 || forecastDays > 15) {
      return res.status(400).json({
        error: 'Invalid days: must be a number between 1 and 15',
      })
    }

    // Round coordinates to 2 decimal places for cache key consistency
    const roundedLat = Math.round(latitude * 100) / 100
    const roundedLon = Math.round(longitude * 100) / 100

    // Check cache first
    const cacheKey = { lat: roundedLat, lon: roundedLon, model, days: forecastDays }
    const cached = cache.get('nwp', cacheKey)
    if (cached) {
      console.log('[NWP] Returning cached forecast')
      return res.json(cached)
    }

    // Select provider based on model parameter
    let provider
    const modelLower = model.toLowerCase()

    switch (modelLower) {
      case 'gfs':
      case 'grapes':
      case 'cma':
        provider = new GFSGRAPESProvider()
        console.log('[NWP] Using CMA GFS GRAPES provider')
        break
      
      case 'ecmwf':
      case 'ifs':
      case 'euro':
        provider = new ECMWFIFSProvider()
        console.log('[NWP] Using ECMWF IFS provider')
        break
      
      default:
        return res.status(400).json({
          error: `Invalid model: '${model}'. Use: 'gfs', 'grapes', 'ecmwf', or 'ifs'`,
        })
    }

    // Fetch forecast
    console.log(`[NWP] Fetching ${provider.getName()} forecast for (${latitude}, ${longitude}), ${forecastDays} days`)
    const startTime = Date.now()

    const forecast = await provider.fetchForecast({
      lat: latitude,
      lon: longitude,
      days: forecastDays,
      variables: provider.getDefaultVariables(),
    })

    const elapsedMs = Date.now() - startTime
    console.log(`[NWP] ✓ ${provider.getName()} forecast fetched in ${elapsedMs}ms (${forecast.forecast.length} hours)`)

    // Cache the result
    cache.set('nwp', cacheKey, forecast, TTL.NWP_FORECAST)

    res.json(forecast)
  } catch (error) {
    console.error('[NWP] Error:', error)

    if (error instanceof ProviderError) {
      return res.status(502).json({
        error: `${error.providerName} error: ${error.message}`,
      })
    }

    res.status(500).json({
      error: 'Failed to fetch NWP forecast. Please try again.',
    })
  }
})

// ─── IMD CAP Alerts Endpoint ──────────────────────────────────────────────────
/**
 * GET /api/imd-alerts
 * 
 * Returns real IMD weather alerts from the public CAP RSS feed.
 * Optional ?location=Pune query resolves to a state and filters alerts.
 * 
 * Source: https://cap-sources.s3.amazonaws.com/in-imd-en/rss.xml
 * Auth: None required. Public domain feed.
 */
app.get('/api/imd-alerts', async (req, res) => {
  const { location } = req.query

  try {
    const result = await fetchIMDCAPAlerts()

    let alerts = result.alerts
    let state  = null
    let matchedAlerts = null

    if (location) {
      state = resolveLocationToState(location)
      console.log('[IMD CAP] Location:', location)
      console.log('[IMD CAP] State:', state || '(unmapped)')

      if (state) {
        matchedAlerts = filterAlertsByState(alerts, state)
        console.log('[IMD CAP] Matching alerts:', matchedAlerts.length)
      }
    }

    return res.json({
      source:       result.source,
      sourceUrl:    result.sourceUrl,
      fetchedAt:    result.fetchedAt,
      sourceStatus: result.sourceStatus,
      ...(result.warning && { warning: result.warning }),
      // If location was specified, return filtered set (may be empty) + resolved state
      ...(location && {
        requestedLocation: location,
        resolvedState:     state,
        alerts: matchedAlerts || [],       // filtered (may be [])
        allAlerts: alerts,                  // full feed for context
        matchCount: matchedAlerts ? matchedAlerts.length : 0,
      }),
      // If no location filter, return all alerts
      ...(!location && {
        alerts,
        alertCount: alerts.length,
      }),
    })
  } catch (err) {
    console.error('[IMD CAP] /api/imd-alerts error:', err.message)
    return res.status(503).json({
      error:  'IMD CAP feed is currently unavailable.',
      detail: err.message,
    })
  }
})

// ─── Gemini chat proxy with optional conversation persistence ────────────────
app.post('/api/chat', optionalAuth, async (req, res) => {
  const { userMessage, history = [], systemPrompt, conversationId, location, enableGoogleSearch = false } = req.body

  // Input validation
  if (!userMessage || typeof userMessage !== 'string' || !userMessage.trim()) {
    return res.status(400).json({
      error: 'userMessage is required and must be a non-empty string.',
    })
  }

  if (userMessage.length > 600) {
    return res.status(400).json({
      error: 'Message too long (max 600 characters).',
    })
  }

  if (!Array.isArray(history)) {
    return res.status(400).json({
      error: 'history must be an array.',
    })
  }

  // ── Diagnostic logging ───────────────────────────────────────────────────
  const hasWeatherData = systemPrompt?.includes('VERIFIED LIVE WEATHER DATA') || systemPrompt?.includes('VERIFIED HOURLY FORECAST DATA')
  console.log(`[/api/chat] model=${PRIMARY_MODEL} msg="${userMessage.slice(0, 60)}" | grounded=${hasWeatherData} | googleSearch=${enableGoogleSearch} | history=${history.length} turns | promptChars=${systemPrompt?.length ?? 0}`)
  if (!hasWeatherData && systemPrompt && !enableGoogleSearch) {
    console.warn('[/api/chat] ⚠️ No live weather data and no Google Search — Gemini will respond without grounding')
  }
  // ─────────────────────────────────────────────────────────────────────────

  // Build Gemini contents: past history + current user turn
  const contents = [
    ...history,
    { role: 'user', parts: [{ text: userMessage.trim() }] },
  ]

  const modelsToTry = [PRIMARY_MODEL, ...FALLBACK_MODELS]
  let lastError = null
  let aiResponseText = null

  for (const modelName of modelsToTry) {
    const t0 = Date.now()
    try {
      // Build config with conditional Google Search grounding
      const genConfig = {
        systemInstruction:
          systemPrompt ||
          'You are WeatherGPT, a helpful Indian weather assistant.',
        maxOutputTokens: 450,
        temperature: 0.35,
      }

      // Add Google Search tool if requested (for IMD queries)
      const tools = enableGoogleSearch ? [{ type: 'google_search' }] : undefined

      const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config: genConfig,
        ...(tools && { tools })
      })

      const elapsedMs = Date.now() - t0
      const candidate = response.candidates?.[0]
      const finishReason = candidate?.finishReason
      const usage = response.usageMetadata
      const text = response.text

      console.log(
        `[/api/chat] gemini (${modelName}) done ${elapsedMs}ms finish=${finishReason ?? 'n/a'} ` +
        `visibleChars=${typeof text === 'string' ? text.length : 0} ` +
        `thoughts=${usage?.thoughtsTokenCount ?? 0} ` +
        `out=${usage?.candidatesTokenCount ?? 0} total=${usage?.totalTokenCount ?? 0}`
      )

      if (typeof text !== 'string' || !text.trim()) {
        console.error(`[/api/chat] empty visible text with ${modelName}`)
        continue
      }

      console.log(`[/api/chat] ✓ Gemini (${modelName}) responded (${text.length} chars)`)
      aiResponseText = text.trim()
      break // Success
    } catch (err) {
      const elapsedMs = Date.now() - t0
      const message = err?.message ?? String(err)
      const status = err?.status ?? err?.statusCode
      console.warn(`[Gemini Error on ${modelName}] ${elapsedMs}ms status=${status ?? 'n/a'}: ${message.slice(0, 150)}`)
      lastError = err
    }
  }

  // ── Return response immediately (don't wait for database) ───────────────────
  if (aiResponseText) {
    const responseData = { 
      text: aiResponseText,
      conversationId: conversationId
    }
    
    // Send response to user immediately
    res.json(responseData)
    
    // Save assistant response to database asynchronously (non-blocking)
    // This happens in the background after user receives response
    if (conversationId && req.user) {
      console.log('[/api/chat] Scheduling async save of assistant message')
      // Use setImmediate/Promise to not block response
      Promise.resolve().then(async () => {
        try {
          console.log('[/api/chat] Saving assistant message to conversation:', conversationId)
          const { error: msgError } = await supabaseAdmin
            .from('messages')
            .insert({
              conversation_id: conversationId,
              role: 'assistant',
              content: aiResponseText,
              location_label: location?.label || null,
              latitude: location?.lat || null,
              longitude: location?.lon || null
            })
          
          if (msgError) {
            console.error('[/api/chat] Failed to save assistant message:', msgError)
            console.error('[/api/chat] Assistant message error details:', JSON.stringify(msgError, null, 2))
            return
          }
          
          console.log('[/api/chat] ✅ Saved assistant message')
          
          // Update conversation title if this is the first exchange
          const { count } = await supabaseAdmin
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conversationId)
          
          console.log('[/api/chat] Message count in conversation:', count)
          
          if (count === 2) { // First user + assistant message
            const title = generateConversationTitle(userMessage.trim())
            console.log('[/api/chat] Updating conversation title to:', title)
            await supabaseAdmin
              .from('conversations')
              .update({ title })
              .eq('id', conversationId)
            console.log('[/api/chat] ✅ Updated conversation title')
          }
        } catch (dbErr) {
          console.error('[/api/chat] Background DB save error:', dbErr)
          console.error('[/api/chat] Background DB save error stack:', dbErr.stack)
        }
      })
    } else {
      if (!conversationId) {
        console.warn('[/api/chat] No conversationId - skipping assistant message save')
      }
      if (!req.user) {
        console.warn('[/api/chat] No authenticated user - skipping assistant message save')
      }
    }
    
    return // Response already sent
  }

  const message = lastError?.message ?? String(lastError)
  const isQuotaErr = message.includes('429') || message.toLowerCase().includes('quota')
  const isRateLimit = message.includes('429') || message.toLowerCase().includes('rate')

  return res.status(502).json({
    error: isQuotaErr || isRateLimit
      ? 'Our AI is busy right now due to high demand. Your weather data is still accurate. Please try again in a moment.'
      : 'AI service is temporarily unavailable. Your weather information is still shown below.',
  })
})

// Helper function for title generation (same as in conversations.js)
function generateConversationTitle(message) {
  const msg = message.toLowerCase().trim()
  
  if (/weather|mausam|havaaman|वातावरण|వాతావరణం|வானிலை|আবহাওয়া/.test(msg)) {
    const locationMatch = msg.match(/\b(?:in|at|for|में|मध्ये|లో|இல்|এ)\s+([a-z\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F]+)/i)
    if (locationMatch) {
      const location = locationMatch[1].charAt(0).toUpperCase() + locationMatch[1].slice(1)
      return `Weather in ${location}`
    }
    return 'Weather Query'
  }
  
  if (/compar|तुलना|పోలిక|ஒப்பீடு|তুলনা/.test(msg)) {
    return 'Weather Comparison'
  }
  
  if (/rain|barish|paus|paos|వర్షం|மழை|বৃষ্টি/.test(msg)) {
    return 'Rainfall Query'
  }
  
  if (/farm|crop|खेत|शेत|వ్యవసాయం|விவசாயம|কৃষি/.test(msg)) {
    return 'Farming Advisory'
  }
  
  if (/travel|trip|यात्रा|प्रवास|ప్రయాణం|பயணம|ভ্রমণ/.test(msg)) {
    return 'Travel Weather'
  }
  
  if (/temperature|temp|तापमान|ఉష్ణోగ్రత|வெப்பநிலை|তাপমাত্রা/.test(msg)) {
    return 'Temperature Query'
  }
  
  const cleanMsg = message.replace(/[^\w\s\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F]/g, '').trim()
  return cleanMsg.length > 50 ? cleanMsg.slice(0, 47) + '...' : cleanMsg || 'New Conversation'
}

// ─── Serve React build in production ─────────────────────────────────────────
const distPath = path.join(__dirname, '..', 'dist')

if (fs.existsSync(distPath)) {
  // Serve static files from dist/
  app.use(express.static(distPath))

  // Catch-all for React Router - serves index.html for all non-API routes
  // This MUST come last, after all API routes
  app.use((req, res, next) => {
    // Skip API routes - they should have been handled by now
    if (req.path.startsWith('/api/')) {
      return next() // Will result in 404 for unmatched API routes
    }
    // Serve React SPA for all other routes
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

// Only start the server if not being imported (i.e., run directly via loader.js)
// This allows Vercel to import the app without auto-starting the server
if (process.env.VERCEL !== '1') {
  app.listen(Number(PORT), () => {
    console.log(`✅ WeatherGPT server → http://localhost:${PORT}`)
    console.log(`   Primary model: ${PRIMARY_MODEL} (fallbacks: ${FALLBACK_MODELS.join(', ')})`)

    if (!fs.existsSync(distPath)) {
      console.log('   (dist/ not found — production static serving disabled)')
    }
  })
}

// Export the Express app for Vercel serverless functions
export default app