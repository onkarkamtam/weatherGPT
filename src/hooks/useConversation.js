/**
 * useConversation — Manages Gemini-format conversation history in React state.
 *
 * History format matches @google/genai SDK:
 *   [{ role: 'user'|'model', parts: [{ text: string }] }]
 *
 * Keeps at most MAX_TURNS entries (user + model combined) to stay within
 * context limits and avoid ballooning prompts over long sessions.
 *
 * Phase 4+: optionally persist to sessionStorage for refresh resilience.
 */
import { useState, useCallback } from 'react'

/** Maximum total role turns (user + model) to keep in memory */
const MAX_TURNS = 12

/**
 * @returns {{
 *   getHistory:   () => Array<{ role: string, parts: Array<{ text: string }> }>,
 *   addTurn:      (userText: string, modelText: string) => void,
 *   clearHistory: () => void,
 * }}
 */
export function useConversation() {
  const [history, setHistory] = useState([])

  /**
   * Returns the current conversation history in Gemini SDK format.
   * Called just before each AI request so it always reflects the latest state.
   */
  const getHistory = useCallback(() => history, [history])

  /**
   * Appends a completed user + model exchange.
   * Trims oldest turns if the history exceeds MAX_TURNS.
   *
   * @param {string} userText   - The user's message
   * @param {string} modelText  - The AI's response text
   */
  const addTurn = useCallback((userText, modelText) => {
    setHistory((prev) => {
      const next = [
        ...prev,
        { role: 'user',  parts: [{ text: userText  }] },
        { role: 'model', parts: [{ text: modelText }] },
      ]
      // Keep only the most recent MAX_TURNS entries
      return next.length > MAX_TURNS ? next.slice(next.length - MAX_TURNS) : next
    })
  }, [])

  /**
   * Clears all history — called when location changes or session resets.
   */
  const clearHistory = useCallback(() => setHistory([]), [])

  return { getHistory, addTurn, clearHistory }
}
