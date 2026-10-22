/**
 * Shiprocket Checkout — refunds only.
 *
 * The storefront checkout, catalog sync (pull URLs + product/collection push)
 * and order webhook were removed. What is left refunds an order that was
 * already paid through Shiprocket Checkout (payments.payment_gateway =
 * 'CustomCheckout'); see refundService. It signs with the brand's saved
 * CUSTOM_CHECKOUT_API_KEY / CUSTOM_CHECKOUT_HMAC_SECRET (X-Api-Key +
 * base64 HMAC-SHA256 of the raw JSON body).
 */
const crypto = require('crypto');
const axios = require('axios');
const settingsHelper = require('./settingsHelper.js');

const REFUND_INITIATE_URL = 'https://checkout-api.shiprocket.com/api/v1/external/refund/initiate';

async function getConfig(brandId) {
  const [apiKey, secret] = await Promise.all([
    settingsHelper.getSetting(brandId, 'CUSTOM_CHECKOUT_API_KEY'),
    settingsHelper.getSetting(brandId, 'CUSTOM_CHECKOUT_HMAC_SECRET'),
  ]);
  if (!apiKey || !secret) return null;
  return { apiKey, secret };
}

async function signedPost(url, bodyObj, cfg, timeout = 15000) {
  const body = JSON.stringify(bodyObj);
  const hmac = crypto.createHmac('sha256', cfg.secret).update(body, 'utf8').digest('base64');
  return axios.post(url, body, {
    headers: { 'Content-Type': 'application/json', 'X-Api-Key': cfg.apiKey, 'X-Api-HMAC-SHA256': hmac },
    timeout,
  });
}

// Refund an order paid through Shiprocket Checkout (provider's own fields:
// transaction/cart ids, amount, refund type …); returns the raw response.
async function initiateRefund(brandId, payload = {}) {
  const cfg = await getConfig(brandId);
  if (!cfg) { const e = new Error('Shiprocket checkout keys are not saved for this store'); e.status = 400; throw e; }
  const res = await signedPost(REFUND_INITIATE_URL, payload, cfg, 20000);
  return res.data;
}

module.exports = { initiateRefund };
