const redisService = require('./redisService');

/**
 * Cache Manager with TTL Support + Namespace Isolation
 *
 * ── Caching Strategy ──────────────────────────────────────────────────────────
 * Key                    TTL        Invalidated on
 * ─────────────────────────────────────────────────
 * products:public:*      5 min      product create/update/delete
 * categories:public      10 min     category create/update/delete
 * sliders:public         10 min     slider create/update/delete
 * dashboard:*            1 min      order create/update
 * seo:*                  30 min     seo update
 * cart:user:{id}         5 min      cart add/remove/update
 * ─────────────────────────────────────────────────
 */

// TTL constants (seconds) — single source of truth
const TTL = {
  PRODUCTS:    5  * 60,   // 5 min
  CATEGORIES:  10 * 60,   // 10 min
  SLIDERS:     10 * 60,   // 10 min
  DASHBOARD:   1  * 60,   // 1 min
  SEO:         30 * 60,   // 30 min
  CART:        5  * 60,   // 5 min
  DEFAULT:     60 * 60,   // 1 hour
};

// Namespace prefix to prevent key collisions with other Redis data (sessions, queues, etc.)
const NAMESPACE = 'crosscoin:cache:';

// Max value size (1MB) to prevent Redis memory exhaustion
const MAX_VALUE_SIZE = 1 * 1024 * 1024;

class CacheManager {
  /**
   * Add namespace prefix to a key
   */
  _prefixKey(key) {
    return key.startsWith(NAMESPACE) ? key : `${NAMESPACE}${key}`;
  }

  /**
   * Set a value in cache with TTL
   */
  async set(key, value, ttl = 3600) {
    try {
      const client = redisService.getClient();
      const serialized = JSON.stringify(value);

      // Enforce max value size
      if (serialized.length > MAX_VALUE_SIZE) {
        const { logger } = require('../config/logging.js');
        logger.warn(`Cache SET skipped for key ${key}: value size ${serialized.length} exceeds max ${MAX_VALUE_SIZE}`);
        return;
      }

      const prefixedKey = this._prefixKey(key);
      if (ttl > 0) {
        await client.setex(prefixedKey, ttl, serialized);
      } else {
        await client.set(prefixedKey, serialized);
      }
    } catch (error) {
      const { logger } = require('../config/logging.js');
      logger.warn(`Cache SET error for key ${key}: ${error.message}`);
    }
  }

  /**
   * Get a value from cache
   */
  async get(key) {
    try {
      const client = redisService.getClient();
      const data = await client.get(this._prefixKey(key));
      if (data === null) return null;
      try {
        return JSON.parse(data);
      } catch {
        await this.delete(key);
        return null;
      }
    } catch (error) {
      const { logger } = require('../config/logging.js');
      logger.warn(`Cache GET error for key ${key}: ${error.message}`);
      return null;
    }
  }

  /**
   * Delete a specific cache key
   */
  async delete(key) {
    try {
      const client = redisService.getClient();
      return await client.del(this._prefixKey(key));
    } catch (error) {
      return 0;
    }
  }

  /**
   * Invalidate cache entries matching a pattern
   */
  async invalidate(pattern) {
    try {
      const client = redisService.getClient();
      let cursor = '0';
      let deletedCount = 0;
      const keysToDelete = [];

      let globPattern = pattern;
      if (pattern instanceof RegExp) {
        globPattern = pattern.source.replace(/\^/, '').replace(/\$/, '').replace(/\./g, '*');
      }
      // Prefix the pattern for namespace isolation
      const prefixedPattern = globPattern.startsWith(NAMESPACE) ? globPattern : `${NAMESPACE}${globPattern}`;

      do {
        const [newCursor, keys] = await client.scan(cursor, 'MATCH', prefixedPattern, 'COUNT', 100);
        cursor = newCursor;
        if (keys.length > 0) keysToDelete.push(...keys);
      } while (cursor !== '0');

      if (keysToDelete.length > 0) {
        const batchSize = 100;
        for (let i = 0; i < keysToDelete.length; i += batchSize) {
          const batch = keysToDelete.slice(i, i + batchSize);
          deletedCount += await client.del(...batch);
        }
      }
      return deletedCount;
    } catch (error) {
      const { logger } = require('../config/logging.js');
      logger.warn(`Cache INVALIDATE error for pattern ${pattern}: ${error.message}`);
      return 0;
    }
  }

  /**
   * Check if a key exists in cache
   */
  async exists(key) {
    try {
      const client = redisService.getClient();
      return (await client.exists(this._prefixKey(key))) === 1;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get TTL of a cache key
   */
  async getTTL(key) {
    try {
      const client = redisService.getClient();
      return await client.ttl(this._prefixKey(key));
    } catch (error) {
      return -2;
    }
  }

  /**
   * Set expiration on an existing key
   */
  async expire(key, ttl) {
    try {
      const client = redisService.getClient();
      return await client.expire(this._prefixKey(key), ttl);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get all keys matching a pattern
   */
  async getKeys(pattern) {
    try {
      const client = redisService.getClient();
      const prefixedPattern = pattern.startsWith(NAMESPACE) ? pattern : `${NAMESPACE}${pattern}`;
      let cursor = '0';
      const keys = [];
      do {
        const [newCursor, batch] = await client.scan(cursor, 'MATCH', prefixedPattern, 'COUNT', 100);
        cursor = newCursor;
        keys.push(...batch);
      } while (cursor !== '0');
      // Strip namespace prefix from returned keys for caller transparency
      return keys.map(k => k.startsWith(NAMESPACE) ? k.slice(NAMESPACE.length) : k);
    } catch (error) {
      const { logger } = require('../config/logging.js');
      logger.warn(`Cache KEYS error for pattern ${pattern}: ${error.message}`);
      return [];
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    try {
      const client = redisService.getClient();
      const info = await client.info('stats');
      const dbSize = await client.dbsize();
      return { dbSize, info };
    } catch (error) {
      return null;
    }
  }

  /**
   * Clear all cache keys (only namespaced keys, not sessions/queues)
   */
  async clear() {
    try {
      // Use pattern-based deletion instead of flushdb to preserve non-cache data
      await this.invalidate('*');
    } catch (_) {}
  }
}

// Export singleton instance + TTL constants
const instance = new CacheManager();
instance.TTL = TTL;
module.exports = instance;
