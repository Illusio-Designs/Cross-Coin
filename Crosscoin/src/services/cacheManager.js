/**
 * Frontend Cache Manager
 * Handles client-side caching with TTL support using localStorage
 * Requirements: 4.1
 */

import { CACHE_CONFIG, getCacheConfig } from '../config/cacheConfig';

class CacheManager {
  constructor() {
    this.storagePrefix = 'crosscoin_cache_';
    this.metaPrefix = 'crosscoin_meta_';
  }

  /**
   * Check if localStorage is available
   * @returns {boolean} True if localStorage is available
   */
  isStorageAvailable() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      console.warn('localStorage not available:', e.message);
      return false;
    }
  }

  /**
   * Set a value in cache with TTL
   * @param {string} key - Cache key
   * @param {*} value - Value to cache (will be JSON serialized)
   * @param {number} ttl - Time to live in milliseconds
   * @returns {boolean} Success status
   */
  set(key, value, ttl = 3600000) {
    try {
      if (!this.isStorageAvailable()) {
        console.warn('Cache SET skipped: localStorage not available');
        return false;
      }

      const storageKey = `${this.storagePrefix}${key}`;
      const metaKey = `${this.metaPrefix}${key}`;
      
      // Store the value
      const serialized = JSON.stringify(value);
      localStorage.setItem(storageKey, serialized);
      
      // Store metadata (expiration time)
      const expiresAt = Date.now() + ttl;
      localStorage.setItem(metaKey, JSON.stringify({ expiresAt, ttl }));
      
      console.log(`✅ Cache SET: ${key} (TTL: ${Math.floor(ttl / 1000)}s)`);
      return true;
    } catch (error) {
      console.error(`❌ Cache SET error for key ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Get a value from cache with expiration check
   * @param {string} key - Cache key
   * @returns {*|null} Cached value or null if not found/expired
   */
  get(key) {
    try {
      if (!this.isStorageAvailable()) {
        return null;
      }

      const storageKey = `${this.storagePrefix}${key}`;
      const metaKey = `${this.metaPrefix}${key}`;
      
      // Get metadata
      const metaData = localStorage.getItem(metaKey);
      if (!metaData) {
        console.log(`⚠️ Cache MISS: ${key} (no metadata)`);
        return null;
      }

      const meta = JSON.parse(metaData);
      
      // Check if expired
      if (Date.now() > meta.expiresAt) {
        console.log(`⚠️ Cache EXPIRED: ${key}`);
        this.delete(key);
        return null;
      }

      // Get the cached value
      const data = localStorage.getItem(storageKey);
      if (data === null) {
        console.log(`⚠️ Cache MISS: ${key} (no data)`);
        return null;
      }

      try {
        const parsed = JSON.parse(data);
        console.log(`✅ Cache HIT: ${key}`);
        return parsed;
      } catch (parseError) {
        console.error(`❌ Cache parse error for key ${key}:`, parseError.message);
        this.delete(key);
        return null;
      }
    } catch (error) {
      console.error(`❌ Cache GET error for key ${key}:`, error.message);
      return null;
    }
  }

  /**
   * Delete a specific cache key
   * @param {string} key - Cache key
   * @returns {boolean} Success status
   */
  delete(key) {
    try {
      if (!this.isStorageAvailable()) {
        return false;
      }

      const storageKey = `${this.storagePrefix}${key}`;
      const metaKey = `${this.metaPrefix}${key}`;
      
      localStorage.removeItem(storageKey);
      localStorage.removeItem(metaKey);
      
      console.log(`✅ Cache DELETE: ${key}`);
      return true;
    } catch (error) {
      console.error(`❌ Cache DELETE error for key ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Check if a key exists and is not expired
   * @param {string} key - Cache key
   * @returns {boolean} True if key exists and is valid
   */
  exists(key) {
    try {
      if (!this.isStorageAvailable()) {
        return false;
      }

      const metaKey = `${this.metaPrefix}${key}`;
      const metaData = localStorage.getItem(metaKey);
      
      if (!metaData) {
        return false;
      }

      const meta = JSON.parse(metaData);
      return Date.now() <= meta.expiresAt;
    } catch (error) {
      console.error(`❌ Cache EXISTS error for key ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Get remaining TTL for a key in milliseconds
   * @param {string} key - Cache key
   * @returns {number} Remaining TTL in milliseconds, or -1 if not found/expired
   */
  getTTL(key) {
    try {
      if (!this.isStorageAvailable()) {
        return -1;
      }

      const metaKey = `${this.metaPrefix}${key}`;
      const metaData = localStorage.getItem(metaKey);
      
      if (!metaData) {
        return -1;
      }

      const meta = JSON.parse(metaData);
      const remaining = meta.expiresAt - Date.now();
      
      return remaining > 0 ? remaining : -1;
    } catch (error) {
      console.error(`❌ Cache TTL error for key ${key}:`, error.message);
      return -1;
    }
  }

  /**
   * Clear all cache entries
   * @returns {boolean} Success status
   */
  clear() {
    try {
      if (!this.isStorageAvailable()) {
        return false;
      }

      const keys = Object.keys(localStorage);
      let cleared = 0;
      
      keys.forEach(key => {
        if (key.startsWith(this.storagePrefix) || key.startsWith(this.metaPrefix)) {
          localStorage.removeItem(key);
          cleared++;
        }
      });
      
      console.log(`✅ Cache CLEAR: ${cleared} entries cleared`);
      return true;
    } catch (error) {
      console.error('❌ Cache CLEAR error:', error.message);
      return false;
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    try {
      if (!this.isStorageAvailable()) {
        return { available: false };
      }

      const keys = Object.keys(localStorage);
      let totalSize = 0;
      let cacheEntries = 0;
      let expiredEntries = 0;

      keys.forEach(key => {
        if (key.startsWith(this.storagePrefix)) {
          const value = localStorage.getItem(key);
          totalSize += value ? value.length : 0;
          cacheEntries++;

          // Check if expired
          const metaKey = key.replace(this.storagePrefix, this.metaPrefix);
          const metaData = localStorage.getItem(metaKey);
          if (metaData) {
            const meta = JSON.parse(metaData);
            if (Date.now() > meta.expiresAt) {
              expiredEntries++;
            }
          }
        }
      });

      return {
        available: true,
        totalEntries: cacheEntries,
        expiredEntries,
        totalSize: `${(totalSize / 1024).toFixed(2)} KB`,
        storageUsage: `${((totalSize / (5 * 1024 * 1024)) * 100).toFixed(2)}%` // Assuming 5MB limit
      };
    } catch (error) {
      console.error('❌ Cache STATS error:', error.message);
      return { available: false, error: error.message };
    }
  }

  /**
   * Set cache using config type
   * @param {string} type - Cache type from CACHE_CONFIG
   * @param {*} value - Value to cache
   * @param {string} identifier - Optional identifier
   * @returns {boolean} Success status
   */
  setByType(type, value, identifier = '') {
    const config = getCacheConfig(type);
    if (!config) {
      console.warn(`Unknown cache type: ${type}`);
      return false;
    }

    const key = identifier ? `${config.key}:${identifier}` : config.key;
    return this.set(key, value, config.ttl);
  }

  /**
   * Get cache using config type
   * @param {string} type - Cache type from CACHE_CONFIG
   * @param {string} identifier - Optional identifier
   * @returns {*|null} Cached value or null
   */
  getByType(type, identifier = '') {
    const config = getCacheConfig(type);
    if (!config) {
      console.warn(`Unknown cache type: ${type}`);
      return null;
    }

    const key = identifier ? `${config.key}:${identifier}` : config.key;
    return this.get(key);
  }

  /**
   * Delete cache using config type
   * @param {string} type - Cache type from CACHE_CONFIG
   * @param {string} identifier - Optional identifier
   * @returns {boolean} Success status
   */
  deleteByType(type, identifier = '') {
    const config = getCacheConfig(type);
    if (!config) {
      console.warn(`Unknown cache type: ${type}`);
      return false;
    }

    const key = identifier ? `${config.key}:${identifier}` : config.key;
    return this.delete(key);
  }
}

// Export singleton instance
export default new CacheManager();
