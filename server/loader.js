/**
 * Environment loader for WeatherGPT backend
 * 
 * This script loads environment variables BEFORE any ES modules are imported.
 * It must be run as: node server/loader.js
 * 
 * Why: ES module static imports are evaluated before module body execution,
 * so dotenv.config() inside index.js runs TOO LATE.
 */
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load .env file
const envPath = path.join(__dirname, '.env')
console.log('[Loader] Loading environment from:', envPath)

const result = dotenv.config({ path: envPath })

if (result.error) {
  console.error('[Loader] ❌ Failed to load .env:', result.error.message)
  process.exit(1)
}

console.log('[Loader] ✅ Environment variables loaded')
console.log('[Loader] Variables:', Object.keys(result.parsed || {}).join(', '))

// Verify critical variables
if (!process.env.GEMINI_API_KEY) {
  console.error('[Loader] ❌ GEMINI_API_KEY missing')
  process.exit(1)
}

if (!process.env.SUPABASE_URL) {
  console.warn('[Loader] ⚠️ SUPABASE_URL missing - persistence disabled')
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[Loader] ⚠️ SUPABASE_SERVICE_ROLE_KEY missing - persistence disabled')
}

// Now load the actual server
console.log('[Loader] Starting server...\n')
await import('./index.js')
