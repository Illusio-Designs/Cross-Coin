'use strict';

/**
 * Lightweight production error visibility.
 *
 * Server exceptions used to only land in log files nobody reads. This pushes a
 * DEDUPED alert to Telegram (reusing telegramService — no new dependency), so an
 * admin actually sees production errors. Identical errors within a window are
 * collapsed to one message so a recurring fault can't spam the channel.
 *
 * It is best-effort and never throws into the caller: if Telegram isn't
 * configured, the error is still in the logs.
 *
 * Env:
 *   ERROR_ALERTS=off              disable Telegram alerts (logs only)
 *   ERROR_ALERT_DEDUP_MS=600000   dedupe window (default 10 min)
 */

const DEDUP_MS = Number(process.env.ERROR_ALERT_DEDUP_MS) || 10 * 60 * 1000;
const MAX_KEYS = 500;
const _recent = new Map(); // key -> last-sent timestamp

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Which deploy/process sent the alert — a process that survived a deploy
// shows an old build, so stale code is obvious from the alert itself.
function _buildLine() {
  try { return require('../utils/buildInfo.js').buildLine(); } catch (_) { return ''; }
}

function _prune() {
  if (_recent.size <= MAX_KEYS) return;
  // Drop the oldest ~100 entries.
  const oldest = [..._recent.entries()].sort((a, b) => a[1] - b[1]).slice(0, 100);
  for (const [k] of oldest) _recent.delete(k);
}

// ── Error count (System health page: "Errors · 24 h") ─────────────────────
// Every report() is counted — before dedupe, and even with alerts off — in
// hourly Redis buckets (shared by all app processes, kept 25 h), with an
// in-process fallback when Redis is down. Two cheap commands per error.
const HOUR_MS = 3600 * 1000;
const _localErrorTimes = []; // timestamps, fallback only
function _redis() {
  try { const r = require('./redisService.js'); return r.isReady() ? r.getClient() : null; } catch (_) { return null; }
}
function _countError() {
  try {
    const now = Date.now();
    _localErrorTimes.push(now);
    while (_localErrorTimes.length && (_localErrorTimes[0] < now - 24 * HOUR_MS || _localErrorTimes.length > 5000)) _localErrorTimes.shift();
    const redis = _redis();
    if (redis) {
      const key = `errors:hour:${Math.floor(now / HOUR_MS)}`;
      redis.multi().incr(key).expire(key, 25 * 3600).exec().catch(() => {});
    }
  } catch (_) { /* counting must never throw */ }
}

/** Errors reported in the last 24 hours ({ count, source: 'redis'|'process' }). */
async function errorsLast24h() {
  const redis = _redis();
  if (redis) {
    try {
      const h = Math.floor(Date.now() / HOUR_MS);
      const vals = await redis.mget(Array.from({ length: 24 }, (_, i) => `errors:hour:${h - i}`));
      return { count: vals.reduce((n, v) => n + (Number(v) || 0), 0), source: 'redis' };
    } catch (_) { /* fall through */ }
  }
  const since = Date.now() - 24 * HOUR_MS;
  return { count: _localErrorTimes.filter((t) => t >= since).length, source: 'process' };
}

/**
 * @param {string} kind    short category, e.g. 'Server error', 'Uncaught exception'
 * @param {Error|any} err  the error
 * @param {{method?:string, url?:string, userId?:string|number}} context
 */
async function report(kind, err, context = {}) {
  _countError();
  try {
    if (String(process.env.ERROR_ALERTS).toLowerCase() === 'off') return;

    const msg = err?.message || String(err);
    const key = `${kind}:${String(msg).slice(0, 140)}`;
    const now = Date.now();
    const last = _recent.get(key);
    if (last && now - last < DEDUP_MS) return; // within dedupe window — skip
    _recent.set(key, now);
    _prune();

    const where = [context.method, context.url].filter(Boolean).join(' ');
    const stack = (err?.stack || '').split('\n').slice(0, 4).join('\n');
    const body = [
      `<b>🐞 ${esc(kind)}</b>`,
      where ? `<code>${esc(where)}</code>` : null,
      context.userId != null ? `user: ${esc(context.userId)}` : null,
      msg ? esc(String(msg).slice(0, 300)) : null,
      stack ? `<pre>${esc(stack.slice(0, 600))}</pre>` : null,
      `<i>${esc(_buildLine())}</i>`,
    ].filter(Boolean).join('\n');

    try {
      const { sendTelegram } = require('./telegramService.js');
      await sendTelegram(body);
    } catch (_) { /* telegram not configured — the logger already has it */ }
  } catch (_) { /* the reporter must never throw */ }
}

/**
 * Plain operational alert (not an exception) — e.g. "a courier booking gave up".
 * Deduped like report(). Pass a stable dedupeKey (e.g. per order) so the same
 * event doesn't re-alert within the window.
 * @param {string} title
 * @param {string|string[]} lines
 * @param {{dedupeKey?:string}} opts
 */
async function notify(title, lines = [], { dedupeKey } = {}) {
  try {
    if (String(process.env.ERROR_ALERTS).toLowerCase() === 'off') return;
    const key = `notify:${dedupeKey || title}`;
    const now = Date.now();
    const last = _recent.get(key);
    if (last && now - last < DEDUP_MS) return;
    _recent.set(key, now);
    _prune();

    const arr = Array.isArray(lines) ? lines : [lines];
    const body = [`<b>${esc(title)}</b>`, ...arr.filter(Boolean).map((l) => esc(String(l).slice(0, 300)))].join('\n');
    try {
      const { sendTelegram } = require('./telegramService.js');
      await sendTelegram(body);
    } catch (_) { /* telegram not configured */ }
  } catch (_) { /* never throw */ }
}

module.exports = { report, notify, errorsLast24h };
