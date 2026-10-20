'use strict';

/**
 * Meta ad spend → Obzus Admin.
 *
 * One Meta connection for every store:
 *   token   — resolved in this order, the first one that is set wins:
 *               1. ALL_META_ADS_TOKEN on brand 1 (the "General · all stores"
 *                  ads token; Reports → Ads → "Replace token" writes it)
 *               2. ALL_FB_ACCESS_TOKEN on brand 1 (the shared Conversions API token)
 *               3. env META_ADS_TOKEN
 *               4. the first store whose own FB_ACCESS_TOKEN can list ad accounts
 *             Which one worked is cached and reported as a plain label
 *             ("Morbix's Conversions API token"). The token itself is never
 *             returned, logged or written to the run log; only "••••1234".
 *   mapping — each store's META_AD_ACCOUNT_ID (digits, no act_). One ad
 *             account per store; an account may be left unassigned.
 *
 * Sync (scheduled every 3 hours, config/cronJobs.js "meta-ads-sync"):
 *   For every mapped account, Graph act_{id}/insights at ad level, one row per
 *   ad per day, upserted into ad_spend_daily (UNIQUE account_id, day, ad_id).
 *   First run / account without rows: the last 90 days. Later runs: the last
 *   3 days (Meta revises recent days), stretched back to cover any gap since
 *   the last good sync. After a complete fetch, rows inside the fetched window
 *   that Meta no longer returns (spend revised to 0) are dropped. Two accounts
 *   at a time; a Meta rate-limit error (4, 17, 32, 613, 80000, 80004) stops
 *   the run and is recorded. Per-account state lives in ad_spend_sync.
 *
 * Reports join this spend to our orders by campaign / ad set / ad NAME
 * (normName below), see services/reports/adsReport.js.
 */

const axios = require('axios');
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');
const { logger } = require('../config/logging.js');

const GRAPH = 'https://graph.facebook.com/v21.0';
// Shared ("General · all stores") settings live on brand 1 as ALL_<KEY>.
const GLOBAL_BRAND_ID = 1;
const GLOBAL_TOKEN_KEY = 'ALL_META_ADS_TOKEN';
const ACCOUNT_KEY = 'META_AD_ACCOUNT_ID';
const BACKFILL_DAYS = 90;
const RECENT_DAYS = 3;
const CONCURRENCY = 2;
const RATE_LIMIT_CODES = new Set([4, 17, 32, 613, 80000, 80003, 80004]);
const INSIGHT_FIELDS = 'account_currency,account_name,campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,impressions,inline_link_clicks,clicks,actions,action_values';
// One purchase figure per row: the first of these Meta reports (never summed —
// omni_purchase already includes the pixel and app purchases).
const PURCHASE_TYPES = ['omni_purchase', 'offsite_conversion.fb_pixel_purchase', 'purchase'];

const ACCOUNT_STATUS = {
  1: 'Active', 2: 'Disabled', 3: 'Payment problem', 7: 'In review', 8: 'Payment due', 9: 'Grace period',
  100: 'Closing', 101: 'Closed', 201: 'Active', 202: 'Closed',
};

const q = (sql, replacements = {}) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT });

// ── Schema ───────────────────────────────────────────────────────────────────
const AD_SPEND_DDL = `CREATE TABLE IF NOT EXISTS ad_spend_daily (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  brand_id INT NULL,
  account_id VARCHAR(32) NOT NULL,
  day DATE NOT NULL,
  campaign_id VARCHAR(32) NULL,
  campaign_name VARCHAR(255) NULL,
  adset_id VARCHAR(32) NULL,
  adset_name VARCHAR(255) NULL,
  ad_id VARCHAR(32) NOT NULL,
  ad_name VARCHAR(255) NULL,
  spend DECIMAL(12,2) NOT NULL DEFAULT 0,
  impressions BIGINT NOT NULL DEFAULT 0,
  clicks BIGINT NOT NULL DEFAULT 0,
  meta_purchases DECIMAL(12,2) NOT NULL DEFAULT 0,
  meta_purchase_value DECIMAL(14,2) NOT NULL DEFAULT 0,
  currency VARCHAR(8) NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_ad_spend_account_day_ad (account_id, day, ad_id),
  KEY idx_ad_spend_brand_day (brand_id, day),
  KEY idx_ad_spend_campaign (campaign_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

const AD_SYNC_DDL = `CREATE TABLE IF NOT EXISTS ad_spend_sync (
  account_id VARCHAR(32) NOT NULL PRIMARY KEY,
  brand_id INT NULL,
  account_name VARCHAR(255) NULL,
  currency VARCHAR(8) NULL,
  last_synced_at DATETIME NULL,
  last_from DATE NULL,
  last_to DATE NULL,
  last_rows INT NULL,
  last_error VARCHAR(500) NULL,
  last_error_at DATETIME NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

let schemaPromise = null;
function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await sequelize.query(AD_SPEND_DDL);
      await sequelize.query(AD_SYNC_DDL);
    })().catch((e) => { schemaPromise = null; throw e; });
  }
  return schemaPromise;
}

// ── Small helpers ────────────────────────────────────────────────────────────
const IST_MS = 330 * 60000;
const ymdIst = (d = new Date()) => new Date(new Date(d).getTime() + IST_MS).toISOString().slice(0, 10);
const addDays = (ymd, n) => { const d = new Date(`${ymd}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const dayStr = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v || '').slice(0, 10));
const digits = (v) => String(v ?? '').trim().replace(/^act_/i, '').replace(/\D/g, '');
const num = (v) => Number(v) || 0;
const mask = (t) => require('./settingsAuditService.js').maskValue(t);

/**
 * Campaign / ad set / ad names → one comparable form, so the name Meta shows
 * and the utm_* value we recorded match:
 *   "+" → space, %XX decoded (twice, for double-encoded links; a bad % is
 *   kept), "+" → space again (a decoded %2B), whitespace collapsed, trimmed,
 *   lower-cased (Unicode NFKC first).
 */
function normName(v) {
  if (v === null || v === undefined) return '';
  let s = String(v).replace(/\+/g, ' ');
  for (let i = 0; i < 2 && /%[0-9a-f]{2}/i.test(s); i++) {
    s = s.replace(/(%[0-9a-f]{2})+/gi, (m) => { try { return decodeURIComponent(m); } catch (_) { return m; } });
  }
  return s.normalize('NFKC').replace(/\+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

// Never let a token reach a message, log line or API response.
function scrub(text, token) {
  let s = String(text || '');
  if (token) s = s.split(token).join('••••');
  return s.replace(/access_token=[^&\s"']+/gi, 'access_token=••••').slice(0, 400);
}

class GraphError extends Error {
  constructor(message, { code = null, subcode = null, status = null } = {}) {
    super(message);
    this.name = 'GraphError';
    this.code = code;
    this.subcode = subcode;
    this.status = status;
    this.rateLimited = RATE_LIMIT_CODES.has(Number(code));
  }
}

// GET a Graph path (token as a param) or a paging.next URL (token inside).
async function graphGet(pathOrUrl, params, token) {
  const isNext = /^https:\/\//i.test(pathOrUrl);
  if (isNext && !pathOrUrl.startsWith('https://graph.facebook.com/')) throw new GraphError('Meta sent an unexpected paging link');
  const url = isNext ? pathOrUrl : `${GRAPH}/${String(pathOrUrl).replace(/^\//, '')}`;
  let r;
  try {
    r = await axios.get(url, {
      params: isNext ? undefined : { ...(params || {}), access_token: token },
      timeout: 30000,
      validateStatus: () => true,
    });
  } catch (e) {
    throw new GraphError(`Couldn’t reach Meta (${e.code || 'network error'})`);
  }
  if (r && r.status === 200 && r.data && !r.data.error) return r.data;
  const err = (r && r.data && r.data.error) || {};
  const msg = scrub(err.error_user_msg || err.message || `Meta answered ${r ? r.status : 'nothing'}`, token);
  throw new GraphError(msg, { code: err.code ?? null, subcode: err.error_subcode ?? null, status: r ? r.status : null });
}

// Follow paging.next until done (or maxPages).
async function graphAll(path, params, token, maxPages = 200) {
  const out = [];
  let data = await graphGet(path, params, token);
  for (let page = 1; ; page++) {
    if (Array.isArray(data.data)) out.push(...data.data);
    const next = data.paging && data.paging.next;
    if (!next || page >= maxPages) break;
    data = await graphGet(next, null, token);
  }
  return out;
}

// ── Settings access (shared values on brand 1 as ALL_<KEY>) ─────────────────
function helper() { return require('./settingsHelper.js'); }
async function readGlobal(key) {
  const h = helper();
  if (typeof h.getGlobal === 'function') return h.getGlobal(key);
  return h.getSetting(GLOBAL_BRAND_ID, `ALL_${key}`, null, { brandOnly: true });
}

async function brandList() {
  return q('SELECT id, name, COALESCE(display_name, name) AS display_name FROM brands ORDER BY id');
}

// ── Token resolution ─────────────────────────────────────────────────────────
const TOKEN_TTL = 15 * 60 * 1000;
let tokenCache = null; // { token, source, label, brandId, at }
const SOURCE_LABEL = {
  global_ads: 'the Meta ads token (General · all stores)',
  global_capi: 'the shared Conversions API token (General · all stores)',
  env: 'the server’s META_ADS_TOKEN',
};

/** { token, source, label, brandId } or null. Cached for 15 minutes. */
async function resolveToken({ refresh = false } = {}) {
  if (!refresh && tokenCache && Date.now() - tokenCache.at < TOKEN_TTL) return tokenCache.token ? tokenCache : null;
  let found = null;
  const g1 = await readGlobal('META_ADS_TOKEN').catch(() => null);
  if (g1) found = { token: String(g1).trim(), source: 'global_ads', brandId: GLOBAL_BRAND_ID };
  if (!found) {
    const g2 = await readGlobal('FB_ACCESS_TOKEN').catch(() => null);
    if (g2) found = { token: String(g2).trim(), source: 'global_capi', brandId: GLOBAL_BRAND_ID };
  }
  if (!found && process.env.META_ADS_TOKEN) found = { token: String(process.env.META_ADS_TOKEN).trim(), source: 'env', brandId: null };
  if (!found) {
    // A store's own Conversions API token that can list ad accounts.
    const tried = new Set();
    for (const b of await brandList()) {
      const t = await helper().getSetting(b.id, 'FB_ACCESS_TOKEN').catch(() => null);
      if (!t || tried.has(t)) continue;
      tried.add(t);
      try {
        const d = await graphGet('me/adaccounts', { fields: 'account_id', limit: 1 }, t);
        if (Array.isArray(d.data) && d.data.length) {
          found = { token: String(t).trim(), source: 'store', brandId: b.id, label: `${b.display_name}’s Conversions API token` };
          break;
        }
      } catch (_) { /* this store's token can't read ads — try the next */ }
    }
  }
  if (found && !found.label) found.label = SOURCE_LABEL[found.source];
  tokenCache = found ? { ...found, at: Date.now() } : { token: null, at: Date.now() };
  return found ? tokenCache : null;
}

function clearCaches() { tokenCache = null; accountsCache = null; }

// ── Ad accounts + mapping ───────────────────────────────────────────────────
let accountsCache = null; // { at, list }
async function listAdAccounts(token) {
  const rows = await graphAll('me/adaccounts', { fields: 'id,account_id,name,currency,account_status', limit: 200 }, token, 50);
  return rows.map((a) => ({
    id: digits(a.account_id || a.id),
    name: a.name || null,
    currency: a.currency || null,
    status: ACCOUNT_STATUS[a.account_status] || (a.account_status != null ? `Status ${a.account_status}` : null),
    statusCode: a.account_status ?? null,
  })).filter((a) => a.id);
}

/** [{ brandId, accountId }] from each store's META_AD_ACCOUNT_ID. */
async function getMapping() {
  const rows = await q(`SELECT brand_id, value FROM brand_settings WHERE \`key\` = :k`, { k: ACCOUNT_KEY });
  return rows.map((r) => ({ brandId: Number(r.brand_id), accountId: digits(r.value) })).filter((m) => m.accountId);
}

async function lastJobRun() {
  try {
    const { recentRuns } = require('./jobRunService.js');
    const runs = await recentRuns(['meta-ads-sync'], 1);
    const r = (runs['meta-ads-sync'] || [])[0];
    return r ? { startedAt: r.started_at, status: r.status, summary: r.summary } : null;
  } catch (_) { return null; }
}

/** GET /api/admin/meta-ads/connection */
async function getConnection({ refresh = false } = {}) {
  await ensureSchema();
  const resolved = await resolveToken({ refresh });
  const [mapping, brands, state, lastRun] = await Promise.all([
    getMapping(), brandList(), q('SELECT * FROM ad_spend_sync'), lastJobRun(),
  ]);
  let graphAccounts = [];
  let accountsError = null;
  if (resolved) {
    try {
      if (!refresh && accountsCache && accountsCache.token === resolved.token && Date.now() - accountsCache.at < 5 * 60 * 1000) {
        graphAccounts = accountsCache.list;
      } else {
        graphAccounts = await listAdAccounts(resolved.token);
        accountsCache = { at: Date.now(), list: graphAccounts, token: resolved.token };
      }
    } catch (e) {
      accountsError = e.message;
    }
  }
  const brandOf = new Map(mapping.map((m) => [m.accountId, m.brandId]));
  const stateOf = new Map(state.map((s) => [String(s.account_id), s]));
  const seen = new Set();
  const accounts = graphAccounts.map((a) => { seen.add(a.id); return { ...a, visible: true }; });
  // Linked accounts the token can't see (wrong token, access removed).
  for (const m of mapping) {
    if (seen.has(m.accountId)) continue;
    seen.add(m.accountId);
    const s = stateOf.get(m.accountId);
    accounts.push({ id: m.accountId, name: s?.account_name || null, currency: s?.currency || null, status: null, statusCode: null, visible: false });
  }
  const iso = (d) => (d ? new Date(d).toISOString() : null);
  return {
    tokenSet: !!resolved,
    tokenSource: resolved ? resolved.source : null,
    tokenSourceLabel: resolved ? resolved.label : null,
    tokenHint: resolved ? mask(resolved.token) : null,
    accountsError,
    accounts: accounts.map((a) => {
      const s = stateOf.get(a.id);
      return {
        id: a.id, name: a.name, currency: a.currency, status: a.status, visible: a.visible,
        storeBrandId: brandOf.get(a.id) ?? null,
        lastSyncedAt: iso(s?.last_synced_at), lastError: s?.last_error || null, lastErrorAt: iso(s?.last_error_at),
        lastRows: s?.last_rows ?? null,
      };
    }).sort((x, y) => (y.storeBrandId != null) - (x.storeBrandId != null) || String(x.name || '').localeCompare(String(y.name || ''))),
    brands: brands.map((b) => ({ id: b.id, name: b.display_name })),
    schedule: 'Every 3 hours',
    lastRun,
  };
}

function canEncrypt() {
  try { require('../utils/encryption.js').encrypt('x'); return true; } catch (_) { return false; }
}

/** Test a pasted token (it must list at least one ad account), then save it. */
async function saveToken(raw, userId) {
  const token = String(raw || '').trim();
  if (!/^[A-Za-z0-9_|.-]{20,600}$/.test(token)) return { ok: false, message: 'That doesn’t look like a Meta access token — copy the whole token (it starts with EAA).' };
  let accounts;
  try {
    accounts = await listAdAccounts(token);
  } catch (e) {
    return { ok: false, message: `Meta didn’t accept this token: ${e.message}` };
  }
  if (!accounts.length) {
    return { ok: false, message: 'Meta accepted the token, but it can’t see any ad account. In Business Settings → Users → System users → this user → Assign assets, give it your ad accounts (View performance), then paste the token again.' };
  }
  const { BrandSetting } = require('../model/brandSettingModel.js');
  const settingsService = require('./brandSettingsService.js');
  const audit = require('./settingsAuditService.js');
  const row = await BrandSetting.findOne({ where: { brand_id: GLOBAL_BRAND_ID, key: GLOBAL_TOKEN_KEY } });
  const encOk = canEncrypt();
  const oldValue = row ? row.value : null;
  if (row) {
    await settingsService.updateSetting(GLOBAL_BRAND_ID, row.key, { value: token, is_encrypted: row.is_encrypted || encOk, updated_by: userId || null });
  } else {
    await settingsService.createSetting({
      brand_id: GLOBAL_BRAND_ID, key: GLOBAL_TOKEN_KEY, value: token, category: 'analytics',
      description: 'Meta ads token — all stores (read-only)', is_encrypted: encOk, updated_by: userId || null,
    });
  }
  await audit.record({ brandId: GLOBAL_BRAND_ID, key: GLOBAL_TOKEN_KEY, action: row ? 'update' : 'create', oldValue, newValue: token, userId, secret: true });
  helper().clearCache(GLOBAL_BRAND_ID);
  clearCaches();
  return { ok: true, accounts: accounts.length, message: `Saved. The token can read ${accounts.length} ad account${accounts.length === 1 ? '' : 's'}.` };
}

/**
 * Link ad accounts to stores. mapping: [{ accountId, brandId|null }].
 * One account per store; an account listed with brandId null is unlinked.
 * Returns { ok, changed } or { ok:false, message }.
 */
async function saveMapping(mapping, userId) {
  if (!Array.isArray(mapping)) return { ok: false, message: 'mapping must be a list' };
  await ensureSchema();
  const brands = await brandList();
  const brandIds = new Set(brands.map((b) => Number(b.id)));
  const wanted = new Map(); // accountId -> brandId|null
  for (const m of mapping) {
    const acc = digits(m && m.accountId);
    if (!/^\d{5,20}$/.test(acc)) return { ok: false, message: `“${String(m && m.accountId).slice(0, 30)}” isn’t an ad account ID.` };
    const b = m.brandId === null || m.brandId === undefined || m.brandId === '' ? null : Number(m.brandId);
    if (b !== null && !brandIds.has(b)) return { ok: false, message: `Store ${m.brandId} doesn’t exist.` };
    wanted.set(acc, b);
  }
  const perBrand = new Map();
  for (const [acc, b] of wanted) {
    if (b === null) continue;
    if (perBrand.has(b)) {
      const name = brands.find((x) => Number(x.id) === b)?.display_name || `Store ${b}`;
      return { ok: false, message: `${name} has two ad accounts picked — a store can have one.` };
    }
    perBrand.set(b, acc);
  }

  const current = await getMapping();
  const next = new Map(current.map((c) => [c.brandId, c.accountId])); // brandId -> accountId
  for (const [acc, b] of wanted) {
    // The account leaves whichever store had it…
    for (const [brandId, a] of next) if (a === acc && brandId !== b) next.delete(brandId);
    // …and goes to its new store (replacing that store's old account).
    if (b !== null) next.set(b, acc);
  }

  const { BrandSetting } = require('../model/brandSettingModel.js');
  const settingsService = require('./brandSettingsService.js');
  const audit = require('./settingsAuditService.js');
  const before = new Map(current.map((c) => [c.brandId, c.accountId]));
  let changed = 0;
  for (const b of brandIds) {
    const was = before.get(b) || '';
    const now = next.get(b) || '';
    if (was === now) continue;
    const row = await BrandSetting.findOne({ where: { brand_id: b, key: ACCOUNT_KEY } });
    if (!now) {
      if (row) await settingsService.deleteBrandSetting(b, row.key);
      await audit.record({ brandId: b, key: ACCOUNT_KEY, action: 'delete', oldValue: was, userId, secret: false });
    } else if (row) {
      await settingsService.updateSetting(b, row.key, { value: now, updated_by: userId || null });
      await audit.record({ brandId: b, key: ACCOUNT_KEY, action: 'update', oldValue: was, newValue: now, userId, secret: false });
    } else {
      await settingsService.createSetting({ brand_id: b, key: ACCOUNT_KEY, value: now, category: 'analytics', description: 'Meta ad account ID', updated_by: userId || null });
      await audit.record({ brandId: b, key: ACCOUNT_KEY, action: 'create', newValue: now, userId, secret: false });
    }
    helper().clearCache(b);
    changed++;
  }
  // Spend already synced follows its account to the new store (or to none).
  const accToBrand = new Map([...next].map(([b, a]) => [a, b]));
  const touched = new Set([...wanted.keys(), ...current.map((c) => c.accountId)]);
  for (const acc of touched) {
    const b = accToBrand.get(acc) ?? null;
    await sequelize.query('UPDATE ad_spend_daily SET brand_id = :b WHERE account_id = :a AND NOT (brand_id <=> :b)', { replacements: { a: acc, b } });
    await sequelize.query('UPDATE ad_spend_sync SET brand_id = :b WHERE account_id = :a', { replacements: { a: acc, b } });
  }
  return { ok: true, changed };
}

// ── Sync ─────────────────────────────────────────────────────────────────────
function pickAction(list) {
  if (!Array.isArray(list)) return 0;
  for (const t of PURCHASE_TYPES) {
    const a = list.find((x) => x && x.action_type === t);
    if (a) return num(a.value);
  }
  return 0;
}

/** One Graph insights row → one ad_spend_daily row. */
function toRow(r, accountId, brandId) {
  const clicks = r.inline_link_clicks !== undefined && r.inline_link_clicks !== null ? r.inline_link_clicks : r.clicks;
  const cut = (s) => (s === null || s === undefined ? null : String(s).slice(0, 255));
  return {
    brand_id: brandId,
    account_id: accountId,
    day: String(r.date_start || '').slice(0, 10),
    campaign_id: cut(r.campaign_id), campaign_name: cut(r.campaign_name),
    adset_id: cut(r.adset_id), adset_name: cut(r.adset_name),
    ad_id: String(r.ad_id || ''), ad_name: cut(r.ad_name),
    spend: Math.round(num(r.spend) * 100) / 100,
    impressions: Math.round(num(r.impressions)),
    clicks: Math.round(num(clicks)),
    meta_purchases: pickAction(r.actions),
    meta_purchase_value: Math.round(pickAction(r.action_values) * 100) / 100,
    currency: r.account_currency ? String(r.account_currency).slice(0, 8) : null,
  };
}

async function upsertRows(rows) {
  const COLS = ['brand_id', 'account_id', 'day', 'campaign_id', 'campaign_name', 'adset_id', 'adset_name', 'ad_id', 'ad_name',
    'spend', 'impressions', 'clicks', 'meta_purchases', 'meta_purchase_value', 'currency'];
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const values = [];
    const ph = chunk.map((r) => { COLS.forEach((c) => values.push(r[c])); return `(${COLS.map(() => '?').join(',')}, NOW())`; });
    await sequelize.query(
      `INSERT INTO ad_spend_daily (${COLS.join(',')}, updated_at) VALUES ${ph.join(',')}
       ON DUPLICATE KEY UPDATE ${COLS.filter((c) => !['account_id', 'day', 'ad_id'].includes(c)).map((c) => `${c} = VALUES(${c})`).join(', ')}, updated_at = NOW()`,
      { replacements: values }
    );
  }
}

async function recordState(accountId, fields) {
  const cols = Object.keys(fields);
  await sequelize.query(
    `INSERT INTO ad_spend_sync (account_id, ${cols.join(', ')}) VALUES (:account_id, ${cols.map((c) => `:${c}`).join(', ')})
     ON DUPLICATE KEY UPDATE ${cols.map((c) => `${c} = VALUES(${c})`).join(', ')}`,
    { replacements: { account_id: accountId, ...fields } }
  );
}

/** Which days to fetch for one account. */
async function rangeFor(accountId, days, today) {
  if (days) return { since: addDays(today, -(Math.max(1, Math.min(BACKFILL_DAYS, days)) - 1)), until: today, kind: 'manual' };
  const [{ n }] = await q('SELECT COUNT(*) AS n FROM ad_spend_daily WHERE account_id = :a', { a: accountId });
  if (!num(n)) return { since: addDays(today, -(BACKFILL_DAYS - 1)), until: today, kind: 'backfill' };
  let since = addDays(today, -(RECENT_DAYS - 1));
  const [st] = await q('SELECT last_synced_at FROM ad_spend_sync WHERE account_id = :a', { a: accountId });
  if (st && st.last_synced_at) {
    const gap = addDays(ymdIst(st.last_synced_at), -(RECENT_DAYS - 1));
    if (gap < since) since = gap;
  } else {
    // Rows but no record of a good sync — look back a week to be safe.
    since = addDays(today, -6);
  }
  const floor = addDays(today, -(BACKFILL_DAYS - 1));
  return { since: since < floor ? floor : since, until: today, kind: 'recent' };
}

async function syncAccount({ accountId, brandId }, token, opts) {
  const today = opts.today || ymdIst();
  const { since, until, kind } = await rangeFor(accountId, opts.days, today);
  const raw = await graphAll(`act_${accountId}/insights`, {
    level: 'ad', time_increment: 1, time_range: JSON.stringify({ since, until }),
    fields: INSIGHT_FIELDS, limit: 500,
  }, token);
  const rows = raw.map((r) => toRow(r, accountId, brandId)).filter((r) => r.ad_id && /^\d{4}-\d{2}-\d{2}$/.test(r.day));
  await upsertRows(rows);
  // Complete fetch: drop rows in this window Meta no longer returns.
  const seen = new Set(rows.map((r) => `${r.day}|${r.ad_id}`));
  const existing = await q('SELECT id, day, ad_id FROM ad_spend_daily WHERE account_id = :a AND day BETWEEN :s AND :u', { a: accountId, s: since, u: until });
  const stale = existing.filter((e) => !seen.has(`${dayStr(e.day)}|${e.ad_id}`)).map((e) => e.id);
  for (let i = 0; i < stale.length; i += 500) {
    await sequelize.query('DELETE FROM ad_spend_daily WHERE id IN (:ids)', { replacements: { ids: stale.slice(i, i + 500) } });
  }
  const first = raw[0] || {};
  const spend = rows.reduce((s, r) => s + r.spend, 0);
  await recordState(accountId, {
    brand_id: brandId, last_synced_at: new Date(), last_from: since, last_to: until, last_rows: rows.length,
    last_error: null, last_error_at: null,
    ...(first.account_name ? { account_name: String(first.account_name).slice(0, 255) } : {}),
    ...(first.account_currency ? { currency: String(first.account_currency).slice(0, 8) } : {}),
  });
  return { accountId, brandId, since, until, kind, rows: rows.length, removed: stale.length, spend: Math.round(spend * 100) / 100, currency: first.account_currency || null };
}

/**
 * Sync every linked ad account. opts.days forces that many days back.
 * Returns { status, summary, error, accounts[], rateLimited } — the shape the
 * job-run log (services/jobRunService.js) records.
 */
async function syncAll(opts = {}) {
  await ensureSchema();
  const days = opts.days ? Math.max(1, Math.min(BACKFILL_DAYS, Number.parseInt(opts.days, 10) || 0)) : null;
  const resolved = await resolveToken();
  if (!resolved) return { status: 'skipped', summary: 'Meta ads not connected — add the token on Reports → Ads', accounts: [] };
  let mapping = await getMapping();
  if (opts.accountIds) mapping = mapping.filter((m) => opts.accountIds.includes(m.accountId));
  if (!mapping.length) return { status: 'skipped', summary: 'No ad account is linked to a store yet (Reports → Ads)', accounts: [] };

  const results = [];
  let stop = null;
  let i = 0;
  const work = async () => {
    while (i < mapping.length && !stop) {
      const m = mapping[i++];
      try {
        results.push(await syncAccount(m, resolved.token, { days, today: opts.today }));
      } catch (e) {
        const message = scrub(e.message, resolved.token);
        results.push({ accountId: m.accountId, brandId: m.brandId, error: message, code: e.code ?? null });
        await recordState(m.accountId, { brand_id: m.brandId, last_error: message.slice(0, 500), last_error_at: new Date() }).catch(() => {});
        if (e.rateLimited) stop = { code: e.code, message };
        logger.warn(`[meta-ads] account ${m.accountId}: ${message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, mapping.length) }, work));

  const ok = results.filter((r) => !r.error);
  const failed = results.filter((r) => r.error);
  const notRun = mapping.length - results.length;
  const rows = ok.reduce((s, r) => s + r.rows, 0);
  const spend = ok.reduce((s, r) => s + r.spend, 0);
  const parts = [`${ok.length} of ${mapping.length} ad account${mapping.length === 1 ? '' : 's'} synced · ${rows.toLocaleString('en-IN')} ad-day rows · ${Math.round(spend).toLocaleString('en-IN')} spend fetched`];
  if (failed.length) parts.push(`${failed.length} failed`);
  if (stop) parts.push(`stopped: Meta rate limit (code ${stop.code})${notRun ? `, ${notRun} left for the next run` : ''}`);
  return {
    status: failed.length || stop ? (ok.length ? 'partial' : 'failed') : 'ok',
    summary: parts.join(' · '),
    error: failed.length ? failed.map((f) => `act_${f.accountId}: ${f.error}`).join('\n').slice(0, 2000) : null,
    rateLimited: !!stop,
    accounts: results,
  };
}

module.exports = {
  GRAPH, GLOBAL_BRAND_ID, GLOBAL_TOKEN_KEY, AD_SPEND_DDL, AD_SYNC_DDL, RATE_LIMIT_CODES,
  ensureSchema, normName, scrub, resolveToken, clearCaches, listAdAccounts, getMapping,
  getConnection, saveToken, saveMapping, syncAll, syncAccount, toRow, pickAction, rangeFor,
  GraphError,
};
