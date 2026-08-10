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

function _prune() {
  if (_recent.size <= MAX_KEYS) return;
  // Drop the oldest ~100 entries.
  const oldest = [..._recent.entries()].sort((a, b) => a[1] - b[1]).slice(0, 100);
  for (const [k] of oldest) _recent.delete(k);
}

/**
 * @param {string} kind    short category, e.g. 'Server error', 'Uncaught exception'
 * @param {Error|any} err  the error
 * @param {{method?:string, url?:string, userId?:string|number}} context
 */
async function report(kind, err, context = {}) {
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
    ].filter(Boolean).join('\n');

    try {
      const { sendTelegram } = require('./telegramService.js');
      await sendTelegram(body);
    } catch (_) { /* telegram not configured — the logger already has it */ }
  } catch (_) { /* the reporter must never throw */ }
}

module.exports = { report };
