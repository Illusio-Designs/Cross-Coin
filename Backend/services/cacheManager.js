const redisService = require('./redisService');

/**
 * Cache Manager with TTL Support
 * Provides high-level cache operations with automatic expiration
 * Supports pattern-based invalidation and data serialization
 * 
 * Requirements: 2.1, 2.2
 */
class CacheManager {
  /**
   * Set a value in cache with TTL
   * @param {string} key - Cache key
   * @param {*} value - Value to cache (will be JSON serialized)
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<void>}
   */
  async set(key, value, ttl = 3600) {
    try {
      const client = redisService.getClient();
      const serialized = JSON.stringify(value);
      
      if (ttl > 0) {
        await client.setex(key, ttl, serialized);
      } else {
        await client.set(key, serialized);
      }
    } catch (error) {
      // Requirement 7.3: cache errors must not propagate to callers
      const { logger } = require('../config/logging.js');
      logger.warn(`Cache SET error for key ${key}: ${error.message}`);
    }
  }

  /**
   * Get a value from cache with expiration check
   * @param {string} key - Cache key
   * @returns {Promise<*|null>} Cached value or null if not found/expired
   */
  async get(key) {
    try {
      const client = redisService.getClient();
      const data = await client.get(key);
      
      if (data === null) {
        console.log(`⚠️ Cache MISS: ${key}`);
        return null;
      }
      
      try {
        const parsed = JSON.parse(data);
        console.log(`✅ Cache HIT: ${key}`);
        return parsed;
      } catch (parseError) {
        console.error(`❌ Cache parse error for key ${key}:`, parseError.message);
        // If parsing fails, delete the corrupted cache entry
        await this.delete(key);
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
   * @returns {Promise<number>} Number of keys deleted
   */
  async delete(key) {
    try {
      const client = redisService.getClient();
      const deleted = await client.del(key);
      console.log(`✅ Cache DELETE: ${key} (${deleted} key(s) deleted)`);
      return deleted;
    } catch (error) {
      console.error(`❌ Cache DELETE error for key ${key}:`, error.message);
      throw error;
    }
  }

  /**
   * Invalidate cache entries matching a pattern
   * Uses Redis SCAN to find matching keys and delete them
   * @param {string|RegExp} pattern - Pattern to match (e.g., 'product:*', 'user:123:*')
   * @returns {Promise<number>} Number of keys deleted
   */
  async invalidate(pattern) {
    try {
      const client = redisService.getClient();
      let cursor = '0';
      let deletedCount = 0;
      const keysToDelete = [];

      // Convert pattern to glob pattern if it's a regex
      let globPattern = pattern;
      if (pattern instanceof RegExp) {
        globPattern = pattern.source.replace(/\^/, '').replace(/\$/, '').replace(/\./g, '*');
      }

      // Use SCAN to find all matching keys
      do {
        const [newCursor, keys] = await client.scan(
          cursor,
          'MATCH',
          globPattern,
          'COUNT',
          100
        );
        cursor = newCursor;

        if (keys.length > 0) {
          keysToDelete.push(...keys);
        }
      } while (cursor !== '0');

      // Delete all matching keys in batches
      if (keysToDelete.length > 0) {
        const batchSize = 100;
        for (let i = 0; i < keysToDelete.length; i += batchSize) {
          const batch = keysToDelete.slice(i, i + batchSize);
          deletedCount += await client.del(...batch);
        }
      }

      return deletedCount;
    } catch (error) {
      // Requirement 7.3: cache errors must not propagate to callers
      const { logger } = require('../config/logging.js');
      logger.warn(`Cache INVALIDATE error for pattern ${pattern}: ${error.message}`);
      return 0;
    }
  }

  /**
   * Check if a key exists in cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} True if key exists
   */
  async exists(key) {
    try {
      const client = redisService.getClient();
      const exists = await client.exists(key);
      return exists === 1;
    } catch (error) {
      console.error(`❌ Cache EXISTS error for key ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Get TTL of a cache key
   * @param {string} key - Cache key
   * @returns {Promise<number>} TTL in seconds (-1 if no expiry, -2 if not exists)
   */
  async getTTL(key) {
    try {
      const client = redisService.getClient();
      const ttl = await client.ttl(key);
      return ttl;
    } catch (error) {
      console.error(`❌ Cache TTL error for key ${key}:`, error.message);
      return -2;
    }
  }

  /**
   * Set expiration on an existing key
   * @param {string} key - Cache key
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<number>} 1 if timeout was set, 0 if key does not exist
   */
  async expire(key, ttl) {
    try {
      const client = redisService.getClient();
      const result = await client.expire(key, ttl);
      console.log(`✅ Cache EXPIRE: ${key} (TTL: ${ttl}s)`);
      return result;
    } catch (error) {
      console.error(`❌ Cache EXPIRE error for key ${key}:`, error.message);
      throw error;
    }
  }

  /**
   * Get all keys matching a pattern
   * @param {string} pattern - Pattern to match
   * @returns {Promise<string[]>} Array of matching keys
   */
  async getKeys(pattern) {
    try {
      const client = redisService.getClient();
      // Requirement 5.7: use SCAN instead of KEYS to avoid blocking Redis event loop
      let cursor = '0';
      const keys = [];
      do {
        const [newCursor, batch] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = newCursor;
        keys.push(...batch);
      } while (cursor !== '0');
      return keys;
    } catch (error) {
      const { logger } = require('../config/logging.js');
      logger.warn(`Cache KEYS error for pattern ${pattern}: ${error.message}`);
      return [];
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} Cache statistics
   */
  async getStats() {
    try {
      const client = redisService.getClient();
      const info = await client.info('stats');
      const dbSize = await client.dbsize();
      
      return {
        dbSize,
        info
      };
    } catch (error) {
      console.error('❌ Cache STATS error:', error.message);
      return null;
    }
  }

  /**
   * Clear all cache
   * @returns {Promise<void>}
   */
  async clear() {
    try {
      const client = redisService.getClient();
      await client.flushdb();
      console.log('✅ Cache CLEAR: All cache cleared');
    } catch (error) {
      console.error('❌ Cache CLEAR error:', error.message);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new CacheManager();
