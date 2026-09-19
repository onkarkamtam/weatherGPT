/**
 * AuthContext - Manages authentication state across the app
 * Gracefully handles missing Supabase configuration
 * 
 * PERFORMANCE: Optimized to not block app startup
 */
import { createContext, useContext, useEffect, useState } from 'react'
import { supabaseClient } from '@/lib/supabase'

const AuthContext = createContext({})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true) // Start with true to check auth state

  useEffect(() => {
    // Skip auth initialization if Supabase not configured
    if (!supabaseClient || !supabaseClient.auth) {
      setUser(null)
      setSession(null)
      setLoading(false)
      return
    }

    // Get initial session asynchronously
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false) // Done checking
    }).catch((err) => {
      console.error('Auth getSession error:', err)
      setSession(null)
      setUser(null)
      setLoading(false) // Done checking even on error
    })

    // Listen for auth changes
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email, password) => {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
    })
    return { data, error }
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  const signOut = async () => {
    const { error } = await supabaseClient.auth.signOut()
    return { error }
  }

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

