'use strict';

/**
 * Server Watch: production monitoring (dashboard → Settings → Server logs).
 *
 *   recorder: Express middleware that counts every request in 5-minute
 *     buckets per group (checkout, login, page loads, webhooks, admin, store)
 *     with 5xx / 4xx / 429 / CORS-blocked counts and response times. Counts
 *     stay in memory and are flushed to MySQL once a minute, so a request
 *     never waits on the database.
 *   noteLog / noteCors: errors (logger.error, 5xx) and blocked requests
 *     (429, CORS) grouped by "same problem" per hour, with a count.
 *   watch(): the watchdog (cron 'server-watch', every 10 min). Checks the
 *     rules below, opens an alert when one trips, reminds every hour while
 *     it stays open and sends "Resolved" when it clears. Alerts go by email
 *     and WhatsApp to the recipients in the settings.
 *   dailySummary(): yesterday in numbers, 9 am IST (cron 'server-watch-daily').
 *   dbPing: every 5 min each process checks the database; when it is down
 *     the alert is emailed directly (no database needed for that).
 *   memory: every 5 min each server process records its memory (total held,
 *     app heap in use, heap limit) so the page can tell a leak (heap in use
 *     keeps climbing), heavy jobs (spikes) and memory not yet given back.
 *
 * Tables (created lazily): server_stats, server_log_events, server_alerts,
 * server_watch_settings. Stats and events are kept 30 days.
 */

const crypto = require('crypto');
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

const BUCKET_MS = 5 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const FLUSH_MS = 60 * 1000;
const KEEP_DAYS = 30;
const SLOW_MS = 3000;
const IST = 'Asia/Kolkata';

const DEFAULTS = {
  enabled: true,
  emails: ['info@illusiodesigns.agency'],
  whatsapp: ['7600046416'],
  hoursFrom: 0, // alert hours, India time; 0–24 = all day
  hoursTo: 24,
  dailySummary: true,
  remindMinutes: 60,
  rules: {
    ordersStoppedHours: 2,
    ordersStoppedMinVisits: 30,
    checkoutFailPct: 20,
    checkoutMinRequests: 5,
    errorPct: 2,
    errorMinRequests: 50,
    blockedCount: 30,
    slowMs: 3000,
    memoryMb: 1024,
    courierQuietHours: 12,
  },
};

const q = (sql, replacements = {}) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
const exec = (sql, replacements = {}) => sequelize.query(sql, { replacements });
const num = (v) => Number(v) || 0;
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);
const istTime = (d = new Date()) => new Date(d).toLocaleString('en-IN', { timeZone: IST, day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const istHour = (d = new Date()) => Number(new Date(d).toLocaleString('en-US', { timeZone: IST, hour: 'numeric', hourCycle: 'h23' }));

// ── Schema ─────────────────────────────────────────────────────────────────
let schemaPromise = null;
function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await exec(`CREATE TABLE IF NOT EXISTS server_stats (
        bucket DATETIME NOT NULL,
        grp VARCHAR(16) NOT NULL,
        brand VARCHAR(32) NOT NULL DEFAULT '',
        requests INT NOT NULL DEFAULT 0,
        fail5xx INT NOT NULL DEFAULT 0,
        fail4xx INT NOT NULL DEFAULT 0,
        rl429 INT NOT NULL DEFAULT 0,
        cors INT NOT NULL DEFAULT 0,
        slow INT NOT NULL DEFAULT 0,
        dur_sum BIGINT NOT NULL DEFAULT 0,
        dur_max INT NOT NULL DEFAULT 0,
        PRIMARY KEY (bucket, grp, brand)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
      await exec(`CREATE TABLE IF NOT EXISTS server_log_events (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        hour DATETIME NOT NULL,
        sig CHAR(16) NOT NULL,
        level VARCHAR(8) NOT NULL,
        kind VARCHAR(16) NOT NULL,
        brand VARCHAR(64) NULL,
        method VARCHAR(8) NULL,
        path VARCHAR(191) NULL,
        status SMALLINT NULL,
        message VARCHAR(500) NOT NULL,
        count INT NOT NULL DEFAULT 0,
        first_at DATETIME NOT NULL,
        last_at DATETIME NOT NULL,
        UNIQUE KEY uq_sle_hour_sig (hour, sig),
        KEY idx_sle_last (last_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
      await exec(`CREATE TABLE IF NOT EXISTS server_alerts (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        alert_key VARCHAR(80) NOT NULL,
        severity VARCHAR(8) NOT NULL,
        title VARCHAR(191) NOT NULL,
        detail VARCHAR(500) NULL,
        opened_at DATETIME NOT NULL,
        last_seen_at DATETIME NOT NULL,
        last_notified_at DATETIME NULL,
        notified_count INT NOT NULL DEFAULT 0,
        resolved_at DATETIME NULL,
        KEY idx_sa_open (resolved_at, alert_key),
        KEY idx_sa_opened (opened_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
      await exec(`CREATE TABLE IF NOT EXISTS server_memory (
        at DATETIME NOT NULL,
        pid INT NOT NULL,
        rss_mb INT NOT NULL,
        heap_used_mb INT NOT NULL,
        heap_total_mb INT NOT NULL,
        external_mb INT NOT NULL,
        heap_limit_mb INT NOT NULL,
        uptime_s INT NOT NULL,
        PRIMARY KEY (at, pid)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
      await exec(`CREATE TABLE IF NOT EXISTS server_watch_settings (
        id TINYINT NOT NULL PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at DATETIME NOT NULL,
        updated_by INT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    })().catch((e) => { schemaPromise = null; throw e; });
  }
  return schemaPromise;
}

// ── Settings ───────────────────────────────────────────────────────────────
const splitList = (v) => (Array.isArray(v) ? v : String(v || '').split(/[,\n]/)).map((s) => String(s).trim()).filter(Boolean);

function cleanSettings(input = {}) {
  const rules = { ...DEFAULTS.rules };
  for (const k of Object.keys(rules)) {
    const v = Number(input.rules?.[k]);
    if (Number.isFinite(v) && v >= 0) rules[k] = v;
  }
  const hour = (v, d) => (Number.isInteger(Number(v)) && Number(v) >= 0 && Number(v) <= 24 ? Number(v) : d);
  const remind = Number(input.remindMinutes);
  return {
    enabled: input.enabled !== undefined ? !!input.enabled : DEFAULTS.enabled,
    emails: input.emails !== undefined ? splitList(input.emails).filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)).slice(0, 10) : DEFAULTS.emails,
    whatsapp: input.whatsapp !== undefined ? splitList(input.whatsapp).map((p) => p.replace(/[^\d+]/g, '')).filter((p) => p.replace(/\D/g, '').length >= 10).slice(0, 10) : DEFAULTS.whatsapp,
    hoursFrom: hour(input.hoursFrom, DEFAULTS.hoursFrom),
    hoursTo: hour(input.hoursTo, DEFAULTS.hoursTo),
    dailySummary: input.dailySummary !== undefined ? !!input.dailySummary : DEFAULTS.dailySummary,
    remindMinutes: Number.isFinite(remind) && remind >= 10 ? Math.min(remind, 24 * 60) : DEFAULTS.remindMinutes,
    rules,
  };
}

let settingsCache = null; // { at, value }
async function getSettings() {
  if (settingsCache && Date.now() - settingsCache.at < 60 * 1000) return settingsCache.value;
  await ensureSchema();
  const [row] = await q('SELECT data FROM server_watch_settings WHERE id = 1');
  let value = DEFAULTS;
  if (row) { try { value = cleanSettings(JSON.parse(row.data)); } catch (_) { value = DEFAULTS; } }
  settingsCache = { at: Date.now(), value };
  return value;
}

async function saveSettings(input, userId = null) {
  await ensureSchema();
  const value = cleanSettings(input);
  await exec(`INSERT INTO server_watch_settings (id, data, updated_at, updated_by) VALUES (1, :data, :now, :by)
              ON DUPLICATE KEY UPDATE data = VALUES(data), updated_at = VALUES(updated_at), updated_by = VALUES(updated_by)`,
  { data: JSON.stringify(value), now: new Date(), by: userId });
  settingsCache = { at: Date.now(), value };
  return value;
}

function inAlertHours(s, d = new Date()) {
  const from = s.hoursFrom; const to = s.hoursTo;
  if (from === to || (from === 0 && to === 24)) return true;
  const h = istHour(d);
  return from < to ? h >= from && h < to : h >= from || h < to;
}

// ── Stores (brands) ────────────────────────────────────────────────────────
// Every storefront sends X-Brand-Name: <slug>. Known slugs are counted per
// store; anything else is 'other' (so made-up headers can't add rows) and
// no header (admin panel, webhooks) is ''.
let brandCache = { at: 0, bySlug: new Map(), loading: false };
function refreshBrands() {
  if (brandCache.loading || Date.now() - brandCache.at < 10 * 60 * 1000) return;
  brandCache.loading = true;
  q('SELECT id, name, slug FROM brands')
    .then((rows) => { brandCache = { at: Date.now(), bySlug: new Map(rows.map((b) => [String(b.slug).toLowerCase(), { id: b.id, name: b.name }])), loading: false }; })
    .catch(() => { brandCache.loading = false; brandCache.at = Date.now() - 9 * 60 * 1000; });
}
async function brands() {
  if (!brandCache.at) {
    const rows = await q('SELECT id, name, slug FROM brands');
    brandCache = { at: Date.now(), bySlug: new Map(rows.map((b) => [String(b.slug).toLowerCase(), { id: b.id, name: b.name }])), loading: false };
  } else refreshBrands();
  return brandCache.bySlug;
}
function brandOf(raw) {
  const slug = String(raw || '').trim().toLowerCase();
  if (!slug) return '';
  if (slug === ADMIN_SOURCE) return ADMIN_SOURCE;
  refreshBrands();
  if (!brandCache.at) return /^[a-z0-9-]{1,32}$/.test(slug) ? slug : 'other'; // before the first load
  return brandCache.bySlug.has(slug) ? slug : 'other';
}
const brandName = (slug) => (slug === ADMIN_SOURCE ? 'Obzus admin' : slug === 'other' ? 'Unknown store' : slug ? brandCache.bySlug.get(slug)?.name || slug : 'No store (webhooks, other)');

// The Obzus admin panel runs on this same server, so its requests are
// counted as their own source ('obzus', group 'admin'): sent from the admin
// site (Origin / Referer), made with a staff login, or the admin login itself.
const ADMIN_SOURCE = 'obzus';
const ADMIN_HOSTS = new Set(['obzus.vercel.app', ...[process.env.ADMIN_URL, process.env.DASHBOARD_URL, process.env.ADMIN_DASHBOARD_URL]
  .filter(Boolean).map((u) => { try { return new URL(u).host; } catch (_) { return null; } }).filter(Boolean)]);
const hostOf = (u) => { try { return new URL(u).host; } catch (_) { return ''; } };
let staffRoles = null;
function isAdminRequest(req) {
  const host = hostOf(req.headers?.origin) || hostOf(req.headers?.referer);
  if (host && (ADMIN_HOSTS.has(host) || /(^|\.)obzus\b/.test(host))) return true;
  if (/^\/api(\/v1)?\/users\/admin\//.test(req.originalUrl || '')) return true;
  const u = req.user || req._rlUser;
  if (!u) return false;
  try {
    if (!staffRoles) staffRoles = require('../middleware/authMiddleware.js');
    return staffRoles.hasAnyRole(u, staffRoles.STAFF_ROLES);
  } catch (_) { return false; }
}
/** Store slug, 'obzus' for the admin panel, 'other' or '' (no store). */
function sourceOf(req) {
  if (req.swSource !== undefined) return req.swSource;
  return isAdminRequest(req) ? ADMIN_SOURCE : brandOf(req.headers?.['x-brand-name']);
}

// ── Recorder (in memory, flushed every minute) ─────────────────────────────
const stats = new Map(); // `${bucketMs}|${grp}|${brand}` → counters
const events = new Map(); // `${hourMs}|${sig}` → event

function groupOf(method, path) {
  const p = path.replace(/^\/api(\/v1)?/, '');
  if (p === '/i/v') return 'visit';
  if (/webhook/i.test(p)) return 'webhook';
  if (/^\/(users\/(admin\/)?login|users\/register|auth\/otp)/.test(p)) return 'login';
  if (method === 'POST' && /^\/(orders|checkout|payments\/razorpay|custom-checkout\/token)/.test(p)) return 'checkout';
  if (/^\/(admin|staff|dashboard)\b/.test(p) || /^\/users\/admin/.test(p)) return 'admin';
  if (!path.startsWith('/api')) return 'other';
  return 'store';
}

// "/api/orders/1234/items?x=1" → "/api/orders/:id/items" so one problem
// groups into one row.
function normPath(url) {
  return String(url || '').split('?')[0]
    .replace(/\/[0-9a-f]{16,}(?=\/|$)/gi, '/:id')
    .replace(/\/[A-Z]{2,}-\d[\w-]*(?=\/|$)/g, '/:id')
    .replace(/\/\d+(?=\/|$)/g, '/:id')
    .slice(0, 191);
}

function bump(bucketMs, grp, brand, f) {
  const k = `${bucketMs}|${grp}|${brand}`;
  let s = stats.get(k);
  if (!s) { s = { requests: 0, fail5xx: 0, fail4xx: 0, rl429: 0, cors: 0, slow: 0, dur_sum: 0, dur_max: 0 }; stats.set(k, s); }
  f(s);
}

const sigOf = (text) => crypto.createHash('sha1').update(text).digest('hex').slice(0, 16);

function noteEvent({ level = 'error', kind = 'error', brand = null, method = null, path = null, status = null, message }) {
  try {
    const now = Date.now();
    const hourMs = now - (now % HOUR_MS);
    const msg = String(message || '').replace(/\s+/g, ' ').trim().slice(0, 500) || '(no message)';
    // Numbers vary per occurrence (ids, amounts, ms); leave them out of the signature.
    const sig = sigOf([kind, brand, method, path, status, msg.replace(/\d+/g, '#')].join('|'));
    const k = `${hourMs}|${sig}`;
    const e = events.get(k);
    if (e) { e.count += 1; e.last = now; return; }
    if (events.size > 2000) return; // runaway: keep memory bounded until the next flush
    events.set(k, { hourMs, sig, level, kind, brand, method, path, status, message: msg, count: 1, first: now, last: now });
  } catch (_) { /* never break the caller */ }
}

/** Called from config/logging.js for every error-level log line. */
function noteLog(level, message, data) {
  if (level !== 'error') return;
  if (data && typeof data === 'object' && data.method && data.url && data.status) {
    noteEvent({ level, kind: 'http', brand: brandOf(data.brand) || null, method: data.method, path: normPath(data.url), status: data.status, message: `${data.status} on ${data.method} ${normPath(data.url)}` });
    return;
  }
  const detail = data instanceof Error ? data.message : (data && typeof data === 'object' ? (data.message || data.error || '') : (data || ''));
  noteEvent({ level, kind: 'error', message: detail ? `${message} ${detail}` : message });
}

/** Called from the error middleware when CORS refuses an origin. */
function noteCors(req) {
  if (req) req.swCors = true;
  noteEvent({ level: 'warn', kind: 'cors', brand: (req && sourceOf(req)) || null, method: req?.method, path: normPath(req?.originalUrl), message: `CORS blocked origin ${req?.headers?.origin || '(none)'}` });
}

function recorder(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    try {
      const url = req.originalUrl || req.url || '';
      const path = url.split('?')[0];
      if (path === '/api/health' || path === '/health') return;
      const method = (req.method || 'GET').toUpperCase();
      const status = res.statusCode;
      const dur = Date.now() - start;
      const bucketMs = start - (start % BUCKET_MS);
      const brand = sourceOf(req);
      req.swSource = brand; // the request log line (config/logging.js) reuses it
      const grp = brand === ADMIN_SOURCE && !/webhook/i.test(path) ? 'admin' : groupOf(method, path);
      bump(bucketMs, grp, brand, (s) => {
        s.requests += 1;
        if (status >= 500) s.fail5xx += 1;
        else if (status === 429) s.rl429 += 1;
        else if (req.swCors) s.cors += 1;
        else if (status >= 400 && method !== 'OPTIONS') s.fail4xx += 1;
        if (dur >= SLOW_MS) s.slow += 1;
        s.dur_sum += dur;
        if (dur > s.dur_max) s.dur_max = dur;
      });
      if (status === 429) {
        noteEvent({ level: 'warn', kind: 'ratelimit', brand: brand || null, method, path: normPath(url), status, message: `Too many requests (429) on ${method} ${normPath(url)}` });
      }
    } catch (_) { /* never break a request */ }
  });
  next();
}

let flushing = false;
async function flush() {
  if (flushing || (!stats.size && !events.size)) return;
  flushing = true;
  const s = [...stats.entries()]; stats.clear();
  const e = [...events.values()]; events.clear();
  try {
    await ensureSchema();
    for (const [k, v] of s) {
      const [bucketMs, grp, brand] = k.split('|');
      await exec(`INSERT INTO server_stats (bucket, grp, brand, requests, fail5xx, fail4xx, rl429, cors, slow, dur_sum, dur_max)
                  VALUES (:bucket, :grp, :brand, :requests, :fail5xx, :fail4xx, :rl429, :cors, :slow, :dur_sum, :dur_max)
                  ON DUPLICATE KEY UPDATE requests = requests + VALUES(requests), fail5xx = fail5xx + VALUES(fail5xx),
                    fail4xx = fail4xx + VALUES(fail4xx), rl429 = rl429 + VALUES(rl429), cors = cors + VALUES(cors),
                    slow = slow + VALUES(slow), dur_sum = dur_sum + VALUES(dur_sum), dur_max = GREATEST(dur_max, VALUES(dur_max))`,
      { bucket: new Date(Number(bucketMs)), grp, brand, ...v });
    }
    for (const v of e) {
      await exec(`INSERT INTO server_log_events (hour, sig, level, kind, brand, method, path, status, message, count, first_at, last_at)
                  VALUES (:hour, :sig, :level, :kind, :brand, :method, :path, :status, :message, :count, :first, :last)
                  ON DUPLICATE KEY UPDATE count = count + VALUES(count), last_at = GREATEST(last_at, VALUES(last_at))`,
      { ...v, hour: new Date(v.hourMs), first: new Date(v.first), last: new Date(v.last), brand: v.brand ? String(v.brand).slice(0, 64) : null, method: v.method || null, path: v.path || null, status: v.status || null });
    }
  } catch (err) {
    // Database down: put the counts back (bounded) so the next flush retries.
    if (stats.size < 5000) for (const [k, v] of s) if (!stats.has(k)) stats.set(k, v);
    console.error('[server-watch] flush failed:', err.message);
  } finally {
    flushing = false;
  }
}

// ── Notifications ──────────────────────────────────────────────────────────
let transport = null;
function mailer() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) return null;
  if (!transport) {
    const nodemailer = require('nodemailer');
    transport = nodemailer.createTransport({
      service: 'gmail', host: 'smtp.gmail.com', port: 587, secure: false,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_APP_PASSWORD },
    });
  }
  return transport;
}

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function sendEmail(to, subject, lines) {
  const t = mailer();
  if (!t) throw new Error('Email is not set up on the server (EMAIL_USER / EMAIL_APP_PASSWORD)');
  if (!to.length) return;
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5">${lines.map((l) => `<p style="margin:0 0 10px">${esc(l)}</p>`).join('')}
    <p style="margin:16px 0 0;color:#666;font-size:12px">Obzus Server Watch · admin panel → Settings → Server logs</p></div>`;
  await t.sendMail({ from: `"Obzus Server Watch" <${process.env.EMAIL_USER}>`, to: to.join(', '), subject, html, text: lines.join('\n\n') });
}

// The server_alert WhatsApp template on the shared business number: its
// status on Meta, and when it doesn't exist yet, create it (at most every
// 10 min) so Meta starts reviewing it. Business-started messages only arrive
// through an APPROVED template.
let tplCreateTriedAt = 0;
async function alertTemplate({ create = true } = {}) {
  const wa = require('./whatsappService.js');
  const brandId = wa.SHARED_WA_BRAND_ID || 1;
  const name = wa.tName('server_alert');
  try {
    const list = (await wa.listTemplates(brandId))?.data || [];
    // Our versioned name, or a plain server_alert made by hand; approved first.
    const found = list.filter((x) => x.name === name || x.name === 'server_alert');
    const t = found.find((x) => String(x.status).toUpperCase() === 'APPROVED') || found[0];
    if (t) {
      const status = String(t.status || '').toUpperCase();
      return { name: t.name, status, reason: status === 'REJECTED' && t.rejected_reason && t.rejected_reason !== 'NONE' ? t.rejected_reason : null };
    }
    if (create && Date.now() - tplCreateTriedAt > 10 * 60 * 1000) {
      tplCreateTriedAt = Date.now();
      const [r] = await wa.seedDefaultTemplates(brandId, [name]);
      try { wa.invalidateTemplateCache?.(brandId); } catch (_) { /* older build */ }
      if (r && (r.status === 'created' || r.status === 'already_exists')) return { name, status: 'PENDING', created: r.status === 'created' };
      return { name, status: 'MISSING', error: r?.error || 'WhatsApp did not accept the template' };
    }
    return { name, status: 'MISSING' };
  } catch (e) {
    return { name, status: 'UNKNOWN', error: e.message };
  }
}

async function sendWhatsApp(phones, title, detail, when) {
  const wa = require('./whatsappService.js');
  const brandId = wa.SHARED_WA_BRAND_ID || 1;
  const tpl = await alertTemplate();
  const results = [];
  for (const phone of phones) {
    let tplErr = null;
    if (tpl.status === 'APPROVED') {
      try {
        const r = await wa.sendTemplate(phone, tpl.name, [title, detail, when], brandId, { staff: true });
        results.push({ phone, ok: true, via: 'template', waId: r?.messages?.[0]?.id || null });
        continue;
      } catch (e) { tplErr = e; }
    }
    // No approved template: a plain message, which WhatsApp only delivers when
    // this number messaged the business number in the last 24 hours.
    try {
      const r = await wa.sendTextMessage(phone, `*${title}*\n\n${detail}\n\nTime: ${when} (India time)`, brandId);
      results.push({ phone, ok: true, via: 'text', waId: r?.messages?.[0]?.id || null, template: tpl.status });
    } catch (txtErr) {
      results.push({ phone, ok: false, error: `${tplErr ? `template: ${wa.metaError ? wa.metaError(tplErr) : tplErr.message}; ` : ''}plain message: ${wa.metaError ? wa.metaError(txtErr) : txtErr.message}`, template: tpl.status });
    }
  }
  return results;
}

// What WhatsApp did with the messages we just sent: the webhook updates the
// saved row (sent → delivered → read, or failed with Meta's reason). Waits up
// to ~10 s for an answer.
async function deliveryOf(results) {
  const ids = results.map((r) => r.waId).filter(Boolean);
  if (!ids.length) return results;
  let rows = [];
  for (let i = 0; i < 5; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    rows = await q('SELECT wa_message_id, status, error_reason, error_text FROM whatsapp_messages WHERE wa_message_id IN (:ids)', { ids }).catch(() => []);
    if (rows.length === ids.length && rows.every((r) => r.status && r.status !== 'sent' && r.status !== 'pending')) break;
  }
  return results.map((r) => {
    const row = rows.find((x) => x.wa_message_id === r.waId);
    if (!row) return r;
    return { ...r, delivery: row.status, ...(row.status === 'failed' ? { ok: false, error: row.error_text || row.error_reason || 'WhatsApp could not deliver it' } : {}) };
  });
}

/** Email + WhatsApp to every recipient. Never throws; returns what happened. */
async function notify(settings, { title, detail, subject }) {
  const when = istTime();
  const out = { email: null, whatsapp: [] };
  try {
    await sendEmail(settings.emails, subject || title, [title, detail, `Time: ${when} (India time)`]);
    out.email = settings.emails.length ? { ok: true } : { ok: false, error: 'No email recipients' };
  } catch (e) {
    out.email = { ok: false, error: e.message };
  }
  try {
    out.whatsapp = await sendWhatsApp(settings.whatsapp, title, detail, when);
  } catch (e) {
    out.whatsapp = [{ ok: false, error: e.message }];
  }
  return out;
}

// ── Memory ─────────────────────────────────────────────────────────────────
const MB = 1024 * 1024;
function memNow() {
  const m = process.memoryUsage();
  return {
    pid: process.pid,
    rss_mb: Math.round(m.rss / MB),
    heap_used_mb: Math.round(m.heapUsed / MB),
    heap_total_mb: Math.round(m.heapTotal / MB),
    external_mb: Math.round((m.external + (m.arrayBuffers || 0)) / MB),
    heap_limit_mb: Math.round(require('v8').getHeapStatistics().heap_size_limit / MB),
    uptime_s: Math.round(process.uptime()),
  };
}
async function sampleMemory() {
  await ensureSchema();
  const now = Date.now();
  await exec(`INSERT IGNORE INTO server_memory (at, pid, rss_mb, heap_used_mb, heap_total_mb, external_mb, heap_limit_mb, uptime_s)
              VALUES (:at, :pid, :rss_mb, :heap_used_mb, :heap_total_mb, :external_mb, :heap_limit_mb, :uptime_s)`,
  { at: new Date(now - (now % 60000)), ...memNow() });
}
// Latest sample of every process seen in the last 15 minutes.
async function liveProcesses() {
  return q(`SELECT m.* FROM server_memory m
              JOIN (SELECT pid, MAX(at) at FROM server_memory WHERE at >= :since GROUP BY pid) l ON l.pid = m.pid AND l.at = m.at
             ORDER BY m.rss_mb DESC`, { since: new Date(Date.now() - 15 * 60 * 1000) });
}

// ── Watchdog ───────────────────────────────────────────────────────────────
async function windowStats(minutes, grp = null, brand = null) {
  const [r] = await q(`SELECT COALESCE(SUM(requests),0) requests, COALESCE(SUM(fail5xx),0) fail5xx, COALESCE(SUM(fail4xx),0) fail4xx,
                              COALESCE(SUM(rl429),0) rl429, COALESCE(SUM(cors),0) cors, COALESCE(SUM(slow),0) slow, COALESCE(SUM(dur_sum),0) dur_sum
                         FROM server_stats WHERE bucket >= :since ${grp ? 'AND grp = :grp' : ''} ${brand != null ? 'AND brand = :brand' : ''}`,
  { since: new Date(Date.now() - minutes * 60 * 1000), grp, brand });
  const o = {};
  for (const k of Object.keys(r)) o[k] = num(r[k]);
  return o;
}

async function checkRules(s) {
  const r = s.rules;
  const found = [];
  const add = (key, severity, title, detail) => found.push({ key, severity, title, detail });

  // 1. Orders stopped on a store while people are still visiting it.
  const hrs = r.ordersStoppedHours;
  if (hrs > 0) {
    const since = new Date(Date.now() - hrs * HOUR_MS);
    const byBrand = await brands();
    const visits = await q(`SELECT brand, SUM(requests) n FROM server_stats WHERE bucket >= :since AND grp = 'visit' AND brand NOT IN ('', 'other')
                             GROUP BY brand HAVING n >= :min`, { since, min: r.ordersStoppedMinVisits });
    for (const v of visits) {
      const b = byBrand.get(v.brand);
      if (!b) continue;
      const [o] = await q('SELECT COUNT(*) n FROM orders WHERE brand_id = :id AND created_at >= :since', { id: b.id, since });
      if (num(o?.n) === 0) {
        add(`orders_stopped:${v.brand}`, 'high', `No orders on ${b.name}`,
          `${b.name} had no new order in the last ${hrs} hours while it had ${num(v.n)} page loads. Try a test order on that store and check checkout, payments and ads.`);
      }
    }
  }

  // 2. Checkout requests failing.
  const co = await windowStats(30, 'checkout');
  const coBad = co.fail5xx + co.rl429 + co.cors;
  if (co.requests >= r.checkoutMinRequests && pct(coBad, co.requests) > r.checkoutFailPct) {
    add('checkout_failing', 'high', 'Checkout is failing',
      `${coBad} of ${co.requests} checkout requests failed in the last 30 minutes (${pct(coBad, co.requests)}%: ${co.fail5xx} server errors, ${co.rl429} rate-limited, ${co.cors} blocked).`);
  }

  // 3. Server errors across the API.
  const all = await windowStats(15);
  if (all.requests >= r.errorMinRequests && pct(all.fail5xx, all.requests) > r.errorPct) {
    add('errors_5xx', 'high', 'Server errors are high',
      `${all.fail5xx} of ${all.requests} requests failed with a server error in the last 15 minutes (${pct(all.fail5xx, all.requests)}%).`);
  }

  // 4. Customers being turned away (rate limit / CORS).
  const blocked = all.rl429 + all.cors;
  if (r.blockedCount > 0 && blocked >= r.blockedCount) {
    add('blocked_requests', 'medium', 'Requests are being blocked',
      `${blocked} requests were refused in the last 15 minutes (${all.rl429} rate-limited, ${all.cors} blocked by CORS). Customers may see "something went wrong".`);
  }

  // 5. Slow responses.
  if (r.slowMs > 0 && all.requests >= r.errorMinRequests) {
    const avg = Math.round(all.dur_sum / all.requests);
    if (avg >= r.slowMs) {
      add('slow_responses', 'medium', 'The server is slow',
        `Average response time was ${(avg / 1000).toFixed(1)} s over the last 15 minutes (${all.slow} requests took over 3 s).`);
    }
  }

  // 6. Memory of the server processes (every process's latest sample).
  if (r.memoryMb > 0) {
    let procs = [];
    try { await sampleMemory(); procs = await liveProcesses(); } catch (_) { procs = [{ ...memNow() }]; }
    const top = procs.reduce((a, p) => (p.rss_mb > (a?.rss_mb || 0) ? p : a), null);
    if (top && top.rss_mb >= r.memoryMb) {
      const total = procs.reduce((n, p) => n + num(p.rss_mb), 0);
      add('memory_high', 'medium', 'Server memory is high',
        `A server process is holding ${top.rss_mb} MB (the app uses ${top.heap_used_mb} MB of it; alert level ${r.memoryMb} MB). ${procs.length} process${procs.length > 1 ? 'es' : ''}, ${total} MB together. The host may restart or slow it down.`);
    }
  }

  // 7. Courier webhooks quiet (status updates stopped arriving).
  if (r.courierQuietHours > 0) {
    try {
      const [w] = await q('SELECT createdAt AS at FROM shipment_webhook_events ORDER BY id DESC LIMIT 1');
      if (w?.at && Date.now() - new Date(w.at).getTime() > r.courierQuietHours * HOUR_MS) {
        add('courier_quiet', 'low', 'No courier updates',
          `The last courier status update arrived at ${istTime(w.at)}. Check the courier webhook setup.`);
      }
    } catch (_) { /* table not created yet */ }
  }

  // 8. Scheduled jobs whose latest run failed.
  try {
    const rows = await q(`SELECT jr.job_key, jr.error, jr.started_at FROM job_runs jr
                            JOIN (SELECT job_key, MAX(id) id FROM job_runs WHERE started_at >= :since GROUP BY job_key) l ON l.id = jr.id
                           WHERE jr.status = 'failed' AND jr.job_key NOT LIKE 'server-watch%'`,
    { since: new Date(Date.now() - 24 * HOUR_MS) });
    let names = {};
    try { names = Object.fromEntries(require('../config/cronJobs.js').JOBS.map((j) => [j.key, j.name])); } catch (_) { /* registry unavailable */ }
    for (const j of rows) {
      add(`job_failed:${j.job_key}`, 'low', `Scheduled job failed: ${names[j.job_key] || j.job_key}`,
        `Last run at ${istTime(j.started_at)} failed: ${String(j.error || 'no error message').slice(0, 200)}`);
    }
  } catch (_) { /* job_runs not created yet */ }

  return found;
}

async function watch() {
  const s = await getSettings();
  await flush();
  if (!s.enabled) return { summary: 'Server Watch is turned off', status: 'skipped' };

  const found = await checkRules(s);
  const now = new Date();
  const open = await q('SELECT * FROM server_alerts WHERE resolved_at IS NULL');
  const openByKey = new Map(open.map((a) => [a.alert_key, a]));
  const hoursOk = inAlertHours(s, now);
  let sent = 0;

  for (const f of found) {
    let row = openByKey.get(f.key);
    if (!row) {
      await exec(`INSERT INTO server_alerts (alert_key, severity, title, detail, opened_at, last_seen_at)
                  VALUES (:key, :severity, :title, :detail, :now, :now)`, { ...f, now });
      [row] = await q('SELECT * FROM server_alerts WHERE alert_key = :key AND resolved_at IS NULL ORDER BY id DESC LIMIT 1', { key: f.key });
    } else {
      await exec('UPDATE server_alerts SET detail = :detail, last_seen_at = :now WHERE id = :id', { detail: f.detail, now, id: row.id });
    }
    const due = !row.last_notified_at || now - new Date(row.last_notified_at) >= s.remindMinutes * 60 * 1000;
    if (hoursOk && due) {
      const again = row.notified_count > 0 ? ' (still happening)' : '';
      await notify(s, { title: `${f.title}${again}`, detail: f.detail, subject: `[Obzus] ${f.severity === 'high' ? '🔴' : '🟠'} ${f.title}${again}` });
      await exec('UPDATE server_alerts SET last_notified_at = :now, notified_count = notified_count + 1 WHERE id = :id', { now, id: row.id });
      sent += 1;
    }
  }

  const active = new Set(found.map((f) => f.key));
  let resolved = 0;
  for (const a of open) {
    if (active.has(a.alert_key)) continue;
    await exec('UPDATE server_alerts SET resolved_at = :now WHERE id = :id', { now, id: a.id });
    resolved += 1;
    // Only say "resolved" for alerts someone was told about.
    if (a.notified_count > 0 && hoursOk) {
      await notify(s, { title: `Resolved: ${a.title}`, detail: `This is back to normal (it started ${istTime(a.opened_at)}).`, subject: `[Obzus] ✅ Resolved: ${a.title}` });
    }
  }

  return found.length
    ? { summary: `${found.length} problem${found.length > 1 ? 's' : ''} open · ${sent} alert${sent === 1 ? '' : 's'} sent${resolved ? ` · ${resolved} resolved` : ''}`, status: 'partial' }
    : `All clear${resolved ? ` · ${resolved} resolved` : ''}`;
}

// ── Daily summary (yesterday, India time) ─────────────────────────────────
function istDayRange(daysAgo = 1) {
  const istNow = new Date(Date.now() + 330 * 60 * 1000);
  const startUtc = Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate() - daysAgo) - 330 * 60 * 1000;
  return { from: new Date(startUtc), to: new Date(startUtc + 24 * HOUR_MS) };
}

async function dailySummary() {
  await ensureSchema();
  await flush();
  const s = await getSettings();
  // Retention runs here too, once a day.
  const cutoff = new Date(Date.now() - KEEP_DAYS * 24 * HOUR_MS);
  await exec('DELETE FROM server_stats WHERE bucket < :cutoff', { cutoff });
  await exec('DELETE FROM server_log_events WHERE hour < :cutoff', { cutoff });
  await exec('DELETE FROM server_alerts WHERE resolved_at IS NOT NULL AND resolved_at < :cutoff', { cutoff });
  await exec('DELETE FROM server_memory WHERE at < :c', { c: new Date(Date.now() - 14 * 24 * HOUR_MS) });
  if (!s.enabled || !s.dailySummary) return { summary: 'Daily summary is turned off', status: 'skipped' };

  const { from, to } = istDayRange(1);
  const [t] = await q(`SELECT COALESCE(SUM(requests),0) requests, COALESCE(SUM(fail5xx),0) fail5xx, COALESCE(SUM(rl429),0) rl429, COALESCE(SUM(cors),0) cors,
                              COALESCE(SUM(CASE WHEN grp = 'visit' THEN requests END),0) visits
                         FROM server_stats WHERE bucket >= :from AND bucket < :to`, { from, to });
  const [o] = await q('SELECT COUNT(*) n, COALESCE(SUM(final_amount),0) amt FROM orders WHERE created_at >= :from AND created_at < :to', { from, to });
  const [a] = await q('SELECT COUNT(*) n FROM server_alerts WHERE opened_at >= :from AND opened_at < :to', { from, to });
  const top = await q(`SELECT message, SUM(count) c FROM server_log_events WHERE hour >= :from AND hour < :to AND level = 'error'
                       GROUP BY sig, message ORDER BY c DESC LIMIT 3`, { from, to });

  const byBrand = await brands();
  const sv = await q(`SELECT brand, SUM(CASE WHEN grp = 'visit' THEN requests ELSE 0 END) visits, SUM(fail5xx) fail5xx
                        FROM server_stats WHERE bucket >= :from AND bucket < :to AND brand NOT IN ('', 'other') GROUP BY brand`, { from, to });
  const so = await q('SELECT brand_id, COUNT(*) n FROM orders WHERE created_at >= :from AND created_at < :to GROUP BY brand_id', { from, to });
  const [adm] = await q(`SELECT COALESCE(SUM(requests),0) requests, COALESCE(SUM(fail5xx),0) fail5xx FROM server_stats
                          WHERE bucket >= :from AND bucket < :to AND brand = :admin`, { from, to, admin: ADMIN_SOURCE });
  const perStore = [...byBrand.entries()].filter(([slug]) => !slug.startsWith('zz-')).map(([slug, v]) => {
    const st = sv.find((r) => r.brand === slug) || {};
    const n = num(so.find((r) => r.brand_id === v.id)?.n);
    return { name: v.name, visits: num(st.visits), errors: num(st.fail5xx), orders: n };
  }).filter((x) => x.visits || x.orders || x.errors).sort((x, y) => y.orders - x.orders || y.visits - x.visits);
  const day = from.toLocaleDateString('en-IN', { timeZone: IST, day: 'numeric', month: 'short' });
  const req = num(t.requests);
  const detail = `${num(o.n)} orders (₹${Math.round(num(o.amt)).toLocaleString('en-IN')}), ${num(t.visits).toLocaleString('en-IN')} page loads, `
    + `${req.toLocaleString('en-IN')} requests, ${pct(num(t.fail5xx), req)}% server errors, ${num(t.rl429) + num(t.cors)} blocked, ${num(a.n)} alerts.`;
  const lines = [`Daily summary for ${day}`, detail,
    ...(perStore.length ? ['By store:', ...perStore.map((x) => `${x.name}: ${x.orders} orders, ${x.visits.toLocaleString('en-IN')} page loads${x.errors ? `, ${x.errors} server errors` : ''}`)] : []),
    ...(num(adm?.requests) ? [`Obzus admin: ${num(adm.requests).toLocaleString('en-IN')} requests${num(adm.fail5xx) ? `, ${num(adm.fail5xx)} server errors` : ''}`] : []),
    ...(top.length ? ['Most common errors:', ...top.map((e) => `${num(e.c)}× ${e.message}`)] : ['No errors logged.'])];

  try { await sendEmail(s.emails, `[Obzus] Daily server summary · ${day}`, lines); } catch (e) { console.error('[server-watch] summary email:', e.message); }
  try { await sendWhatsApp(s.whatsapp, `Daily summary for ${day}`, detail, istTime()); } catch (e) { console.error('[server-watch] summary WhatsApp:', e.message); }
  return `Sent: ${detail}`;
}

// ── Database ping (works when the database doesn't) ───────────────────────
let dbFails = 0;
let dbAlertAt = 0;
async function dbPing() {
  try {
    await Promise.race([sequelize.query('SELECT 1'), new Promise((_, rej) => setTimeout(() => rej(new Error('no answer in 10 s')), 10000))]);
    if (dbFails >= 2 && dbAlertAt) {
      const s = await getSettings().catch(() => DEFAULTS);
      await sendEmail(s.emails, '[Obzus] ✅ Resolved: Database is back', ['Resolved: Database is back', 'The server can reach the database again.']).catch(() => {});
    }
    dbFails = 0; dbAlertAt = 0;
  } catch (e) {
    dbFails += 1;
    if (dbFails >= 2 && Date.now() - dbAlertAt > HOUR_MS) {
      dbAlertAt = Date.now();
      const s = settingsCache?.value || DEFAULTS;
      // Email only: WhatsApp sending reads its settings from the database.
      await sendEmail(s.emails, '[Obzus] 🔴 Database is not answering', ['Database is not answering',
        `The server could not reach the database twice in a row (${e.message}). Orders, logins and the admin panel will fail until it is back. Check cPanel → MySQL and Resource Usage.`,
        `Time: ${istTime()} (India time)`]).catch((err) => console.error('[server-watch] db alert email:', err.message));
    }
  }
}

let started = false;
function start() {
  if (started || process.env.NODE_ENV === 'test') return;
  started = true;
  setInterval(() => { flush().catch(() => {}); }, FLUSH_MS).unref();
  setInterval(() => { dbPing().catch(() => {}); }, 5 * 60 * 1000).unref();
  setInterval(() => { sampleMemory().catch(() => {}); }, 5 * 60 * 1000).unref();
  setTimeout(() => { sampleMemory().catch(() => {}); }, 30 * 1000).unref();
  noteEvent({ level: 'info', kind: 'restart', message: `Server process started (pid ${process.pid})` });
}

// ── Admin page data ────────────────────────────────────────────────────────
const rank = (slug) => (slug === ADMIN_SOURCE ? 1 : slug === 'other' ? 2 : slug === '' ? 3 : 0);

async function overview({ hours = 24, level = '', search = '', brand = '' } = {}) {
  await ensureSchema();
  await flush();
  const h = [6, 24, 48, 168].includes(Number(hours)) ? Number(hours) : 24;
  const since = new Date(Date.now() - h * HOUR_MS);
  const byBrand = await brands();
  // One store, or all of them. '' = all; '-' = requests without a store.
  const wanted = String(brand || '').toLowerCase();
  const b = brand === '-' ? '' : wanted === ADMIN_SOURCE || (wanted && byBrand.has(wanted)) ? wanted : null;
  const brandId = b && b !== ADMIN_SOURCE ? byBrand.get(b).id : null;
  const oWhere = brandId ? 'AND brand_id = :brandId' : '';
  const sWhere = b != null ? 'AND brand = :b' : '';

  const [last15, lastHour, checkout1h, window] = await Promise.all([windowStats(15, null, b), windowStats(60, null, b), windowStats(60, 'checkout', b), windowStats(h * 60, null, b)]);
  const [orders1h] = await q(`SELECT COUNT(*) n FROM orders WHERE created_at >= :since ${oWhere}`, { since: new Date(Date.now() - HOUR_MS), brandId });
  const [lastOrder] = await q(`SELECT MAX(created_at) at FROM orders WHERE 1 = 1 ${oWhere}`, { brandId });

  // Hours are India-time hours (stored times are UTC).
  const series = await q(`SELECT DATE_FORMAT(DATE_ADD(bucket, INTERVAL 330 MINUTE), '%Y-%m-%d %H:00:00') hour, grp, SUM(requests) requests, SUM(fail5xx) fail5xx,
                                 SUM(rl429) + SUM(cors) blocked, SUM(dur_sum) dur_sum
                            FROM server_stats WHERE bucket >= :since ${sWhere} GROUP BY hour, grp ORDER BY hour`, { since, b });
  const ordersByHour = await q(`SELECT DATE_FORMAT(DATE_ADD(created_at, INTERVAL 330 MINUTE), '%Y-%m-%d %H:00:00') hour, COUNT(*) n FROM orders
                                 WHERE created_at >= :since ${oWhere} GROUP BY hour`, { since, brandId });

  // Per store, over the chosen range.
  const perStats = await q(`SELECT brand, SUM(requests) requests, SUM(CASE WHEN grp = 'visit' THEN requests ELSE 0 END) visits,
                                   SUM(CASE WHEN grp = 'checkout' THEN requests ELSE 0 END) checkout,
                                   SUM(CASE WHEN grp = 'checkout' THEN fail5xx + rl429 + cors ELSE 0 END) checkout_failed,
                                   SUM(fail5xx) fail5xx, SUM(rl429) + SUM(cors) blocked
                              FROM server_stats WHERE bucket >= :since GROUP BY brand`, { since });
  const perOrders = await q('SELECT brand_id, COUNT(*) n, MAX(created_at) last_at FROM orders WHERE created_at >= :since GROUP BY brand_id', { since });
  const perErrors = await q(`SELECT brand, SUM(count) n FROM server_log_events WHERE last_at >= :since AND level = 'error' AND brand IS NOT NULL GROUP BY brand`, { since });
  const stores = new Map();
  const row = (slug) => {
    if (!stores.has(slug)) stores.set(slug, { brand: slug, name: brandName(slug), requests: 0, visits: 0, checkout: 0, checkout_failed: 0, fail5xx: 0, blocked: 0, errors: 0, orders: 0, last_order_at: null });
    return stores.get(slug);
  };
  for (const r of perStats) Object.assign(row(r.brand), { requests: num(r.requests), visits: num(r.visits), checkout: num(r.checkout), checkout_failed: num(r.checkout_failed), fail5xx: num(r.fail5xx), blocked: num(r.blocked) });
  for (const r of perErrors) row(r.brand).errors = num(r.n);
  const slugById = new Map([...byBrand.entries()].map(([slug, v]) => [v.id, slug]));
  for (const r of perOrders) {
    const slug = slugById.get(r.brand_id);
    if (!slug) continue;
    Object.assign(row(slug), { orders: num(r.n), last_order_at: r.last_at });
  }

  const where = ['last_at >= :since'];
  const repl = { since };
  if (['error', 'warn', 'info'].includes(level)) { where.push('level = :level'); repl.level = level; }
  if (search) { where.push('(message LIKE :s OR path LIKE :s OR brand LIKE :s)'); repl.s = `%${String(search).slice(0, 80)}%`; }
  if (b) { where.push('brand = :b'); repl.b = b; } else if (b === '') where.push('brand IS NULL');
  const logEvents = await q(`SELECT sig, MAX(level) level, MAX(kind) kind, MAX(brand) brand, MAX(method) method, MAX(path) path, MAX(status) status,
                                    MAX(message) message, SUM(count) count, MIN(first_at) first_at, MAX(last_at) last_at
                               FROM server_log_events WHERE ${where.join(' AND ')}
                              GROUP BY sig ORDER BY last_at DESC LIMIT 200`, repl);

  const alerts = await q(`SELECT id, alert_key, severity, title, detail, opened_at, last_seen_at, last_notified_at, notified_count, resolved_at
                            FROM server_alerts WHERE resolved_at IS NULL OR opened_at >= :old ORDER BY resolved_at IS NULL DESC, opened_at DESC LIMIT 60`,
  { old: new Date(Date.now() - 7 * 24 * HOUR_MS) });

  // Memory: every live process now, and per India-time hour the highest
  // total held / app heap in use (across processes) and how many ran.
  await sampleMemory().catch(() => {});
  const memProcs = await liveProcesses().catch(() => []);
  const memHours = await q(`SELECT DATE_FORMAT(DATE_ADD(at, INTERVAL 330 MINUTE), '%Y-%m-%d %H:00:00') hour,
                                   MAX(rss_mb) rss_max, MAX(heap_used_mb) heap_max, MAX(heap_limit_mb) heap_limit,
                                   COUNT(DISTINCT pid) procs, MIN(uptime_s) min_uptime
                              FROM server_memory WHERE at >= :since GROUP BY hour ORDER BY hour DESC`, { since }).catch(() => []);
  const restarts = await q(`SELECT COUNT(*) n FROM (SELECT pid FROM server_memory WHERE at >= :since GROUP BY pid HAVING MIN(uptime_s) < 600) x`, { since }).catch(() => [{ n: 0 }]);

  let lastWatch = null;
  try { [lastWatch] = await q(`SELECT started_at, status, summary FROM job_runs WHERE job_key = 'server-watch' ORDER BY id DESC LIMIT 1`); } catch (_) { /* no runs yet */ }

  const settings = await getSettings();
  return {
    brand: b,
    brands: [...[...byBrand.entries()].filter(([slug]) => !slug.startsWith('zz-')).map(([slug, v]) => ({ slug, name: v.name })), { slug: ADMIN_SOURCE, name: brandName(ADMIN_SOURCE) }],
    orders_all_stores: !brandId,
    // Stores first (busiest on top), then the admin panel, unknown, no store.
    stores: [...stores.values()].sort((x, y) => rank(x.brand) - rank(y.brand) || y.requests - x.requests),
    kpis: {
      requests_15m: last15.requests,
      error_pct_15m: pct(last15.fail5xx, last15.requests),
      blocked_15m: last15.rl429 + last15.cors,
      requests_1h: lastHour.requests,
      avg_ms_1h: lastHour.requests ? Math.round(lastHour.dur_sum / lastHour.requests) : 0,
      checkout_1h: checkout1h.requests,
      checkout_fail_pct_1h: pct(checkout1h.fail5xx + checkout1h.rl429 + checkout1h.cors, checkout1h.requests),
      orders_1h: num(orders1h?.n),
      last_order_at: lastOrder?.at || null,
      window: { hours: h, ...window },
      memory_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    },
    memory: {
      now: memNow(),
      processes: memProcs.map((p) => ({ pid: p.pid, rss_mb: num(p.rss_mb), heap_used_mb: num(p.heap_used_mb), heap_total_mb: num(p.heap_total_mb), external_mb: num(p.external_mb), heap_limit_mb: num(p.heap_limit_mb), uptime_s: num(p.uptime_s), at: p.at })),
      hours: memHours.map((h) => ({ hour: h.hour, rss_max: num(h.rss_max), heap_max: num(h.heap_max), heap_limit: num(h.heap_limit), procs: num(h.procs) })),
      started_in_range: num(restarts[0]?.n),
    },
    series: series.map((r) => ({ hour: r.hour, grp: r.grp, requests: num(r.requests), fail5xx: num(r.fail5xx), blocked: num(r.blocked), dur_sum: num(r.dur_sum) })),
    orders_by_hour: ordersByHour.map((r) => ({ hour: r.hour, n: num(r.n) })),
    events: logEvents.map((e) => ({ ...e, count: num(e.count), brand_name: e.brand ? brandName(e.brand) : null })),
    alerts,
    last_watch: lastWatch || null,
    settings,
    email_ready: !!(process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD),
    wa_template: await alertTemplate(),
  };
}

async function sendTest() {
  const s = await getSettings();
  const out = await notify(s, { title: 'Test alert', detail: 'This is a test from Obzus Server Watch. If you got this, alerts reach you.', subject: '[Obzus] Test alert' });
  out.whatsapp = await deliveryOf(out.whatsapp || []);
  out.template = await alertTemplate({ create: false });
  return out;
}

module.exports = {
  DEFAULTS, recorder, noteLog, noteCors, noteEvent, flush, watch, dailySummary, start,
  getSettings, saveSettings, overview, sendTest,
  _internal: { memNow, sampleMemory, dbPing, brandOf, sourceOf, groupOf, normPath, cleanSettings, inAlertHours, checkRules, stats, events, istDayRange },
};
