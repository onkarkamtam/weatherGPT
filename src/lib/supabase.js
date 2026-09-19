/**
 * Supabase client for frontend (React)
 * 
 * Uses anon (public) key which is safe to expose
 * All RLS policies still apply for data security
 * 
 * IMPORTANT: This module provides graceful degradation if Supabase is not configured.
 * The app will work without persistence if env variables are missing.
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let supabase = null

if (supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://your-project.supabase.co') {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
    console.log('✅ Supabase client initialized')
  } catch (err) {
    console.error('❌ Failed to initialize Supabase:', err)
    supabase = null
  }
} else {
  console.warn('⚠️ Supabase not configured - running without persistence')
  console.warn('  Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env to enable chat history')
}

// Export supabase (may be null if not configured)
export { supabase }

// Mock auth object for when Supabase is not configured
// PERFORMANCE: Synchronous callbacks to avoid event loop delays
const mockAuth = {
  getSession: async () => ({ data: { session: null }, error: null }),
  onAuthStateChange: (callback) => {
    // Call synchronously - no setTimeout delay
    const unsubscribe = () => {}
    return { data: { subscription: { unsubscribe } } }
  },
  signUp: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
  signInWithPassword: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
  signOut: async () => ({ error: null })
}

// Provide mock client if Supabase not initialized
export const supabaseClient = supabase || { auth: mockAuth }


