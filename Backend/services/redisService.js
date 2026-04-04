const Redis = require('ioredis');

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
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB) || 0,
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
    return {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      db: process.env.REDIS_DB || 0,
      isConnected: this.isConnected,
      status: this.client ? this.client.status : 'not_initialized'
    };
  }
}

// Export singleton instance
module.exports = new RedisService();
