const axios = require('axios');
const { logger } = require('../config/logging.js');
const settingsHelper = require('./settingsHelper');

const ITHINK_STAGING_URL = 'https://pre-alpha.ithinklogistics.com';
const ITHINK_PRODUCTION_URL = 'https://my.ithinklogistics.com';
// iThink uses a separate production host for the V3 tracking endpoint
// (see https://docs.ithinklogistics.com/doc-track-order/3). Calling track.json
// on my.ithinklogistics.com returns an empty 200 — real data only lives here.
const ITHINK_TRACKING_PRODUCTION_URL = 'https://api.ithinklogistics.com';

/**
 * iThink Logistics Service
 * Handles all iThink API interactions for CrossCoin platform.
 * Mirrors the FShipService interface so both can be used interchangeably.
 */
class IThinkService {
  constructor(brandId = 1) {
    this.brandId = brandId;
    this.initialized = false;
  }

  // ── Initialization ──────────────────────────────────────────────────────

  async initialize() {
    if (this.initialized) return;
    if (this._initPromise) return this._initPromise;

    this._initPromise = (async () => {
      // Default to PRODUCTION: an unset value must never silently fall back to
      // pre-alpha staging (which returns empty data → every PIN reads as "not
      // serviceable"). Set ITHINK_ENVIRONMENT='staging' explicitly to test.
      const env = await settingsHelper.getSetting(this.brandId, 'ITHINK_ENVIRONMENT', 'production');
      this.accessToken = await settingsHelper.getSetting(this.brandId, 'ITHINK_ACCESS_TOKEN');
      this.secretKey = await settingsHelper.getSetting(this.brandId, 'ITHINK_SECRET_KEY');
      this.pickupAddressId = await settingsHelper.getSetting(this.brandId, 'ITHINK_PICKUP_ADDRESS_ID');
      this.returnAddressId = await settingsHelper.getSetting(this.brandId, 'ITHINK_RETURN_ADDRESS_ID', this.pickupAddressId);
      this.env = env;
      this.baseURL = env === 'production' ? ITHINK_PRODUCTION_URL : ITHINK_STAGING_URL;
      // Tracking lives on a separate prod host; staging uses the same host as everything else.
      this.trackingBaseURL = env === 'production' ? ITHINK_TRACKING_PRODUCTION_URL : ITHINK_STAGING_URL;

      logger.debug('iThink Configuration:', {
        brandId: this.brandId,
        environment: env,
        baseUrl: this.baseURL,
        accessToken: this.accessToken ? 'Present' : 'Missing',
        secretKey: this.secretKey ? 'Present' : 'Missing',
        pickupAddressId: this.pickupAddressId,
      });

      // Booking runs in the background queue now, so we no longer need a huge
      // window that pins a worker — 45s is plenty for iThink's order/add.json and
      // releases the connection far sooner (override with ITHINK_TIMEOUT_MS).
      const timeoutMs = Number(process.env.ITHINK_TIMEOUT_MS) || 45000;
      this.axiosInstance = axios.create({
        baseURL: this.baseURL,
        timeout: timeoutMs,
        headers: { 'Content-Type': 'application/json' },
      });

      this.initialized = true;
    })();

    try { await this._initPromise; } finally { this._initPromise = null; }
  }

  /** Auth payload fragment included in every request body */
  _authData() {
    return {
      access_token: this.accessToken,
      secret_key: this.secretKey,
    };
  }

  /** Redact PII before logging */
  _redactPII(data) {
    if (!data) return data;
    const str = JSON.stringify(data);
    return str.replace(/(\d{6,})/g, (m) => '****' + m.slice(-4));
  }

  /** Consistent error handler */
  handleApiError(error, operation) {
    console.error(`=== iThink ${operation} Error ===`);
    console.error('Status:', error.response?.status);
    console.error('Error Data:', this._redactPII(error.response?.data));
    console.error('Message:', error.message);

    if (error.response?.status === 401) {
      throw new Error('iThink authentication failed: Invalid credentials');
    }
    const errData = error.response?.data;
    const netCode = String(error.code || '');
    const isNetwork = /ECONNABORTED|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|ECONNREFUSED|EHOSTUNREACH|ENETUNREACH|CERT_|EPROTO/i.test(netCode)
      || (error.request && !error.response && /timeout/i.test(error.message || ''));
    let msg = 'Unknown error';
    if (errData) {
      msg = errData.message || errData.error || (typeof errData === 'string' ? errData : JSON.stringify(errData));
    } else if (isNetwork) {
      // A real transport failure: iThink was contacted but gave no usable reply.
      msg = /ECONNABORTED|timeout/i.test(netCode + ' ' + (error.message || ''))
        ? `No response from iThink within the timeout — request sent, iThink did not answer [${netCode || 'ECONNABORTED'}]`
        : `Network error contacting iThink [${netCode || 'no-code'}]`;
    } else {
      // NOT an HTTP response and NOT a recognised transport error → this was
      // thrown before/around the request (e.g. payload validation like an invalid
      // phone, missing courier, or a code bug). Surface the REAL message instead
      // of masking it as "Network error".
      msg = error.message || 'Unknown error';
    }
    throw new Error(`iThink ${operation} failed: ${msg}`);
  }

  // ── Order Creation ──────────────────────────────────────────────────────

  // ── Courier Discovery (for manual selection) ─────────────────────────────

  /**
   * Get available couriers for a route.
   * Admin calls this first, picks a courier, then passes it to createForwardOrder.
   *
   * @param {Object} params
   * @param {string} params.sourcePincode   - warehouse pincode
   * @param {string} params.destinationPincode - customer pincode
   * @param {number} params.weight          - weight in kg
   * @param {number} params.length          - cm
   * @param {number} params.width           - cm
   * @param {number} params.height          - cm
   * @param {string} params.paymentMode     - 'COD' or 'Prepaid'
   * @param {number} params.productMrp      - order value
   * @returns {Promise<Array>} Array of courier options with name, rate, ETA
   */
  async getAvailableCouriers(params) {
    await this.initialize();
    try {
      logger.debug('=== iThink Get Available Couriers ===');
      const payload = {
        data: {
          ...this._authData(),
          from_pincode: String(params.sourcePincode),
          to_pincode: String(params.destinationPincode),
          country_code: String(process.env.ITHINK_COUNTRY_CODE || 'IN'),
          shipping_length_cms: String(params.length || 14),
          shipping_width_cms: String(params.width || 3),
          shipping_height_cms: String(params.height || 10),
          shipping_weight_kg: String(params.weight || 0.07),
          order_type: 'forward',
          payment_method: params.paymentMode === 1 || String(params.paymentMode).toUpperCase() === 'COD' ? 'COD' : 'Prepaid',
          product_mrp: String(params.productMrp || 0),
        },
      };

      const response = await this.axiosInstance.post('/api_v3/rate/check.json', payload);
      const raw = response.data;

      // Normalise into a flat array of courier options. iThink's rate/check
      // response comes back in several shapes depending on account/route, and a
      // shape we didn't handle used to normalise to [] → a FALSE "not serviceable"
      // even when the pincode is deliverable. Handle them all:
      const looksCourier = (v) => v && typeof v === 'object' && !Array.isArray(v)
        && (('cod' in v) || ('prepaid' in v) || ('rate' in v) || ('mode' in v)
            || ('service_type' in v) || ('logistics_name' in v) || ('logistic_name' in v));
      const flattenObject = (obj) => {
        const rows = [];
        for (const [key, val] of Object.entries(obj)) {
          if (looksCourier(val)) rows.push({ logistics: key, ...val });
          else if (val && typeof val === 'object' && !Array.isArray(val)) {
            // One nested level (e.g. keyed by pincode → { <courier>: {...} }).
            for (const [k2, v2] of Object.entries(val)) {
              if (looksCourier(v2)) rows.push({ logistics: k2, ...v2 });
            }
          }
        }
        return rows;
      };

      let couriers = [];
      if (raw?.data && Array.isArray(raw.data)) {
        couriers = raw.data;
      } else if (raw?.data && typeof raw.data === 'object') {
        // { data: { delhivery:{cod,prepaid,rate,…}, bluedart:{…} } } — the shape
        // that previously slipped through and returned zero couriers.
        couriers = flattenObject(raw.data);
      } else if (raw?.courier_data && typeof raw.courier_data === 'object') {
        // iThink sometimes returns { courier_data: { delhivery: {...}, bluedart: {...} } }
        couriers = Object.entries(raw.courier_data).map(([key, val]) => ({
          logistics: key,
          ...val,
        }));
      } else if (Array.isArray(raw)) {
        couriers = raw;
      } else if (raw && typeof raw === 'object') {
        // Try an array-like structure first, then any keyed-object of couriers.
        const firstArrayKey = Object.keys(raw).find(k => Array.isArray(raw[k]));
        if (firstArrayKey) couriers = raw[firstArrayKey];
        else couriers = flattenObject(raw);
      }

      logger.debug(`Found ${couriers.length} courier options`);
      return couriers;
    } catch (error) {
      this.handleApiError(error, 'Get Available Couriers');
    }
  }

  /**
   * Create a forward order (domestic).
   * Accepts CrossCoin-normalised orderData and transforms it for iThink.
   *
   * For manual courier selection, pass:
   *   orderData.logistics  - courier name: 'delhivery', 'bluedart', 'xpressbees', 'ecom', 'ekart', 'fedex'
   *   orderData.s_type     - service type: 'air', 'surface', 'ground', 'standard', 'priority' (optional)
   */
  async createForwardOrder(orderData) {
    await this.initialize();
    try {
      logger.debug('=== iThink Create Forward Order ===');
      this.validateOrderData(orderData);

      const payload = this.formatOrderDataForIThink(orderData);
      // PII-safe payload preview for diagnosing iThink rejections.
      logger.debug('iThink order payload (preview):', JSON.stringify({
        logistics: payload.data?.logistics,
        s_type: payload.data?.s_type,
        shipment_count: payload.data?.shipments?.length,
        pickup_address_id: payload.data?.shipments?.[0]?.pickup_address_id,
        return_address_id: payload.data?.shipments?.[0]?.return_address_id,
        order: payload.data?.shipments?.[0]?.order,
        pin: payload.data?.shipments?.[0]?.pin,
        payment_mode: payload.data?.shipments?.[0]?.payment_mode,
        weight: payload.data?.shipments?.[0]?.weight,
        product_count: payload.data?.shipments?.[0]?.products?.length,
      }));
      logger.debug('iThink API Request URL:', `${this.baseURL}/api_v3/order/add.json`);
      logger.debug('iThink API Request Headers:', { 'Content-Type': 'application/json' });
      const response = await this.axiosInstance.post('/api_v3/order/add.json', payload);

      let responseData = response.data;

      // Handle case where axios doesn't auto-parse JSON (e.g., with chunked encoding)
      // Also handle the case where iThink API returns literal null string
      if (responseData === undefined || responseData === 'null' || (responseData === null && response.status === 200)) {
        console.warn('Response.data is null/undefined, attempting fallback parsing...');

        // Try multiple fallback approaches
        if (response.request?.response) {
          try {
            console.warn('Parsing from request.response...');
            const parsed = JSON.parse(response.request.response);
            responseData = parsed;
            console.warn('Successfully parsed from request.response');
          } catch (e) {
            console.warn('Failed to parse request.response:', e.message);
            // If parsing returns null, that's actually valid
            responseData = null;
          }
        }

        if (responseData === undefined && response.request?.responseText) {
          try {
            console.warn('Parsing from request.responseText...');
            const parsed = JSON.parse(response.request.responseText);
            responseData = parsed;
            console.warn('Successfully parsed from request.responseText');
          } catch (e) {
            console.warn('Failed to parse request.responseText:', e.message);
            responseData = null;
          }
        }
      }

      // If we still have no data but got a 200 response, try to get it from request
      if (responseData === undefined && response.status === 200) {
        const rawBody = response.request?.response || response.request?.responseText;
        if (rawBody) {
          try {
            responseData = JSON.parse(rawBody);
          } catch (e) {
            console.error('Failed to parse response body:', rawBody?.substring(0, 100));
            throw new Error(`iThink API returned status 200 but invalid JSON: ${rawBody?.substring(0, 100)}`);
          }
        }
      }

      // At this point, responseData can be null, which is valid if status is 200
      if (response.status !== 200) {
        throw new Error(`iThink API returned status ${response.status}`);
      }

      logger.debug('iThink order response:', JSON.stringify(responseData, null, 2));

      // Handle case where iThink returns null — this is NOT success
      if (responseData === null) {
        console.error('❌ iThink returned null response — order may not have been created');
        throw new Error('iThink API returned null response. Order may not have been accepted. Check iThink dashboard for details.');
      }

      // Stash the EXACT request we sent (auth redacted) + the raw iThink reply +
      // our field diagnostics, so a failed booking can be inspected without
      // server logs. iThink's "Some error occured" has no detail — the cause is
      // in the payload WE sent (usually an invalid/empty pickup_address_id).
      try {
        const d = payload?.data || {};
        const { access_token, secret_key, ...safeData } = d;
        this._lastBookingRaw = {
          at: new Date().toISOString(),
          order: orderData.orderId,
          url: `${this.baseURL}/api_v3/order/add.json`,
          resolved_pickup_address_id: payload?.data?.shipments?.[0]?.pickup_address_id || null,
          request: { ...safeData, access_token: access_token ? 'set' : 'MISSING', secret_key: secret_key ? 'set' : 'MISSING' },
          response: responseData,
          field_issues: this._diagnoseBookingPayload(payload),
        };
      } catch (_) { /* never let diagnostics break booking */ }

      // iThink's /order/add.json keys per-shipment results by the 1-based
      // shipment index (e.g. data: { "1": { status, remark, waybill, ... } }),
      // NOT by the order number. Other iThink endpoints key by order number,
      // and the international endpoint returns an array. Cover all three shapes.
      const orderKey = orderData.orderId;
      const dataRoot = responseData?.data;
      const result =
        // Per-order keyed (some iThink endpoints)
        (dataRoot && typeof dataRoot === 'object' && !Array.isArray(dataRoot) && dataRoot[orderKey]) ||
        // Per-shipment keyed by index — what /order/add.json actually returns
        (dataRoot && typeof dataRoot === 'object' && !Array.isArray(dataRoot) && dataRoot['1']) ||
        // Array form
        (Array.isArray(dataRoot) ? dataRoot[0] : null) ||
        // Fallback: first value of the data object (handles unknown key formats)
        (dataRoot && typeof dataRoot === 'object' && !Array.isArray(dataRoot)
          ? Object.values(dataRoot).find(v => v && typeof v === 'object')
          : null) ||
        {};

      const topStatus   = String(responseData?.status || '').toLowerCase();
      const orderStatus = String(result.status || '').toLowerCase();
      const waybill     = result.waybill || result.awb_number || result.AWB || null;

      // Real success requires either:
      //   - a waybill was issued, OR
      //   - the per-order status explicitly says success
      // Top-level status / status_code are NOT enough on their own because
      // iThink returns status_code 200 even when an individual order failed.
      const success = !!waybill || orderStatus === 'success';

      // When we couldn't confirm success, extract the most useful reason
      // iThink gave us. Different failure modes use different keys.
      let message = null;
      if (!success) {
        const remark = result.remark || result.message || result.error || result.reason
          || responseData?.message || responseData?.status_message || responseData?.remark
          || responseData?.error || (typeof dataRoot === 'string' ? dataRoot : null);

        if (remark && /not\s*serviceable/i.test(remark)) {
          // Clean, human message for the common "pincode not serviceable" case.
          const pin = (String(remark).match(/\b(\d{6})\b/) || [])[1]
            || (String(orderData.customer_PinCode || '').match(/\d{6}/) || [])[0] || '';
          message = pin
            ? `Delivery pincode ${pin} is not serviceable by any courier — please verify the customer's address.`
            : `Delivery pincode is not serviceable by any courier — please verify the customer's address.`;
        } else if (remark) {
          // iThink gave a reason — use it. Only add our field diagnostics when the
          // remark is vague/generic ("Some error occured"), so specific messages
          // stay clean.
          message = remark;
          if (/some error occured|unknown/i.test(remark)) {
            const issues = this._diagnoseBookingPayload(payload);
            if (issues.length) message += ` — likely cause: ${issues.join('; ')}`;
          }
        } else {
          // No remark at all — last resort diagnostic.
          const issues = this._diagnoseBookingPayload(payload);
          message = `iThink did not return a waybill (top status: ${topStatus || 'none'}).`
            + (issues.length ? ` Likely cause: ${issues.join('; ')}.` : ` Response: ${JSON.stringify(responseData).slice(0, 200)}`);
        }
        console.error('iThink create rejected — full response:', JSON.stringify(responseData, null, 2));
      }

      return {
        success,
        orderId: orderKey,
        waybill,
        routeCode: null,
        status: result.status || (success ? 'booked' : 'failed'),
        labelUrl: result.label_url || result.labelurl || null,
        courierName: result.courier_name || result.logistic || orderData.logistics || null,
        courierId: result.courier_id || null,
        message,
        response: responseData,
      };
    } catch (error) {
      console.error('=== iThink Create Order Exception ===');
      console.error('Error Type:', error.constructor.name);
      console.error('Error Message:', error.message);
      if (error.code === 'ECONNABORTED') {
        console.error('Request timeout — iThink API did not respond within 60 seconds');
      }
      if (error.response) {
        console.error('Response Status:', error.response.status);
        console.error('Response Data:', this._redactPII(error.response.data));
      }
      // Stash the request even when iThink didn't respond (network error /
      // timeout), so GET /api/ithink-last-booking still shows what we sent.
      try {
        const p = this.formatOrderDataForIThink(orderData);
        const { access_token, secret_key, ...safeData } = p?.data || {};
        this._lastBookingRaw = {
          at: new Date().toISOString(),
          order: orderData.orderId,
          url: `${this.baseURL}/api_v3/order/add.json`,
          resolved_pickup_address_id: p?.data?.shipments?.[0]?.pickup_address_id || null,
          request: { ...safeData, access_token: access_token ? 'set' : 'MISSING', secret_key: secret_key ? 'set' : 'MISSING' },
          response: null,
          error: `${error.code || ''} ${error.message || ''}`.trim(),
          field_issues: this._diagnoseBookingPayload(p),
        };
      } catch (_) { /* diagnostics must never mask the real error */ }
      this.handleApiError(error, 'Create Forward Order');
    }
  }

  /**
   * Create or update — mirrors FShipService interface.
   * iThink doesn't have a native "update" so we cancel + recreate if needed.
   */
  async createOrUpdateForwardOrder(orderData) {
    await this.initialize();
    try {
      logger.debug('=== iThink Create/Update Forward Order ===');
      return await this.createForwardOrder(orderData);
    } catch (error) {
      console.error('iThink createOrUpdateForwardOrder error:', error.message);
      throw error;
    }
  }

  // ── Validation ──────────────────────────────────────────────────────────

  validateOrderData(orderData) {
    const required = [
      'customer_Name', 'customer_Mobile', 'customer_Address',
      'customer_PinCode', 'customer_City', 'orderId',
      'payment_Mode', 'shipment_Weight',
      'shipment_Length', 'shipment_Width', 'shipment_Height',
      'products',
    ];
    for (const field of required) {
      if (!orderData[field]) throw new Error(`Missing required field: ${field}`);
    }
    if (!Array.isArray(orderData.products) || orderData.products.length === 0) {
      throw new Error('Products array is required and cannot be empty');
    }
  }

  // ── Payload Transformer ─────────────────────────────────────────────────

  /**
   * Transform CrossCoin normalised payload → iThink API format.
   * The incoming shape matches what orderService already builds for FShip.
   *
   * Manual courier selection fields:
   *   orderData.logistics - 'delhivery', 'bluedart', 'xpressbees', 'ecom', 'ekart', 'fedex'
   *   orderData.s_type    - 'air', 'surface', 'ground', 'standard', 'priority'
   */
  // Inspect the payload we sent to /api_v3/order/add.json and return a list of
  // empty/invalid REQUIRED fields — iThink rejects the whole order with a
  // generic "Some error occured" and never says which field, so we detect the
  // most common causes ourselves (empty pickup_address_id, missing address
  // parts, zero amounts, priceless products).
  _diagnoseBookingPayload(payload) {
    const issues = [];
    try {
      const s = payload?.data?.shipments?.[0] || {};
      const blank = (v) => v == null || String(v).trim() === '';
      if (blank(s.pickup_address_id)) issues.push('pickup_address_id is EMPTY (this brand has no valid ITHINK_PICKUP_ADDRESS_ID set)');
      if (blank(s.return_address_id)) issues.push('return_address_id is EMPTY');
      if (blank(s.name))  issues.push('customer name is empty');
      if (blank(s.add))   issues.push('address is empty');
      if (blank(s.city))  issues.push('city is empty');
      if (blank(s.state)) issues.push('state is empty');
      if (!/^\d{6}$/.test(String(s.pin || ''))) issues.push(`pincode "${s.pin}" is not a valid 6-digit PIN`);
      if (!/^\d{10}$/.test(String(s.phone || ''))) issues.push(`phone "${s.phone}" is not a valid 10-digit number`);
      if (!Number(s.total_amount)) issues.push('total_amount is 0');
      const prods = Array.isArray(s.products) ? s.products : [];
      if (!prods.length) issues.push('no products on the shipment');
      else if (prods.every((p) => !Number(p.product_price))) issues.push('all product prices are 0');
      if (String(s.payment_mode).toUpperCase() === 'COD' && !Number(s.cod_amount)) issues.push('COD order but cod_amount is 0');
      if (blank(payload?.data?.logistics)) issues.push('no courier (logistics) selected');
    } catch (_) { /* diagnostics must never throw */ }
    return issues;
  }

  formatOrderDataForIThink(orderData) {
    const totalQty = orderData.products.reduce((s, p) => s + (p.quantity || 1), 0);
    const weightKg = orderData.shipment_Weight || 0.10;

    const paymentMode = orderData.payment_Mode === 1 || String(orderData.payment_Mode).toLowerCase() === 'cod'
      ? 'COD' : 'Prepaid';

    const now = new Date();
    // iThink expects DD-MM-YYYY HH:MM:SS (the doc example is "29-09-2021 00:01:00").
    // A date-only value can be rejected with the generic "Some error occured".
    const pad = (n) => String(n).padStart(2, '0');
    const orderDate = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    // REQUIRE explicit courier selection - NO DEFAULT FALLBACK
    // User must manually select courier via /sync-with-courier endpoint
    const selectedLogistics = orderData.logistics || '';
    if (!selectedLogistics) {
      throw new Error('Courier selection (logistics) is REQUIRED for iThink orders. Please use the courier selection modal to choose a courier before syncing.');
    }
    const selectedServiceType = orderData.s_type || '';

    // Per iThink v3 docs (POST /api_v3/order/add.json) the warehouse fields
    // are `pickup_address_id` and `return_address_id` and they live INSIDE
    // each shipment object — not at the outer `data` level. The value is
    // the numeric ID of a pickup location registered in the iThink dashboard
    // (Settings → Pickup Locations).
    const pickupId = String(orderData.pick_Address_ID || this.pickupAddressId || '').trim();
    const returnId = String(orderData.return_Address_ID || this.returnAddressId || this.pickupAddressId || '').trim();

    logger.debug(`📍 iThink Order Format - Order: ${orderData.orderId}, Logistics: ${selectedLogistics}`);
    logger.debug(`   Warehouse Resolution: orderData.pick_Address_ID=${orderData.pick_Address_ID}, this.pickupAddressId=${this.pickupAddressId}, final=${pickupId}`);
    logger.debug(`   Final Warehouse IDs: Pickup: ${pickupId || '(EMPTY - will default to 117173)'}, Return: ${returnId || '(EMPTY - will default to 117173)'}`);

    // Per the iThink add-order doc, pickup_address_id / return_address_id live
    // INSIDE each shipment object (set below), not at the top-level data object.
    // Log the exact value sent per booking so a wrong warehouse is traceable.
    logger.info(`[iThink] Booking ${orderData.orderId} → pickup_address_id=${pickupId}, return_address_id=${returnId} (this.pickupAddressId=${this.pickupAddressId})`);
    return {
      data: {
        ...this._authData(),
        logistics: selectedLogistics,
        s_type: selectedServiceType || 'standard',
        order_type: '',
        shipments: [{
          waybill: '',
          order: String(orderData.orderId),
          sub_order: '',
          order_date: orderDate,
          // Round to a whole rupee — iThink rejects/mis-books decimal amounts
          // (e.g. a coupon leaving 449.10), which was blocking the shipment sync.
          total_amount: String(Math.round(Number(orderData.total_Amount || orderData.order_Amount || 0))),
          name: orderData.customer_Name,
          company_name: '',
          add: orderData.customer_Address,
          add2: orderData.landMark || '',
          add3: '',
          pin: String(orderData.customer_PinCode),
          city: orderData.customer_City,
          state: orderData.customer_State || '',
          country: 'India',
          phone: this.formatPhoneNumber(orderData.customer_Mobile),
          alt_phone: '',
          email: orderData.customer_Emailid || '',
          is_billing_same_as_shipping: 'yes',
          products: orderData.products.map(p => ({
            product_name: p.productName || 'Product',
            product_sku: p.sku || '',
            product_quantity: String(p.quantity || 1),
            product_price: String(p.unitPrice || 0),
            product_tax_rate: String(p.taxRate || ''),
            product_hsn_code: p.hsnCode || '',
            product_discount: String(p.productDiscount || 0),
            product_img_url: '',
          })),
          shipment_length: String(orderData.shipment_Length || 14),
          shipment_width: String(orderData.shipment_Width || 3),
          shipment_height: String(orderData.shipment_Height || 10),
          weight: String(weightKg.toFixed(2)),
          shipping_charges: '0',
          giftwrap_charges: '0',
          transaction_charges: '0',
          total_discount: '0',
          first_attemp_discount: '0',
          cod_charges: '0',
          advance_amount: '0',
          cod_amount: paymentMode === 'COD' ? String(Math.round(Number(orderData.total_Amount || orderData.order_Amount || 0))) : '0',
          payment_mode: paymentMode,
          reseller_name: '',
          eway_bill_number: '',
          gst_number: '',
          what3words: '',
          pickup_address_id: pickupId,
          return_address_id: returnId,
        }],
      },
    };
  }

  formatPhoneNumber(phone) {
    if (!phone) throw new Error('Phone number is required for shipping');
    const digits = phone.toString().replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) return digits.substring(2);
    if (digits.length === 11 && digits.startsWith('0')) return digits.substring(1);
    if (digits.length === 10) return digits;
    if (digits.length > 10) return digits.slice(-10);
    throw new Error(`Invalid phone number: ${phone}`);
  }

  // ── Tracking ────────────────────────────────────────────────────────────

  /**
   * Get tracking history for one or more AWBs.
   * Returns the full tracking response keyed by AWB number.
   */
  async getTrackingHistory(waybill) {
    await this.initialize();
    try {
      logger.debug('=== iThink Track Order ===');
      const awbList = Array.isArray(waybill) ? waybill.join(',') : waybill;

      const payload = {
        data: {
          ...this._authData(),
          awb_number_list: awbList,
        },
      };

      // Tracking endpoint lives on a different host than the rest of the API
      // in production — pass the full URL so axios ignores this.baseURL.
      const trackingUrl = `${this.trackingBaseURL}/api_v3/order/track.json`;
      const response = await this.axiosInstance.post(trackingUrl, payload);
      logger.debug(`Tracking fetched successfully from ${this.trackingBaseURL}`);
      return response.data;
    } catch (error) {
      this.handleApiError(error, 'Track Order');
    }
  }

  /**
   * Get current shipment status — convenience wrapper around tracking.
   */
  async getShipmentStatus(waybill) {
    const tracking = await this.getTrackingHistory(waybill);
    const awbData = tracking?.data?.[waybill];
    if (!awbData) return tracking;
    return {
      current_status: awbData.current_status,
      current_status_code: awbData.current_status_code,
      last_scan: awbData.last_scan_details,
      order_details: awbData.order_details,
      scan_details: awbData.scan_details,
    };
  }

  // ── Cancellation ────────────────────────────────────────────────────────

  /**
   * Cancel one or more orders by AWB number.
   * Max 100 AWBs per request.
   */
  async cancelOrder(waybill, _reason = 'Order cancelled') {
    await this.initialize();
    try {
      logger.debug('=== iThink Cancel Order ===');
      const awbStr = Array.isArray(waybill) ? waybill.join(',') : waybill;

      const payload = {
        data: {
          ...this._authData(),
          awb_numbers: awbStr,
        },
      };

      // Use the v3 cancel endpoint — orders are created via /api_v3/order/add.json,
      // so cancelling through the old /api/order/cancel.json silently failed to
      // match them and the shipment stayed active in iThink.
      const response = await this.axiosInstance.post('/api_v3/order/cancel.json', payload);
      // iThink returns HTTP 200 even when the cancel is rejected, so inspect the
      // body. Log the raw response so the exact shape is visible in production.
      logger.info(`iThink cancel response for AWB ${awbStr}: ` + JSON.stringify(response.data).slice(0, 400));
      const body = response.data || {};
      const status = String(body.status ?? '').toLowerCase();
      if (status && !/success|200/.test(status)) {
        throw new Error(body.message || body.status_message || body.remark || `iThink cancel rejected (status: ${body.status})`);
      }
      return response.data;
    } catch (error) {
      this.handleApiError(error, 'Cancel Order');
    }
  }

  // ── Rate Calculator ─────────────────────────────────────────────────────

  async calculateRates(rateData) {
    await this.initialize();
    try {
      logger.debug('=== iThink Calculate Rates ===');
      const payload = {
        data: {
          ...this._authData(),
          from_pincode: String(rateData.source_Pincode || rateData.from_pincode),
          to_pincode: String(rateData.destination_Pincode || rateData.to_pincode),
          shipping_length_cms: String(rateData.shipment_Length || rateData.shipping_length_cms || 14),
          shipping_width_cms: String(rateData.shipment_Width || rateData.shipping_width_cms || 3),
          shipping_height_cms: String(rateData.shipment_Height || rateData.shipping_height_cms || 10),
          shipping_weight_kg: String(rateData.shipment_Weight || rateData.shipping_weight_kg || 0.07),
          order_type: rateData.order_type || 'forward',
          payment_method: rateData.payment_Mode === 1 || rateData.payment_method === 'COD' ? 'COD' : 'Prepaid',
          product_mrp: String(rateData.amount || rateData.product_mrp || 0),
        },
      };

      const response = await this.axiosInstance.post('/api_v3/rate/check.json', payload);
      logger.debug('Rates calculated successfully');
      return response.data;
    } catch (error) {
      this.handleApiError(error, 'Calculate Rates');
    }
  }

  // ── Pincode Serviceability ──────────────────────────────────────────────

  async checkServiceability(sourcePincode, destinationPincode) {
    await this.initialize();
    try {
      logger.debug('=== iThink Pincode Check ===');
      // DOMESTIC serviceability: /api_v3/pincode/check.json takes a single
      // `pincode` (the customer's) and returns the full courier matrix
      // (Xpressbees/Delhivery/Ekart/… with cod/prepaid/pickup flags) keyed by
      // pincode → courier name. This is the endpoint iThink's own dashboard uses.
      // (pincode_intl/check.json is the INTERNATIONAL endpoint — it only returns
      // Aramex + Xplore — so we no longer use it here.)
      const payload = {
        data: {
          ...this._authData(),
          pincode: String(destinationPincode),
        },
      };

      const endpoint = '/api_v3/pincode/check.json';
      const response = await this.axiosInstance.post(endpoint, payload);
      logger.debug('Serviceability response:', JSON.stringify(response.data, null, 2));

      const raw = response.data;

      // The customer's city/state live under data[pincode] — surface them at the
      // top level so the display route can read them for the delivery estimate.
      let area = {};
      const dataObj = raw && raw.data;
      if (dataObj && typeof dataObj === 'object' && !Array.isArray(dataObj)) {
        const node = dataObj[String(destinationPincode)] || Object.values(dataObj)[0];
        if (node && typeof node === 'object') {
          area = { city_name: node.city_name, state_name: node.state_name };
        }
      }
      const { access_token, secret_key, ...safeReq } = payload.data;
      this._lastPincodeRaw = {
        url: `${this.baseURL}${endpoint}`,
        request: { ...safeReq, access_token: access_token ? 'set' : 'MISSING', secret_key: secret_key ? 'set' : 'MISSING' },
        response: { ...(raw && typeof raw === 'object' ? raw : {}), ...area },
      };

      // Return the raw response — extractIThinkCouriers()/parseServiceability()
      // both understand the pincode-keyed shape.
      return raw;
    } catch (error) {
      this.handleApiError(error, 'Pincode Check');
    }
  }

  /**
   * DIAGNOSTIC: fire every candidate DOMESTIC serviceability endpoint/shape with
   * the brand's real credentials and return each raw reply, so we can see which
   * one returns the full courier matrix (Xpressbees/Delhivery/Ekart/… with
   * prepaid/cod/pickup flags) that iThink's own dashboard shows. Credentials are
   * never included in the return value.
   */
  async debugServiceabilityEndpoints(sourcePincode, destinationPincode) {
    await this.initialize();
    const from = String(sourcePincode || '');
    const to = String(destinationPincode || '');
    const attempts = [
      { name: 'pincode_check__pincode_only', endpoint: '/api_v3/pincode/check.json', body: { pincode: to } },
      { name: 'pincode_check__from_to', endpoint: '/api_v3/pincode/check.json', body: { from_pincode: from, to_pincode: to } },
      { name: 'pincode_check__from_to_dims', endpoint: '/api_v3/pincode/check.json', body: {
        from_pincode: from, to_pincode: to, country_code: 'IN',
        shipping_length_cms: '10', shipping_width_cms: '10', shipping_height_cms: '5', shipping_weight_kg: '0.10',
      } },
      { name: 'rate_check__from_to_dims', endpoint: '/api_v3/rate/check.json', body: {
        from_pincode: from, to_pincode: to, country_code: 'IN',
        shipping_length_cms: '10', shipping_width_cms: '10', shipping_height_cms: '5', shipping_weight_kg: '0.10',
        order_type: 'forward', payment_method: 'COD', product_mrp: '500',
      } },
      { name: 'pincode_intl__from_to (current)', endpoint: '/api_v3/pincode_intl/check.json', body: {
        from_pincode: from, to_pincode: to, country_code: 'IN',
        shipping_length_cms: '10', shipping_width_cms: '10', shipping_height_cms: '5', shipping_weight_kg: '0.10',
      } },
    ];
    const out = {};
    for (const a of attempts) {
      try {
        const payload = { data: { ...this._authData(), ...a.body } };
        const r = await this.axiosInstance.post(a.endpoint, payload);
        const data = r.data;
        // Count couriers the extractor would find, so it's obvious at a glance.
        let courierCount = 0;
        try {
          const { extractIThinkCouriers } = require('../utils/serviceability.js');
          courierCount = extractIThinkCouriers(data).length;
        } catch (_) { /* ignore */ }
        out[a.name] = { endpoint: a.endpoint, request_fields: Object.keys(a.body), http_status: r.status, courier_count: courierCount, response: data };
      } catch (e) {
        out[a.name] = { endpoint: a.endpoint, request_fields: Object.keys(a.body), http_status: e.response?.status || null, error: e.message, response: e.response?.data ?? null };
      }
    }
    return out;
  }

  /**
   * DIAGNOSTIC: run the same Check Pincode request against BOTH the production
   * and pre-alpha (staging) hosts with the brand's current credentials, and
   * return each raw reply + HTTP status. Whichever host returns real data tells
   * us which environment the tokens actually belong to. Credentials are never
   * included in the return value.
   */
  async probePincode(destinationPincode) {
    await this.initialize();
    const payload = { data: { ...this._authData(), pincode: String(destinationPincode) } };
    const hosts = { production: ITHINK_PRODUCTION_URL, staging: ITHINK_STAGING_URL };
    const out = {};
    for (const [name, host] of Object.entries(hosts)) {
      try {
        const r = await axios.post(`${host}/api/pincode/check.json`, payload, {
          timeout: 15000,
          headers: { 'Content-Type': 'application/json', 'cache-control': 'no-cache' },
        });
        out[name] = { http_status: r.status, response: r.data };
      } catch (e) {
        out[name] = { http_status: e.response?.status || null, error: e.message, response: e.response?.data ?? null };
      }
    }
    return out;
  }

  // ── Shipping Label ──────────────────────────────────────────────────────

  async getShippingLabel(waybills) {
    await this.initialize();
    try {
      logger.debug('=== iThink Print Label ===');
      const awbStr = Array.isArray(waybills) ? waybills.join(',') : waybills;

      const payload = {
        data: {
          ...this._authData(),
          awb_numbers: awbStr,
        },
      };

      // iThink V3 label endpoint is /api_v3/shipping/label.json
      // (https://docs.ithinklogistics.com/doc-print-shipment/3). The earlier
      // /api_v3/order/label.json path is invalid and returns no file_name.
      const response = await this.axiosInstance.post('/api_v3/shipping/label.json', payload);
      logger.debug('Label fetched successfully');
      return response.data;
    } catch (error) {
      this.handleApiError(error, 'Print Label');
    }
  }

  /**
   * Generate label for one or more orders.
   * For iThink, label = PDF containing waybill and shipping info.
   * Returns same structure as FShip for consistency.
   */
  async getLabel({ waybills }) {
    await this.initialize();
    try {
      logger.debug('=== iThink Generate Label ===');
      if (!waybills || waybills.length === 0) {
        throw new Error('At least one waybill is required');
      }

      const awbStr = Array.isArray(waybills) ? waybills.join(',') : waybills;
      const payload = {
        data: {
          ...this._authData(),
          awb_numbers: awbStr,
        },
      };

      // Correct iThink V3 path is /api_v3/shipping/label.json. Response shape
      // per the docs: { status, status_code, file_name: "<pdf url>" }.
      const response = await this.axiosInstance.post('/api_v3/shipping/label.json', payload);
      logger.debug('Label generated successfully for iThink');

      // Extract PDF URL from response — try every shape we've seen iThink return.
      const root = response.data || {};
      const inner = root.data || {};
      const pdfUrl =
        root.file_name || root.label_url || root.labelurl || root.LabelUrl ||
        inner.file_name || inner.label_url || inner.labelurl || inner.LabelUrl ||
        null;

      if (!pdfUrl) {
        const topStatus = String(root.status || '').toLowerCase();
        const message =
          root.message || root.status_message || root.error ||
          inner.message || inner.error ||
          `iThink returned no label URL (status: ${topStatus || 'unknown'}). Response: ${JSON.stringify(root).slice(0, 300)}`;
        console.error('iThink label generation returned no pdf URL — full response:', JSON.stringify(root, null, 2));
        return {
          success: false,
          waybills: Array.isArray(waybills) ? waybills : [waybills],
          pdfUrl: null,
          error: message,
          message,
        };
      }

      return {
        success: true,
        labelId: `LABEL-ITHINK-${Date.now()}`,
        waybills: Array.isArray(waybills) ? waybills : [waybills],
        pdfUrl: pdfUrl,
        message: 'Label generated successfully'
      };
    } catch (error) {
      console.error('Failed to generate label:', error.message);
      return {
        success: false,
        error: error.message,
        message: `Failed to generate label: ${error.message}`
      };
    }
  }

  // ── Warehouse ───────────────────────────────────────────────────────────

  /**
   * Look up one pickup warehouse by ID using the iThink credentials.
   * Returns the warehouse record (company_name, address, status, etc.) when
   * the ID is recognised by the API for these credentials. Throws otherwise.
   *
   * Used by the Shipping Settings page diagnostic to confirm that the saved
   * Pickup Address ID is approved for the brand's Access Token / Secret Key.
   */
  async getWarehouse(warehouseId) {
    await this.initialize();
    if (!warehouseId) throw new Error('warehouse_id is required');
    const payload = {
      data: {
        warehouse_id: String(warehouseId).trim(),
        ...this._authData(),
      },
    };

    // iThink's warehouse endpoint isn't versioned the same way as order/*.
    // Try the v3-style path first, fall back to the v1 path on 404 so the
    // diagnostic works regardless of which is exposed for this account.
    const paths = ['/api_v3/warehouse/get.json', '/api/warehouse/get.json'];
    let lastErr = null;
    for (const path of paths) {
      try {
        logger.debug(`=== iThink Get Warehouse (${path}) ===`);
        const response = await this.axiosInstance.post(path, payload);
        return response.data;
      } catch (e) {
        lastErr = e;
        if (e.response?.status !== 404) break;
      }
    }
    this.handleApiError(lastErr, 'Get Warehouse');
  }

  async addWarehouse(warehouseData) {
    await this.initialize();
    try {
      logger.debug('=== iThink Add Warehouse ===');
      const payload = {
        data: {
          ...this._authData(),
          company_name: warehouseData.companyName || warehouseData.warehouseName,
          address1: warehouseData.addressLine1,
          address2: warehouseData.addressLine2 || '',
          mobile: this.formatPhoneNumber(warehouseData.phoneNumber),
          pincode: String(warehouseData.pincode),
          city_id: String(warehouseData.cityId || ''),
          state_id: String(warehouseData.stateId || ''),
          country_id: String(warehouseData.countryId || '101'),
          gps: warehouseData.gps || '',
        },
      };

      const response = await this.axiosInstance.post('/api_v3/warehouse/add.json', payload);
      logger.debug('Warehouse added:', response.data);
      return response.data;
    } catch (error) {
      this.handleApiError(error, 'Add Warehouse');
    }
  }

  // ── NDR (Non-Delivery Report) ───────────────────────────────────────────

  async ndrAction(awbNumber, action = 'reattempt') {
    await this.initialize();
    try {
      logger.debug('=== iThink NDR Action ===');
      const payload = {
        data: {
          ...this._authData(),
          awb_number: awbNumber,
          action: action, // 'reattempt' or 'rto'
        },
      };

      const response = await this.axiosInstance.post('/api_v3/ndr/action.json', payload);
      logger.debug('NDR action response:', response.data);
      return response.data;
    } catch (error) {
      this.handleApiError(error, 'NDR Action');
    }
  }

  // ── Status Mapping ──────────────────────────────────────────────────────

  /**
   * Map iThink status string → CrossCoin order status.
   * Interface-compatible with fshipService.mapFShipStatusToCrossCoin().
   */
  mapStatusToCrossCoin(iThinkStatus) {
    if (!iThinkStatus) return 'processing';
    const s = iThinkStatus.toLowerCase().trim();

    const mapping = {
      // iThink "Push Order Statuses" panel can emit these channel labels
      // (Ready to Ship → "Shipped"). Map them so a pushed status never
      // falls through to the "processing" default and moves an order backward.
      'shipped':                'shipped',
      'ready to ship':          'shipped',
      'manifested':             'manifested',
      'picked up':              'pickup initiated',
      'not picked':             'booked',
      'in transit':             'in transit',
      'in transit at origin':   'in transit',
      'reached at destination': 'in transit',
      'out for delivery':       'out for delivery',
      'delivered':              'delivered',
      'undelivered':            'undelivered',
      'rto initiated':          'rto',
      'rto in transit':         'rto',
      'rto delivered':          'rto delivered',
      'cancelled':              'cancelled',
      'order cancelled':        'order cancelled',
    };

    const mapped = mapping[s];
    if (mapped) {
      logger.debug(`📊 iThink status mapping: "${iThinkStatus}" → "${mapped}"`);
      return mapped;
    }

    logger.debug(`⚠️ Unknown iThink status: "${iThinkStatus}", defaulting to "processing"`);
    return 'processing';
  }

  // Alias so the provider factory can call the same method name as FShip
  mapFShipStatusToCrossCoin(status) {
    return this.mapStatusToCrossCoin(status);
  }

  // ── Dimensions (reuse CrossCoin standard) ───────────────────────────────

  calculateShipmentDimensions(items) {
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    return {
      shipment_Weight: totalQuantity * 0.07,
      shipment_Length: 14,
      shipment_Width: 3,
      shipment_Height: 10 * totalQuantity,
    };
  }

  // ── Health Check ────────────────────────────────────────────────────────

  async testConnection() {
    await this.initialize();
    try {
      logger.debug('=== iThink Test Connection ===');
      // Use rate check as a lightweight connectivity test
      const payload = {
        data: {
          ...this._authData(),
          from_pincode: '395006',
          to_pincode: '400001',
          shipping_length_cms: '10',
          shipping_width_cms: '10',
          shipping_height_cms: '5',
          shipping_weight_kg: '0.5',
          order_type: 'forward',
          payment_method: 'Prepaid',
          product_mrp: '500',
        },
      };
      const response = await this.axiosInstance.post('/api_v3/rate/check.json', payload);
      return {
        success: response.status === 200,
        message: 'iThink API connection successful',
        environment: this.baseURL,
      };
    } catch (error) {
      return {
        success: false,
        message: `iThink API connection failed: ${error.message}`,
        environment: this.baseURL,
      };
    }
  }

  // ── Register Pickup (no-op for iThink — handled automatically) ──────────

  async registerPickup(_waybills) {
    // iThink handles pickup scheduling automatically on order creation.
    // This is a no-op stub to keep interface parity with FShipService.
    logger.debug('iThink: Pickup is auto-scheduled on order creation — no separate call needed.');
    return { success: true, message: 'Pickup auto-scheduled by iThink' };
  }
}

module.exports = new IThinkService();
module.exports.IThinkService = IThinkService;
