/**
 * Authentication routes
 * Handles signup, login using Supabase Auth
 */
import express from 'express'
import { supabaseAdmin } from '../database/supabase.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()

/**
 * POST /api/auth/signup
 * Create new user account
 * Body: { email, password }
 */
router.post('/signup', async (req, res) => {
  try {
    const { email, password } = req.body
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }
    
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true // Auto-confirm for development
    })
    
    if (error) {
      console.error('[POST /auth/signup] Supabase error:', error)
      
      if (error.message.includes('already registered')) {
        return res.status(409).json({ error: 'Email already registered' })
      }
      
      return res.status(400).json({ error: error.message })
    }
    
    // Sign in to get session
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password
    })
    
    if (signInError) {
      // User created but signin failed - they can still login manually
      return res.status(201).json({
        message: 'Account created successfully. Please log in.',
        user: { id: data.user.id, email: data.user.email }
      })
    }
    
    res.status(201).json({
      user: signInData.user,
      session: signInData.session
    })
  } catch (err) {
    console.error('[POST /auth/signup] Error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /api/auth/login
 * Login with email and password
 * Body: { email, password }
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }
    
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) {
      console.error('[POST /auth/login] Supabase error:', error)
      
      if (error.message.includes('Invalid login credentials')) {
        return res.status(401).json({ error: 'Invalid email or password' })
      }
      
      return res.status(400).json({ error: error.message })
    }
    
    res.json({
      user: data.user,
      session: data.session
    })
  } catch (err) {
    console.error('[POST /auth/login] Error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /api/auth/logout
 * Logout user (invalidate session)
 * Requires: Authorization header
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    // Note: Supabase sessions are stateless JWTs
    // Client should discard the token
    // Optionally revoke refresh token here if needed
    
    res.json({ message: 'Logged out successfully' })
  } catch (err) {
    console.error('[POST /auth/logout] Error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/auth/me
 * Get current user info
 * Requires: Authorization header
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    res.json({ user: req.user })
  } catch (err) {
    console.error('[GET /auth/me] Error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

