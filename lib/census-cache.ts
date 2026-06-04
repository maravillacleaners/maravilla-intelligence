/**
 * In-memory Cache for Census API Responses
 *
 * Avoids duplicate API calls for the same location within 24 hours
 * Census data doesn't change frequently, so caching is safe and efficient
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  expiresAt: number
}

class CensusCache {
  private cache: Map<string, CacheEntry<any>> = new Map()
  private readonly DEFAULT_TTL = 24 * 60 * 60 * 1000 // 24 hours
  private readonly CLEANUP_INTERVAL = 60 * 60 * 1000 // 1 hour

  constructor() {
    // Periodic cleanup of expired entries
    setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL)
  }

  /**
   * Generate cache key from parameters
   */
  private generateKey(type: string, params: Record<string, any>): string {
    const paramStr = JSON.stringify(params).toLowerCase()
    return `census:${type}:${paramStr}`
  }

  /**
   * Get cached data if valid and not expired
   */
  get<T>(type: string, params: Record<string, any>): T | null {
    const key = this.generateKey(type, params)
    const entry = this.cache.get(key)

    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  /**
   * Store data in cache
   */
  set<T>(type: string, params: Record<string, any>, data: T, ttl = this.DEFAULT_TTL): void {
    const key = this.generateKey(type, params)
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    })
  }

  /**
   * Clear specific cache entry
   */
  invalidate(type: string, params: Record<string, any>): void {
    const key = this.generateKey(type, params)
    this.cache.delete(key)
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    let removed = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
        removed++
      }
    }

    if (removed > 0) {
      console.log(`[CensusCache] Cleaned up ${removed} expired entries`)
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number
    entries: Array<{
      key: string
      age: number
      expiresIn: number
    }>
  } {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key: key.substring(0, 50) + (key.length > 50 ? '...' : ''),
      age: Date.now() - entry.timestamp,
      expiresIn: Math.max(0, entry.expiresAt - Date.now()),
    }))

    return {
      size: this.cache.size,
      entries,
    }
  }
}

// Global singleton instance
export const censusCache = new CensusCache()
