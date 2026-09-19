/**
 * useConversations - Manages conversation history state and operations
 * 
 * Fetches conversations from backend, manages active conversation,
 * and provides CRUD operations for conversation management.
 */
import { useState, useEffect, useCallback } from 'react'
import { 
  fetchConversations, 
  fetchConversation, 
  deleteConversation 
} from '@/services/conversationService'

export function useConversations() {
  const [conversations, setConversations] = useState([])
  const [activeConversationId, setActiveConversationId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  /**
   * Load all conversations for the current user
   */
  const loadConversations = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchConversations()
      setConversations(data)
      console.log('[useConversations] Loaded', data.length, 'conversations')
    } catch (err) {
      console.error('[useConversations] Failed to load conversations:', err)
      setError(err.message)
      // Don't throw - let app continue to work without history
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Load on mount
   */
  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  /**
   * Load a specific conversation's messages
   * @param {string} id - Conversation ID
   * @returns {Promise<Array>} - Array of messages
   */
  const loadConversation = useCallback(async (id) => {
    try {
      console.log('[useConversations] Loading conversation:', id)
      const { conversation, messages } = await fetchConversation(id)
      setActiveConversationId(id)
      console.log('[useConversations] Loaded', messages.length, 'messages')
      return messages
    } catch (err) {
      console.error('[useConversations] Failed to load conversation:', err)
      throw err
    }
  }, [])

  /**
   * Start a new conversation (clear active ID)
   */
  const createNewConversation = useCallback(() => {
    console.log('[useConversations] Starting new conversation')
    setActiveConversationId(null)
  }, [])

  /**
   * Delete a conversation
   * @param {string} id - Conversation ID
   */
  const removeConversation = useCallback(async (id) => {
    try {
      console.log('[useConversations] Deleting conversation:', id)
      await deleteConversation(id)
      setConversations(prev => prev.filter(c => c.id !== id))
      
      // If deleted conversation was active, clear it
      if (activeConversationId === id) {
        setActiveConversationId(null)
      }
      
      console.log('[useConversations] Conversation deleted successfully')
    } catch (err) {
      console.error('[useConversations] Failed to delete conversation:', err)
      throw err
    }
  }, [activeConversationId])

  /**
   * Update conversation in list after new message
   * @param {string} id - Conversation ID
   * @param {object} updates - Fields to update (e.g., { title, updated_at })
   */
  const updateConversation = useCallback((id, updates) => {
    setConversations(prev => 
      prev.map(conv => 
        conv.id === id 
          ? { ...conv, ...updates, updated_at: new Date().toISOString() }
          : conv
      ).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    )
  }, [])

  /**
   * Add a new conversation to the list
   * @param {object} conversation - New conversation object
   */
  const addConversation = useCallback((conversation) => {
    setConversations(prev => [conversation, ...prev])
    setActiveConversationId(conversation.id)
  }, [])

  return {
    conversations,
    activeConversationId,
    loading,
    error,
    loadConversations,
    loadConversation,
    createNewConversation,
    removeConversation,
    updateConversation,
    addConversation,
    setActiveConversationId
  }
}
