/**
 * cache.js — Simple in-memory cache for API responses
 * 
 * Caches weather, NWP, and historical data to reduce API calls
 * Uses TTL (time-to-live) to ensure data freshness
 * 
 * IMPORTANT: Location-aware caching - coordinates are part of the key
 */

class SimpleCache {
  constructor() {
    this.cache = new Map()
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
    }
  }

  /**
   * Generate cache key from parameters
   */
  _generateKey(prefix, params) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(k => `${k}:${params[k]}`)
      .join('|')
    return `${prefix}:${sortedParams}`
  }

  /**
   * Get value from cache
   */
  get(prefix, params) {
    const key = this._generateKey(prefix, params)
    const entry = this.cache.get(key)

    if (!entry) {
      this.stats.misses++
      return null
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      this.stats.misses++
      return null
    }

    this.stats.hits++
    console.log(`[Cache] HIT: ${key}`)
    return entry.value
  }

  /**
   * Set value in cache with TTL
   */
  set(prefix, params, value, ttlSeconds) {
    const key = this._generateKey(prefix, params)
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (ttlSeconds * 1000),
    })
    this.stats.sets++
    console.log(`[Cache] SET: ${key} (TTL: ${ttlSeconds}s)`)
  }

  /**
   * Clear all cache
   */
  clear() {
    const size = this.cache.size
    this.cache.clear()
    console.log(`[Cache] Cleared ${size} entries`)
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(1)
      : 0

    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: `${hitRate}%`,
    }
  }

  /**
   * Clean expired entries (runs periodically)
   */
  cleanExpired() {
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
        cleaned++
      }
    }

    if (cleaned > 0) {
      console.log(`[Cache] Cleaned ${cleaned} expired entries`)
    }
  }
}

// Create singleton cache instance
const cache = new SimpleCache()

// Clean expired entries every 5 minutes
setInterval(() => {
  cache.cleanExpired()
}, 5 * 60 * 1000)

// TTL constants (in seconds)
export const TTL = {
  CURRENT_WEATHER: 10 * 60,       // 10 minutes
  FORECAST: 30 * 60,               // 30 minutes
  NWP_FORECAST: 60 * 60,           // 1 hour
  HISTORICAL: 24 * 60 * 60,        // 24 hours
  CLIMATE: 7 * 24 * 60 * 60,       // 7 days
  
  // IMD-specific TTLs
  IMD_WARNINGS: 15 * 60,           // 15 minutes - warnings change frequently
  IMD_NOWCAST: 10 * 60,            // 10 minutes - short-term forecast
  IMD_CURRENT: 10 * 60,            // 10 minutes - current observations
  IMD_FORECAST: 60 * 60,           // 1 hour - 7-day forecast
  IMD_RAINFALL: 30 * 60,           // 30 minutes - rainfall data
  IMD_RAINFALL_FORECAST: 60 * 60,  // 1 hour - 5-day rainfall forecast
}

export default cache

