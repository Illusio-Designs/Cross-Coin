'use strict';

/**
 * System health (dashboard → Settings → System health, admins only).
 *
 *   getHealth() — one payload: this server process (build, uptime, memory),
 *     the Bull job queue, when the last courier / WhatsApp webhook arrived,
 *     errors reported in 24 h, and every scheduled job (config/cronJobs.js)
 *     with its last run, next run and last 10 runs (services/jobRunService.js).
 *   runJobNow() — "Run now": the same logged wrapper, refused while the job
 *     is running (and for once-a-day jobs that already ran today).
 *
 * Cheap enough to poll every 60 s: a handful of indexed queries.
 */

const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');
const jobRuns = require('./jobRunService.js');

const IST_OFFSET_MIN = 330;
const LATE_GRACE_MS = 15 * 60 * 1000;
const RUN_NOW_WAIT_MS = 20 * 1000;

const q = (sql, replacements = {}) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
const iso = (d) => (d ? new Date(d).toISOString() : null);
const mb = (n) => Math.round(n / 1024 / 1024);
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timed out')), ms))]);

function registry() {
  return require('../config/cronJobs.js');
}

// "3 am server time = 8:30 am India time" for a job that follows the server
// clock while the server isn't on IST. null when it doesn't matter.
function clockNote(job) {
  if (job.tz) return null;
  const serverOff = -new Date().getTimezoneOffset();
  if (serverOff === IST_OFFSET_MIN) return null;
  const [min, hour] = job.cron.split(/\s+/);
  if (hour === '*' || !/^\d+$/.test(min) || !/^[\d,]+$/.test(hour)) return null;
  const fmt = (totalMin) => {
    const m = ((totalMin % 1440) + 1440) % 1440;
    const h = Math.floor(m / 60); const mm = m % 60;
    return `${h % 12 || 12}${mm ? `:${String(mm).padStart(2, '0')}` : ''} ${h < 12 ? 'am' : 'pm'}`;
  };
  const times = hour.split(',').map((h) => Number(h) * 60 + Number(min));
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'server';
  return `Set on the server clock (${zone}): ${times.map(fmt).join(' & ')} there = ${times.map((t) => fmt(t - serverOff + IST_OFFSET_MIN)).join(' & ')} India time`;
}

async function webhookTimes() {
  const out = { courier_last_at: null, whatsapp_last_at: null };
  try {
    const [r] = await q('SELECT createdAt AS at FROM shipment_webhook_events ORDER BY id DESC LIMIT 1');
    out.courier_last_at = iso(r?.at);
  } catch (_) { /* table not created yet */ }
  try {
    // Last customer message Meta delivered to our webhook (MAX(id) on the
    // (direction, status) index, then one primary-key lookup).
    const [r] = await q(`SELECT createdAt AS at FROM whatsapp_messages
                          WHERE id = (SELECT MAX(id) FROM whatsapp_messages WHERE direction = 'inbound' AND status = 'received')`);
    out.whatsapp_last_at = iso(r?.at);
  } catch (_) { /* no WhatsApp tables */ }
  return out;
}

async function queueHealth() {
  let redisUp = false;
  try { redisUp = require('./redisService.js').isReady(); } catch (_) { /* no redis module */ }
  if (!redisUp) return { queue: null, note: 'Background queue is off (Redis not connected) — jobs run inside the web server, without retries.' };
  try {
    const h = await withTimeout(require('./integrationQueue.js').getHealth(), 2500);
    if (!h) return { queue: null, note: 'Background queue is off — jobs run inside the web server, without retries.' };
    return { queue: h, note: null };
  } catch (e) {
    return { queue: null, note: `Couldn't read the job queue: ${e.message}` };
  }
}

function jobRow(job, history, runningSince, now) {
  const last = history[0] || null;
  let nextAt = null;
  try { nextAt = jobRuns.nextRunAt(job.cron, job.tz, now); } catch (_) { /* bad expression */ }
  // Late: the run due after the last one finished should have started by now.
  let late = false;
  if (last && !runningSince) {
    try {
      const due = jobRuns.nextRunAt(job.cron, job.tz, new Date(last.finished_at || last.started_at));
      late = !!due && due.getTime() + LATE_GRACE_MS < now.getTime();
    } catch (_) { /* ignore */ }
  }
  return {
    key: job.key,
    name: job.name,
    schedule: job.schedule,
    clock_note: clockNote(job),
    cron: job.cron,
    timezone: job.tz || Intl.DateTimeFormat().resolvedOptions().timeZone || null,
    messages_customers: !!job.messagesCustomers,
    once_per_day: !!job.oncePerDay,
    running: !!runningSince,
    running_since: iso(runningSince),
    late,
    last: last ? {
      started_at: last.started_at, status: last.status, summary: last.summary,
      error: last.error, duration_ms: last.duration_ms, manual: last.manual,
    } : null,
    next_at: iso(nextAt),
    history,
  };
}

async function getHealth() {
  const now = new Date();
  const { JOBS } = registry();
  const keys = JOBS.map((j) => j.key);
  const mem = process.memoryUsage();

  const [history, running, hooks, qh, errors] = await Promise.all([
    jobRuns.recentRuns(keys, 10),
    jobRuns.runningJobs(keys),
    webhookTimes(),
    queueHealth(),
    require('./errorReporter.js').errorsLast24h().catch(() => ({ count: null, source: null })),
  ]);

  return {
    generated_at: now.toISOString(),
    server: {
      build: require('../utils/buildInfo.js').buildInfo(),
      uptime: Math.round(process.uptime()),
      pid: process.pid,
      node: process.version,
      memory: { rss_mb: mb(mem.rss), heap_used_mb: mb(mem.heapUsed), heap_total_mb: mb(mem.heapTotal) },
    },
    queue: qh.queue,
    queue_note: qh.note,
    webhooks: hooks,
    errors_24h: errors.count,
    // 'process' = Redis is down, so this counts only this server process
    // since it started.
    errors_source: errors.source,
    jobs: JOBS.map((j) => jobRow(j, history[j.key] || [], running[j.key], now)),
  };
}

/** Start of today in India, as a Date. */
function istDayStart(now = Date.now()) {
  const day = 24 * 3600 * 1000;
  return new Date(Math.floor((now + IST_OFFSET_MIN * 60000) / day) * day - IST_OFFSET_MIN * 60000);
}

/**
 * "Run now". Returns { status: 404|409|200|202, body }.
 * Waits up to 20 s so a quick job answers with its result; a longer one
 * keeps running in the background (the page polls until it finishes).
 */
async function runJobNow(key, userId) {
  const job = registry().getJob(key);
  if (!job) return { status: 404, body: { success: false, message: 'No such job' } };

  if (job.oncePerDay && await jobRuns.ranSince(job.key, istDayStart())) {
    return { status: 409, body: { success: false, message: 'Already ran today. Running it again would message the same customers twice.' } };
  }
  const lock = await jobRuns.acquireLock(job.key, (job.lockMinutes || 30) * 60);
  if (!lock) return { status: 409, body: { success: false, message: 'This job is running right now. Wait for it to finish.' } };

  const run = jobRuns.executeLocked(job.key, job.run, lock, { triggeredBy: userId || null });
  const done = await Promise.race([run, new Promise((r) => setTimeout(() => r(null), RUN_NOW_WAIT_MS))]);
  if (!done) {
    run.catch(() => {});
    return { status: 202, body: { success: true, finished: false, message: 'Still running. This row updates when it finishes.' } };
  }
  return {
    status: 200,
    body: {
      success: true,
      finished: true,
      run: {
        started_at: iso(done.started_at), finished_at: iso(done.finished_at), status: done.status,
        summary: done.summary, error: done.error, duration_ms: done.duration_ms, manual: true,
      },
    },
  };
}

module.exports = { getHealth, runJobNow };
