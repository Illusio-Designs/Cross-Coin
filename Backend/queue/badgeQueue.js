'use strict';

const Queue = require('bull');
const { logger } = require('../config/logging.js');

// Only create the queue if Redis is configured
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  // Stop retrying after 3 attempts — prevents log spam when Redis is down
  maxRetriesPerRequest: 1,
  enableReadyCheck: false,
  retryStrategy: (times) => {
    if (times > 3) return null; // give up
    return Math.min(times * 1000, 5000);
  },
};

let badgeQueue = null;

try {
  badgeQueue = new Queue('badge_recalculation', {
    redis: redisConfig,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
      removeOnFail: false,
    },
  });

  badgeQueue.on('completed', (job) => {
    logger.debug(`✅ Badge job ${job.id} completed for user ${job.data.user_id}`);
  });

  badgeQueue.on('failed', (job, err) => {
    logger.warn(`⚠️ Badge job ${job.id} failed (attempt ${job.attemptsMade}/${job.opts.attempts}): ${err.message}`);
    // Dead Letter Queue — after max attempts, log for manual review
    if (job.attemptsMade >= job.opts.attempts) {
      logger.error(`[DLQ] Badge job permanently failed for user ${job.data.user_id}:`, {
        jobId: job.id,
        data: job.data,
        error: err.message,
        failedAt: new Date().toISOString(),
      });
    }
  });

  // Log error once, don't spam
  let errorLogged = false;
  badgeQueue.on('error', (error) => {
    if (!errorLogged) {
      logger.warn('Badge queue unavailable (Redis): ' + error.message);
      errorLogged = true;
    }
  });

} catch (err) {
  logger.warn('Badge queue disabled — Redis not available: ' + err.message);
}

module.exports = badgeQueue;
