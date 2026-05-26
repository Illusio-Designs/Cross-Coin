const axios = require('axios');
const settingsHelper = require('./settingsHelper');

const ITHINK_STAGING_URL = 'https://pre-alpha.ithinklogistics.com';
const ITHINK_PRODUCTION_URL = 'https://my.ithinklogistics.com';

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
      const env = await settingsHelper.getSetting(this.brandId, 'ITHINK_ENVIRONMENT', 'staging');
      this.accessToken = await settingsHelper.getSetting(this.brandId, 'ITHINK_ACCESS_TOKEN');
      this.secretKey = await settingsHelper.getSetting(this.brandId, 'ITHINK_SECRET_KEY');
      this.pickupAddressId = await settingsHelper.getSetting(this.brandId, 'ITHINK_PICKUP_ADDRESS_ID');
      this.returnAddressId = await settingsHelper.getSetting(this.brandId, 'ITHINK_RETURN_ADDRESS_ID', this.pickupAddressId);
      this.defaultLogistics = await settingsHelper.getSetting(this.brandId, 'ITHINK_DEFAULT_LOGISTICS', '');
      this.baseURL = env === 'production' ? ITHINK_PRODUCTION_URL : ITHINK_STAGING_URL;

      console.log('iThink Configuration:', {
        brandId: this.brandId,
        environment: env,
        baseUrl: this.baseURL,
        accessToken: this.accessToken ? 'Present' : 'Missing',
        secretKey: this.secretKey ? 'Present' : 'Missing',
        pickupAddressId: this.pickupAddressId,
      });

      this.axiosInstance = axios.create({
        baseURL: this.baseURL,
        timeout: 60000,
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
    let msg = 'Unknown error';
    if (errData) {
      msg = errData.message || errData.error || (typeof errData === 'string' ? errData : JSON.stringify(errData));
    } else if (!error.response) {
      msg = 'Network error';
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
      console.log('=== iThink Get Available Couriers ===');
      const payload = {
        data: {
          ...this._authData(),
          from_pincode: String(params.sourcePincode),
          to_pincode: String(params.destinationPincode),
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

      // Normalise into a flat array of courier options
      let couriers = [];
      if (raw?.data && Array.isArray(raw.data)) {
        couriers = raw.data;
      } else if (raw?.courier_data && typeof raw.courier_data === 'object') {
        // iThink sometimes returns { courier_data: { delhivery: {...}, bluedart: {...} } }
        couriers = Object.entries(raw.courier_data).map(([key, val]) => ({
          logistics: key,
          ...val,
        }));
      } else if (Array.isArray(raw)) {
        couriers = raw;
      } else if (raw && typeof raw === 'object') {
        // Try to extract any array-like structure
        const firstArrayKey = Object.keys(raw).find(k => Array.isArray(raw[k]));
        if (firstArrayKey) couriers = raw[firstArrayKey];
      }

      console.log(`Found ${couriers.length} courier options`);
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
      console.log('=== iThink Create Forward Order ===');
      this.validateOrderData(orderData);

      const payload = this.formatOrderDataForIThink(orderData);
      // PII-safe payload preview for diagnosing iThink rejections.
      console.log('iThink order payload (preview):', JSON.stringify({
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
      console.log('iThink API Request URL:', `${this.baseURL}/api_v3/order/add.json`);
      console.log('iThink API Request Headers:', { 'Content-Type': 'application/json' });
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

      console.log('iThink order response:', JSON.stringify(responseData, null, 2));

      // Handle case where iThink returns null — this is NOT success
      if (responseData === null) {
        console.error('❌ iThink returned null response — order may not have been created');
        throw new Error('iThink API returned null response. Order may not have been accepted. Check iThink dashboard for details.');
      }

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
        message =
          result.remark ||
          result.message ||
          result.error ||
          result.reason ||
          responseData?.message ||
          responseData?.status_message ||
          responseData?.remark ||
          responseData?.error ||
          (typeof dataRoot === 'string' ? dataRoot : null) ||
          // Last resort: surface a snippet of the full response so the failure
          // is at least diagnosable from the toast in the admin UI.
          `iThink did not return a waybill (top status: ${topStatus || 'none'}). Response: ${
            JSON.stringify(responseData).slice(0, 300)
          }`;
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
      console.log('=== iThink Create/Update Forward Order ===');
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
  formatOrderDataForIThink(orderData) {
    const totalQty = orderData.products.reduce((s, p) => s + (p.quantity || 1), 0);
    const weightKg = orderData.shipment_Weight || 0.10;

    const paymentMode = orderData.payment_Mode === 1 || String(orderData.payment_Mode).toLowerCase() === 'cod'
      ? 'COD' : 'Prepaid';

    const now = new Date();
    const orderDate = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;

    // Manual courier selection: use orderData.logistics if provided, else fall back to brand default
    const selectedLogistics = orderData.logistics || this.defaultLogistics || '';
    const selectedServiceType = orderData.s_type || '';

    // Per iThink v3 docs (POST /api_v3/order/add.json) the warehouse fields
    // are `pickup_address_id` and `return_address_id` and they live INSIDE
    // each shipment object — not at the outer `data` level. The value is
    // the numeric ID of a pickup location registered in the iThink dashboard
    // (Settings → Pickup Locations).
    const pickupId = String(orderData.pick_Address_ID || this.pickupAddressId || '').trim();
    const returnId = String(orderData.return_Address_ID || this.returnAddressId || this.pickupAddressId || '').trim();

    return {
      data: {
        ...this._authData(),
        logistics: selectedLogistics,
        s_type: selectedServiceType,
        order_type: '',
        shipments: [{
          waybill: '',
          order: String(orderData.orderId),
          sub_order: '',
          order_date: orderDate,
          total_amount: String(orderData.total_Amount || orderData.order_Amount || 0),
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
          cod_amount: paymentMode === 'COD' ? String(orderData.total_Amount || orderData.order_Amount || 0) : '0',
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
      console.log('=== iThink Track Order ===');
      const awbList = Array.isArray(waybill) ? waybill.join(',') : waybill;

      const payload = {
        data: {
          ...this._authData(),
          awb_number_list: awbList,
        },
      };

      const response = await this.axiosInstance.post('/api_v3/order/track.json', payload);
      console.log('Tracking fetched successfully');
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
      console.log('=== iThink Cancel Order ===');
      const awbStr = Array.isArray(waybill) ? waybill.join(',') : waybill;

      const payload = {
        data: {
          ...this._authData(),
          awb_numbers: awbStr,
        },
      };

      const response = await this.axiosInstance.post('/api/order/cancel.json', payload);
      console.log('Cancel response:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      this.handleApiError(error, 'Cancel Order');
    }
  }

  // ── Rate Calculator ─────────────────────────────────────────────────────

  async calculateRates(rateData) {
    await this.initialize();
    try {
      console.log('=== iThink Calculate Rates ===');
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
      console.log('Rates calculated successfully');
      return response.data;
    } catch (error) {
      this.handleApiError(error, 'Calculate Rates');
    }
  }

  // ── Pincode Serviceability ──────────────────────────────────────────────

  async checkServiceability(sourcePincode, destinationPincode) {
    await this.initialize();
    try {
      console.log('=== iThink Pincode Check ===');
      const payload = {
        data: {
          ...this._authData(),
          from_pincode: String(sourcePincode),
          to_pincode: String(destinationPincode),
          shipping_length_cms: '14',
          shipping_width_cms: '3',
          shipping_height_cms: '10',
          shipping_weight_kg: '0.07',
        },
      };

      const response = await this.axiosInstance.post('/api_v3/pincode/check.json', payload);
      console.log('Serviceability response:', JSON.stringify(response.data, null, 2));

      // Normalise — return an array (empty = not serviceable)
      const raw = response.data;
      if (Array.isArray(raw)) return raw;
      if (raw?.data && Array.isArray(raw.data)) return raw.data;
      if (raw?.courier_data && Array.isArray(raw.courier_data)) return raw.courier_data;
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) return [raw];
      return raw;
    } catch (error) {
      this.handleApiError(error, 'Pincode Check');
    }
  }

  // ── Shipping Label ──────────────────────────────────────────────────────

  async getShippingLabel(waybills) {
    await this.initialize();
    try {
      console.log('=== iThink Print Label ===');
      const awbStr = Array.isArray(waybills) ? waybills.join(',') : waybills;

      const payload = {
        data: {
          ...this._authData(),
          awb_numbers: awbStr,
        },
      };

      const response = await this.axiosInstance.post('/api_v3/order/label.json', payload);
      console.log('Label fetched successfully');
      return response.data;
    } catch (error) {
      this.handleApiError(error, 'Print Label');
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
        console.log(`=== iThink Get Warehouse (${path}) ===`);
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
      console.log('=== iThink Add Warehouse ===');
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
      console.log('Warehouse added:', response.data);
      return response.data;
    } catch (error) {
      this.handleApiError(error, 'Add Warehouse');
    }
  }

  // ── NDR (Non-Delivery Report) ───────────────────────────────────────────

  async ndrAction(awbNumber, action = 'reattempt') {
    await this.initialize();
    try {
      console.log('=== iThink NDR Action ===');
      const payload = {
        data: {
          ...this._authData(),
          awb_number: awbNumber,
          action: action, // 'reattempt' or 'rto'
        },
      };

      const response = await this.axiosInstance.post('/api_v3/ndr/action.json', payload);
      console.log('NDR action response:', response.data);
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
      console.log(`📊 iThink status mapping: "${iThinkStatus}" → "${mapped}"`);
      return mapped;
    }

    console.log(`⚠️ Unknown iThink status: "${iThinkStatus}", defaulting to "processing"`);
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
      console.log('=== iThink Test Connection ===');
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
    console.log('iThink: Pickup is auto-scheduled on order creation — no separate call needed.');
    return { success: true, message: 'Pickup auto-scheduled by iThink' };
  }
}

module.exports = new IThinkService();
module.exports.IThinkService = IThinkService;
