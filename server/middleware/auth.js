/**
 * Authentication middleware
 * Verifies JWT tokens from Supabase Auth
 */
import { verifyToken } from '../database/supabase.js'

/**
 * Middleware to authenticate requests
 * Expects: Authorization: Bearer <token>
 * Adds req.user if valid
 */
export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' })
  }
  
  const token = authHeader.substring(7) // Remove 'Bearer ' prefix
  
  const { user, error } = await verifyToken(token)
  
  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
  
  req.user = user
  next()
}

/**
 * Optional authentication middleware
 * Adds req.user if token is valid, but doesn't require it
 */
export async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    const { user } = await verifyToken(token)
    if (user) {
      req.user = user
    }
  }
  
  next()
}

