/**
 * imdCapService.js - Frontend client for the IMD CAP alerts endpoint.
 *
 * Calls GET /api/imd-alerts (served by Express — no direct S3 access needed,
 * so CORS is not an issue).
 *
 * Exports:
 *   fetchIMDCAPWarnings({ location })  -> Promise<IMDCAPResult>
 */

const REQUEST_TIMEOUT = 15000  // 15 seconds

export class IMDCAPError extends Error {
  constructor(message, statusCode = null) {
    super(message)
    this.name = 'IMDCAPError'
    this.statusCode = statusCode
  }
}

/**
 * Fetch IMD CAP alerts for a given location.
 *
 * @param {{ location?: string }} params
 * @returns {Promise<{
 *   source: string,
 *   sourceUrl: string,
 *   fetchedAt: string,
 *   sourceStatus: string,
 *   alerts: Array,
 *   allAlerts?: Array,
 *   resolvedState?: string,
 *   matchCount?: number,
 *   alertCount?: number,
 * }>}
 */
export async function fetchIMDCAPWarnings({ location } = {}) {
  const params = new URLSearchParams()
  if (location) params.set('location', location)

  const url = `/api/imd-alerts${params.toString() ? '?' + params.toString() : ''}`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      throw new IMDCAPError(
        body.error || `IMD alerts unavailable (HTTP ${response.status})`,
        response.status
      )
    }

    return await response.json()
  } catch (err) {
    clearTimeout(timeoutId)
    if (err.name === 'AbortError') {
      throw new IMDCAPError('IMD alert fetch timed out')
    }
    if (err instanceof IMDCAPError) throw err
    throw new IMDCAPError('Could not reach IMD alerts endpoint: ' + err.message)
  }
}

/**
 * Build a human-readable summary string from a CAP alert object.
 * Used to inject into the Gemini system prompt.
 */
export function formatCAPAlertForAI(alert) {
  const parts = []
  if (alert.headline)    parts.push('Alert: ' + alert.headline)
  if (alert.event)       parts.push('Event: ' + alert.event)
  if (alert.severity)    parts.push('Severity: ' + alert.severity)
  if (alert.certainty)   parts.push('Certainty: ' + alert.certainty)
  if (alert.areaDesc)    parts.push('Area: ' + alert.areaDesc)
  if (alert.onset)       parts.push('From: ' + alert.onset)
  if (alert.expires)     parts.push('Until: ' + alert.expires)
  if (alert.description) parts.push('Details: ' + alert.description)
  if (alert.instruction) parts.push('Action: ' + alert.instruction.slice(0, 200))
  if (alert.senderName)  parts.push('Issued by: ' + alert.senderName)
  return parts.join('\n')
}
