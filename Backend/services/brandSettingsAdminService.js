'use strict';

/**
 * Brand settings — the plain-form layer behind Dashboard → Brands.
 *
 * brand_settings is a free key/value table. This service maps every key the
 * backend actually reads (settingsHelper.getSetting / getBrandSetting callers)
 * to a labelled field in one of six sections, validates input, never hands a
 * secret back to the browser (only "••••1234"), works out per-brand warnings
 * and writes every change to settings_audit.
 *
 * Keys that are stored for a brand but not in the catalogue land in "Other
 * settings" so nothing is lost. Keys owned by other pages (SEO_*, the Policies
 * page's company_gstin, the shared PICKUP_SCHEDULE, internal boot markers) are
 * left to those pages.
 */

const axios = require('axios');
const { Op } = require('sequelize');
const { BrandSetting } = require('../model/brandSettingModel.js');
const Brand = require('../model/brandModel.js');
const { encrypt } = require('../utils/encryption.js');
const { OWN_HOSTS, normalizeHost } = require('../utils/ownHosts.js');
const { VALID_INDIAN_STATES } = require('./shippingValidationService.js');
const settingsHelper = require('./settingsHelper.js');
const audit = require('./settingsAuditService.js');

// ── Sections (tabs) ──────────────────────────────────────────────────────────
const SECTIONS = [
  { key: 'store', title: 'Store', help: 'How the store appears to shoppers: name, website, contact details and colours.' },
  { key: 'shipping', title: 'Shipping', help: 'The iThink courier account that ships this store’s orders, its warehouse and delivery rules. Delivery charges are on Shipping & courier.' },
  { key: 'tax', title: 'Tax & invoices', help: 'Printed on every GST invoice for this store.' },
  { key: 'returns', title: 'Returns', help: 'Used by the Problems desk refund presets and return pickups.' },
  { key: 'payments', title: 'Payments', help: 'Razorpay keys and the cash-on-delivery rules for this store.' },
  { key: 'tracking', title: 'Tracking', help: 'Pixels and analytics loaded on the store.' },
];

// ── Field catalogue ──────────────────────────────────────────────────────────
// type: text | number | select | toggle | textarea | secret
// brandOnly: the backend reads this key WITHOUT the shared server (.env) fallback.
const ADS_EVENTS = [
  ['VIEW_ITEM', 'viewed a product'], ['ADD_TO_CART', 'added to cart'], ['BEGIN_CHECKOUT', 'started checkout'],
  ['ADD_SHIPPING_INFO', 'added address'], ['ADD_PAYMENT_INFO', 'chose payment'], ['PURCHASE', 'purchase'],
];
const F = (key, tab, label, extra = {}) => ({ key, tab, label, type: 'text', category: 'general', ...extra });
const FIELDS = [
  // Store → courier (brand record fields are edited alongside, see BRAND_FIELDS)
  F('ITHINK_ACCESS_TOKEN', 'shipping', 'iThink access token', { group: 'Courier account (iThink)', type: 'secret', category: 'shipping' }),
  F('ITHINK_SECRET_KEY', 'shipping', 'iThink secret key', { group: 'Courier account (iThink)', type: 'secret', category: 'shipping' }),
  F('ITHINK_PICKUP_ADDRESS_ID', 'shipping', 'Pickup warehouse ID', { group: 'Courier account (iThink)', rule: 'digits', category: 'shipping', hint: 'From iThink → Warehouses. Orders can’t be booked without it.' }),
  F('ITHINK_RETURN_ADDRESS_ID', 'shipping', 'Return warehouse ID', { group: 'Courier account (iThink)', rule: 'digits', category: 'shipping', hint: 'Empty = returns go to the pickup warehouse.' }),
  F('ITHINK_WAREHOUSE_PINCODE', 'shipping', 'Warehouse PIN code', { group: 'Courier account (iThink)', rule: 'pincode', category: 'shipping', hint: 'Used to check if a shopper’s PIN code can be delivered to.' }),
  F('DEFAULT_WAREHOUSE_PINCODE', 'shipping', 'Backup warehouse PIN code', { group: 'Courier account (iThink)', rule: 'pincode', category: 'shipping', hint: 'Only used when the PIN code above is empty.' }),
  F('ITHINK_ENVIRONMENT', 'shipping', 'iThink account type', { group: 'Courier account (iThink)', type: 'select', category: 'shipping', options: [['production', 'Live'], ['staging', 'Test (no real pickups)']], default: 'production' }),
  F('COURIER_PRIORITY', 'shipping', 'Couriers to share orders between', { group: 'Courier account (iThink)', rule: 'list', category: 'shipping', default: 'delhivery, amazon, xpressbees, dtdc', hint: 'Comma-separated courier names.' }),
  F('COURIER_EXCLUDE', 'shipping', 'Couriers never to use', { group: 'Courier account (iThink)', rule: 'list', category: 'shipping', hint: 'Comma-separated. Empty = none blocked.' }),

  // Tax & invoices (invoiceService reads these brand-only)
  F('GST_LEGAL_NAME', 'tax', 'Legal name', { brandOnly: true, hint: 'Empty = the store name.' }),
  F('GSTIN', 'tax', 'GSTIN', { brandOnly: true, rule: 'gstin', hint: '15 characters, e.g. 24ABCDE1234F1Z5' }),
  F('GST_PERCENTAGE', 'tax', 'GST rate (%)', { brandOnly: true, type: 'number', min: 0, max: 28, hint: 'Prices include GST; the invoice backs it out.' }),
  F('GST_STATE', 'tax', 'State you ship from', { brandOnly: true, rule: 'state', hint: 'Same state as the shopper → CGST + SGST, otherwise IGST.' }),
  F('GST_ADDRESS', 'tax', 'Registered address', { brandOnly: true, type: 'textarea' }),

  // Returns (exceptionsService return-charge presets + return pickups)
  F('RETURN_CHARGE_SHIPPING', 'returns', 'Return shipping kept (₹)', { brandOnly: true, type: 'number', min: 0, max: 100000, default: '79' }),
  F('RETURN_CHARGE_GATEWAY_PERCENT', 'returns', 'Payment fee kept on prepaid refunds (%)', { brandOnly: true, type: 'number', min: 0, max: 50, default: '2' }),
  F('RETURN_CHARGE_RESTOCK', 'returns', 'Restocking fee (₹)', { brandOnly: true, type: 'number', min: 0, max: 100000, default: '99' }),
  F('RETURN_AUTO_PICKUP', 'returns', 'Book the return pickup automatically', { type: 'toggle', default: 'true' }),
  F('ITHINK_REVERSE_LOGISTICS', 'returns', 'Courier for return pickups', { category: 'shipping', hint: 'e.g. delhivery. Empty = staff arrange the pickup by hand.' }),

  // Payments
  F('RAZORPAY_KEY_ID', 'payments', 'Razorpay key ID', { rule: 'razorpayKey', category: 'payment', group: 'Razorpay' }),
  F('RAZORPAY_KEY_SECRET', 'payments', 'Razorpay key secret', { type: 'secret', category: 'payment', group: 'Razorpay' }),
  F('RAZORPAY_WEBHOOK_SECRET', 'payments', 'Razorpay webhook secret', { type: 'secret', category: 'payment', group: 'Razorpay' }),
  F('PREPAID_INSTANT_DISCOUNT', 'payments', 'Instant discount for paying online (₹)', { type: 'number', min: 0, max: 10000, default: '50', category: 'payment', group: 'Checkout rules', hint: 'Largest discount the server accepts without a coupon.' }),
  F('COD_MAX_ORDER_VALUE', 'payments', 'Cash on delivery allowed up to (₹)', { type: 'number', min: 0, max: 1000000, default: '1500', category: 'payment', group: 'Checkout rules', hint: 'Same value as on Shipping & courier.' }),
  F('COD_MIN_ADDRESS_QUALITY', 'payments', 'Lowest address score allowed for COD (0–100)', { type: 'number', min: 0, max: 100, default: '60', category: 'payment', group: 'Checkout rules', hint: '0 = never block COD for a messy address.' }),
  F('FREE_SHIPPING_THRESHOLD', 'shipping', 'Free delivery over (₹)', { type: 'number', min: 0, max: 1000000, default: '0', category: 'shipping', group: 'Delivery rules', hint: '0 = off. Same value as on Shipping & courier.' }),
  F('CUSTOM_CHECKOUT_API_KEY', 'payments', 'Custom checkout API key', { type: 'secret', category: 'payment', group: 'Custom checkout' }),
  F('CUSTOM_CHECKOUT_HMAC_SECRET', 'payments', 'Custom checkout signing secret', { type: 'secret', category: 'payment', group: 'Custom checkout' }),

  // WhatsApp is universal: one shared number (WhatsApp → Profile) and one
  // win-back coupon for every store (WhatsApp → Abandoned carts → rules).

  // Tracking (trackingConfigController + integrations read these brand-only)
  F('FB_PIXEL_ID', 'tracking', 'Meta pixel ID', { rule: 'digits', category: 'analytics', group: 'Meta' }),
  F('FB_ACCESS_TOKEN', 'tracking', 'Meta Conversions API token', { type: 'secret', category: 'analytics', group: 'Meta' }),
  F('FB_TEST_EVENT_CODE', 'tracking', 'Meta test event code', { category: 'analytics', group: 'Meta', hint: 'Only while testing — remove afterwards.' }),
  F('META_AD_ACCOUNT_ID', 'tracking', 'Meta ad account ID', { brandOnly: true, rule: 'adAccount', category: 'analytics', group: 'Meta', hint: 'For reading ad spend into the reports.' }),
  F('META_ADS_TOKEN', 'tracking', 'Meta ads token (read-only)', { brandOnly: true, type: 'secret', category: 'analytics', group: 'Meta', hint: 'Only if “Check ad account access” fails with the Conversions API token.' }),
  F('GA_MEASUREMENT_ID', 'tracking', 'Google Analytics ID', { brandOnly: true, rule: 'ga', category: 'analytics', group: 'Google' }),
  F('GA_API_SECRET', 'tracking', 'Google Analytics API secret', { brandOnly: true, type: 'secret', category: 'analytics', group: 'Google' }),
  F('GTM_ID', 'tracking', 'Google Tag Manager ID', { brandOnly: true, rule: 'gtm', category: 'analytics', group: 'Google' }),
  F('GOOGLE_ADS_ID', 'tracking', 'Google Ads ID', { brandOnly: true, rule: 'aw', category: 'analytics', group: 'Google Ads' }),
  F('GOOGLE_ADS_CONVERSION_LABEL', 'tracking', 'Purchase label (old single label)', { brandOnly: true, category: 'analytics', group: 'Google Ads', hint: 'Used only when the purchase label below is empty.' }),
  ...ADS_EVENTS.map(([ev, what]) => F(`GOOGLE_ADS_LABEL_${ev}`, 'tracking', `Conversion label — ${what}`, { brandOnly: true, category: 'analytics', group: 'Google Ads' })),
  F('CLARITY_ID', 'tracking', 'Microsoft Clarity ID', { brandOnly: true, category: 'analytics', group: 'Other' }),
];
// "Where do I find this?" — shown behind the ⓘ next to each field.
const GOOGLE_ADS_LABEL_GUIDE = 'Google Ads → Goals → Conversions → open the conversion → Tag setup → “Use Google tag”. The label is the part after the slash in AW-123456789/AbC-dEfGh.';
const GUIDES = {
  ITHINK_ACCESS_TOKEN: 'iThink Logistics dashboard → Settings → API settings (or ask your iThink account manager). Copy the access token.',
  ITHINK_SECRET_KEY: 'Same place as the access token: iThink → Settings → API settings → secret key.',
  ITHINK_PICKUP_ADDRESS_ID: 'iThink dashboard → Warehouses (pickup addresses): the warehouse ID shown next to your pickup address.',
  ITHINK_RETURN_ADDRESS_ID: 'iThink → Warehouses: the ID of the address returns should come back to. Leave empty to use the pickup warehouse.',
  ITHINK_WAREHOUSE_PINCODE: 'The 6-digit PIN code of the warehouse your parcels leave from.',
  DEFAULT_WAREHOUSE_PINCODE: 'A second warehouse PIN code, only used when the one above is empty.',
  ITHINK_ENVIRONMENT: 'Live for real orders. Choose Test only with an iThink staging (test) account.',
  COURIER_PRIORITY: 'Courier names as iThink spells them, e.g. delhivery, xpressbees, dtdc, ekart. Ask iThink which couriers are active on your account.',
  COURIER_EXCLUDE: 'Courier names (as iThink spells them) you never want orders booked with.',
  GST_LEGAL_NAME: 'Exactly as on your GST registration certificate: “Legal name of business”.',
  GSTIN: 'On your GST registration certificate, or search your business on gst.gov.in → Search taxpayer.',
  GST_PERCENTAGE: 'The GST rate charged on your products. Ask your CA if you are not sure.',
  GST_STATE: 'The state on your GST certificate — the state you ship from.',
  GST_ADDRESS: 'Your principal place of business, as printed on the GST certificate.',
  RETURN_CHARGE_SHIPPING: 'Your own return policy: the amount kept from a refund to pay for the return pickup.',
  RETURN_CHARGE_GATEWAY_PERCENT: 'Your own return policy: Razorpay keeps its fee on refunds, so you can keep the same % from prepaid refunds.',
  RETURN_CHARGE_RESTOCK: 'Your own return policy: a fixed fee kept for checking and repacking returned items.',
  RETURN_AUTO_PICKUP: 'On: approving a return books the pickup with the courier straight away. Off: staff book it by hand.',
  ITHINK_REVERSE_LOGISTICS: 'The courier iThink uses for return pickups on your account, e.g. delhivery. Ask iThink which couriers do reverse pickups for you.',
  RAZORPAY_KEY_ID: 'Razorpay Dashboard → Account & Settings → API keys → Generate key. Starts with rzp_live_ (rzp_test_ for test mode).',
  RAZORPAY_KEY_SECRET: 'Shown only once, when you generate the key in Razorpay → API keys. If it is lost, regenerate the key and update both values here.',
  RAZORPAY_WEBHOOK_SECRET: 'Razorpay → Account & Settings → Webhooks → the webhook pointing to api.crosscoin.in → the secret you typed when you created it.',
  PREPAID_INSTANT_DISCOUNT: 'Your own rule: the ₹ off shoppers get for paying online instead of cash on delivery.',
  COD_MAX_ORDER_VALUE: 'Your own rule: orders above this amount must be paid online.',
  COD_MIN_ADDRESS_QUALITY: 'Your own rule: addresses scoring below this (incomplete or messy) can’t use cash on delivery. 0 turns it off.',
  FREE_SHIPPING_THRESHOLD: 'Your own rule: orders above this amount ship free. 0 turns it off.',
  CUSTOM_CHECKOUT_API_KEY: 'Shared with your custom-checkout partner. Both sides must use exactly the same value.',
  CUSTOM_CHECKOUT_HMAC_SECRET: 'Shared with your custom-checkout partner to sign messages. Both sides must use exactly the same value.',
  FB_PIXEL_ID: 'Meta Events Manager → Data sources → your pixel (dataset): the 15–16 digit ID under its name.',
  FB_ACCESS_TOKEN: 'Meta Events Manager → your pixel → Settings → Conversions API → Generate access token.',
  FB_TEST_EVENT_CODE: 'Meta Events Manager → your pixel → Test events → the code like TEST12345. Remove it once testing is done.',
  META_ADS_TOKEN: 'Business Settings → Users → System users → your system user → Generate new token → pick your app → tick ads_read → Generate. The system user also needs the ad account under Assign assets (View performance).',
  META_AD_ACCOUNT_ID: 'Meta Ads Manager → the account switcher (top left): the number under the account name. Or Business Settings → Accounts → Ad accounts. With or without act_.',
  GA_MEASUREMENT_ID: 'Google Analytics → Admin → Data streams → your website stream → Measurement ID (G-…).',
  GA_API_SECRET: 'Google Analytics → Admin → Data streams → your stream → Measurement Protocol API secrets → Create.',
  GTM_ID: 'tagmanager.google.com → your container: the ID at the top of the page (GTM-…).',
  GOOGLE_ADS_ID: 'Google Ads → Goals → Conversions → open any conversion → Tag setup → “Use Google tag”: the AW-… number.',
  GOOGLE_ADS_CONVERSION_LABEL: GOOGLE_ADS_LABEL_GUIDE,
  CLARITY_ID: 'clarity.microsoft.com → your project → Settings → Overview → Project ID (about 10 letters and numbers).',
};
for (const f of FIELDS) f.guide = GUIDES[f.key] || (f.key.startsWith('GOOGLE_ADS_LABEL_') ? GOOGLE_ADS_LABEL_GUIDE : null);

for (const f of FIELDS) if (f.type === 'secret') f.secret = true;

// "General · all stores": the account credentials every store shares (Meta
// token, iThink account, Razorpay account). They leave the per-store forms and
// are edited once; settingsHelper serves the shared value to every store.
const GENERAL_KEYS = settingsHelper.GLOBAL_KEYS;
const GENERAL_PAIRS = [['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'], ['ITHINK_ACCESS_TOKEN', 'ITHINK_SECRET_KEY']];
const GENERAL_FIELDS = [];
for (let i = FIELDS.length - 1; i >= 0; i--) {
  if (GENERAL_KEYS.has(FIELDS[i].key)) GENERAL_FIELDS.unshift({ ...FIELDS.splice(i, 1)[0], tab: 'general', brandOnly: false });
}
const GENERAL_BY_KEY = new Map(GENERAL_FIELDS.map((f) => [f.key, f]));
const ALL_KEY = (key) => settingsHelper.GLOBAL_PREFIX + key;

const FIELD_BY_KEY = new Map(FIELDS.map((f) => [f.key, f]));

// Friendly labels for known keys that have no tab (shown under "Other settings").
const OTHER_LABELS = {
  LOYALTY_EARN_RATE: 'Loyalty — rupees spent per point',
  LOYALTY_REDEEM_RATE: 'Loyalty — rupee value of a point',
  LOYALTY_MAX_REDEEM_PERCENT: 'Loyalty — most of an order payable in points (%)',
  LOYALTY_POINTS_EXPIRY_DAYS: 'Loyalty — points expire after (days)',
  GOOGLE_ADS_CONVERSION_LABELS: 'Google Ads labels (JSON, advanced)',
  SHIPPING_PROVIDER: 'Shipping provider (always iThink)',
  ADS_PRODUCT_COST: 'Not used — product cost comes from each variant’s cost price (Products). Safe to remove.',
};

// The shared WhatsApp number's keys: set once on WhatsApp → Profile (they live
// on the shared WhatsApp brand). On any other store a saved copy overrides the
// shared number, so it is listed under "Other settings" with a warning.
// Which setting keys does the backend code actually read? Every upper-case
// string literal in the backend source (plus `PREFIX_${…}` templates), read
// once per process. A saved key that appears nowhere in the code is not used.
let _codeKeys = null;
function codeKeys() {
  if (_codeKeys) return _codeKeys;
  const fs = require('fs');
  const path = require('path');
  const root = path.join(__dirname, '..');
  const exact = new Set();
  const prefixes = [];
  const walk = (dir) => {
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return; }
    for (const e of entries) {
      if (['node_modules', 'tests', '__tests__', 'uploads', 'logs', 'tmp', '.git'].includes(e.name)) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (!e.name.endsWith('.js') || p === __filename) continue;
      let src = '';
      try { src = fs.readFileSync(p, 'utf8'); } catch (_) { continue; }
      for (const m of src.matchAll(/['"`]([A-Z][A-Z0-9_]{2,99})['"`]/g)) exact.add(m[1]);
      for (const m of src.matchAll(/`([A-Z][A-Z0-9_]*_)\$\{/g)) prefixes.push(m[1]);
    }
  };
  walk(root);
  _codeKeys = { exact, prefixes };
  return _codeKeys;
}
const readByCode = (key) => {
  const k = String(key).trim().toUpperCase();
  const { exact, prefixes } = codeKeys();
  return exact.has(k) || prefixes.some((p) => k.startsWith(p));
};

// Saved keys nothing reads any more: shown with a "not used" label and offered
// in one "Remove unused settings" step (the admin removes them on Save).
function unusedLabel(key, brandId) {
  if (/^FSHIP_/i.test(key)) return 'Old Fship setting — not used (orders ship with iThink). Safe to remove.';
  if (/^BUNDLE_TIER_IMAGE_/i.test(key)) return 'Old pack banner image — that feature was removed, nothing uses it. Safe to remove.';
  if (key === 'ADS_PRODUCT_COST') return 'Not used — product cost comes from each variant’s cost price (Products). Safe to remove.';
  if (key === 'SHIPPING_PROVIDER') return 'Not needed — orders always ship with iThink. Safe to remove.';
  if (key === 'WINBACK_COUPON_CODE') return 'Not used — the win-back coupon is set once for all stores on WhatsApp → Abandoned carts. Safe to remove.';
  if (key === 'STORE_NAME') return 'Not needed — messages use the Store name above. Safe to remove.';
  if (key === 'STORE_URL') return 'Not needed — messages use the Website address above. Safe to remove.';
  if (WA_KEY.test(key) && brandId !== SHARED_WA_BRAND_ID) return 'Old per-store WhatsApp key — not used: WhatsApp is the same for every store (WhatsApp → Profile). Safe to remove.';
  if (!readByCode(key)) return 'Not used anywhere in the system. Safe to remove.';
  return null;
}

const SHARED_WA_BRAND_ID = Number(process.env.WHATSAPP_SHARED_BRAND_ID) || 1;
const WA_KEY = /^WHATSAPP_(API_TOKEN|PHONE_NUMBER_ID|BUSINESS_ACCOUNT_ID|CATALOG_ID)$/i;

// Owned by other pages — never shown or touched here.
const OWNED_ELSEWHERE = (key, category) =>
  category === 'seo' || /^SEO_/i.test(key) || key === 'company_gstin' || key === 'PICKUP_SCHEDULE'
  || /cleanup_done|^dpdp_|_seed(_|$)|schema[_-]?version|_migrated|seo-init/i.test(key);

// Brand record fields edited in the Store tab (brands table, not brand_settings).
const BRAND_FIELDS = [
  { key: 'display_name', label: 'Store name', rule: 'required' },
  { key: 'name', label: 'Internal name', rule: 'required' },
  { key: 'domain', label: 'Website address', rule: 'host' },
  { key: 'contact_email', label: 'Support email', rule: 'email' },
  { key: 'contact_phone', label: 'Support phone', rule: 'phone' },
  { key: 'logo_url', label: 'Logo link', rule: 'url' },
  { key: 'primary_color', label: 'Main colour', rule: 'color' },
  { key: 'secondary_color', label: 'Second colour', rule: 'color' },
];

const isSecret = (key, row) => !!(FIELD_BY_KEY.get(key)?.secret || row?.is_encrypted || audit.isSecretKey(key));
const str = (v) => (v === null || v === undefined ? '' : String(v));

// ── Validation ───────────────────────────────────────────────────────────────
const RULES = {
  required: (v) => (v ? null : 'This can’t be empty.'),
  digits: (v) => (/^\d+$/.test(v) ? null : 'Numbers only.'),
  pincode: (v) => (/^[1-9]\d{5}$/.test(v) ? null : 'Enter a 6-digit PIN code.'),
  gstin: (v) => (/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v) ? null : 'A GSTIN is 15 characters, like 24ABCDE1234F1Z5.'),
  state: (v) => (VALID_INDIAN_STATES.has(v.toLowerCase()) ? null : 'Enter an Indian state name, e.g. Gujarat.'),
  list: (v) => (/^[a-z0-9 ,._-]*$/i.test(v) ? null : 'Use courier names separated by commas.'),
  razorpayKey: (v) => (/^rzp_(live|test)_[A-Za-z0-9]{6,}$/.test(v) ? null : 'Razorpay key IDs start with rzp_live_ or rzp_test_.'),
  ga: (v) => (/^G-[A-Z0-9]{4,}$/i.test(v) ? null : 'Google Analytics IDs look like G-XXXXXXX.'),
  gtm: (v) => (/^GTM-[A-Z0-9]{4,}$/i.test(v) ? null : 'Tag Manager IDs look like GTM-XXXXXX.'),
  aw: (v) => (/^AW-\d{6,}$/i.test(v) ? null : 'Google Ads IDs look like AW-123456789.'),
  code: (v) => (/^[A-Z0-9_-]{2,40}$/i.test(v) ? null : 'Letters and numbers only, no spaces.'),
  adAccount: (v) => (/^\d{5,20}$/.test(v) ? null : 'Ad account IDs are numbers, like 805062759008052 (act_ is optional).'),
  host: (v) => (/^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/.*)?$/i.test(v) ? null : 'Enter a website address like mystore.in.'),
  url: (v) => (/^https?:\/\/\S+$/i.test(v) ? null : 'Enter a full link starting with https://'),
  email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? null : 'Enter a valid email address.'),
  phone: (v) => (/^(\+?91)?[6-9]\d{9}$/.test(v.replace(/[\s()-]/g, '')) ? null : 'Enter a 10-digit Indian mobile number.'),
  color: (v) => (/^#[0-9a-f]{6}$/i.test(v) ? null : 'Use a colour like #1A2B3C.'),
};

function normalise(field, raw) {
  let v = str(raw).trim();
  if (field.rule === 'gstin' || field.rule === 'code') v = v.toUpperCase();
  if (field.rule === 'host' && v) v = v.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  if (field.rule === 'adAccount') v = v.replace(/^act_/i, '');
  if (field.type === 'toggle') v = ['true', '1', 'yes', 'on'].includes(v.toLowerCase()) ? 'true' : 'false';
  return v;
}

function validate(field, v) {
  if (v === '') return field.rule === 'required' ? RULES.required(v) : null;
  if (field.type === 'number') {
    const n = Number(v);
    if (!Number.isFinite(n)) return 'Enter a number.';
    if (field.min !== undefined && n < field.min) return `Must be ${field.min} or more.`;
    if (field.max !== undefined && n > field.max) return `Must be ${field.max} or less.`;
    return null;
  }
  if (field.type === 'select' && field.options && !field.options.some(([o]) => o === v)) return 'Pick one of the options.';
  return field.rule && RULES[field.rule] ? RULES[field.rule](v) : null;
}

// ── Reads ────────────────────────────────────────────────────────────────────
async function loadRows(brandIds) {
  const rows = await BrandSetting.findAll({ where: { brand_id: { [Op.in]: brandIds } } });
  const byBrand = new Map();
  for (const r of rows) {
    if (!byBrand.has(r.brand_id)) byBrand.set(r.brand_id, new Map());
    // The key column compares case-insensitively, so "clarity_id" IS the
    // CLARITY_ID row as far as the database is concerned (a second row can't
    // be created). File such rows under the field's key; an exact match wins.
    const m = byBrand.get(r.brand_id);
    const canon = String(r.key).trim().toUpperCase();
    const key = FIELD_BY_KEY.has(canon) ? canon : r.key;
    if (!m.has(key) || r.key === key) m.set(key, r);
  }
  return byBrand;
}

// Decrypted value (server side only) or ''.
const rowValue = (row) => (row ? str(row.value) : '');

// Effective value the backend would use: brand row → shared server value
// (unless brandOnly, or a credential that belongs to another brand — see
// settingsHelper.envFallbackAllowed).
const brandIdOf = (row, field) => (row ? row.brand_id : field._brandId);
function effective(field, row, brandId) {
  if (brandId !== undefined) field = { ...field, _brandId: brandId };
  const own = rowValue(row);
  if (own !== '') return { value: own, source: 'brand' };
  if (settingsHelper.envFallbackAllowed(brandIdOf(row, field), field.key, !!field.brandOnly) && process.env[field.key]) {
    return { value: str(process.env[field.key]), source: 'server' };
  }
  return { value: '', source: 'none' };
}

// What the browser may see for one value.
function publicValue(key, value, row) {
  return isSecret(key, row) ? audit.maskValue(value) : value;
}

// ── Warnings ─────────────────────────────────────────────────────────────────
const brandKey = (b) => str(b.name || b.display_name).toLowerCase().replace(/[^a-z]/g, '');
const PLACEHOLDER_HOST = /(^|\.)(example|test|localhost|local|invalid|yourdomain|domain)(\.|$)|^\d+\.\d+\.\d+\.\d+$/i;

function domainWarnings(brand) {
  const host = normalizeHost(brand.domain);
  if (!host) return [{ tab: 'store', field: 'domain', text: 'No website address — links in WhatsApp messages and product feeds can’t be made for this store.' }];
  if (PLACEHOLDER_HOST.test(host) || !host.includes('.')) {
    return [{ tab: 'store', field: 'domain', text: `“${host}” looks like a placeholder, not the live store.` }];
  }
  if (!OWN_HOSTS.has(host)) {
    const key = brandKey(brand);
    const live = key ? [...OWN_HOSTS].find((h) => !h.endsWith('vercel.app') && h.replace(/[^a-z]/g, '').startsWith(key)) : null;
    return [{ tab: 'store', field: 'domain', text: live
      ? `“${host}” isn’t the live store address — the live site is ${live}. Links built from this address may not open.`
      : `“${host}” isn’t one of the known live store addresses — check that it opens.` }];
  }
  return [];
}

// Win-back coupon problems come from the Coupons page's own check
// (couponAdminService.dependencies — missing / off / ended / used up / wrong
// store) so both pages always agree. One call covers every brand.
async function winBackWarnings() {
  try {
    const { dependencies } = require('./couponAdminService.js');
    const { warnings } = await dependencies();
    const byBrand = new Map();
    for (const w of warnings || []) {
      if (w.automation !== 'win_back' || !w.brandId) continue;
      if (!byBrand.has(w.brandId)) byBrand.set(w.brandId, []);
      byBrand.get(w.brandId).push({ tab: 'store', field: null, text: `${w.message} (create the coupon for this store in Growth → Coupons).` });
    }
    return byBrand;
  } catch (_) {
    return new Map(); // coupon check unavailable — never block the page
  }
}

// Cheap, no-network warnings for one brand.
async function brandWarnings(brand, rows, winBack = new Map(), globals = new Map()) {
  const get = (key) => (GENERAL_KEYS.has(key) && globals.get(key)) || effective(FIELD_BY_KEY.get(key) || { key }, rows.get(key), brand.id).value;
  const out = [...domainWarnings(brand)];
  if (!get('ITHINK_ACCESS_TOKEN') || !get('ITHINK_SECRET_KEY')) out.push({ tab: 'shipping', field: 'ITHINK_ACCESS_TOKEN', text: 'Courier account not connected — add the iThink keys in General · all stores.' });
  else if (!get('ITHINK_PICKUP_ADDRESS_ID')) out.push({ tab: 'shipping', field: 'ITHINK_PICKUP_ADDRESS_ID', text: 'No pickup warehouse ID — orders can’t be booked until it’s set.' });

  const gstin = get('GSTIN');
  if (!gstin) out.push({ tab: 'tax', field: 'GSTIN', text: 'GSTIN missing — invoices print without it.' });
  else if (RULES.gstin(gstin)) out.push({ tab: 'tax', field: 'GSTIN', text: 'GSTIN doesn’t look right — check it before invoices go out.' });
  if (get('GST_PERCENTAGE') === '') out.push({ tab: 'tax', field: 'GST_PERCENTAGE', text: 'No GST rate — invoices show no tax breakdown.' });

  if (!get('RAZORPAY_KEY_ID') || !get('RAZORPAY_KEY_SECRET')) out.push({ tab: 'payments', field: 'RAZORPAY_KEY_ID', text: 'No Razorpay keys — add them in General · all stores so shoppers can pay online.' });
  else if (/^rzp_test_/.test(get('RAZORPAY_KEY_ID'))) out.push({ tab: 'payments', field: 'RAZORPAY_KEY_ID', text: 'These are Razorpay test keys — real payments won’t go through.' });

  out.push(...(winBack.get(Number(brand.id)) || []));

  if (!get('FB_PIXEL_ID')) out.push({ tab: 'tracking', field: 'FB_PIXEL_ID', text: 'No Meta pixel of its own — purchases on this store aren’t reported to Meta.' });
  else if (!get('FB_ACCESS_TOKEN')) out.push({ tab: 'tracking', field: 'FB_ACCESS_TOKEN', text: 'Meta pixel is set but there’s no Conversions API token — add it in General · all stores.' });
  return out;
}

// Does the website actually open? (Store tab only — one request, short timeout, cached.)
const reachCache = new Map();
async function reachability(host) {
  if (!host) return null;
  const hit = reachCache.get(host);
  if (hit && Date.now() - hit.at < 10 * 60 * 1000) return hit.text;
  let text = null;
  try {
    const r = await axios.get(`https://${host}/`, { timeout: 5000, maxRedirects: 5, validateStatus: () => true, responseType: 'stream' });
    try { r.data?.destroy?.(); } catch (_) { /* ignore */ }
    if (r.status >= 500) text = `${host} answered with an error (${r.status}) when we tried to open it.`;
  } catch (e) {
    text = `${host} doesn’t open right now (${e.code === 'ENOTFOUND' ? 'address not found' : e.code === 'ECONNABORTED' ? 'took too long' : 'couldn’t connect'}). Links in WhatsApp messages break.`;
  }
  reachCache.set(host, { at: Date.now(), text });
  return text;
}

async function overview() {
  const brands = await Brand.findAll({ order: [['id', 'ASC']] });
  const rowsBy = await loadRows(brands.map((b) => b.id));
  const winBack = await winBackWarnings();
  const globals = await loadGlobals();
  const out = [];
  for (const b of brands) {
    const warnings = await brandWarnings(b, rowsBy.get(b.id) || new Map(), winBack, globals);
    out.push({
      id: b.id, name: b.name, display_name: b.display_name, slug: b.slug, domain: b.domain, status: b.status,
      logo_url: b.logo_url, warnings, health: warnings.length ? 'warn' : 'ok',
    });
  }
  return out;
}

async function form(brandId, { checkSite = true } = {}) {
  const brand = await Brand.findByPk(brandId);
  if (!brand) return null;
  const rows = (await loadRows([brand.id])).get(brand.id) || new Map();
  const globals = await loadGlobals();

  const fields = FIELDS.map((f) => {
    const row = rows.get(f.key);
    const eff = effective(f, row, brand.id);
    return {
      key: f.key, tab: f.tab, group: f.group || null, label: f.label, type: f.type, hint: f.hint || null,
      options: f.options || null, min: f.min, max: f.max, rule: f.rule || null, readOnly: !!f.readOnly,
      secret: !!f.secret, default: f.default ?? null, guide: f.guide || null,
      value: eff.source === 'none' ? '' : publicValue(f.key, eff.value, row),
      isSet: eff.value !== '', source: eff.source, updated_at: row ? row.updatedAt || row.updated_at : null,
    };
  });

  const other = [];
  for (const [key, row] of rows) {
    if (FIELD_BY_KEY.has(key) || OWNED_ELSEWHERE(key, row.category)) continue;
    if (WA_KEY.test(key) && brand.id === SHARED_WA_BRAND_ID) continue; // the shared number itself
    if (brand.id === settingsHelper.GLOBAL_BRAND_ID && key.startsWith(settingsHelper.GLOBAL_PREFIX)) continue; // General · all stores
    const secret = isSecret(key, row);
    const general = GENERAL_KEYS.has(String(key).toUpperCase());
    const unused = general
      ? (globals.get(String(key).toUpperCase()) ? 'Not used — the General · all stores value is used for every store. Safe to remove.' : null)
      : unusedLabel(key, brand.id);
    other.push({
      key, label: unused || (general ? 'Used for this store until General · all stores has a value — then this copy can be removed.' : null) || OTHER_LABELS[key] || null, unused: !!unused,
      value: secret ? audit.maskValue(rowValue(row)) : rowValue(row), secret, isSet: rowValue(row) !== '',
      category: row.category, description: row.description || null, updated_at: row.updatedAt || row.updated_at || null,
    });
  }
  other.sort((a, b) => a.key.localeCompare(b.key));

  const warnings = await brandWarnings(brand, rows, await winBackWarnings(), globals);
  if (checkSite && !warnings.some((w) => w.field === 'domain')) {
    const t = await reachability(normalizeHost(brand.domain));
    if (t) warnings.unshift({ tab: 'store', field: 'domain', text: t });
  }

  return {
    brand: {
      id: brand.id, name: brand.name, display_name: brand.display_name, slug: brand.slug, domain: brand.domain,
      contact_email: brand.contact_email, contact_phone: brand.contact_phone, logo_url: brand.logo_url,
      primary_color: brand.primary_color, secondary_color: brand.secondary_color, status: brand.status,
    },
    sections: SECTIONS,
    fields,
    other,
    warnings,
    health: warnings.length ? 'warn' : 'ok',
    audit: await audit.list({ brandId: brand.id, limit: 8 }).catch(() => []),
  };
}

// ── Writes ───────────────────────────────────────────────────────────────────
function canEncrypt() {
  try { encrypt('x'); return true; } catch (_) { return false; }
}

/**
 * Save one brand's settings.
 * body: { values: { KEY: value }, remove: [KEY], brand: { display_name, … } }
 * Secrets: send only a NEW value; a masked "••••" value is ignored.
 * Returns { errors } (field → message) or { saved: n }.
 */
async function save(brandId, body, userId) {
  const brand = await Brand.findByPk(brandId);
  if (!brand) { const e = new Error('Brand not found'); e.status = 404; throw e; }
  const values = body && typeof body.values === 'object' && body.values ? body.values : {};
  const remove = Array.isArray(body?.remove) ? body.remove.map(String) : [];
  const brandIn = body && typeof body.brand === 'object' && body.brand ? body.brand : null;
  const rows = (await loadRows([brand.id])).get(brand.id) || new Map();
  const errors = {};
  const writes = [];

  for (const [key, raw] of Object.entries(values)) {
    const row = rows.get(key);
    const field = FIELD_BY_KEY.get(key);
    if (field?.readOnly) continue;
    // A key with no form field: an existing "other" setting, or a new custom one.
    if (!field && (OWNED_ELSEWHERE(key, row?.category) || WA_KEY.test(key))) { errors[key] = WA_KEY.test(key) ? 'Set on WhatsApp → Profile (shared by all stores).' : 'This setting is edited on its own page.'; continue; }
    if (!field && !row && !/^[A-Z][A-Z0-9_]{1,99}$/.test(key)) { errors[key] = 'Use capital letters, numbers and _ for a new key.'; continue; }
    if (isSecret(key, row) && /^•+/.test(str(raw))) continue; // unchanged mask echoed back
    const v = field ? normalise(field, raw) : str(raw).trim();
    const err = field ? validate(field, v) : null;
    if (err) { errors[key] = err; continue; }
    if (rowValue(row) === v) continue;
    writes.push({ key, field, row, value: v });
  }
  for (const key of remove) {
    const row = rows.get(key);
    const field = FIELD_BY_KEY.get(key);
    if (!row || field?.readOnly || (!field && OWNED_ELSEWHERE(key, row.category))) continue;
    if (WA_KEY.test(key) && brand.id === SHARED_WA_BRAND_ID) continue;
    writes.push({ key, field, row, remove: true });
  }

  const brandChanges = {};
  if (brandIn) {
    for (const f of BRAND_FIELDS) {
      if (!(f.key in brandIn)) continue;
      let v = str(brandIn[f.key]).trim();
      if (f.rule === 'host') v = v.replace(/^https?:\/\//i, '').replace(/\/+$/, '').toLowerCase();
      const err = v === '' ? (f.rule === 'required' ? RULES.required(v) : null) : RULES[f.rule]?.(v);
      if (err) { errors[`brand.${f.key}`] = err; continue; }
      if (str(brand[f.key]) !== v) brandChanges[f.key] = v === '' ? null : v;
    }
  }

  if (Object.keys(errors).length) return { errors };

  const encOk = canEncrypt();
  const settingsService = require('./brandSettingsService.js');
  for (const w of writes) {
    const secret = isSecret(w.key, w.row);
    if (w.remove) {
      await settingsService.deleteBrandSetting(brand.id, w.row.key);
      await audit.record({ brandId: brand.id, key: w.key, action: 'delete', oldValue: rowValue(w.row), userId, secret });
      continue;
    }
    if (w.row) {
      await settingsService.updateSetting(brand.id, w.row.key, {
        value: w.value,
        is_encrypted: secret ? (w.row.is_encrypted || encOk) : w.row.is_encrypted,
        updated_by: userId,
      });
      // Saved under an old spelling (e.g. clarity_id): store it under the real key.
      if (w.row.key !== w.key) await BrandSetting.update({ key: w.key }, { where: { id: w.row.id } });
    } else {
      try {
        await settingsService.createSetting({
          brand_id: brand.id, key: w.key, value: w.value, category: w.field?.category || 'general',
          description: w.field?.label || null, is_encrypted: secret && encOk, updated_by: userId,
        });
      } catch (e) {
        if (e.name === 'SequelizeUniqueConstraintError') return { errors: { [w.key]: 'This setting is already saved under a slightly different name — reload the page and try again.' } };
        throw e;
      }
    }
    await audit.record({ brandId: brand.id, key: w.key, action: w.row ? 'update' : 'create', oldValue: rowValue(w.row), newValue: w.value, userId, secret });
  }

  if (Object.keys(brandChanges).length) {
    const brandService = require('./brandService.js');
    const before = brand.toJSON();
    try {
      // Always pass the slug: updateBrand re-derives it from a new name otherwise,
      // and the storefronts find their brand by slug (X-Brand-Name).
      await brandService.updateBrand(brand.id, { ...brandChanges, slug: brand.slug });
    } catch (e) {
      if (e.name === 'SequelizeUniqueConstraintError') return { errors: { 'brand.name': 'Another brand already uses this name or website address.' } };
      throw e;
    }
    await brandService.invalidateBrandCache?.();
    for (const [k, v] of Object.entries(brandChanges)) {
      await audit.record({ brandId: brand.id, area: 'brand', key: k, action: 'update', oldValue: before[k], newValue: v, userId, secret: false });
    }
    reachCache.delete(normalizeHost(before.domain));
  }
  settingsHelper.clearCache(brand.id);
  try { require('./shippingProviderFactory.js').clearCache?.(brand.id); } catch (_) { /* optional */ }
  return { saved: writes.length + Object.keys(brandChanges).length };
}

// ── Tests ────────────────────────────────────────────────────────────────────
// Razorpay: ask for one order with the saved keys. 200 = keys work, 401 = wrong.
async function testRazorpay(brandId) {
  const keyId = await settingsHelper.getSetting(brandId, 'RAZORPAY_KEY_ID');
  const secret = await settingsHelper.getSetting(brandId, 'RAZORPAY_KEY_SECRET');
  if (!keyId || !secret) return { ok: false, message: 'Save the key ID and key secret first.' };
  try {
    const r = await axios.get('https://api.razorpay.com/v1/orders', {
      params: { count: 1 }, auth: { username: keyId, password: secret }, timeout: 8000, validateStatus: () => true,
    });
    if (r.status === 200) return { ok: true, message: `Razorpay accepted the ${/^rzp_live_/.test(keyId) ? 'live' : 'test'} keys.` };
    if (r.status === 401) return { ok: false, message: 'Razorpay rejected these keys — the key ID and secret don’t match.' };
    return { ok: false, message: `Razorpay answered ${r.status} — try again in a minute.` };
  } catch (e) {
    return { ok: false, message: `Couldn’t reach Razorpay (${e.code || e.message}).` };
  }
}

// ── General · all stores ─────────────────────────────────────────────────────
// Decrypted shared values (key → value) from the ALL_<KEY> rows.
async function loadGlobals() {
  const map = new Map();
  try {
    const rows = await BrandSetting.findAll({ where: { brand_id: settingsHelper.GLOBAL_BRAND_ID, key: { [Op.in]: [...GENERAL_KEYS].map(ALL_KEY) } } });
    for (const r of rows) {
      const v = rowValue(r);
      if (v) map.set(String(r.key).slice(settingsHelper.GLOBAL_PREFIX.length), v);
    }
  } catch (_) { /* table issues → nothing shared yet */ }
  return map;
}

async function general() {
  const brands = await Brand.findAll({ order: [['id', 'ASC']] });
  const rowsBy = await loadRows(brands.map((b) => b.id));
  const sharedRows = (rowsBy.get(settingsHelper.GLOBAL_BRAND_ID)) || new Map();
  const nameOf = (b) => b.display_name || b.name;
  const fields = GENERAL_FIELDS.map((f) => {
    const row = sharedRows.get(ALL_KEY(f.key));
    const v = rowValue(row);
    // Stores that still carry their own copy (used until the shared one is set).
    const stores = brands.map((b) => {
      const own = (rowsBy.get(b.id) || new Map()).get(f.key);
      return own && rowValue(own) !== '' ? { brandId: b.id, name: nameOf(b), value: publicValue(f.key, rowValue(own), own) } : null;
    }).filter(Boolean);
    return {
      key: f.key, group: f.group || null, label: f.label, type: f.type, hint: f.hint || null, guide: f.guide || null,
      options: f.options || null, rule: f.rule || null, secret: !!f.secret, default: f.default ?? null,
      value: v ? publicValue(f.key, v, row) : '', isSet: v !== '', updated_at: row ? row.updatedAt || row.updated_at : null,
      envSet: !!process.env[f.key], stores,
    };
  });
  let winbackCoupon = 'CART10';
  try { winbackCoupon = await require('./cartRecoveryService.js').getWinbackCode(); } catch (_) { /* default */ }
  const waRows = sharedRows;
  const waSet = ['WHATSAPP_API_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_BUSINESS_ACCOUNT_ID'].filter((k) => rowValue(waRows.get(k)) !== '' || process.env[k]).length;
  return {
    fields,
    winbackCoupon,
    whatsapp: { connected: waSet === 3, keysSet: waSet },
    audit: await audit.list({ brandId: settingsHelper.GLOBAL_BRAND_ID, area: 'general', limit: 8 }).catch(() => []),
  };
}

// Save: { values: { KEY: value }, remove: [KEY], copyFrom: { KEY: brandId }, winbackCoupon }
async function saveGeneral(body, userId) {
  const values = body && typeof body.values === 'object' && body.values ? body.values : {};
  const remove = Array.isArray(body?.remove) ? body.remove.map(String) : [];
  const copyFrom = body && typeof body.copyFrom === 'object' && body.copyFrom ? body.copyFrom : {};
  const G = settingsHelper.GLOBAL_BRAND_ID;
  const brandIds = (await Brand.findAll({ attributes: ['id'] })).map((b) => b.id);
  const rowsBy = await loadRows(brandIds);
  const shared = rowsBy.get(G) || new Map();
  const errors = {};
  const writes = [];

  for (const [key, brandId] of Object.entries(copyFrom)) {
    const f = GENERAL_BY_KEY.get(key);
    const src = f && (rowsBy.get(Number(brandId)) || new Map()).get(key);
    if (!f || !src || rowValue(src) === '') { errors[key] = 'That store has no value to copy.'; continue; }
    writes.push({ f, value: rowValue(src), row: shared.get(ALL_KEY(key)) });
  }
  for (const [key, raw] of Object.entries(values)) {
    const f = GENERAL_BY_KEY.get(key);
    if (!f || key in copyFrom) continue;
    if (f.secret && /^•+/.test(str(raw))) continue; // unchanged mask echoed back
    const v = normalise(f, raw);
    const err = validate(f, v);
    if (err) { errors[key] = err; continue; }
    const row = shared.get(ALL_KEY(key));
    if (rowValue(row) === v) continue;
    if (v === '') { if (row) writes.push({ f, remove: true, row }); continue; }
    writes.push({ f, value: v, row });
  }
  for (const key of remove) {
    const row = shared.get(ALL_KEY(key));
    if (GENERAL_BY_KEY.has(key) && row) writes.push({ f: GENERAL_BY_KEY.get(key), remove: true, row });
  }
  let winback = null;
  if (body && body.winbackCoupon != null) {
    const code = str(body.winbackCoupon).trim().toUpperCase();
    if (code && RULES.code(code)) errors.winbackCoupon = RULES.code(code);
    else winback = code || 'CART10';
  }
  // A key ID and its secret must both be shared or both empty — otherwise a
  // store would pair the shared ID with its own (different) secret.
  const after = new Map([...GENERAL_KEYS].map((k) => [k, rowValue(shared.get(ALL_KEY(k))) !== '']));
  for (const w of writes) after.set(w.f.key, !w.remove);
  for (const [a, b] of GENERAL_PAIRS) {
    if (after.get(a) === after.get(b) || errors[a] || errors[b]) continue;
    const missing = after.get(a) ? b : a;
    const other = after.get(a) ? a : b;
    errors[missing] = `Set this too — “${GENERAL_BY_KEY.get(other).label}” is set for all stores, so this one must be as well (the two belong to one account).`;
  }
  if (Object.keys(errors).length) return { errors };

  const settingsService = require('./brandSettingsService.js');
  const encOk = canEncrypt();
  for (const w of writes) {
    const key = ALL_KEY(w.f.key);
    const secret = !!w.f.secret;
    if (w.remove) {
      await settingsService.deleteBrandSetting(G, w.row.key);
      await audit.record({ brandId: G, area: 'general', key: w.f.key, action: 'delete', oldValue: rowValue(w.row), userId, secret });
      continue;
    }
    if (w.row) {
      await settingsService.updateSetting(G, w.row.key, { value: w.value, is_encrypted: secret ? (w.row.is_encrypted || encOk) : w.row.is_encrypted, updated_by: userId });
    } else {
      await settingsService.createSetting({ brand_id: G, key, value: w.value, category: w.f.category || 'general', description: `${w.f.label} (all stores)`, is_encrypted: secret && encOk, updated_by: userId });
    }
    await audit.record({ brandId: G, area: 'general', key: w.f.key, action: w.row ? 'update' : 'create', oldValue: rowValue(w.row), newValue: w.value, userId, secret });
  }
  if (winback) {
    const before = await require('./cartRecoveryService.js').getWinbackCode().catch(() => 'CART10');
    if (before !== winback) {
      await require('./whatsappInsightsService.js').saveCartRules({ winbackCoupon: winback });
      await audit.record({ brandId: G, area: 'general', key: 'WINBACK_COUPON', action: 'update', oldValue: before, newValue: winback, userId, secret: false });
    }
  }
  // Every store reads these: drop all cached settings and provider instances.
  settingsHelper.clearCache();
  try { require('./shippingProviderFactory.js').clearCache(); } catch (_) { /* optional */ }
  try { require('./razorpayService.js').clearCache(); } catch (_) { /* optional */ }
  return { saved: writes.length + (winback ? 1 : 0) };
}

// Can this store's Meta token read its ad account (needed to pull ad spend)?
// Uses the Conversions API token already saved for the pixel; read-only call.
async function testMetaAds(brandId) {
  const account = String((await settingsHelper.getSetting(brandId, 'META_AD_ACCOUNT_ID', null, { brandOnly: true })) || '').replace(/^act_/i, '').trim();
  // A dedicated read-only ads token wins; otherwise try the Conversions API token.
  const adsToken = await settingsHelper.getSetting(brandId, 'META_ADS_TOKEN', null, { brandOnly: true });
  const token = adsToken || await settingsHelper.getSetting(brandId, 'FB_ACCESS_TOKEN');
  const which = adsToken ? 'Meta ads token' : 'Conversions API token';
  if (!account) return { ok: false, message: 'Save the Meta ad account ID first.' };
  if (!token) return { ok: false, message: 'Save the Meta ads token (or the Conversions API token) first.' };
  try {
    const r = await axios.get(`https://graph.facebook.com/v21.0/act_${account}`, {
      params: { fields: 'name,currency,account_status', access_token: token }, timeout: 10000, validateStatus: () => true,
    });
    if (r.status === 200 && r.data && r.data.id) {
      const ins = await axios.get(`https://graph.facebook.com/v21.0/act_${account}/insights`, {
        params: { date_preset: 'last_7d', fields: 'spend', access_token: token }, timeout: 10000, validateStatus: () => true,
      });
      if (ins.status === 200) {
        const spend = Number(ins.data?.data?.[0]?.spend || 0);
        return { ok: true, message: `The ${which} can read “${r.data.name}” (${r.data.currency}) — last 7 days spend ${spend.toLocaleString('en-IN')} ${r.data.currency}. Ad spend can be read with it.` };
      }
      return { ok: false, message: `The token can see “${r.data.name}” but not its spend: ${ins.data?.error?.message || `Meta answered ${ins.status}`}. Give the token’s system user “View performance” on this ad account.` };
    }
    const err = r.data?.error?.message || `Meta answered ${r.status}`;
    return { ok: false, message: `The ${which} can’t read ad account ${account}: ${err}. Fix: Business Settings → Users → System users → the user behind this token → Assign assets → Ad accounts → this account → View performance, then check again. If it still fails, generate a token with ads_read for that system user and paste it into “Meta ads token”.` };
  } catch (e) {
    return { ok: false, message: `Couldn’t reach Meta (${e.code || e.message}).` };
  }
}

module.exports = {
  SECTIONS, FIELDS, GENERAL_FIELDS, overview, form, save, general, saveGeneral, loadGlobals, testRazorpay, testMetaAds, isSecret, publicValue,
  // exported for the legacy controller's masking
  maskRow(row) {
    const plain = typeof row?.toJSON === 'function' ? row.toJSON() : { ...row };
    if (isSecret(plain.key, plain)) {
      plain.value = audit.maskValue(plain.value);
      plain.masked = true;
    }
    return plain;
  },
};
