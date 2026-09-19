/**
 * Supabase client for backend (Express server)
 * 
 * Uses service role key for admin operations
 * NEVER expose this client to the frontend
 * 
 * IMPORTANT: Gracefully handles missing configuration
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Diagnostic logging (safe - doesn't expose actual keys)
console.log('[Supabase Backend] Environment check:')
console.log('  SUPABASE_URL:', supabaseUrl ? `${supabaseUrl.substring(0, 25)}... (${supabaseUrl.length} chars)` : 'NOT SET')
console.log('  SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? `${supabaseServiceKey.substring(0, 10)}... (${supabaseServiceKey.length} chars)` : 'NOT SET')

let supabaseAdmin = null

if (supabaseUrl && supabaseServiceKey && supabaseServiceKey !== 'your_supabase_service_role_key_here') {
  try {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      },
      db: {
        schema: 'public'
      }
    })
    
    console.log('✅ Supabase admin client initialized')
  } catch (err) {
    console.error('❌ Failed to initialize Supabase admin:', err)
    supabaseAdmin = null
  }
} else {
  console.warn('⚠️ Supabase not configured on backend - chat persistence disabled')
  if (!supabaseUrl) {
    console.warn('   Missing: SUPABASE_URL')
  }
  if (!supabaseServiceKey) {
    console.warn('   Missing: SUPABASE_SERVICE_ROLE_KEY')
  }
  if (supabaseServiceKey === 'your_supabase_service_role_key_here') {
    console.warn('   SUPABASE_SERVICE_ROLE_KEY is still a placeholder')
  }
  console.warn('   Add these to server/.env to enable chat history')
}

export { supabaseAdmin }

/**
 * Verify JWT token and get user
 * @param {string} token - JWT token from Authorization header
 * @returns {Promise<{user: object, error: null} | {user: null, error: object}>}
 */
export async function verifyToken(token) {
  if (!supabaseAdmin) {
    return { user: null, error: { message: 'Supabase not configured' } }
  }
  
  if (!token) {
    return { user: null, error: { message: 'No token provided' } }
  }

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    
    if (error) {
      return { user: null, error }
    }
    
    return { user, error: null }
  } catch (err) {
    return { user: null, error: { message: err.message } }
  }
}

