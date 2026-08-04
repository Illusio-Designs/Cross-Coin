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

  // Register the consumer + one-time backlog clear. This queue previously had a
  // producer (order creation enqueues jobs) but NO consumer registered, so jobs
  // piled up in Redis and product badges never recalculated. On first boot after
  // this fix we drain the stale backlog once (guarded by a Redis marker so later
  // deploys never wipe live jobs), then process new jobs with bounded
  // concurrency so the drain can't spike the small cPanel server.
  const BADGE_CONCURRENCY = parseInt(process.env.BADGE_QUEUE_CONCURRENCY) || 2;
  badgeQueue.isReady().then(async () => {
    try {
      const cleared = await badgeQueue.client.get('badge_queue_cleared_v1');
      if (!cleared) {
        await badgeQueue.empty(); // drop the stale no-consumer backlog (one-time)
        await badgeQueue.client.set('badge_queue_cleared_v1', '1');
        logger.info('[Badge] cleared stale backlog (one-time)');
      }
      const { processBadgeRecalculation } = require('./processors/badgeProcessor.js');
      badgeQueue.process(BADGE_CONCURRENCY, processBadgeRecalculation);
      logger.info(`[Badge] processor registered (concurrency ${BADGE_CONCURRENCY})`);
    } catch (e) {
      logger.warn('[Badge] processor registration failed: ' + e.message);
    }
  }).catch((e) => logger.warn('[Badge] queue not ready: ' + e.message));

} catch (err) {
  logger.warn('Badge queue disabled — Redis not available: ' + err.message);
}

module.exports = badgeQueue;
