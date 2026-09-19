/**
 * Conversation management routes
 */
import express from 'express'
import { supabaseAdmin } from '../database/supabase.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()

// All routes require authentication
router.use(authenticate)

/**
 * Generate conversation title from first message
 */
function generateTitle(message) {
  const msg = message.toLowerCase().trim()
  
  // Weather queries
  if (/weather|mausam|havaaman|वातावरण|వాతావరణం|வானிலை|আবহাওয়া/.test(msg)) {
    // Extract location if present
    const locationMatch = msg.match(/\b(?:in|at|for|में|मध्ये|లో|இல்|এ)\s+([a-z\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F]+)/i)
    if (locationMatch) {
      const location = locationMatch[1].charAt(0).toUpperCase() + locationMatch[1].slice(1)
      return `Weather in ${location}`
    }
    return 'Weather Query'
  }
  
  // Historical/comparison
  if (/compar|तुलना|పోలిక|ஒப்பீடு|তুলনা/.test(msg)) {
    return 'Weather Comparison'
  }
  
  // Rainfall
  if (/rain|barish|paus|paos|వర్షం|மழை|বৃষ্টি/.test(msg)) {
    return 'Rainfall Query'
  }
  
  // Farming
  if (/farm|crop|खेत|शेत|వ్యవసాయం|விவசாயம|কৃষি/.test(msg)) {
    return 'Farming Advisory'
  }
  
  // Travel
  if (/travel|trip|यात्रा|प्रवास|ప్రయాణం|பயணம|ভ্রমণ/.test(msg)) {
    return 'Travel Weather'
  }
  
  // Temperature
  if (/temperature|temp|तापमान|ఉష్ణోగ్రత|வெப்பநிலை|তাপমাত্রা/.test(msg)) {
    return 'Temperature Query'
  }
  
  // Generic: use first 50 characters
  const cleanMsg = message.replace(/[^\w\s\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F]/g, '').trim()
  return cleanMsg.length > 50 ? cleanMsg.slice(0, 47) + '...' : cleanMsg || 'New Conversation'
}

/**
 * GET /api/conversations
 * List all conversations for the authenticated user
 */
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('conversations')
      .select('id, title, created_at, updated_at')
      .eq('user_id', req.user.id)
      .order('updated_at', { ascending: false })
    
    if (error) {
      console.error('[GET /conversations] Supabase error:', error)
      return res.status(500).json({ error: 'Failed to fetch conversations' })
    }
    
    res.json({ conversations: data || [] })
  } catch (err) {
    console.error('[GET /conversations] Error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /api/conversations
 * Create a new conversation
 * Body: { title?, firstMessage? }
 */
router.post('/', async (req, res) => {
  try {
    const { title, firstMessage } = req.body
    
    const conversationTitle = title || (firstMessage ? generateTitle(firstMessage) : 'New Conversation')
    
    const { data, error } = await supabaseAdmin
      .from('conversations')
      .insert({
        user_id: req.user.id,
        title: conversationTitle
      })
      .select()
      .single()
    
    if (error) {
      console.error('[POST /conversations] Supabase error:', error)
      return res.status(500).json({ error: 'Failed to create conversation' })
    }
    
    res.status(201).json({ conversation: data })
  } catch (err) {
    console.error('[POST /conversations] Error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/conversations/:id
 * Get conversation with all messages
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    // Fetch conversation
    const { data: conversation, error: convError } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single()
    
    if (convError || !conversation) {
      return res.status(404).json({ error: 'Conversation not found' })
    }
    
    // Fetch messages
    const { data: messages, error: msgError } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })
    
    if (msgError) {
      console.error('[GET /conversations/:id] Messages error:', msgError)
      return res.status(500).json({ error: 'Failed to fetch messages' })
    }
    
    res.json({
      conversation,
      messages: messages || []
    })
  } catch (err) {
    console.error('[GET /conversations/:id] Error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * PATCH /api/conversations/:id
 * Update conversation title
 * Body: { title }
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { title } = req.body
    
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Title is required' })
    }
    
    const { data, error } = await supabaseAdmin
      .from('conversations')
      .update({ title: title.trim() })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single()
    
    if (error || !data) {
      return res.status(404).json({ error: 'Conversation not found or update failed' })
    }
    
    res.json({ conversation: data })
  } catch (err) {
    console.error('[PATCH /conversations/:id] Error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * DELETE /api/conversations/:id
 * Delete conversation and all its messages
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    const { error } = await supabaseAdmin
      .from('conversations')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id)
    
    if (error) {
      console.error('[DELETE /conversations/:id] Error:', error)
      return res.status(500).json({ error: 'Failed to delete conversation' })
    }
    
    res.json({ success: true })
  } catch (err) {
    console.error('[DELETE /conversations/:id] Error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

