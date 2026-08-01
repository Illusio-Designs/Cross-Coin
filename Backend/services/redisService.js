const Redis = require('ioredis');

/**
 * Resolve Redis connection details. Prefers discrete REDIS_HOST/PORT/PASSWORD,
 * but falls back to REDIS_URL (redis://:pass@host:port/db) — managed hosts
 * (cPanel, etc.) often only provide REDIS_URL, in which case the discrete
 * defaults (localhost:6379) point at the wrong/no Redis and caching silently
 * disables itself.
 */
function resolveRedis() {
  if (!process.env.REDIS_HOST && process.env.REDIS_URL) {
    try {
      const u = new URL(process.env.REDIS_URL);
      return {
        host: u.hostname || 'localhost',
        port: parseInt(u.port, 10) || 6379,
        password: u.password ? decodeURIComponent(u.password) : undefined,
        db: u.pathname && u.pathname.length > 1 ? (parseInt(u.pathname.slice(1), 10) || 0) : 0,
        ...(u.protocol === 'rediss:' ? { tls: {} } : {}),
      };
    } catch { /* fall through to discrete/defaults */ }
  }
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
  };
}

/**
 * Redis Connection Manager
 * Handles Redis client initialization with connection pooling,
 * error handling, and reconnection logic
 * 
 * Requirements: 2.1
 */
class RedisService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
  }

  /**
   * Initialize Redis client with connection pooling
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      this.client = new Redis({
        ...resolveRedis(),
        // Stop retrying after 5 attempts — don't spam logs forever
        retryStrategy: (times) => {
          if (times > 5) return null; // stop retrying
          return Math.min(times * 500, 3000);
        },
        maxRetriesPerRequest: 1,
        enableReadyCheck: false,
        enableOfflineQueue: false, // don't queue commands when disconnected
        lazyConnect: true,        // don't connect until .ping() is called
        reconnectOnError: () => false,
      });

      // Handle connection events
      this.client.on('connect', () => {
        console.log('✅ Redis client connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
      });

      this.client.on('error', (err) => {
        console.error('❌ Redis client error:', err.message);
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        console.log('🔄 Redis client reconnecting...');
      });

      this.client.on('ready', () => {
        console.log('✅ Redis client ready');
        this.isConnected = true;
      });

      // Connect explicitly (lazyConnect: true means it won't auto-connect)
      await this.client.connect();

      // Test connection
      await this.client.ping();
      this.isConnected = true;
      console.log('✅ Redis connection verified');
    } catch (error) {
      console.error('❌ Failed to initialize Redis:', error.message);
      this.isConnected = false;
      // Disconnect cleanly so it doesn't keep retrying in background
      if (this.client) {
        this.client.disconnect();
        this.client = null;
      }
      throw error;
    }
  }

  /**
   * Get Redis client instance
   * @returns {Redis} Redis client
   */
  getClient() {
    if (!this.client) {
      throw new Error('Redis client not initialized. Call initialize() first.');
    }
    return this.client;
  }

  /**
   * Check if Redis is connected
   * @returns {boolean} Connection status
   */
  isReady() {
    return this.isConnected && this.client && this.client.status === 'ready';
  }

  /**
   * Close Redis connection
   * @returns {Promise<void>}
   */
  async close() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      console.log('✅ Redis connection closed');
    }
  }

  /**
   * Flush all data from current database
   * @returns {Promise<void>}
   */
  async flushDb() {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }
    await this.client.flushdb();
    console.log('✅ Redis database flushed');
  }

  /**
   * Get connection info
   * @returns {Object} Connection info
   */
  getConnectionInfo() {
    const c = resolveRedis();
    return {
      host: c.host,
      port: c.port,
      db: c.db,
      isConnected: this.isConnected,
      status: this.client ? this.client.status : 'not_initialized'
    };
  }

  async get(key) {
    if (!this.client || !this.isConnected) return null;
    return this.client.get(key);
  }

  async set(key, value, ...args) {
    if (!this.client || !this.isConnected) return null;
    return this.client.set(key, value, ...args);
  }

  async del(key) {
    if (!this.client || !this.isConnected) return null;
    return this.client.del(key);
  }

  async incr(key) {
    if (!this.client || !this.isConnected) return null;
    return this.client.incr(key);
  }

  async incrby(key, amount) {
    if (!this.client || !this.isConnected) return null;
    return this.client.incrby(key, amount);
  }

  async decrby(key, amount) {
    if (!this.client || !this.isConnected) return null;
    return this.client.decrby(key, amount);
  }

  async ttl(key) {
    if (!this.client || !this.isConnected) return -2;
    return this.client.ttl(key);
  }

  async exists(key) {
    if (!this.client || !this.isConnected) return 0;
    return this.client.exists(key);
  }

  async expire(key, seconds) {
    if (!this.client || !this.isConnected) return null;
    return this.client.expire(key, seconds);
  }

  async scan(cursor, ...args) {
    if (!this.client || !this.isConnected) return ['0', []];
    return this.client.scan(cursor, ...args);
  }

  async eval(script, numKeys, ...args) {
    if (!this.client || !this.isConnected) return null;
    return this.client.eval(script, numKeys, ...args);
  }
}

// Export singleton instance
module.exports = new RedisService();
// Exposed for tests — the REDIS_URL/discrete-vars resolver.
module.exports.resolveRedis = resolveRedis;
