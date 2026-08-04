const Razorpay = require('razorpay');
const crypto = require('crypto');
const settingsHelper = require('./settingsHelper');
const { toSmallestUnit, fromSmallestUnit } = require('../utils/amountConverter');

/**
 * Pull a human-readable message out of a Razorpay SDK rejection.
 * The SDK rejects with the parsed API body — { statusCode, error: { code,
 * description, reason, field } } — which is NOT an Error, so `err.message` is
 * `undefined`. That's why order failures showed up as "…: undefined". Dig out
 * the real description (and the offending field, which is gold for Magic
 * line_items errors) so the log and the client see WHY it failed.
 */
function rzpErrorMessage(error) {
  if (!error) return 'Unknown error';
  const inner = error.error || error;
  const parts = [
    inner.description || error.message,
    inner.field ? `(field: ${inner.field})` : null,
    inner.code && inner.code !== 'BAD_REQUEST_ERROR' ? `[${inner.code}]` : null,
  ].filter(Boolean);
  if (parts.length) return parts.join(' ');
  try { return JSON.stringify(inner); } catch { return String(inner); }
}

/**
 * Razorpay Service Wrapper
 * Centralizes all Razorpay API interactions and provides a single point of configuration
 * Supports multi-brand setup with different API keys per brand
 */
class RazorpayService {
  constructor() {
    this.instances = new Map(); // Cache instances per brand
  }

  /**
   * Get or create Razorpay instance for a specific brand
   * @param {number} brandId - Brand identifier (default: 1)
   * @returns {Promise<Razorpay>} Razorpay instance
   */
  async getInstance(brandId = 1) {
    // Return cached instance if available
    if (this.instances.has(brandId)) {
      return this.instances.get(brandId);
    }

    try {
      // Fetch brand-specific credentials from settings
      const key_id = await settingsHelper.getSetting(brandId, 'RAZORPAY_KEY_ID');
      const key_secret = await settingsHelper.getSetting(brandId, 'RAZORPAY_KEY_SECRET');

      // Validate credentials are available
      if (!key_id || !key_secret) {
        throw new Error(
          `Razorpay credentials not configured for brand ${brandId}. ` +
          `Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in settings.`
        );
      }

      // Create and cache instance
      const instance = new Razorpay({
        key_id,
        key_secret
      });

      this.instances.set(brandId, instance);
      return instance;
    } catch (error) {
      throw new Error(`Failed to initialize Razorpay for brand ${brandId}: ${error.message}`);
    }
  }

  /**
   * Create a Razorpay order
   * @param {Object} options - Order creation options
   * @param {number} options.amount - Amount in rupees (will be converted to paise)
   * @param {string} options.currency - Currency code (default: INR)
   * @param {string} options.receipt - Receipt identifier
   * @param {Object} options.notes - Additional notes
   * @param {number} options.brandId - Brand identifier (default: 1)
   * @returns {Promise<Object>} Razorpay order object
   */
  async createOrder(options = {}) {
    const {
      amount,
      currency = 'INR',
      receipt,
      notes = {},
      brandId = 1,
      line_items = null,
      line_items_total = null,
      partial_payment = false,
      one_click_checkout = false
    } = options;

    try {
      // Validate required parameters
      if (!amount || amount <= 0) {
        throw new Error('Valid amount is required and must be greater than 0');
      }

      // Get Razorpay instance for this brand
      const razorpay = await this.getInstance(brandId);

      // Convert amount to smallest unit (paise)
      const amountInSmallestUnit = toSmallestUnit(amount, currency);

      // Build order options
      const orderOptions = {
        amount: amountInSmallestUnit,
        currency,
        receipt: receipt || `rcpt_${Date.now()}_${brandId}`,
        notes,
        partial_payment
      };

      // Add line_items if provided (for Magic Checkout)
      if (line_items && Array.isArray(line_items) && line_items.length > 0) {
        orderOptions.line_items = line_items;
        orderOptions.line_items_total = line_items_total || amountInSmallestUnit;
      }

      // Magic (one-click) Checkout — Razorpay's modal collects the address from
      // its cross-merchant network and calls our shipping/coupon callbacks.
      if (one_click_checkout) {
        orderOptions.line_items_total = orderOptions.line_items_total || amountInSmallestUnit;
        orderOptions.one_click_checkout = true;
      }

      // Create order
      try {
        return await razorpay.orders.create(orderOptions);
      } catch (err) {
        // If the account isn't provisioned for Magic (one-click) Checkout,
        // Razorpay rejects one_click_checkout / line_items with
        // "…is/are not required and should not be sent". Rather than fail the
        // whole order, strip the Magic-only fields and create a standard order
        // so payment still works (it just won't be the 1CC address flow).
        const msg = rzpErrorMessage(err).toLowerCase();
        const magicRejected = msg.includes('should not be sent')
          && (msg.includes('one_click_checkout') || msg.includes('line_items'));
        if (magicRejected && (orderOptions.one_click_checkout || orderOptions.line_items)) {
          // eslint-disable-next-line no-console
          console.warn('[Razorpay] Magic (1CC) not enabled on this account — retrying as a standard order. Reason: ' + rzpErrorMessage(err));
          delete orderOptions.one_click_checkout;
          delete orderOptions.line_items;
          delete orderOptions.line_items_total;
          const order = await razorpay.orders.create(orderOptions);
          order._magic_disabled = true; // signal to callers that 1CC wasn't used
          order._magic_disabled_reason = rzpErrorMessage(err); // exact Razorpay message
          return order;
        }
        throw err;
      }
    } catch (error) {
      throw new Error(`Failed to create Razorpay order: ${rzpErrorMessage(error)}`);
    }
  }

  /**
   * Verify payment signature
   * @param {string} razorpayOrderId - Razorpay order ID
   * @param {string} razorpayPaymentId - Razorpay payment ID
   * @param {string} razorpaySignature - Razorpay signature from webhook
   * @param {number} brandId - Brand identifier (default: 1)
   * @returns {Promise<boolean>} True if signature is valid
   */
  async verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature, brandId = 1) {
    try {
      // Validate required parameters
      if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        throw new Error('Order ID, Payment ID, and Signature are required');
      }

      // Get brand-specific secret
      const key_secret = await settingsHelper.getSetting(brandId, 'RAZORPAY_KEY_SECRET');

      if (!key_secret) {
        throw new Error(`Razorpay secret not configured for brand ${brandId}`);
      }

      // Generate signature using HMAC-SHA256
      const generatedSignature = crypto
        .createHmac('sha256', key_secret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      // Compare signatures
      const isValid = generatedSignature === razorpaySignature;

      if (!isValid) {
        console.warn(`Invalid Razorpay signature for order ${razorpayOrderId}`);
      }

      return isValid;
    } catch (error) {
      throw new Error(`Failed to verify Razorpay signature: ${error.message}`);
    }
  }

  /**
   * Create a refund for a payment
   * @param {string} paymentId - Razorpay payment ID
   * @param {Object} options - Refund options
   * @param {number} options.amount - Refund amount in rupees (optional, full refund if not specified)
   * @param {string} options.notes - Refund notes
   * @param {number} options.brandId - Brand identifier (default: 1)
   * @returns {Promise<Object>} Refund object
   */
  async createRefund(paymentId, options = {}) {
    const {
      amount = null,
      notes = {},
      brandId = 1
    } = options;

    try {
      // Validate payment ID
      if (!paymentId) {
        throw new Error('Payment ID is required');
      }

      // Get Razorpay instance
      const razorpay = await this.getInstance(brandId);

      // Build refund options
      const refundOptions = {
        notes
      };

      // Add amount if specified (convert to paise)
      if (amount && amount > 0) {
        refundOptions.amount = toSmallestUnit(amount, 'INR');
      }

      // Create refund
      const refund = await razorpay.payments.refund(paymentId, refundOptions);

      return refund;
    } catch (error) {
      throw new Error(`Failed to create refund: ${rzpErrorMessage(error)}`);
    }
  }

  /**
   * Fetch payment details
   * @param {string} paymentId - Razorpay payment ID
   * @param {number} brandId - Brand identifier (default: 1)
   * @returns {Promise<Object>} Payment object
   */
  async getPayment(paymentId, brandId = 1) {
    try {
      if (!paymentId) {
        throw new Error('Payment ID is required');
      }

      const razorpay = await this.getInstance(brandId);
      const payment = await razorpay.payments.fetch(paymentId);

      return payment;
    } catch (error) {
      throw new Error(`Failed to fetch payment: ${rzpErrorMessage(error)}`);
    }
  }

  /**
   * Fetch order details
   * @param {string} orderId - Razorpay order ID
   * @param {number} brandId - Brand identifier (default: 1)
   * @returns {Promise<Object>} Order object
   */
  async getOrder(orderId, brandId = 1) {
    try {
      if (!orderId) {
        throw new Error('Order ID is required');
      }

      const razorpay = await this.getInstance(brandId);
      const order = await razorpay.orders.fetch(orderId);

      return order;
    } catch (error) {
      throw new Error(`Failed to fetch order: ${rzpErrorMessage(error)}`);
    }
  }

  /**
   * Clear cached instances (useful for testing or credential updates)
   * @param {number} brandId - Brand identifier (optional, clears all if not specified)
   */
  clearCache(brandId = null) {
    if (brandId) {
      this.instances.delete(brandId);
    } else {
      this.instances.clear();
    }
  }
}

// Export singleton instance
module.exports = new RazorpayService();
