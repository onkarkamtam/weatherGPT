/**
 * dateTime.js — Locale-aware date and time utilities
 * Phase 2+: accept a locale parameter and user timezone from profile.
 */

const DEFAULT_LOCALE = 'en-IN'

/**
 * Returns a friendly greeting based on current hour.
 * @returns {'Good morning'|'Good afternoon'|'Good evening'}
 */
export function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

/**
 * Formats a Date object to a short time string, e.g. "2:30 PM"
 * @param {Date} date
 * @returns {string}
 */
export function formatTime(date = new Date()) {
  return date.toLocaleTimeString(DEFAULT_LOCALE, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Formats a Date object to a short date string, e.g. "Fri, 29 Aug"
 * @param {Date} date
 * @returns {string}
 */
export function formatDate(date = new Date()) {
  return date.toLocaleDateString(DEFAULT_LOCALE, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

/**
 * Returns "Today", "Tomorrow", or formatted date for further-ahead days.
 * @param {Date} date
 * @returns {string}
 */
export function formatRelativeDay(date) {
  const today    = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const sameDay = (a, b) =>
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()

  if (sameDay(date, today))    return 'Today'
  if (sameDay(date, tomorrow)) return 'Tomorrow'
  return formatDate(date)
}

/**
 * Returns current timestamp string for chat message timestamps.
 * @returns {string}
 */
export function nowTimestamp() {
  return formatTime(new Date())
}
