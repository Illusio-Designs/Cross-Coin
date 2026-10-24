'use strict';

/**
 * Load the environment before anything else reads process.env.
 *
 * 1. This app's own .env (from the app folder), as before. In production the
 *    values usually come from cPanel → Setup Node.js App → Environment
 *    variables instead, and are already set when Node starts.
 *
 * 2. Main API (no APP_ROLE): writes the app settings it runs with to
 *    .env.shared.json in its folder (readable by this account only; JSON so
 *    every value survives exactly), so the
 *    admin API copy can use exactly the same keys without anyone copying them
 *    by hand. Rewritten on every start, so a key changed in cPanel reaches the
 *    admin app after both restart. The deploy never uploads or overwrites
 *    .env.* files, and the folder is not served on the web.
 *
 * 3. Admin API copy (APP_ROLE=admin, folder AdminBackend/ next to Backend/):
 *    reads SHARED_ENV_FILE, else ../Backend/.env.shared.json, then ../Backend/.env.
 *    Its local uploads default to the main app's Backend/uploads, which
 *    api.crosscoin.in serves.
 *
 * dotenv never overrides a value that is already set, so this app's own
 * cPanel variables always win.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const dotenv = require('dotenv');

// App settings shared with the admin copy: everything the code reads except
// per-app values (port, role, memory flags, upload folder).
const SHARED_KEYS = [
  'ABANDONED_CART_DELAY_MIN', 'ADMIN_DASHBOARD_URL', 'ADMIN_METRICS_TOKEN', 'ADMIN_URL', 'API_URL', 'APP_TZ_OFFSET',
  'APP_VERSION', 'BACKEND_URL', 'BASE_URL', 'CLIENT_URL', 'CRON_TOKEN', 'DASHBOARD_URL', 'DATA_ENCRYPTION_KEY',
  'DB_DATABASE', 'DB_DIALECT', 'DB_HOST', 'DB_PASSWORD', 'DB_POOL_ACQUIRE', 'DB_POOL_EVICT', 'DB_POOL_IDLE',
  'DB_POOL_MAX', 'DB_POOL_MIN', 'DB_USER', 'EMAIL_APP_PASSWORD', 'EMAIL_USER', 'ERROR_ALERTS', 'ERROR_ALERT_DEDUP_MS',
  'FACEBOOK_APP_ID', 'FACEBOOK_APP_SECRET', 'FRONTEND_URL', 'GA_API_SECRET', 'GA_MEASUREMENT_ID',
  'IMAGEKIT_PRIVATE_KEY', 'IMAGEKIT_PUBLIC_KEY', 'IMAGEKIT_URL_ENDPOINT', 'INVOICE_URL_SECRET', 'ITHINK_COUNTRY_CODE',
  'ITHINK_TIMEOUT_MS', 'ITHINK_WEBHOOK_TOKEN', 'JWT_SECRET', 'MAX_FILE_SIZE', 'MEDIA_URL_SECRET', 'META_ADS_TOKEN',
  'META_APP_ID', 'META_APP_SECRET', 'MSG91_AUTH_KEY', 'NODE_ENV', 'POPUP_COUPON_CODE', 'RECON_USE_QUEUE',
  'REDIS_DB', 'REDIS_HOST', 'REDIS_PASSWORD', 'REDIS_PORT', 'REDIS_URL', 'SENTRY_DSN', 'SENTRY_FORCE', 'SENTRY_PII',
  'SENTRY_TRACES_SAMPLE', 'SESSION_SECRET', 'SHIPPING_AUTO_SYNC', 'SHIPPING_REFRESH_BATCH', 'SLOW_QUERY_MS',
  'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'VAPID_PRIVATE_KEY', 'VAPID_PUBLIC_KEY', 'VAPID_SUBJECT',
  'VISIT_INGEST_KEY', 'WA_MEDIA_MAX_AGE_DAYS', 'WA_MEDIA_MAX_BYTES', 'WEBHOOK_REQUIRE_SIGNATURE', 'WHATSAPP_API_TOKEN',
  'WHATSAPP_APP_ID', 'WHATSAPP_APP_SECRET', 'WHATSAPP_BUSINESS_ACCOUNT_ID', 'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_SHARED_BRAND_ID', 'WHATSAPP_WEBHOOK_SECRET', 'WHATSAPP_WEBHOOK_VERIFY_TOKEN',
];

const APP_DIR = path.resolve(__dirname, '..');
// Like dotenv: set only what isn't set yet.
function loadFile(file) {
  if (file.endsWith('.json')) {
    const vars = JSON.parse(fs.readFileSync(file, 'utf8')).vars || {};
    for (const [k, v] of Object.entries(vars)) if (process.env[k] === undefined) process.env[k] = String(v);
  } else {
    dotenv.config({ path: file, quiet: true });
  }
}

dotenv.config({ quiet: true });

// The admin copy is deployed to AdminBackend/: treat it as APP_ROLE=admin
// even when the cPanel variable is missing, so it finds the main app's
// settings and can never start the scheduled jobs.
if (!process.env.APP_ROLE && /admin/i.test(path.basename(APP_DIR))) process.env.APP_ROLE = 'admin';

// What the admin copy looked for and found (index.js shows it when the
// settings are missing, instead of the host's bare 503).
const diagnostics = { looked: [], found: [] };

if (String(process.env.APP_ROLE || '').toLowerCase() === 'admin') {
  // The main app's folder: next to this one, else Backend/ in the home folder.
  const homes = [...new Set([path.resolve(APP_DIR, '..', 'Backend'), path.join(os.homedir(), 'Backend')])];
  const mainApp = homes.find((d) => fs.existsSync(path.join(d, '.env.shared.json')) || fs.existsSync(path.join(d, '.env'))) || homes[0];
  const files = process.env.SHARED_ENV_FILE
    ? [path.resolve(process.env.SHARED_ENV_FILE)]
    : homes.flatMap((d) => [path.join(d, '.env.shared.json'), path.join(d, '.env')]);
  const found = files.filter((f) => fs.existsSync(f));
  diagnostics.looked = files;
  diagnostics.found = found;
  for (const f of found) {
    try { loadFile(f); } catch (e) { console.warn(`[env] could not read ${f}: ${e.message}`); }
  }
  if (found.length) console.warn(`[env] admin API: settings loaded from ${found.join(', ')}${process.env.JWT_SECRET ? '' : ' (but no JWT_SECRET in them)'}`);
  else console.warn(`[env] APP_ROLE=admin but none of ${files.join(', ')} exists: start the main API once, or set SHARED_ENV_FILE`);
  if (!process.env.UPLOAD_PATH) process.env.UPLOAD_PATH = path.join(mainApp, 'uploads');
} else if (process.env.NODE_ENV === 'production') {
  try {
    const vars = {};
    for (const k of SHARED_KEYS) if (process.env[k] !== undefined) vars[k] = process.env[k];
    const body = `${JSON.stringify({ note: 'Written by the main API on start (config/loadEnv.js) for the admin API copy. Do not edit: change the values in cPanel and restart the main API.', vars }, null, 1)}\n`;
    const file = path.join(APP_DIR, '.env.shared.json');
    const old = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
    if (old !== body) fs.writeFileSync(file, body, { mode: 0o600 });
    fs.chmodSync(file, 0o600);
  } catch (e) {
    console.warn(`[env] could not write .env.shared.json for the admin API: ${e.message}`);
  }
}

module.exports = { diagnostics };
