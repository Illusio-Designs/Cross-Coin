/**
 * Integration retry queue (Bull on Redis).
 *
 * Wraps external integration calls that have historically been
 * fire-and-forget — shipping syncs, payment captures, WhatsApp sends.
 * Failures are pushed onto a Bull queue and retried with exponential
 * backoff so a transient network blip no longer leaves an order in
 * limbo.
 *
 * Graceful degradation: if Redis isn't available the queue API still
 * works but jobs execute INLINE (best-effort, no retries). Same code
 * path in dev (no Redis) and prod (with Redis) — nothing crashes.
 *
 * Public API:
 *   enqueue(jobName, payload, opts?)  → adds a job to the queue
 *   registerProcessor(jobName, fn)    → wires a worker for a job type
 *   getStats()                        → counts for dashboard display
 *   close()                           → graceful shutdown
 *
 * Job processors run in the same Node process for now (cheaper than
 * a separate worker dyno and good enough for our scale). To move to
 * a dedicated worker later, just call registerProcessor() from a
 * different entry point and skip mounting it here.
 */

const { logger } = require('../config/logging.js');

let queue = null;
let bullAvailable = false;
const inlineProcessors = new Map();

function buildRedisConfig() {
  const base = { maxRetriesPerRequest: null, enableReadyCheck: false };

  // Prefer discrete vars, but fall back to REDIS_URL (redis://:pass@host:port/db).
  // Managed hosts (cPanel, etc.) often only provide REDIS_URL — without this the
  // queue defaulted to localhost:6379 (wrong Redis) and jobs sat unprocessed,
  // leaving orders stuck at "Pending Sync".
  if (!process.env.REDIS_HOST && process.env.REDIS_URL) {
    try {
      const u = new URL(process.env.REDIS_URL);
      return {
        ...base,
        host: u.hostname || 'localhost',
        port: parseInt(u.port, 10) || 6379,
        password: u.password ? decodeURIComponent(u.password) : undefined,
        db: u.pathname && u.pathname.length > 1 ? (parseInt(u.pathname.slice(1), 10) || 0) : 0,
        ...(u.protocol === 'rediss:' ? { tls: {} } : {}),
      };
    } catch {
      logger.warn('[integrationQueue] REDIS_URL is set but could not be parsed — using discrete vars/defaults');
    }
  }

  return {
    ...base,
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
  };
}

function tryInit() {
  if (queue !== null) return;
  try {
    // Bull opens a few ioredis connections and registers error/ready/end
    // listeners on each for every processor we mount (~11), tripping Node's
    // default 10-listener leak heuristic with a harmless startup warning. Raise
    // the default so those legitimate one-time listeners don't warn (a genuine
    // per-request leak would still climb past this).
    require('events').EventEmitter.defaultMaxListeners = 25;
    const Bull = require('bull');
    queue = new Bull('integrations', {
      redis: buildRedisConfig(),
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 200, age: 24 * 3600 },
        removeOnFail: { count: 500, age: 7 * 24 * 3600 },
      },
    });
    queue.on('error', (err) => {
      logger.warn(`[integrationQueue] Bull error: ${err.message}`);
    });
    queue.on('failed', (job, err) => {
      logger.warn(`[integrationQueue] job ${job.name}#${job.id} failed (attempt ${job.attemptsMade}/${job.opts.attempts}): ${err.message}`);
    });
    queue.on('completed', (job) => {
      logger.debug(`[integrationQueue] job ${job.name}#${job.id} completed`);
    });
    bullAvailable = true;
    logger.info('[integrationQueue] Bull queue ready');
  } catch (err) {
    bullAvailable = false;
    queue = false;  // sentinel — don't retry
    logger.warn(`[integrationQueue] Bull unavailable — falling back to inline processing: ${err.message}`);
  }
}

async function enqueue(jobName, payload = {}, opts = {}) {
  tryInit();
  if (bullAvailable && queue) {
    try {
      return await queue.add(jobName, payload, opts);
    } catch (err) {
      logger.warn(`[integrationQueue] enqueue failed, running inline: ${err.message}`);
    }
  }
  // Inline fallback — best effort, no retries.
  const fn = inlineProcessors.get(jobName);
  if (!fn) {
    logger.warn(`[integrationQueue] No processor registered for "${jobName}" — payload dropped`);
    return null;
  }
  setImmediate(async () => {
    try { await fn({ name: jobName, data: payload, attemptsMade: 1 }); }
    catch (err) { logger.warn(`[integrationQueue] inline ${jobName} failed: ${err.message}`); }
  });
  return null;
}

function registerProcessor(jobName, concurrency, fn) {
  // Allow registerProcessor(name, fn) shorthand
  if (typeof concurrency === 'function') { fn = concurrency; concurrency = 1; }
  inlineProcessors.set(jobName, fn);
  tryInit();
  if (bullAvailable && queue) {
    queue.process(jobName, concurrency, async (job) => fn(job));
    logger.info(`[integrationQueue] processor registered: ${jobName} (concurrency=${concurrency})`);
  }
}

async function getStats() {
  tryInit();
  if (!bullAvailable || !queue) {
    return { available: false, mode: 'inline', counts: {} };
  }
  try {
    const counts = await queue.getJobCounts();
    return { available: true, mode: 'bull', counts };
  } catch (err) {
    return { available: false, mode: 'bull', error: err.message };
  }
}

async function close() {
  if (queue && bullAvailable) {
    try { await queue.close(); } catch {}
  }
  queue = null;
  bullAvailable = false;
}

module.exports = { enqueue, registerProcessor, getStats, close };
