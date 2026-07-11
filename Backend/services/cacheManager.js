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

// Cap the in-memory fallback so a burst of unique keys (e.g. per-slug SEO)
// can't grow the heap unbounded. Oldest entry is evicted on overflow.
const MEMORY_MAX_ENTRIES = 2000;

/**
 * In-process fallback cache used ONLY when Redis is unavailable.
 *
 * On shared hosting (cPanel/Passenger) Redis is frequently not provisioned, in
 * which case the Redis path silently no-ops and every request hits MySQL. This
 * store keeps caching working in that scenario. Values are stored serialized
 * (mirrors the Redis path — prevents callers mutating cached objects).
 *
 * Caveat: this cache is per Node process. If the host runs multiple workers,
 * an invalidation only clears the local worker; others expire by TTL. That's
 * an acceptable bound (minutes) and only applies when Redis is down — when
 * Redis is up, this store is never used for reads, so there's no regression.
 */
class MemoryStore {
  constructor(max = MEMORY_MAX_ENTRIES) {
    this.max = max;
    this.m = new Map(); // key -> { v: serializedString, exp: epochMs | 0 }
  }
  set(key, serialized, ttlSec) {
    if (this.m.has(key)) this.m.delete(key); // refresh insertion order (LRU-ish)
    const exp = ttlSec > 0 ? Date.now() + ttlSec * 1000 : 0;
    this.m.set(key, { v: serialized, exp });
    if (this.m.size > this.max) {
      const oldest = this.m.keys().next().value;
      this.m.delete(oldest);
    }
  }
  get(key) {
    const e = this.m.get(key);
    if (!e) return null;
    if (e.exp && Date.now() > e.exp) { this.m.delete(key); return null; }
    // Touch for LRU ordering
    this.m.delete(key); this.m.set(key, e);
    return e.v;
  }
  delete(key) { return this.m.delete(key) ? 1 : 0; }
  ttl(key) {
    const e = this.m.get(key);
    if (!e) return -2;
    if (!e.exp) return -1;
    const s = Math.ceil((e.exp - Date.now()) / 1000);
    return s > 0 ? s : -2;
  }
  expire(key, ttlSec) {
    const e = this.m.get(key);
    if (!e) return 0;
    e.exp = ttlSec > 0 ? Date.now() + ttlSec * 1000 : 0;
    return 1;
  }
  _glob(pattern) {
    const esc = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    return new RegExp(`^${esc}$`);
  }
  invalidate(globPattern) {
    const re = this._glob(globPattern);
    let n = 0;
    for (const k of [...this.m.keys()]) {
      if (re.test(k)) { this.m.delete(k); n++; }
    }
    return n;
  }
  keys(globPattern) {
    const re = this._glob(globPattern);
    const out = [];
    for (const k of this.m.keys()) if (re.test(k)) out.push(k);
    return out;
  }
  size() { return this.m.size; }
  clear() { this.m.clear(); }
}

class CacheManager {
  constructor() {
    this._mem = new MemoryStore();
    // Periodically drop expired entries so long-lived processes don't hold
    // stale keys that are never re-accessed. unref() so it never keeps the
    // process alive on its own.
    try {
      const t = setInterval(() => {
        const now = Date.now();
        for (const [k, e] of this._mem.m) {
          if (e.exp && now > e.exp) this._mem.m.delete(k);
        }
      }, 60 * 1000);
      if (t && typeof t.unref === 'function') t.unref();
    } catch (_) { /* timers unavailable — size cap still bounds memory */ }
  }

  /**
   * Whether to use Redis. When ready, Redis is the single source of truth for
   * reads/writes (shared across workers — correct cross-worker invalidation),
   * exactly as before this fallback existed. Only when Redis is NOT ready do we
   * fall back to the in-process store.
   */
  _useRedis() {
    try { return redisService.isReady(); } catch (_) { return false; }
  }

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
      const serialized = JSON.stringify(value);

      // Enforce max value size
      if (serialized.length > MAX_VALUE_SIZE) {
        const { logger } = require('../config/logging.js');
        logger.warn(`Cache SET skipped for key ${key}: value size ${serialized.length} exceeds max ${MAX_VALUE_SIZE}`);
        return;
      }

      const prefixedKey = this._prefixKey(key);
      if (this._useRedis()) {
        const client = redisService.getClient();
        if (ttl > 0) {
          await client.setex(prefixedKey, ttl, serialized);
        } else {
          await client.set(prefixedKey, serialized);
        }
      } else {
        this._mem.set(prefixedKey, serialized, ttl);
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
      const prefixedKey = this._prefixKey(key);
      let data;
      if (this._useRedis()) {
        data = await redisService.getClient().get(prefixedKey);
      } else {
        data = this._mem.get(prefixedKey);
      }
      if (data === null || data === undefined) return null;
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
   * Delete a specific cache key. Clears both tiers so a Redis recovery never
   * leaves a stale entry lingering in the in-process store.
   */
  async delete(key) {
    const prefixedKey = this._prefixKey(key);
    this._mem.delete(prefixedKey);
    try {
      if (redisService.isReady()) {
        return await redisService.getClient().del(prefixedKey);
      }
    } catch (error) { /* fall through */ }
    return 0;
  }

  /**
   * Invalidate cache entries matching a pattern. Always clears the in-process
   * store; also clears Redis when it's ready.
   */
  async invalidate(pattern) {
    let globPattern = pattern;
    if (pattern instanceof RegExp) {
      globPattern = pattern.source.replace(/\^/, '').replace(/\$/, '').replace(/\./g, '*');
    }
    // Prefix the pattern for namespace isolation
    const prefixedPattern = globPattern.startsWith(NAMESPACE) ? globPattern : `${NAMESPACE}${globPattern}`;

    // In-process tier (cheap, always safe)
    let deletedCount = this._mem.invalidate(prefixedPattern);

    // Redis tier
    try {
      if (redisService.isReady()) {
        const client = redisService.getClient();
        let cursor = '0';
        const keysToDelete = [];
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
      }
    } catch (error) {
      const { logger } = require('../config/logging.js');
      logger.warn(`Cache INVALIDATE error for pattern ${pattern}: ${error.message}`);
    }
    return deletedCount;
  }

  /**
   * Check if a key exists in cache
   */
  async exists(key) {
    try {
      const prefixedKey = this._prefixKey(key);
      if (this._useRedis()) {
        return (await redisService.getClient().exists(prefixedKey)) === 1;
      }
      return this._mem.get(prefixedKey) !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get TTL of a cache key
   */
  async getTTL(key) {
    try {
      const prefixedKey = this._prefixKey(key);
      if (this._useRedis()) {
        return await redisService.getClient().ttl(prefixedKey);
      }
      return this._mem.ttl(prefixedKey);
    } catch (error) {
      return -2;
    }
  }

  /**
   * Set expiration on an existing key
   */
  async expire(key, ttl) {
    try {
      const prefixedKey = this._prefixKey(key);
      if (this._useRedis()) {
        return await redisService.getClient().expire(prefixedKey, ttl);
      }
      return this._mem.expire(prefixedKey, ttl);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get all keys matching a pattern
   */
  async getKeys(pattern) {
    try {
      const prefixedPattern = pattern.startsWith(NAMESPACE) ? pattern : `${NAMESPACE}${pattern}`;
      let keys;
      if (this._useRedis()) {
        const client = redisService.getClient();
        let cursor = '0';
        keys = [];
        do {
          const [newCursor, batch] = await client.scan(cursor, 'MATCH', prefixedPattern, 'COUNT', 100);
          cursor = newCursor;
          keys.push(...batch);
        } while (cursor !== '0');
      } else {
        keys = this._mem.keys(prefixedPattern);
      }
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
      if (this._useRedis()) {
        const client = redisService.getClient();
        const info = await client.info('stats');
        const dbSize = await client.dbsize();
        return { dbSize, info, tier: 'redis' };
      }
      return { dbSize: this._mem.size(), info: 'in-process memory fallback', tier: 'memory' };
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
