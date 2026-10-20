'use strict';

// WhatsApp → Profile (admins only).
//
// The one shared WhatsApp number every store sends from:
//   • its business profile on WhatsApp (about, description, address, email,
//     websites, category, photo) — read from and written to Meta's Cloud API;
//   • its display name (a change request goes to Meta for review);
//   • the four connection keys stored as brand_settings rows on the shared
//     WhatsApp brand (token, phone number ID, business account ID, catalogue ID);
//   • how each store signs its messages (name, link domain, win-back code).
//
// The token is never returned or logged: reads give "••••" + its last 4
// characters, the audit log stores the same mask.

const axios = require('axios');
const { Op } = require('sequelize');
const { logger } = require('../config/logging.js');
const { BrandSetting } = require('../model/brandSettingModel.js');
const { encrypt } = require('../utils/encryption.js');
const settingsHelper = require('./settingsHelper.js');
const audit = require('./settingsAuditService.js');

// Loaded lazily: whatsappService pulls in a lot, and loads this file's
// neighbours (circular requires at boot are avoided this way).
const ws = () => require('./whatsappService.js');
const insights = () => require('./whatsappInsightsService.js');
const graphUrl = () => ws().GRAPH_API_URL;
const sharedBrandId = () => Number(ws().SHARED_WA_BRAND_ID) || 1;

const http = axios.create({ timeout: 20000 });
const bearer = (token) => ({ Authorization: `Bearer ${token}` });

const PROFILE_TTL_MS = 10 * 60 * 1000;
const PROFILE_FAIL_TTL_MS = 2 * 60 * 1000;
const NAME_REQUEST_KEY = 'profile_name_request';
const MANAGER_GUIDE = 'Change it in WhatsApp Manager → Phone numbers → your number → Edit display name; Meta reviews it in 1–3 days.';

// Meta's allowed business categories, with the words customers see.
const VERTICALS = [
  ['UNDEFINED', 'Not set'],
  ['APPAREL', 'Clothing & apparel'],
  ['RETAIL', 'Shopping & retail'],
  ['BEAUTY', 'Beauty, spa & salon'],
  ['GROCERY', 'Food & grocery'],
  ['RESTAURANT', 'Restaurant'],
  ['HEALTH', 'Medical & health'],
  ['PROF_SERVICES', 'Professional services'],
  ['AUTO', 'Automotive'],
  ['EDU', 'Education'],
  ['ENTERTAIN', 'Entertainment'],
  ['EVENT_PLAN', 'Event planning & service'],
  ['FINANCE', 'Finance & banking'],
  ['GOVT', 'Public service'],
  ['HOTEL', 'Hotel & lodging'],
  ['NONPROFIT', 'Non-profit organisation'],
  ['TRAVEL', 'Travel & transport'],
  ['OTHER', 'Other'],
  ['NOT_A_BIZ', 'Not a business'],
];
const VERTICAL_LABEL = new Map(VERTICALS);
const LIMITS = Object.freeze({ about: 139, description: 512, address: 256, email: 128, website: 256, websites: 2, nameMin: 3, nameMax: 100, photoBytes: 5 * 1024 * 1024 });
const PROFILE_FIELDS = ['about', 'description', 'address', 'email', 'websites', 'vertical'];
const FIELD_LABEL = { about: 'About', description: 'Description', address: 'Address', email: 'Email', websites: 'Websites', vertical: 'Business category' };

// ─── Errors ───────────────────────────────────────────────────────────────────
function httpError(status, message, extra = {}) {
  const e = new Error(message);
  e.status = status;
  Object.assign(e, extra);
  return e;
}

const metaErrOf = (e) => e?.response?.data?.error || null;
const metaCode = (e) => Number(metaErrOf(e)?.code) || null;

// Meta's error in words a shop owner can act on.
function plainMetaError(e) {
  if (!e) return 'Something went wrong.';
  if (!e.response) {
    if (e.code === 'ECONNABORTED' || /timeout/i.test(e.message || '')) return 'WhatsApp (Meta) took too long to answer. Try again in a minute.';
    if (e.status) return e.message;
    return 'Couldn’t reach WhatsApp (Meta) just now. Check the server’s internet connection and try again.';
  }
  const err = metaErrOf(e) || {};
  const code = Number(err.code);
  const detail = ws().metaError(e);
  if (code === 190) return 'The access token was rejected: it has expired or was revoked. Paste a new one under Connection keys.';
  if (code === 10 || (code >= 200 && code < 300)) return `The access token isn’t allowed to do this. It needs the whatsapp_business_management permission. (${detail})`;
  if ([4, 17, 32, 613, 80007, 130429].includes(code)) return 'WhatsApp is limiting requests right now. Try again in a few minutes.';
  if (code === 100 && /does not exist|cannot be loaded|missing permissions|Unsupported (get|post) request/i.test(detail)) {
    return `WhatsApp couldn’t find that ID, or the access token can’t see it. (${detail})`;
  }
  if (e.response.status >= 500) return `WhatsApp had a problem on its side. Try again in a few minutes. (${detail})`;
  return detail;
}
// 4xx from Meta = WhatsApp refused the input; anything else = it couldn't be reached.
const metaStatus = (e) => (e?.response && e.response.status < 500 ? 422 : 502);

// ─── Small helpers ────────────────────────────────────────────────────────────
const str = (v) => (v === null || v === undefined ? '' : String(v));
const maskSecret = (s) => { const v = str(s); return v ? `••••${v.length > 8 ? v.slice(-4) : ''}` : ''; };
// "+91 98765 43210" → "+•• ••••• •3210": only the last 4 digits stay.
function maskPhone(phone) {
  const s = str(phone);
  const total = (s.match(/\d/g) || []).length;
  if (!total) return null;
  let seen = 0;
  return s.replace(/\d/g, (d) => (++seen > total - 4 ? d : '•'));
}
const canEncrypt = () => { try { encrypt('x'); return true; } catch (_) { return false; } };

async function appId() {
  const fromSetting = await settingsHelper.getSetting(sharedBrandId(), 'WHATSAPP_APP_ID').catch(() => null);
  return str(fromSetting || process.env.WHATSAPP_APP_ID || process.env.META_APP_ID || process.env.FACEBOOK_APP_ID).trim() || null;
}

// Token + phone number ID of the shared number. getCredentials also wants the
// business account ID; the profile only needs the first two, so fall back to
// reading them directly when that is the only thing missing.
async function sharedCreds() {
  const id = sharedBrandId();
  try {
    const c = await ws().getCredentials(id);
    return { token: c.token, phoneNumberId: c.phoneNumberId };
  } catch (_) { /* fall through */ }
  const [token, phoneNumberId] = await Promise.all([
    settingsHelper.getSetting(id, 'WHATSAPP_API_TOKEN'),
    settingsHelper.getSetting(id, 'WHATSAPP_PHONE_NUMBER_ID'),
  ]);
  if (!token || !phoneNumberId) {
    throw httpError(409, 'WhatsApp isn’t connected yet. Add the access token and phone number ID under Connection keys.', { code: 'NOT_CONFIGURED' });
  }
  return { token, phoneNumberId };
}

// GET a Graph node asking for optional fields too. Some fields don't exist on
// every account / API version; Meta answers code 100 "nonexisting field (x)".
// Drop the named field (or all optional ones) and ask again.
async function graphGetFields(path, token, required, optional = []) {
  let opt = [...optional];
  for (let i = 0; i <= optional.length; i++) {
    try {
      const r = await http.get(`${graphUrl()}/${path}`, { params: { fields: [...required, ...opt].join(',') }, headers: bearer(token) });
      return r.data || {};
    } catch (e) {
      if (!opt.length || metaCode(e) !== 100 || !e.response || e.response.status >= 500) throw e;
      const msg = str(metaErrOf(e)?.message);
      const named = opt.filter((f) => new RegExp(`\\b${f}\\b`).test(msg));
      opt = named.length ? opt.filter((f) => !named.includes(f)) : [];
    }
  }
  throw httpError(502, 'WhatsApp didn’t answer the request.');
}

// ─── Profile: read ────────────────────────────────────────────────────────────
let _cache = null; // { at, ttl, data: { profile, number, error } }
function clearProfileCache() { _cache = null; }

function normProfile(raw) {
  const p = Array.isArray(raw?.data) ? (raw.data[0] || {}) : (raw || {});
  const vertical = str(p.vertical).toUpperCase() || 'UNDEFINED';
  return {
    about: str(p.about),
    description: str(p.description),
    address: str(p.address),
    email: str(p.email),
    websites: (Array.isArray(p.websites) ? p.websites : []).map(str).filter(Boolean).slice(0, 2),
    vertical,
    verticalLabel: VERTICAL_LABEL.get(vertical) || vertical,
    profilePictureUrl: p.profile_picture_url || null,
  };
}

function normNumber(d) {
  return {
    verifiedName: d.verified_name || null,
    displayPhone: d.display_phone_number || null, // full; masked on the way out
    nameStatus: d.name_status || null,
    pendingName: d.new_display_name || null,
    pendingNameStatus: d.new_name_status || null,
    qualityRating: d.quality_rating || null,
    codeVerificationStatus: d.code_verification_status || null,
  };
}

async function fetchFromMeta(creds) {
  const [prof, num] = await Promise.allSettled([
    graphGetFields(`${creds.phoneNumberId}/whatsapp_business_profile`, creds.token,
      ['about'], ['address', 'description', 'email', 'profile_picture_url', 'websites', 'vertical']),
    graphGetFields(creds.phoneNumberId, creds.token,
      ['verified_name', 'display_phone_number'],
      ['name_status', 'new_name_status', 'new_display_name', 'quality_rating', 'code_verification_status']),
  ]);
  if (prof.status === 'rejected' && num.status === 'rejected') {
    const e = prof.reason;
    throw httpError(metaStatus(e), `Couldn’t read the profile from WhatsApp: ${plainMetaError(e)}`, { code: 'META_ERROR' });
  }
  const errors = [];
  if (prof.status === 'rejected') errors.push(`Profile: ${plainMetaError(prof.reason)}`);
  if (num.status === 'rejected') errors.push(`Number: ${plainMetaError(num.reason)}`);
  return {
    profile: prof.status === 'fulfilled' ? normProfile(prof.value) : null,
    number: num.status === 'fulfilled' ? normNumber(num.value) : null,
    error: errors.length ? errors.join(' ') : null,
  };
}

async function readNameRequest() {
  try { return await insights().readSetting(NAME_REQUEST_KEY, null); } catch (_) { return null; }
}

async function getProfile({ refresh = false, includeFull = false } = {}) {
  const creds = await sharedCreds();
  let data;
  let cached = false;
  if (!refresh && _cache && Date.now() - _cache.at < _cache.ttl) {
    data = _cache.data;
    cached = true;
  } else {
    data = await fetchFromMeta(creds);
    _cache = { at: Date.now(), ttl: data.error ? PROFILE_FAIL_TTL_MS : PROFILE_TTL_MS, data };
  }
  const number = data.number ? {
    ...data.number,
    displayPhone: maskPhone(data.number.displayPhone),
    ...(includeFull ? { displayPhoneFull: data.number.displayPhone } : {}),
  } : null;
  return {
    profile: data.profile,
    number,
    nameRequest: await readNameRequest(),
    verticals: VERTICALS.map(([value, label]) => ({ value, label })),
    limits: LIMITS,
    photoUploadReady: !!(await appId()),
    checkedAt: new Date(_cache.at),
    cached,
    ...(data.error ? { error: data.error } : {}),
  };
}

// ─── Profile: validate + save ─────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
function websiteOk(u) {
  if (!/^https?:\/\//i.test(u) || /\s/.test(u)) return false;
  try {
    const url = new URL(u);
    return (url.protocol === 'http:' || url.protocol === 'https:') && /\.[a-z]{2,}$/i.test(url.hostname);
  } catch (_) { return false; }
}

// → { values, errors } for the fields present in body.
function validateProfile(body) {
  const b = body && typeof body === 'object' ? body : {};
  const values = {};
  const errors = {};
  const text = (k, max, { required = false } = {}) => {
    if (b[k] === undefined) return;
    if (b[k] !== null && typeof b[k] !== 'string') { errors[k] = `${FIELD_LABEL[k]} must be text.`; return; }
    const v = str(b[k]).trim();
    if (required && !v) { errors[k] = `${FIELD_LABEL[k]} can’t be empty. WhatsApp needs at least 1 character.`; return; }
    if (v.length > max) { errors[k] = `${FIELD_LABEL[k]} can be at most ${max} characters (now ${v.length}).`; return; }
    values[k] = v;
  };
  text('about', LIMITS.about, { required: true });
  text('description', LIMITS.description);
  text('address', LIMITS.address);
  text('email', LIMITS.email);
  if (values.email && !EMAIL_RE.test(values.email)) { errors.email = 'That doesn’t look like an email address.'; delete values.email; }

  if (b.websites !== undefined) {
    const list = b.websites === null ? [] : Array.isArray(b.websites) ? b.websites : typeof b.websites === 'string' ? [b.websites] : null;
    if (!list) errors.websites = 'Websites must be a list of links.';
    else {
      const clean = list.map((u) => str(u).trim()).filter(Boolean);
      if (clean.length > LIMITS.websites) errors.websites = 'WhatsApp allows at most 2 websites.';
      else {
        const bad = clean.findIndex((u) => u.length > LIMITS.website || !websiteOk(u));
        if (bad >= 0) {
          errors.websites = clean[bad].length > LIMITS.website
            ? `Website ${bad + 1} can be at most ${LIMITS.website} characters.`
            : `Website ${bad + 1} must start with http:// or https:// and be a full address, like https://crosscoin.in.`;
          errors[`website${bad + 1}`] = errors.websites;
        } else values.websites = clean;
      }
    }
  }
  if (b.vertical !== undefined) {
    const v = str(b.vertical).trim().toUpperCase();
    if (!VERTICAL_LABEL.has(v)) errors.vertical = 'Pick a business category from the list.';
    else values.vertical = v;
  }
  return { values, errors };
}

const same = (a, b) => (Array.isArray(a) || Array.isArray(b)
  ? JSON.stringify(a || []) === JSON.stringify(b || [])
  : str(a) === str(b));

async function updateProfile(body, userId) {
  const { values, errors } = validateProfile(body);
  if (Object.keys(errors).length) {
    return { status: 400, body: { success: false, message: Object.values(errors)[0], errors } };
  }
  const keys = PROFILE_FIELDS.filter((k) => k in values);
  if (!keys.length) return { status: 400, body: { success: false, message: 'Nothing to save. Change a field first.' } };

  const creds = await sharedCreds();
  // Only send what actually changed. If the current profile can't be read,
  // send everything the page sent.
  let current = _cache?.data?.profile || null;
  if (!current) {
    try { current = (await fetchFromMeta(creds)).profile; } catch (_) { current = null; }
  }
  const changed = keys.filter((k) => !current || !same(values[k], current[k]));
  if (!changed.length) return { status: 200, body: { success: true, changed: [], message: 'Nothing changed.' } };

  const payload = { messaging_product: 'whatsapp' };
  for (const k of changed) payload[k] = values[k];
  try {
    await http.post(`${graphUrl()}/${creds.phoneNumberId}/whatsapp_business_profile`, payload, { headers: bearer(creds.token) });
  } catch (e) {
    logger.warn(`[wa-profile] profile update refused: ${ws().metaError(e)}`);
    return { status: metaStatus(e), body: { success: false, message: `WhatsApp didn’t accept the change: ${plainMetaError(e)}` } };
  }
  for (const k of changed) {
    const show = (v) => (Array.isArray(v) ? v.join(', ') : v);
    await audit.record({ brandId: sharedBrandId(), area: 'whatsapp_profile', key: k, action: 'update', oldValue: current ? show(current[k]) : null, newValue: show(values[k]), userId, secret: false });
  }
  clearProfileCache();
  const profile = current ? normProfile({ ...toMeta(current), ...payload }) : null;
  return {
    status: 200,
    body: { success: true, changed, profile, message: 'Saved to WhatsApp. Customers see it within a few minutes.' },
  };
}
// Back to Meta's field names (for merging a saved change into the cached shape).
const toMeta = (p) => ({ about: p.about, description: p.description, address: p.address, email: p.email, websites: p.websites, vertical: p.vertical, profile_picture_url: p.profilePictureUrl });

// ─── Profile photo (Meta Resumable Upload API) ────────────────────────────────
const PHOTO_TYPES = { 'image/jpeg': 'JPG', 'image/jpg': 'JPG', 'image/png': 'PNG' };
function sniffImage(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 8) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  return null;
}

async function uploadPhoto(file, userId) {
  if (!file || !file.buffer || !file.buffer.length) return { status: 400, body: { success: false, message: 'Choose a JPG or PNG photo first.' } };
  if (file.buffer.length > LIMITS.photoBytes) return { status: 400, body: { success: false, message: 'The photo is bigger than 5 MB. Pick a smaller one.' } };
  const type = sniffImage(file.buffer);
  if (!type || !PHOTO_TYPES[str(file.mimetype).toLowerCase()]) return { status: 400, body: { success: false, message: 'Only JPG or PNG photos work for the WhatsApp profile.' } };

  const app = await appId();
  if (!app) {
    return { status: 409, body: { success: false, code: 'NO_APP_ID', message: 'Add the Meta app ID (server setting WHATSAPP_APP_ID — Meta for Developers → your app → App settings → Basic → App ID) to change the photo.' } };
  }
  const creds = await sharedCreds();
  let step = 'start the upload';
  try {
    const s = await http.post(`${graphUrl()}/${app}/uploads`, null, {
      params: { file_length: file.buffer.length, file_type: type, file_name: type === 'image/png' ? 'profile.png' : 'profile.jpg' },
      headers: bearer(creds.token),
    });
    const sessionId = s.data?.id;
    if (!sessionId) throw httpError(502, 'WhatsApp didn’t start the upload (no upload session).');
    step = 'upload the photo';
    const u = await http.post(`${graphUrl()}/${sessionId}`, file.buffer, {
      headers: { Authorization: `OAuth ${creds.token}`, file_offset: '0', 'Content-Type': type },
      maxBodyLength: Infinity, maxContentLength: Infinity, timeout: 60000,
    });
    const handle = u.data?.h;
    if (!handle) throw httpError(502, 'WhatsApp took the photo but didn’t return a file handle.');
    step = 'set the photo';
    await http.post(`${graphUrl()}/${creds.phoneNumberId}/whatsapp_business_profile`,
      { messaging_product: 'whatsapp', profile_picture_handle: handle }, { headers: bearer(creds.token) });
  } catch (e) {
    logger.warn(`[wa-profile] photo upload failed (${step}): ${e.response ? ws().metaError(e) : e.message}`);
    return { status: e.status || metaStatus(e), body: { success: false, message: `Couldn’t ${step} on WhatsApp: ${plainMetaError(e)}` } };
  }
  await audit.record({ brandId: sharedBrandId(), area: 'whatsapp_profile', key: 'profile_photo', action: 'update', newValue: `${PHOTO_TYPES[type]} photo, ${Math.round(file.buffer.length / 1024)} KB`, userId, secret: false });
  clearProfileCache();
  return { status: 200, body: { success: true, message: 'New photo sent to WhatsApp. Customers see it within a few minutes.' } };
}

// ─── Display name change request ──────────────────────────────────────────────
async function requestNameChange(rawName, userId) {
  const name = str(rawName).replace(/\s+/g, ' ').trim();
  if (name.length < LIMITS.nameMin || name.length > LIMITS.nameMax) {
    return { status: 400, body: { success: false, message: `The display name must be ${LIMITS.nameMin} to ${LIMITS.nameMax} characters.` } };
  }
  const creds = await sharedCreds();
  const current = _cache?.data?.number?.verifiedName || null;
  if (current && current.toLowerCase() === name.toLowerCase()) {
    return { status: 400, body: { success: false, message: 'That is already the display name.' } };
  }
  try {
    await http.post(`${graphUrl()}/${creds.phoneNumberId}`, { new_display_name: name }, { headers: bearer(creds.token) });
  } catch (e) {
    logger.warn(`[wa-profile] display name request refused: ${ws().metaError(e)}`);
    return {
      status: metaStatus(e),
      body: { success: false, code: 'NAME_REQUEST_REFUSED', message: `WhatsApp didn’t take the request: ${plainMetaError(e)} ${MANAGER_GUIDE}`, guidance: MANAGER_GUIDE },
    };
  }
  const record = { name, at: new Date().toISOString(), by: userId || null, previous: current };
  try { await insights().writeSetting(NAME_REQUEST_KEY, record); } catch (e) { logger.warn(`[wa-profile] could not remember the name request: ${e.message}`); }
  await audit.record({ brandId: sharedBrandId(), area: 'whatsapp_profile', key: 'display_name', action: 'request', oldValue: current, newValue: name, userId, secret: false });
  clearProfileCache();
  return { status: 200, body: { success: true, nameRequest: record, message: `Sent to Meta for review: “${name}”. Meta usually decides in 1 to 3 days.` } };
}

// ─── Connection keys (shared brand rows) ──────────────────────────────────────
const KEY_DEFS = [
  { field: 'token', key: 'WHATSAPP_API_TOKEN', label: 'Access token', secret: true },
  { field: 'phoneNumberId', key: 'WHATSAPP_PHONE_NUMBER_ID', label: 'Phone number ID' },
  { field: 'businessAccountId', key: 'WHATSAPP_BUSINESS_ACCOUNT_ID', label: 'WhatsApp Business account ID' },
  { field: 'catalogId', key: 'WHATSAPP_CATALOG_ID', label: 'Catalogue ID', optional: true },
];

async function loadKeyRows(brandId) {
  const rows = await BrandSetting.findAll({ where: { brand_id: brandId, key: { [Op.in]: KEY_DEFS.map((d) => d.key) } } });
  const m = new Map();
  for (const r of rows) {
    const k = str(r.key).trim().toUpperCase();
    if (!m.has(k) || r.key === k) m.set(k, r);
  }
  return m;
}

function rowValue(row) {
  if (!row) return '';
  try { return str(row.value).trim(); } catch (_) { return ''; }
}

function effectiveKey(def, row, brandId) {
  const own = rowValue(row);
  if (own) return { value: own, source: 'brand' };
  if (settingsHelper.envFallbackAllowed(brandId, def.key) && process.env[def.key]) return { value: str(process.env[def.key]).trim(), source: 'server' };
  return { value: '', source: 'none' };
}

async function getKeys() {
  const id = sharedBrandId();
  const rows = await loadKeyRows(id);
  let brandName = null;
  try {
    const Brand = require('../model/brandModel.js');
    const b = await Brand.findByPk(id, { attributes: ['name', 'display_name'] });
    brandName = b ? (b.display_name || b.name) : null;
  } catch (_) { /* optional */ }
  const keys = KEY_DEFS.map((d) => {
    const row = rows.get(d.key);
    const eff = effectiveKey(d, row, id);
    return {
      field: d.field, key: d.key, label: d.label, secret: !!d.secret, optional: !!d.optional,
      isSet: !!eff.value,
      value: d.secret ? maskSecret(eff.value) : eff.value,
      source: eff.source,
      encrypted: d.secret ? !!row?.is_encrypted : undefined,
      updatedAt: row ? (row.updatedAt || row.updated_at || null) : null,
    };
  });
  return {
    sharedBrandId: id,
    sharedBrandName: brandName,
    configured: keys.filter((k) => !k.optional).every((k) => k.isSet),
    canEncrypt: canEncrypt(),
    appIdSet: !!(await appId()),
    keys,
  };
}

// body: { token?, phoneNumberId?, businessAccountId?, catalogId? }
async function saveKeys(body, userId) {
  const b = body && typeof body === 'object' ? body : {};
  const id = sharedBrandId();
  const input = {};
  const errors = {};
  for (const d of KEY_DEFS) {
    if (b[d.field] === undefined) continue;
    let v = str(b[d.field]).trim();
    if (d.secret) {
      if (/^•/.test(v)) continue; // the mask echoed back = unchanged
      if (!v) { errors[d.field] = 'Paste the new access token.'; continue; }
      if (/\s/.test(v) || v.length < 20 || v.length > 2048) { errors[d.field] = 'That doesn’t look like an access token. It is one long code that usually starts with EAA.'; continue; }
    } else {
      v = v.replace(/\s+/g, '');
      if (!v && d.optional) { input[d.field] = ''; continue; }
      if (!/^\d{5,25}$/.test(v)) { errors[d.field] = `${d.label}: numbers only, like 110483726159842.`; continue; }
    }
    input[d.field] = v;
  }
  if (Object.keys(errors).length) return { status: 400, body: { success: false, message: Object.values(errors)[0], errors } };

  const rows = await loadKeyRows(id);
  const cur = Object.fromEntries(KEY_DEFS.map((d) => [d.field, effectiveKey(d, rows.get(d.key), id)]));
  const changes = KEY_DEFS.filter((d) => d.field in input && input[d.field] !== cur[d.field].value)
    // Clearing an optional key only means something when this brand has a row.
    .filter((d) => input[d.field] !== '' || rows.get(d.key));
  if (!changes.length) return { status: 200, body: { success: true, saved: [], message: 'Nothing changed.', ...(await getKeys()) } };

  // A new token or phone number ID must work together before it is saved.
  let test = null;
  if (changes.some((d) => d.field === 'token' || d.field === 'phoneNumberId')) {
    const token = input.token ?? cur.token.value;
    const pnid = input.phoneNumberId ?? cur.phoneNumberId.value;
    if (!token || !pnid) {
      return { status: 400, body: { success: false, message: 'Add both the access token and the phone number ID. WhatsApp needs the two together.' } };
    }
    const what = changes.some((d) => d.field === 'token') ? (changes.some((d) => d.field === 'phoneNumberId') ? 'token and phone number ID' : 'token') : 'phone number ID';
    try {
      const r = await http.get(`${graphUrl()}/${pnid}`, { params: { fields: 'verified_name,display_phone_number' }, headers: bearer(token) });
      const name = r.data?.verified_name || null;
      const phone = maskPhone(r.data?.display_phone_number);
      test = { ok: true, verifiedName: name, displayPhone: phone, message: `WhatsApp accepted the new ${what}${name ? `: the number is “${name}”${phone ? ` (${phone})` : ''}` : ''}.` };
    } catch (e) {
      logger.warn(`[wa-profile] key test failed: ${e.response ? ws().metaError(e) : e.message}`);
      const msg = `WhatsApp rejected the new ${what}, so nothing was saved and the old values stay in use. ${plainMetaError(e)}`;
      return { status: metaStatus(e), body: { success: false, code: 'KEY_TEST_FAILED', message: msg, test: { ok: false, message: msg } } };
    }
  }

  const encOk = canEncrypt();
  const settingsService = require('./brandSettingsService.js');
  for (const d of changes) {
    const row = rows.get(d.key);
    const v = input[d.field];
    const old = rowValue(row) || cur[d.field].value;
    if (v === '') {
      await settingsService.deleteBrandSetting(id, row.key);
      await audit.record({ brandId: id, area: 'whatsapp_keys', key: d.key, action: 'delete', oldValue: old, userId, secret: !!d.secret });
      continue;
    }
    if (row) {
      await settingsService.updateSetting(id, row.key, {
        value: v,
        is_encrypted: d.secret ? (row.is_encrypted || encOk) : row.is_encrypted,
        updated_by: userId,
      });
    } else {
      await settingsService.createSetting({
        brand_id: id, key: d.key, value: v, category: 'general', description: d.label,
        is_encrypted: !!d.secret && encOk, updated_by: userId,
      });
    }
    await audit.record({ brandId: id, area: 'whatsapp_keys', key: d.key, action: row ? 'update' : 'create', oldValue: old || null, newValue: v, userId, secret: !!d.secret });
  }
  clearAllCaches();
  return {
    status: 200,
    body: { success: true, saved: changes.map((d) => d.field), test, message: `Saved: ${changes.map((d) => d.label.toLowerCase()).join(', ')}.`, ...(await getKeys()) },
  };
}

function clearAllCaches() {
  const id = sharedBrandId();
  try { ws().clearCredentialsCache(id); } catch (_) { /* optional */ }
  try { settingsHelper.clearCache(id); } catch (_) { /* optional */ }
  try { insights().clearHealthCache(); } catch (_) { /* optional */ }
  clearProfileCache();
}

// ─── How each store signs its messages ───────────────────────────────────────
async function storesIdentity() {
  const Brand = require('../model/brandModel.js');
  const { Coupon } = require('../model/couponModel.js');
  const { statusOf } = require('./couponAdminService.js');
  const brands = await Brand.findAll({ order: [['id', 'ASC']] });
  const ids = brands.map((b) => b.id);
  const ownRows = ids.length ? await BrandSetting.findAll({ where: { brand_id: { [Op.in]: ids }, key: { [Op.in]: ['WINBACK_COUPON_CODE', 'STORE_NAME'] } } }) : [];
  const own = new Map(ownRows.map((r) => [`${r.brand_id}:${str(r.key).toUpperCase()}`, rowValue(r)]));
  let winOn = true;
  try { winOn = await ws().isAutomationEnabled('win_back'); } catch (_) { winOn = true; }

  // One win-back code for every store (WhatsApp → Abandoned carts → rules).
  const winCode = await require('./cartRecoveryService.js').getWinbackCode();
  const codes = new Map();
  for (const b of brands) codes.set(b.id, winCode);
  const coupons = codes.size ? await Coupon.findAll({ where: { code: [...new Set(codes.values())] } }) : [];
  const byCode = new Map();
  for (const c of coupons) {
    const k = str(c.code).toUpperCase();
    if (!byCode.has(k)) byCode.set(k, []);
    byCode.get(k).push(c);
  }
  const nameOf = new Map(brands.map((b) => [Number(b.id), b.display_name || b.name]));
  const now = new Date();
  const fmtDay = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });

  const stores = [];
  for (const b of brands) {
    const storeNameSetting = own.get(`${b.id}:STORE_NAME`) || '';
    const messageName = b.display_name || b.name || storeNameSetting || 'Cross Coin';
    const nameSource = b.display_name ? 'display_name' : b.name ? 'name' : storeNameSetting ? 'store_name' : 'default';
    let domain = '';
    try { domain = await ws().getBrandDomain(b.id); } catch (_) { domain = str(b.domain); }

    const code = codes.get(b.id);
    const rows = byCode.get(code) || [];
    // Like the win-back cron: the coupon must be this store's own, on and in date.
    const mine = rows.find((c) => Number(c.brand_id) === Number(b.id)) || null;
    let status; let note;
    if (!mine) {
      const other = rows[0];
      status = other ? 'other_store' : 'missing';
      note = other ? `${code} belongs to ${nameOf.get(Number(other.brand_id)) || 'another store'}, so win-back skips this store` : `No coupon called ${code} yet, so win-back skips this store`;
    } else {
      status = statusOf(mine, now);
      note = status === 'live' ? null
        : status === 'ended' ? (mine.usageLimit && Number(mine.usageCount) >= Number(mine.usageLimit) ? `${code} is used up` : `${code} ended${mine.endDate ? ` ${fmtDay(mine.endDate)}` : ''}`)
          : status === 'off' ? `${code} is switched off`
            : `${code} starts ${fmtDay(mine.startDate)}`;
    }
    stores.push({
      brandId: b.id,
      store: b.name,
      status: b.status,
      color: b.primary_color || null,
      messageName,
      nameSource,
      storeNameSetting: storeNameSetting || null,
      domain,
      winback: {
        code,
        isDefault: winCode === 'CART10',
        status: status === 'live' ? 'active' : status,
        active: status === 'live' && winOn,
        endedAt: mine && status === 'ended' ? mine.endDate : null,
        note,
      },
    });
  }
  const attention = stores.filter((s) => s.status === 'active' && s.winback.status !== 'active');
  return { winbackAutomationOn: winOn, stores, attention: attention.length };
}

module.exports = {
  getProfile,
  updateProfile,
  uploadPhoto,
  requestNameChange,
  getKeys,
  saveKeys,
  storesIdentity,
  clearProfileCache,
  // exported for tests / reuse
  validateProfile,
  maskPhone,
  maskSecret,
  plainMetaError,
  VERTICALS,
  LIMITS,
  MANAGER_GUIDE,
};
