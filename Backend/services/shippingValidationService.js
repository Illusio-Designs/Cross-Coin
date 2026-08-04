/**
 * Shipping Validation Service
 *
 * Validates order + address + product data BEFORE sending to any shipping
 * provider (FShip / iThink). Returns a structured list of issues so the
 * admin dashboard can display exactly what's wrong and the order doesn't
 * get rejected by the courier API.
 *
 * Usage:
 *   const { validateOrderForShipping } = require('./shippingValidationService');
 *   const result = await validateOrderForShipping(orderId);
 *   if (!result.valid) {
 *     // result.errors   → blocking issues (order CANNOT be shipped)
 *     // result.warnings → non-blocking but worth fixing
 *   }
 */

const { Order } = require('../model/orderModel');
const { OrderItem } = require('../model/orderItemModel');
const { Product } = require('../model/productModel');
const { ProductVariation } = require('../model/productVariationModel');
const { ShippingAddress } = require('../model/shippingAddressModel');
const { User } = require('../model/userModel');

// ── Indian states (for state name validation) ─────────────────────────────

const VALID_INDIAN_STATES = new Set([
  'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh',
  'goa', 'gujarat', 'haryana', 'himachal pradesh', 'jharkhand', 'karnataka',
  'kerala', 'madhya pradesh', 'maharashtra', 'manipur', 'meghalaya',
  'mizoram', 'nagaland', 'odisha', 'punjab', 'rajasthan', 'sikkim',
  'tamil nadu', 'telangana', 'tripura', 'uttar pradesh', 'uttarakhand',
  'west bengal',
  // Union territories
  'andaman and nicobar islands', 'chandigarh', 'dadra and nagar haveli and daman and diu',
  'delhi', 'jammu and kashmir', 'ladakh', 'lakshadweep', 'puducherry',
  // Common abbreviations / alternate spellings
  'new delhi', 'j&k', 'jammu & kashmir', 'a&n islands',
  'dadra and nagar haveli', 'daman and diu', 'pondicherry',
]);

// ── Core validation ───────────────────────────────────────────────────────

/**
 * Validate an order for shipping readiness.
 *
 * @param {number} orderId
 * @param {Object} [options]
 * @param {string} [options.logistics]  - courier name for iThink (for courier-specific checks)
 * @returns {Promise<{ valid: boolean, errors: string[], warnings: string[], data: Object }>}
 */
async function validateOrderForShipping(orderId, options = {}) {
  const errors = [];
  const warnings = [];

  // ── 1. Load order ────────────────────────────────────────────────────
  const order = await Order.findByPk(orderId);
  if (!order) {
    return { valid: false, errors: ['Order not found'], warnings: [], data: null };
  }

  // ── 2. Order-level checks ────────────────────────────────────────────
  if (!order.order_number) {
    errors.push('Order number is missing');
  }
  if (String(order.order_number || '').toUpperCase().includes('TEST')) {
    errors.push('Test orders cannot be shipped');
  }

  const blockedStatuses = ['awaiting_confirmation', 'pending', 'cancelled', 'delivered', 'rto delivered'];
  if (blockedStatuses.includes(order.status)) {
    errors.push(`Order status "${order.status}" is not eligible for shipping`);
  }

  if (!order.final_amount || parseFloat(order.final_amount) <= 0) {
    errors.push('Order final amount is zero or missing');
  }

  if (order.payment_type === 'cod' && parseFloat(order.final_amount) > 50000) {
    warnings.push('COD amount exceeds ₹50,000 — most couriers reject high-value COD');
  }

  // ── 3. Shipping address checks ─────────────────────────────────────────
  const addr = order.shipping_address_id
    ? await ShippingAddress.findByPk(order.shipping_address_id)
    : null;

  if (!addr) {
    errors.push('Shipping address is missing');
  } else {
    // Full name
    if (!addr.full_name || !String(addr.full_name).trim()) {
      errors.push('Customer name is missing');
    } else if (String(addr.full_name).trim().length < 2) {
      errors.push('Customer name is too short (min 2 characters)');
    } else if (/^\d+$/.test(String(addr.full_name).trim())) {
      errors.push('Customer name cannot be only numbers');
    }

    // Address line
    if (!addr.address || !String(addr.address).trim()) {
      errors.push('Street address is missing');
    } else {
      const addrStr = String(addr.address).trim();
      if (addrStr.length < 10) {
        errors.push(`Street address is too short (${addrStr.length} chars, min 10) — courier may reject`);
      } else if (addrStr.length < 20) {
        warnings.push(`Street address is short (${addrStr.length} chars) — add landmark or area for better delivery`);
      }
      // Check for placeholder/junk addresses
      const junkPatterns = [/^test/i, /^asdf/i, /^xxx/i, /^abc$/i, /^na$/i, /^n\/a$/i, /^\.+$/, /^-+$/];
      if (junkPatterns.some(p => p.test(addrStr))) {
        errors.push('Street address appears to be a placeholder/test value');
      }
    }

    // City
    if (!addr.city || !String(addr.city).trim()) {
      errors.push('City is missing');
    } else if (String(addr.city).trim().length < 2) {
      errors.push('City name is too short');
    } else if (/^\d+$/.test(String(addr.city).trim())) {
      errors.push('City cannot be only numbers');
    }

    // State
    if (!addr.state || !String(addr.state).trim()) {
      errors.push('State is missing');
    } else {
      const stateStr = String(addr.state).trim().toLowerCase();
      if (!VALID_INDIAN_STATES.has(stateStr)) {
        warnings.push(`State "${addr.state}" may not be a valid Indian state — verify spelling`);
      }
    }

    // Pincode
    if (!addr.pincode || !String(addr.pincode).trim()) {
      errors.push('Pincode is missing');
    } else {
      const pin = String(addr.pincode).trim();
      if (!/^\d{6}$/.test(pin)) {
        errors.push(`Pincode "${pin}" is not a valid 6-digit Indian pincode`);
      } else if (pin === '000000' || pin === '111111' || pin === '999999') {
        errors.push(`Pincode "${pin}" appears to be a placeholder`);
      }
    }

    // Phone
    if (!addr.phone) {
      errors.push('Phone number is missing');
    } else {
      const digits = String(addr.phone).replace(/\D/g, '');
      if (digits.length < 10) {
        errors.push(`Phone number is too short (${digits.length} digits, need 10)`);
      } else {
        // Extract the 10-digit number
        let tenDigit = digits;
        if (digits.length === 12 && digits.startsWith('91')) tenDigit = digits.substring(2);
        else if (digits.length === 11 && digits.startsWith('0')) tenDigit = digits.substring(1);
        else if (digits.length > 10) tenDigit = digits.slice(-10);

        if (tenDigit.length !== 10) {
          errors.push(`Phone number "${addr.phone}" could not be normalised to 10 digits`);
        } else if (!/^[6-9]\d{9}$/.test(tenDigit)) {
          errors.push(`Phone number "${tenDigit}" is not a valid Indian mobile (must start with 6-9)`);
        } else if (/^(\d)\1{9}$/.test(tenDigit)) {
          errors.push(`Phone number "${tenDigit}" is a repeated digit — likely fake`);
        } else if (tenDigit === '9876543210' || tenDigit === '1234567890') {
          errors.push(`Phone number "${tenDigit}" is a known placeholder`);
        }
      }
    }

    // Country
    if (addr.country && !['india', 'in'].includes(String(addr.country).trim().toLowerCase())) {
      warnings.push(`Country is "${addr.country}" — domestic shipping only supports India`);
    }
  }

  // ── 4. Order items checks ──────────────────────────────────────────────
  const items = await OrderItem.findAll({
    where: { order_id: orderId },
    include: [
      { model: Product, as: 'Product', attributes: ['name', 'id', 'status'] },
      { model: ProductVariation, as: 'ProductVariation', attributes: ['sku', 'price', 'stock'] },
    ],
  });

  if (!items || items.length === 0) {
    errors.push('Order has no items');
  } else {
    for (const item of items) {
      const label = item.Product?.name || `Item #${item.id}`;

      if (!item.quantity || item.quantity <= 0) {
        errors.push(`${label}: quantity is zero or missing`);
      }
      if (!item.price || parseFloat(item.price) <= 0) {
        warnings.push(`${label}: price is zero — verify this is intentional`);
      }
      if (!item.Product) {
        errors.push(`Item #${item.id}: linked product not found (may have been deleted)`);
      } else if (item.Product.status && item.Product.status !== 'active') {
        warnings.push(`${label}: product status is "${item.Product.status}" — still shippable but verify`);
      }
      if (item.ProductVariation && item.ProductVariation.stock !== null && item.ProductVariation.stock < item.quantity) {
        warnings.push(`${label}: current stock (${item.ProductVariation.stock}) is less than ordered quantity (${item.quantity})`);
      }
    }

    // Weight sanity check
    const totalQty = items.reduce((s, i) => s + (i.quantity || 0), 0);
    const estimatedWeightKg = totalQty * 0.07;
    if (estimatedWeightKg > 10) {
      warnings.push(`Estimated weight ${estimatedWeightKg.toFixed(2)} kg exceeds 10 kg — courier may charge extra or reject`);
    }
  }

  // ── 5. Customer / user checks ──────────────────────────────────────────
  if (order.user_id) {
    const user = await User.findByPk(order.user_id, { attributes: ['id', 'email', 'deleted_at'] });
    if (!user) {
      warnings.push('Linked user account not found');
    } else if (user.deleted_at) {
      warnings.push('Customer account has been soft-deleted');
    }
  }

  // ── 6. Courier-specific checks (iThink) ────────────────────────────────
  if (options.logistics) {
    const allowed = ['delhivery', 'bluedart', 'xpressbees', 'ecom', 'ekart', 'fedex'];
    if (!allowed.includes(options.logistics.toLowerCase())) {
      errors.push(`Courier "${options.logistics}" is not a valid iThink logistics option. Allowed: ${allowed.join(', ')}`);
    }

    // Reverse shipment courier restrictions
    if (options.orderType === 'reverse') {
      const reverseAllowed = ['delhivery', 'bluedart', 'xpressbees'];
      if (!reverseAllowed.includes(options.logistics.toLowerCase())) {
        errors.push(`Courier "${options.logistics}" does not support reverse shipments. Use: ${reverseAllowed.join(', ')}`);
      }
    }

    // Service type validation
    if (options.s_type) {
      const sTypeMap = {
        bluedart: ['air', 'surface'],
        delhivery: ['air', 'surface'],
        fedex: ['standard', 'priority', 'ground'],
      };
      const allowedTypes = sTypeMap[options.logistics.toLowerCase()];
      if (allowedTypes && !allowedTypes.includes(options.s_type.toLowerCase())) {
        errors.push(`Service type "${options.s_type}" is not valid for ${options.logistics}. Allowed: ${allowedTypes.join(', ')}`);
      }
    }

    // COD restrictions
    if (order.payment_type === 'cod' && options.orderType === 'reverse') {
      errors.push('Reverse shipments must be Prepaid — COD is not allowed');
    }
  }

  // ── Build result ───────────────────────────────────────────────────────
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    data: {
      order_id: orderId,
      order_number: order.order_number,
      status: order.status,
      payment_type: order.payment_type,
      final_amount: order.final_amount,
      item_count: items?.length || 0,
      has_address: !!addr,
      pincode: addr?.pincode || null,
    },
  };
}

/**
 * Quick address-only validation (for use at checkout / address creation).
 * Does NOT load the order — just validates the address fields.
 *
 * @param {Object} address - { full_name, address, city, state, pincode, phone }
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
function validateShippingAddress(address) {
  const errors = [];
  const warnings = [];

  if (!address) {
    return { valid: false, errors: ['Address object is empty'], warnings: [] };
  }

  // Name
  const name = String(address.full_name || '').trim();
  if (!name) errors.push('Customer name is required');
  else if (name.length < 2) errors.push('Customer name is too short');
  else if (/^\d+$/.test(name)) errors.push('Customer name cannot be only numbers');

  // Address line
  const addr = String(address.address || '').trim();
  if (!addr) errors.push('Street address is required');
  else if (addr.length < 10) errors.push(`Street address is too short (${addr.length} chars, min 10)`);
  else if (addr.length < 20) warnings.push('Street address is short — add landmark for better delivery');
  const junkPatterns = [/^test/i, /^asdf/i, /^xxx/i, /^abc$/i, /^na$/i, /^n\/a$/i, /^\.+$/, /^-+$/];
  if (junkPatterns.some(p => p.test(addr))) errors.push('Street address appears to be a placeholder');

  // City
  const city = String(address.city || '').trim();
  if (!city) errors.push('City is required');
  else if (city.length < 2) errors.push('City name is too short');
  else if (/^\d+$/.test(city)) errors.push('City cannot be only numbers');

  // State
  const state = String(address.state || '').trim();
  if (!state) errors.push('State is required');
  else if (!VALID_INDIAN_STATES.has(state.toLowerCase())) {
    warnings.push(`State "${state}" may not be valid — verify spelling`);
  }

  // Pincode
  const pin = String(address.pincode || '').trim();
  if (!pin) errors.push('Pincode is required');
  else if (!/^\d{6}$/.test(pin)) errors.push(`Pincode "${pin}" is not a valid 6-digit format`);
  else if (['000000', '111111', '999999'].includes(pin)) errors.push(`Pincode "${pin}" is a placeholder`);

  // Phone
  const phone = String(address.phone || '').replace(/\D/g, '');
  if (!phone || phone.length < 10) {
    errors.push('Valid 10-digit phone number is required');
  } else {
    let tenDigit = phone;
    if (phone.length === 12 && phone.startsWith('91')) tenDigit = phone.substring(2);
    else if (phone.length === 11 && phone.startsWith('0')) tenDigit = phone.substring(1);
    else if (phone.length > 10) tenDigit = phone.slice(-10);

    if (!/^[6-9]\d{9}$/.test(tenDigit)) {
      errors.push('Phone number must be a valid Indian mobile (starts with 6-9)');
    } else if (/^(\d)\1{9}$/.test(tenDigit)) {
      errors.push('Phone number is a repeated digit — likely fake');
    } else if (['9876543210', '1234567890'].includes(tenDigit)) {
      errors.push('Phone number is a known placeholder');
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

module.exports = {
  validateOrderForShipping,
  validateShippingAddress,
  VALID_INDIAN_STATES,
};
