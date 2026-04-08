'use strict';

/**
 * Lightweight schema validation — no external deps.
 * Returns { valid: true } or { valid: false, errors: string[] }
 */

const PHONE_RE = /^[6-9]\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PIN_RE   = /^\d{6}$/;

// ── Field validators ──────────────────────────────────────────────────────────

const validators = {
  required: (v, label) => (v !== undefined && v !== null && String(v).trim() !== '') ? null : `${label} is required`,
  string:   (v, label) => typeof v === 'string' ? null : `${label} must be a string`,
  number:   (v, label) => (typeof v === 'number' && !isNaN(v)) ? null : `${label} must be a number`,
  min:      (n) => (v, label) => (typeof v === 'string' ? v.trim().length >= n : v >= n) ? null : `${label} must be at least ${n}`,
  max:      (n) => (v, label) => (typeof v === 'string' ? v.trim().length <= n : v <= n) ? null : `${label} must be at most ${n}`,
  phone:    (v, label) => PHONE_RE.test(String(v || '').replace(/\D/g, '').slice(-10)) ? null : `${label} must be a valid 10-digit Indian mobile number`,
  email:    (v, label) => EMAIL_RE.test(String(v || '').trim()) ? null : `${label} must be a valid email address`,
  pincode:  (v, label) => PIN_RE.test(String(v || '').trim()) ? null : `${label} must be a valid 6-digit pincode`,
  enum:     (values) => (v, label) => values.includes(v) ? null : `${label} must be one of: ${values.join(', ')}`,
  array:    (v, label) => Array.isArray(v) ? null : `${label} must be an array`,
  minItems: (n) => (v, label) => (Array.isArray(v) && v.length >= n) ? null : `${label} must have at least ${n} item(s)`,
};

/**
 * Validate a body object against a schema.
 *
 * Schema format:
 * {
 *   fieldName: { label: 'Human label', rules: ['required', 'email'] }
 *   // or with args:
 *   fieldName: { label: 'Name', rules: ['required', ['min', 2], ['max', 100]] }
 * }
 *
 * @param {object} body
 * @param {object} schema
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validate(body, schema) {
  const errors = [];

  for (const [field, def] of Object.entries(schema)) {
    const value = body[field];
    const label = def.label || field;

    for (const rule of def.rules) {
      const [ruleName, ...args] = Array.isArray(rule) ? rule : [rule];
      const fn = typeof validators[ruleName] === 'function'
        ? (args.length ? validators[ruleName](...args) : validators[ruleName])
        : null;

      if (!fn) continue;

      // Skip non-required rules if value is absent (let 'required' handle that)
      if (ruleName !== 'required' && (value === undefined || value === null || value === '')) continue;

      const error = fn(value, label);
      if (error) { errors.push(error); break; } // one error per field
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Express middleware factory.
 * Usage: router.post('/route', validateBody(schema), handler)
 */
function validateBody(schema) {
  return (req, res, next) => {
    const { valid, errors } = validate(req.body, schema);
    if (!valid) {
      return res.status(400).json({ success: false, error: errors[0], errors });
    }
    next();
  };
}

// ── Pre-built schemas ─────────────────────────────────────────────────────────

const schemas = {
  checkout: {
    'guest_info.phone': { label: 'Phone', rules: ['required', 'phone'] },
    'guest_info.email': { label: 'Email', rules: ['required', 'email'] },
    'guest_info.firstName': { label: 'First name', rules: ['required', ['min', 2]] },
    items: { label: 'Items', rules: ['required', 'array', ['minItems', 1]] },
    payment_type: { label: 'Payment type', rules: ['required', ['enum', ['cod', 'razorpay', 'upi', 'credit_card', 'debit_card', 'wallet']]] },
  },

  cancelOrder: {
    reason: { label: 'Cancellation reason', rules: ['required', ['min', 5], ['max', 500]] },
  },

  createAddress: {
    address: { label: 'Address', rules: ['required', ['min', 15]] },
    city:    { label: 'City',    rules: ['required'] },
    state:   { label: 'State',   rules: ['required'] },
    postal_code: { label: 'Pincode', rules: ['required', 'pincode'] },
    phone_number: { label: 'Phone', rules: ['required', 'phone'] },
  },

  register: {
    username: { label: 'Username', rules: ['required', ['min', 2], ['max', 50]] },
    email:    { label: 'Email',    rules: ['required', 'email'] },
    password: { label: 'Password', rules: ['required', ['min', 8]] },
  },
};

module.exports = { validate, validateBody, schemas, validators };
