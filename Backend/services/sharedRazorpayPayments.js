const razorpay = require('./razorpayService.js');
const { logger } = require('../config/logging.js');

const pendingDays = new Map();

function istPaymentDay(date, now = Math.floor(Date.now() / 1000)) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const utc = new Date(`${date}T00:00:00Z`);
  const from = Date.parse(`${date}T00:00:00+05:30`) / 1000;
  if (!Number.isFinite(from) || from <= 0 || from > now || utc.toISOString().slice(0, 10) !== date) return null;
  return { from, until: Math.min(now, from + 86399) };
}

function dateInIndia(value) {
  if (value == null) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? new Date(timestamp + 19800000).toISOString().slice(0, 10) : null;
}

async function paymentPage(instance, { from, offset, until }) {
  const count = 100;
  const result = await instance.payments.all({ from, to: until, count, skip: offset });
  if (!Array.isArray(result?.items)) throw new Error('Razorpay returned an invalid payments list.');
  return { items: result.items, nextOffset: result.items.length === count ? offset + count : null };
}

function paymentsOnDay(day) {
  if (pendingDays.has(day.from)) return pendingDays.get(day.from);
  const request = (async () => {
    const instance = await razorpay.getInstance();
    const seen = new Set();
    const payments = new Map();
    let offset = 0;
    while (offset != null) {
      const page = await paymentPage(instance, { ...day, offset });
      const count = seen.size;
      for (const payment of page.items) {
        if (!/^pay_[a-zA-Z0-9]{6,64}$/.test(payment?.id) || seen.has(payment.id)) continue;
        seen.add(payment.id);
        const at = Number(payment.created_at);
        if (at >= day.from && at <= day.until) payments.set(payment.id, payment);
      }
      if (page.nextOffset != null && seen.size === count) throw new Error('Razorpay repeated a page of payments.');
      offset = page.nextOffset;
    }
    return payments;
  })().finally(() => pendingDays.delete(day.from));
  pendingDays.set(day.from, request);
  return request;
}

async function getSharedPayment(id, { date, sourceAt } = {}) {
  let failure;
  try {
    const payment = await razorpay.getPayment(id);
    if (payment?.id === id) return payment;
  } catch (error) {
    failure = error;
    logger.warn(`[reconcile] Razorpay payment lookup failed for ${id}: ${error.message}`);
  }

  // Some captures are visible through the account list even when the
  // single-payment endpoint rejects the same ID. Only use fresh, exact hits.
  let day = istPaymentDay(dateInIndia(sourceAt)) || istPaymentDay(date);
  if (!day) {
    try {
      const { readRecoveries } = require('./prepaidRecoveryStore.js');
      const record = (await readRecoveries([id])).get(id);
      day = istPaymentDay(dateInIndia(record?.source_at));
    } catch (error) {
      logger.warn(`[reconcile] Recorded capture date unavailable for ${id}: ${error.message}`);
    }
  }
  day ||= istPaymentDay(dateInIndia(Date.now()));
  try {
    const payment = (await paymentsOnDay(day)).get(id);
    if (payment) return payment;
  } catch (error) {
    logger.warn(`[reconcile] Razorpay daily fallback failed for ${id}: ${error.message || error.statusCode}`);
    throw Object.assign(new Error('Razorpay could not verify this payment right now. Try again.'), { status: 502, retryable: true });
  }
  const status = failure?.providerStatus;
  if (status != null && ![400, 404].includes(status)) {
    throw Object.assign(new Error('Razorpay could not verify this payment right now. Try again.'), { status: 502, retryable: true });
  }
  throw Object.assign(new Error('This payment ID was not found on the selected Razorpay date. Check the ID and payment date.'), { status: 404, retryable: true });
}

module.exports = { istPaymentDay, paymentPage, paymentsOnDay, getSharedPayment };
