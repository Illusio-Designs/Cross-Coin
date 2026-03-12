const Queue = require("bull");
const redis = require("redis");

// Create Redis client for Bull queue
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
});

// Create Bull queue for badge recalculation
const badgeQueue = new Queue("badge_recalculation", {
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },
  defaultJobOptions: {
    attempts: 3, // Retry up to 3 times
    backoff: {
      type: "exponential",
      delay: 2000, // Start with 2 second delay
    },
    removeOnComplete: true, // Remove job after completion
    removeOnFail: false, // Keep failed jobs for debugging
  },
});

// Event listeners for queue
badgeQueue.on("completed", (job) => {
  console.log(`✅ Badge recalculation job ${job.id} completed for user ${job.data.user_id}`);
});

badgeQueue.on("failed", (job, err) => {
  console.error(`❌ Badge recalculation job ${job.id} failed:`, err.message);
});

badgeQueue.on("error", (error) => {
  console.error("❌ Badge queue error:", error);
});

badgeQueue.on("stalled", (job) => {
  console.warn(`⚠️ Badge recalculation job ${job.id} stalled`);
});

module.exports = badgeQueue;
