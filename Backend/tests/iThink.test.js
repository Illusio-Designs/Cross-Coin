#!/usr/bin/env node
/**
 * Standalone iThink API tester.
 *
 * Doesn't boot the full app — talks directly to iThink with axios using
 * credentials from process.env, so you can run it independently of the
 * database / brand_settings stack to diagnose:
 *   - whether the Access Token & Secret Key are valid
 *   - whether the configured Pickup Address ID is recognised
 *   - whether a delivery pincode is serviceable
 *   - which couriers iThink offers for a given route
 *   - (optional) whether a real test order can be created
 *
 * Env vars consumed:
 *   ITHINK_ACCESS_TOKEN          required
 *   ITHINK_SECRET_KEY            required
 *   ITHINK_ENVIRONMENT           "production" | "staging" (default: staging)
 *   ITHINK_PICKUP_ADDRESS_ID     pickup warehouse id to verify (required for warehouse + order tests)
 *   ITHINK_RETURN_ADDRESS_ID     defaults to pickup
 *   ITHINK_WAREHOUSE_PINCODE     default 395006
 *   ITHINK_DEFAULT_LOGISTICS     courier to use for rate/create tests (leave blank for auto)
 *   TEST_DESTINATION_PINCODE     pincode used for serviceability + rate tests (default: 110001)
 *   TEST_CREATE_ORDER            "true" to actually POST /order/add.json (creates a real shipment!)
 */

const axios = require('axios');

const STAGING_URL    = 'https://pre-alpha.ithinklogistics.com';
const PRODUCTION_URL = 'https://my.ithinklogistics.com';

const env = {
  accessToken:  process.env.ITHINK_ACCESS_TOKEN || '',
  secretKey:    process.env.ITHINK_SECRET_KEY   || '',
  environment:  (process.env.ITHINK_ENVIRONMENT || 'staging').toLowerCase(),
  pickupId:     (process.env.ITHINK_PICKUP_ADDRESS_ID || '').trim(),
  returnId:     (process.env.ITHINK_RETURN_ADDRESS_ID || process.env.ITHINK_PICKUP_ADDRESS_ID || '').trim(),
  warehousePin: (process.env.ITHINK_WAREHOUSE_PINCODE || '395006').trim(),
  logistics:    (process.env.ITHINK_DEFAULT_LOGISTICS || '').trim(),
  destPincode:  (process.env.TEST_DESTINATION_PINCODE || '110001').trim(),
  createOrder:  String(process.env.TEST_CREATE_ORDER || '').toLowerCase() === 'true',
};

const baseURL = env.environment === 'production' ? PRODUCTION_URL : STAGING_URL;
const http = axios.create({
  baseURL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

const authData = () => ({ access_token: env.accessToken, secret_key: env.secretKey });

// ── Output helpers ────────────────────────────────────────────────────────
const c = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  red:    '\x1b[31m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  blue:   '\x1b[34m',
  cyan:   '\x1b[36m',
};
const isTTY = process.stdout.isTTY;
const paint = (col, s) => (isTTY ? `${col}${s}${c.reset}` : s);
const pass  = (msg) => console.log(`${paint(c.green, '  ✓')} ${msg}`);
const fail  = (msg) => console.log(`${paint(c.red,   '  ✗')} ${msg}`);
const warn  = (msg) => console.log(`${paint(c.yellow,'  ⚠')} ${msg}`);
const info  = (msg) => console.log(`${paint(c.dim,   '  ·')} ${msg}`);
const head  = (msg) => console.log(`\n${paint(c.bold + c.cyan, msg)}`);

function preview(obj, max = 600) {
  const json = JSON.stringify(obj, null, 2);
  if (json.length <= max) return json;
  return json.slice(0, max) + `\n  …(${json.length - max} more chars)`;
}

let totalPass = 0;
let totalFail = 0;
let totalSkip = 0;

async function step(name, fn) {
  head(name);
  try {
    const result = await fn();
    if (result === 'skip') {
      totalSkip++;
    } else {
      totalPass++;
    }
  } catch (err) {
    totalFail++;
    fail(err.message);
    if (err.response?.data) {
      info('Response body:');
      console.log(paint(c.dim, '  ' + preview(err.response.data).replace(/\n/g, '\n  ')));
    }
  }
}

// ── Pre-flight ────────────────────────────────────────────────────────────
function preflight() {
  head('Pre-flight');
  let ok = true;
  if (!env.accessToken) { fail('ITHINK_ACCESS_TOKEN is not set'); ok = false; }
  else                   pass(`Access token: ${env.accessToken.slice(0, 6)}…${env.accessToken.slice(-4)}`);
  if (!env.secretKey)   { fail('ITHINK_SECRET_KEY is not set');   ok = false; }
  else                   pass(`Secret key:   ${env.secretKey.slice(0, 6)}…${env.secretKey.slice(-4)}`);
  pass(`Environment:  ${env.environment} (${baseURL})`);
  if (env.pickupId)      pass(`Pickup ID:    ${env.pickupId}`);
  else                   warn('ITHINK_PICKUP_ADDRESS_ID not set — warehouse + order tests will be skipped');
  if (env.logistics)     pass(`Logistics:    ${env.logistics}`);
  else                   info('Logistics: (auto, iThink picks)');
  pass(`Warehouse pin: ${env.warehousePin} → destination pin: ${env.destPincode}`);
  return ok;
}

// ── Tests ─────────────────────────────────────────────────────────────────
async function testWarehouseLookup() {
  if (!env.pickupId) {
    info('Skipped — set ITHINK_PICKUP_ADDRESS_ID to run this test');
    return 'skip';
  }
  const payload = { data: { warehouse_id: env.pickupId, ...authData() } };

  // Try both API versions — different accounts expose different paths.
  const paths = ['/api_v3/warehouse/get.json', '/api/warehouse/get.json'];
  let lastErr;
  for (const path of paths) {
    try {
      info(`POST ${path}`);
      const { data } = await http.post(path, payload);
      const wh = data?.data || data || {};
      const status = String(wh.status || data?.status || '').toLowerCase();

      if (status === 'error' || data?.status === 'error') {
        fail(`iThink: ${wh.remark || wh.message || data?.message || 'rejected'}`);
        info(preview(data));
        throw new Error('Warehouse lookup rejected by iThink');
      }

      const approval = String(wh.status || '').toLowerCase();
      pass(`Resolved warehouse ID ${env.pickupId}`);
      pass(`  Name:    ${wh.company_name || wh.name || '—'}`);
      pass(`  Pincode: ${wh.pincode || wh.pin || '—'}`);
      pass(`  Status:  ${approval || '—'}`);
      if (approval && approval !== 'approved' && approval !== 'active') {
        warn(`Warehouse status is "${approval}" — iThink may reject orders until it's approved`);
      }
      return;
    } catch (e) {
      lastErr = e;
      if (e.response?.status !== 404) break;
      info(`  404 on ${path} — trying next path`);
    }
  }
  throw lastErr;
}

async function testServiceability() {
  const payload = {
    data: {
      ...authData(),
      origin_pincode: String(env.warehousePin),
      destination_pincode: String(env.destPincode),
    },
  };
  info(`POST /api_v3/pincode/check.json  ${env.warehousePin} → ${env.destPincode}`);
  const { data } = await http.post('/api_v3/pincode/check.json', payload);
  const status = String(data?.status || '').toLowerCase();
  if (status && status !== 'success') {
    fail(`iThink: ${data?.message || data?.html_message || 'serviceability check failed'}`);
    info(preview(data));
    throw new Error('Serviceability rejected');
  }
  pass(`Serviceable: ${env.warehousePin} → ${env.destPincode}`);
  info(preview(data, 300));
}

async function testRateCheck() {
  const payload = {
    data: {
      ...authData(),
      shipments: {
        origin_pincode: String(env.warehousePin),
        destination_pincode: String(env.destPincode),
        shipping_weight_kg: '0.5',
        order_type: 'forward',
        payment_method: 'Prepaid',
        product_mrp: '500',
      },
    },
  };
  info('POST /api_v3/rate/check.json');
  const { data } = await http.post('/api_v3/rate/check.json', payload);
  let couriers = [];
  if (Array.isArray(data?.data)) couriers = data.data;
  else if (data?.courier_data && typeof data.courier_data === 'object') {
    couriers = Object.entries(data.courier_data).map(([k, v]) => ({ logistics: k, ...v }));
  }
  if (couriers.length === 0) {
    warn('Rate check returned no couriers');
    info(preview(data));
    return;
  }
  pass(`Couriers available: ${couriers.length}`);
  couriers.slice(0, 8).forEach(c => {
    const name = c.logistics || c.logistic || c.courier_name || c.courierName || '?';
    const rate = c.rate || c.total_charges || c.total_amount || c.shipping_charges || '';
    info(`  ${name}${rate ? ` — ₹${rate}` : ''}`);
  });
}

async function testCreateOrder() {
  if (!env.createOrder) {
    info('Skipped — set TEST_CREATE_ORDER=true to send a real order (creates a shipment!)');
    return 'skip';
  }
  if (!env.pickupId) {
    info('Skipped — ITHINK_PICKUP_ADDRESS_ID is required');
    return 'skip';
  }

  const orderRef = `TEST-${Date.now()}`;
  const today = new Date();
  const orderDate = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;

  const payload = {
    data: {
      ...authData(),
      logistics: env.logistics || '',
      s_type: '',
      order_type: '',
      shipments: [{
        waybill: '',
        order: orderRef,
        sub_order: '',
        order_date: orderDate,
        total_amount: '500',
        name: 'Test Customer',
        company_name: '',
        add: '123 Test Street',
        add2: '', add3: '',
        pin: env.destPincode,
        city: 'New Delhi',
        state: 'Delhi',
        country: 'India',
        phone: '9999999999',
        alt_phone: '',
        email: 'test@example.com',
        is_billing_same_as_shipping: 'yes',
        products: [{
          product_name: 'iThink Test Product',
          product_sku: 'TEST-SKU-001',
          product_quantity: '1',
          product_price: '500',
          product_tax_rate: '',
          product_hsn_code: '',
          product_discount: '0',
          product_img_url: '',
        }],
        shipment_length: '14',
        shipment_width: '3',
        shipment_height: '10',
        weight: '500',
        shipping_charges: '0',
        giftwrap_charges: '0',
        transaction_charges: '0',
        total_discount: '0',
        first_attemp_discount: '0',
        cod_amount: '0',
        payment_mode: 'Prepaid',
        reseller_name: '',
        eway_bill_number: '',
        gst_number: '',
        what3words: '',
        pickup_address_id: env.pickupId,
        return_address_id: env.returnId || env.pickupId,
      }],
    },
  };

  info(`POST /api_v3/order/add.json  (ref: ${orderRef}, pickup_id: ${env.pickupId})`);
  const { data } = await http.post('/api_v3/order/add.json', payload);

  const dataRoot = data?.data;
  const result =
    (dataRoot && typeof dataRoot === 'object' && !Array.isArray(dataRoot) && dataRoot['1']) ||
    (dataRoot && typeof dataRoot === 'object' && !Array.isArray(dataRoot) && dataRoot[orderRef]) ||
    (Array.isArray(dataRoot) ? dataRoot[0] : null) ||
    (dataRoot && typeof dataRoot === 'object' && !Array.isArray(dataRoot)
      ? Object.values(dataRoot).find(v => v && typeof v === 'object')
      : null) ||
    {};

  const waybill = result.waybill || result.awb_number || null;
  const status = String(result.status || '').toLowerCase();
  if (waybill || status === 'success') {
    pass(`Order created — AWB: ${waybill || '(no waybill yet)'} via ${result.logistic_name || env.logistics || 'auto'}`);
  } else {
    fail(`iThink: ${result.remark || result.message || 'no waybill returned'}`);
    info(preview(data));
    throw new Error(result.remark || 'iThink rejected the test order');
  }
}

// ── Driver ────────────────────────────────────────────────────────────────
(async () => {
  const ok = preflight();
  if (!ok) {
    console.log(paint(c.red, '\nMissing required env vars — aborting.'));
    process.exit(1);
  }

  await step('1. Verify pickup warehouse',  testWarehouseLookup);
  await step('2. Pincode serviceability',   testServiceability);
  await step('3. Rate check (couriers)',    testRateCheck);
  await step('4. Create test order',        testCreateOrder);

  console.log();
  console.log(paint(c.bold, '──────────────────────────────────────────────'));
  const summary = `Summary: ${paint(c.green, totalPass + ' passed')} · ${paint(c.red, totalFail + ' failed')} · ${paint(c.dim, totalSkip + ' skipped')}`;
  console.log(summary);
  process.exit(totalFail > 0 ? 1 : 0);
})().catch(err => {
  console.error(paint(c.red, '\nFatal error:'), err.message);
  process.exit(2);
});
