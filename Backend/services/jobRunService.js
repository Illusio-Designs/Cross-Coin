'use strict';

/**
 * Job-run log for the scheduled jobs (config/cronJobs.js).
 *
 * Every run of a scheduled job — on its schedule, from the queue, or started
 * by an admin with "Run now" on the System health page — goes through
 * runLogged(), which:
 *   - takes a per-job lock (Redis SET NX, in-process when Redis is down) so a
 *     job never runs twice at the same time,
 *   - times the run and records one row in job_runs with a one-line,
 *     plain-English summary the job returns ("9 sent · 2 skipped (no number)"),
 *   - prunes rows older than 30 days, at most once a day per process.
 *
 * A job returns a summary string, or { summary, status, error } where status
 * is ok | partial | failed | skipped. A thrown error is recorded as failed.
 *
 * Schema (created lazily, once per process — see ensureSchema):
 *   job_runs (id, job_key, started_at, finished_at, status, summary, error,
 *             duration_ms, triggered_by)
 *
 * Also here: nextRunAt(), a tiny 5-field cron parser that tells the health
 * page when each job runs next (in the job's time zone).
 */

const crypto = require('crypto');
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');
const { logger } = require('../config/logging.js');

const KEEP_DAYS = 30;
const STATUSES = new Set(['ok', 'partial', 'failed', 'skipped']);

const q = (sql, replacements = {}) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT });

// ── Schema ─────────────────────────────────────────────────────────────────
let schemaPromise = null;
function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await sequelize.query(`CREATE TABLE IF NOT EXISTS job_runs (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        job_key VARCHAR(64) NOT NULL,
        started_at DATETIME(3) NOT NULL,
        finished_at DATETIME(3) NULL,
        status VARCHAR(10) NOT NULL,
        summary VARCHAR(255) NULL,
        error TEXT NULL,
        duration_ms INT NULL,
        triggered_by INT NULL,
        KEY idx_job_runs_key_started (job_key, started_at),
        KEY idx_job_runs_started (started_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    })().catch((e) => { schemaPromise = null; throw e; });
  }
  return schemaPromise;
}

// ── Lock: one run of a job at a time (across processes when Redis is up) ────
const LOCK_PREFIX = 'jobrun:lock:';
const localLocks = new Map(); // key -> { token, startedAt, until }

function redisClient() {
  try {
    const r = require('./redisService.js');
    return r.isReady() ? r.getClient() : null;
  } catch (_) { return null; }
}

/** Try to take the lock. Returns { key, token, startedAt } or null if held. */
async function acquireLock(jobKey, ttlSec = 30 * 60) {
  const startedAt = Date.now();
  const token = `${startedAt}|${process.pid}|${crypto.randomBytes(4).toString('hex')}`;
  const redis = redisClient();
  if (redis) {
    try {
      const ok = await redis.set(LOCK_PREFIX + jobKey, token, 'EX', ttlSec, 'NX');
      return ok === 'OK' ? { key: jobKey, token, startedAt, redis: true } : null;
    } catch (e) {
      logger.warn(`[jobs] lock via Redis failed for ${jobKey}, using in-process lock: ${e.message}`);
    }
  }
  const held = localLocks.get(jobKey);
  if (held && held.until > Date.now()) return null;
  localLocks.set(jobKey, { token, startedAt, until: startedAt + ttlSec * 1000 });
  return { key: jobKey, token, startedAt, redis: false };
}

async function releaseLock(lock) {
  if (!lock) return;
  if (lock.redis) {
    const redis = redisClient();
    if (redis) {
      try {
        // Delete only our own lock (it may have expired and been re-taken).
        await redis.eval("if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
          1, LOCK_PREFIX + lock.key, lock.token);
      } catch (_) { /* expires by TTL */ }
    }
    return;
  }
  const held = localLocks.get(lock.key);
  if (held && held.token === lock.token) localLocks.delete(lock.key);
}

/** Map jobKey -> running-since Date for jobs currently running. */
async function runningJobs(keys) {
  const out = {};
  const redis = redisClient();
  if (redis && keys.length) {
    try {
      const vals = await redis.mget(keys.map((k) => LOCK_PREFIX + k));
      vals.forEach((v, i) => { if (v) out[keys[i]] = new Date(Number(String(v).split('|')[0]) || Date.now()); });
    } catch (_) { /* fall through to local */ }
  }
  for (const k of keys) {
    const held = localLocks.get(k);
    if (held && held.until > Date.now() && !out[k]) out[k] = new Date(held.startedAt);
  }
  return out;
}

// ── Recording ───────────────────────────────────────────────────────────────
function normalizeResult(result) {
  if (result == null) return { status: 'ok', summary: 'Done', error: null };
  if (typeof result === 'string') return { status: 'ok', summary: result, error: null };
  const status = STATUSES.has(result.status) ? result.status : 'ok';
  return { status, summary: result.summary || (status === 'ok' ? 'Done' : null), error: result.error || null };
}

let lastPruneAt = 0;
async function pruneOldRuns() {
  if (Date.now() - lastPruneAt < 24 * 3600 * 1000) return;
  lastPruneAt = Date.now();
  try {
    await sequelize.query('DELETE FROM job_runs WHERE started_at < ?', {
      replacements: [new Date(Date.now() - KEEP_DAYS * 24 * 3600 * 1000)],
    });
  } catch (e) { logger.warn('[jobs] prune failed: ' + e.message); }
}

async function recordRun(row) {
  await ensureSchema();
  await sequelize.query(
    `INSERT INTO job_runs (job_key, started_at, finished_at, status, summary, error, duration_ms, triggered_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    { replacements: [row.job_key, row.started_at, row.finished_at, row.status,
      row.summary ? String(row.summary).slice(0, 255) : null,
      row.error ? String(row.error).slice(0, 4000) : null,
      row.duration_ms, row.triggered_by || null] },
  );
}

/**
 * Run a job whose lock is already held, record it, release the lock.
 * opts.rethrow — re-throw a thrown error after recording it (Bull jobs that
 * rely on Bull's retry). opts.triggeredBy — staff user id for "Run now".
 */
async function executeLocked(jobKey, fn, lock, { rethrow = false, triggeredBy = null } = {}) {
  const started = new Date(lock.startedAt);
  let outcome; let thrown = null;
  try {
    outcome = normalizeResult(await fn());
  } catch (e) {
    thrown = e;
    outcome = { status: 'failed', summary: `Stopped with an error: ${String(e.message || e).slice(0, 180)}`, error: e.stack || String(e) };
  } finally {
    await releaseLock(lock);
  }
  const finished = new Date();
  const row = { job_key: jobKey, started_at: started, finished_at: finished, duration_ms: finished - started, triggered_by: triggeredBy, ...outcome };
  const tag = outcome.status === 'failed' ? '❌' : outcome.status === 'partial' ? '⚠️' : '✅';
  (outcome.status === 'failed' ? console.error : console.log)(`${tag} [CRON] ${jobKey}: ${outcome.summary || outcome.status}${outcome.status === 'failed' && outcome.error ? ` — ${String(outcome.error).split('\n')[0]}` : ''}`);
  try { await recordRun(row); } catch (e) { logger.warn(`[jobs] could not record run of ${jobKey}: ${e.message}`); }
  pruneOldRuns();
  if (thrown && rethrow) throw thrown;
  return row;
}

/**
 * Run fn as job `jobKey`, logged. If the job is already running (here or in
 * another process) this run is dropped and returns { busy: true } — nothing
 * is recorded, the run in progress records its own result.
 */
async function runLogged(jobKey, fn, { lockMinutes = 30, rethrow = false, triggeredBy = null } = {}) {
  const lock = await acquireLock(jobKey, lockMinutes * 60);
  if (!lock) {
    console.log(`⏭️  [CRON] ${jobKey}: previous run still going — this run skipped`);
    return { busy: true };
  }
  return executeLocked(jobKey, fn, lock, { rethrow, triggeredBy });
}

// ── Reading ─────────────────────────────────────────────────────────────────
const toIso = (d) => (d ? new Date(d).toISOString() : null);

/** Last `limit` runs per job key, newest first: { key: [run, ...] }. */
async function recentRuns(keys, limit = 10) {
  const out = Object.fromEntries(keys.map((k) => [k, []]));
  if (!keys.length) return out;
  await ensureSchema();
  const n = Math.max(1, Math.min(50, Number(limit) || 10));
  const parts = keys.map(() => `(SELECT id, job_key, started_at, finished_at, status, summary, error, duration_ms, triggered_by
                                   FROM job_runs WHERE job_key = ? ORDER BY started_at DESC LIMIT ${n})`);
  const rows = await q(parts.join(' UNION ALL '), keys);
  for (const r of rows) {
    out[r.job_key].push({
      id: Number(r.id), started_at: toIso(r.started_at), finished_at: toIso(r.finished_at),
      status: r.status, summary: r.summary, error: r.error,
      duration_ms: r.duration_ms == null ? null : Number(r.duration_ms),
      manual: r.triggered_by != null,
    });
  }
  for (const k of keys) out[k].sort((a, b) => (a.started_at < b.started_at ? 1 : -1));
  return out;
}

/** Did this job finish a non-failed run since `since`? (guard for "Run now"). */
async function ranSince(jobKey, since) {
  await ensureSchema();
  const rows = await q(`SELECT id FROM job_runs WHERE job_key = :k AND started_at >= :since AND status IN ('ok','partial') LIMIT 1`,
    { k: jobKey, since });
  return rows.length > 0;
}

// ── Next run (tiny cron parser) ─────────────────────────────────────────────
// Supports the 5-field syntax used in cronJobs.js: *, n, a-b, lists and /step.
const FIELD_RANGES = [[0, 59], [0, 23], [1, 31], [1, 12], [0, 7]];

function parseField(src, [lo, hi]) {
  const set = new Set();
  for (const part of String(src).split(',')) {
    const [rangePart, stepPart] = part.split('/');
    const step = stepPart ? parseInt(stepPart, 10) : 1;
    let a; let b;
    if (rangePart === '*') { a = lo; b = hi; }
    else if (rangePart.includes('-')) { [a, b] = rangePart.split('-').map((x) => parseInt(x, 10)); }
    else { a = parseInt(rangePart, 10); b = stepPart ? hi : a; }
    if (!Number.isFinite(a) || !Number.isFinite(b) || !(step > 0)) throw new Error(`Bad cron field "${src}"`);
    for (let v = a; v <= b; v += step) set.add(v);
  }
  return set;
}

function parseCron(expr) {
  const f = String(expr).trim().split(/\s+/);
  if (f.length !== 5) throw new Error(`Cron "${expr}" must have 5 fields`);
  const [min, hour, dom, mon, dow] = f.map((s, i) => parseField(s, FIELD_RANGES[i]));
  if (dow.has(7)) dow.add(0);
  return { min, hour, dom, mon, dow, domAny: f[2] === '*', dowAny: f[4] === '*' };
}

/** Minutes the zone is ahead of UTC at `at` (server zone when tz is empty). */
function tzOffsetMinutes(tz, at = new Date()) {
  if (!tz) return -at.getTimezoneOffset();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(at);
  const g = (t) => Number(parts.find((p) => p.type === t).value);
  const wall = Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'));
  return Math.round((wall - Math.floor(at.getTime() / 60000) * 60000) / 60000);
}

/** Next time (Date) the cron expression fires strictly after `from`. */
function nextRunAt(expr, tz, from = new Date()) {
  const c = parseCron(expr);
  const off = tzOffsetMinutes(tz, from);
  const MIN = 60000;
  // Walk in "wall clock as UTC" time, skipping whole days/hours that can't match.
  let t = Math.floor((from.getTime() + off * MIN) / MIN) * MIN + MIN;
  const limit = t + 400 * 24 * 60 * MIN;
  while (t < limit) {
    const d = new Date(t);
    const dayOk = (c.domAny || c.dowAny)
      ? c.dom.has(d.getUTCDate()) && c.dow.has(d.getUTCDay())
      : c.dom.has(d.getUTCDate()) || c.dow.has(d.getUTCDay());
    if (!c.mon.has(d.getUTCMonth() + 1) || !dayOk) {
      t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
      continue;
    }
    if (!c.hour.has(d.getUTCHours())) {
      t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours() + 1);
      continue;
    }
    if (!c.min.has(d.getUTCMinutes())) { t += MIN; continue; }
    return new Date(t - off * MIN);
  }
  return null;
}

module.exports = {
  ensureSchema, runLogged, executeLocked, acquireLock, releaseLock, runningJobs,
  recentRuns, ranSince, nextRunAt, parseCron, tzOffsetMinutes, KEEP_DAYS,
};
