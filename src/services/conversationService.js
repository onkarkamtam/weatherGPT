/**
 * conversationService.js - API calls for conversation management
 * Gracefully handles missing Supabase configuration
 */
import { supabaseClient } from '@/lib/supabase'

const API_BASE = '/api'

/**
 * Get auth token from current session
 */
async function getAuthToken() {
  if (!supabaseClient) return null
  
  try {
    const { data: { session } } = await supabaseClient.auth.getSession()
    return session?.access_token || null
  } catch (err) {
    console.error('getAuthToken error:', err)
    return null
  }
}

/**
 * Fetch headers with auth token
 */
async function getHeaders() {
  const token = await getAuthToken()
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  }
}

/**
 * Fetch all conversations for current user
 */
export async function fetchConversations() {
  try {
    const headers = await getHeaders()
    const res = await fetch(`${API_BASE}/conversations`, { headers })
    
    if (!res.ok) {
      throw new Error(`Failed to fetch conversations: ${res.status}`)
    }
    
    const data = await res.json()
    return data.conversations || []
  } catch (err) {
    console.error('[fetchConversations] Error:', err)
    throw err
  }
}

/**
 * Create new conversation
 */
export async function createConversation({ title, firstMessage } = {}) {
  try {
    const headers = await getHeaders()
    const res = await fetch(`${API_BASE}/conversations`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ title, firstMessage })
    })
    
    if (!res.ok) {
      throw new Error(`Failed to create conversation: ${res.status}`)
    }
    
    const data = await res.json()
    return data.conversation
  } catch (err) {
    console.error('[createConversation] Error:', err)
    throw err
  }
}

/**
 * Fetch conversation with all messages
 */
export async function fetchConversation(conversationId) {
  try {
    const headers = await getHeaders()
    const res = await fetch(`${API_BASE}/conversations/${conversationId}`, { headers })
    
    if (!res.ok) {
      throw new Error(`Failed to fetch conversation: ${res.status}`)
    }
    
    const data = await res.json()
    return {
      conversation: data.conversation,
      messages: data.messages || []
    }
  } catch (err) {
    console.error('[fetchConversation] Error:', err)
    throw err
  }
}

/**
 * Update conversation title
 */
export async function updateConversationTitle(conversationId, title) {
  try {
    const headers = await getHeaders()
    const res = await fetch(`${API_BASE}/conversations/${conversationId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ title })
    })
    
    if (!res.ok) {
      throw new Error(`Failed to update conversation: ${res.status}`)
    }
    
    const data = await res.json()
    return data.conversation
  } catch (err) {
    console.error('[updateConversationTitle] Error:', err)
    throw err
  }
}

/**
 * Delete conversation
 */
export async function deleteConversation(conversationId) {
  try {
    const headers = await getHeaders()
    const res = await fetch(`${API_BASE}/conversations/${conversationId}`, {
      method: 'DELETE',
      headers
    })
    
    if (!res.ok) {
      throw new Error(`Failed to delete conversation: ${res.status}`)
    }
    
    return true
  } catch (err) {
    console.error('[deleteConversation] Error:', err)
    throw err
  }
}

