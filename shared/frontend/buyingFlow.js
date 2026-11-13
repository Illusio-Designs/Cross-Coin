// One in-flight opening per storefront, and one confirmation per provider order.
// These guards deduplicate requests; they do not decide whether payment succeeded.
const openings = new Map();
const confirmations = new Map();

export function runCheckoutOpening(brand, start) {
  if (openings.has(brand)) return openings.get(brand);
  const task = Promise.resolve().then(start).finally(() => openings.delete(brand));
  openings.set(brand, task);
  return task;
}

export function confirmVerifiedOrder(brand, providerId, request) {
  const id = String(providerId || '').trim();
  if (!id) return Promise.reject(new Error('Order reference is required'));
  const key = `${brand}:${id}`;
  if (confirmations.has(key)) return confirmations.get(key);
  const task = Promise.resolve().then(request).then((order) => {
    if (!order?.ok || !String(order.order_number || '').trim() || order.order_number === '—' ||
        order.value == null || String(order.value).trim() === '' ||
        !Number.isFinite(Number(order.value)) || Number(order.value) < 0 ||
        !Array.isArray(order.items) || !order.items.length ||
        order.items.some((item) => item?.id == null || !Number.isSafeInteger(Number(item.quantity)) || Number(item.quantity) <= 0)) {
      const error = new Error('Order confirmation is still pending');
      error.code = 'CHECKOUT_CONFIRMATION_PENDING';
      throw error;
    }
    return order;
  }).finally(() => confirmations.delete(key));
  confirmations.set(key, task);
  return task;
}

export function normalizeCheckoutLines(lines) {
  if (!Array.isArray(lines) || !lines.length) throw new Error('Choose an available product option');
  const quantities = new Map();
  for (const line of lines) {
    const id = String(line?.variationId ?? '');
    const quantity = Number(line?.quantity ?? 1);
    if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) <= 0 || !Number.isSafeInteger(quantity) || quantity <= 0) {
      throw new Error('Some product options or quantities are invalid');
    }
    const total = (quantities.get(id) || 0) + quantity;
    if (!Number.isSafeInteger(total)) throw new Error('Quantity is too large');
    quantities.set(id, total);
  }
  return [...quantities].map(([variationId, quantity]) => ({ variationId, quantity }));
}

export async function readCheckoutTokenResponse(response) {
  const data = await response.json().catch(() => ({}));
  const token = data?.result?.token || data?.token;
  if (!response.ok || data?.success !== true || typeof token !== 'string' || !token.trim()) {
    throw new Error(data?.message || 'Checkout could not be started');
  }
  return data;
}

export function cleanCheckoutFallbackUrl(href) {
  const url = new URL(href);
  for (const name of [...url.searchParams.keys()]) {
    if (/^attributes\[fastrr_redirect(?:_uuid|_time)?\]$/.test(name)) url.searchParams.delete(name);
  }
  return url.href;
}

// Native COD retries must reuse the key after a lost response. Do not discard
// it until the verified order has been handed to the confirmation screen.
const nativeOrders = new Map();
const nativeAttemptKeys = new Map();
const nativeStorageKeys = new Map();
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  return value;
}
export function runNativeOrder(brand, body, send) {
  const selection = {};
  for (const name of ['items', 'shipping_address_id', 'shipping_address', 'guest_info', 'payment_type', 'coupon_id', 'discount_amount', 'notes']) selection[name] = body[name];
  const fingerprint = JSON.stringify(canonical(selection));
  const key = `${brand}:${fingerprint}`;
  if (nativeOrders.has(key)) return nativeOrders.get(key);
  const task = Promise.resolve().then(async () => {
    let storageKey;
    try {
      const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(fingerprint));
      storageKey = `${brand}:native-order:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
    } catch (_) { /* memory-only retry protection if Web Crypto is unavailable */ }
    let attemptKey = nativeAttemptKeys.get(key) || body.idempotency_key;
    if (storageKey) {
      try { attemptKey = sessionStorage.getItem(storageKey) || attemptKey; } catch (_) { /* optional storage */ }
      if (!nativeStorageKeys.has(brand)) nativeStorageKeys.set(brand, new Set());
      nativeStorageKeys.get(brand).add(storageKey);
    }
    if (!attemptKey) {
      try { attemptKey = crypto.randomUUID(); } catch (_) { attemptKey = `order-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
    }
    if (storageKey) { try { sessionStorage.setItem(storageKey, attemptKey); } catch (_) { /* optional storage */ } }
    nativeAttemptKeys.set(key, attemptKey);
    body.idempotency_key = attemptKey;
    return send();
  }).catch((error) => { nativeOrders.delete(key); throw error; });
  nativeOrders.set(key, task);
  return task;
}

export function resetNativeOrderAttempts(brand) {
  for (const key of nativeAttemptKeys.keys()) if (key.startsWith(`${brand}:`)) nativeAttemptKeys.delete(key);
  for (const key of nativeOrders.keys()) if (key.startsWith(`${brand}:`)) nativeOrders.delete(key);
  for (const key of nativeStorageKeys.get(brand) || []) { try { sessionStorage.removeItem(key); } catch (_) { /* optional storage */ } }
  nativeStorageKeys.delete(brand);
}
