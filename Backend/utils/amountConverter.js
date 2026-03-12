/**
 * Amount Conversion Utility
 * Standardizes currency amount handling across the application
 * 
 * Razorpay uses paise (smallest unit) for internal calculations:
 * - 1 Rupee (INR) = 100 Paise
 * - 1 Dollar (USD) = 100 Cents
 * 
 * This utility ensures consistent conversion between display units (rupees/dollars)
 * and smallest units (paise/cents) to prevent precision loss and rounding errors.
 */

/**
 * Convert amount from display unit (rupees/dollars) to smallest unit (paise/cents)
 * 
 * @param {number} amount - Amount in display unit (rupees/dollars)
 * @param {string} currency - Currency code (INR, USD, etc.)
 * @returns {number} - Amount in smallest unit (paise/cents), rounded to nearest integer
 * 
 * @example
 * toSmallestUnit(100, 'INR') // Returns 10000 (100 rupees = 10000 paise)
 * toSmallestUnit(99.99, 'INR') // Returns 9999 (99.99 rupees = 9999 paise)
 * toSmallestUnit(0.01, 'INR') // Returns 1 (0.01 rupees = 1 paise)
 */
const toSmallestUnit = (amount, currency = 'INR') => {
  // Validate input
  if (typeof amount !== 'number' || isNaN(amount)) {
    throw new Error(`Invalid amount: ${amount}. Amount must be a valid number.`);
  }

  if (amount < 0) {
    throw new Error(`Invalid amount: ${amount}. Amount cannot be negative.`);
  }

  // Multiply by 100 to convert to smallest unit and round to nearest integer
  // Using Math.round to handle floating point precision issues
  const smallestUnit = Math.round(amount * 100);

  return smallestUnit;
};

/**
 * Convert amount from smallest unit (paise/cents) to display unit (rupees/dollars)
 * 
 * @param {number} amount - Amount in smallest unit (paise/cents)
 * @param {string} currency - Currency code (INR, USD, etc.)
 * @returns {number} - Amount in display unit (rupees/dollars), with 2 decimal places
 * 
 * @example
 * fromSmallestUnit(10000, 'INR') // Returns 100 (10000 paise = 100 rupees)
 * fromSmallestUnit(9999, 'INR') // Returns 99.99 (9999 paise = 99.99 rupees)
 * fromSmallestUnit(1, 'INR') // Returns 0.01 (1 paise = 0.01 rupees)
 */
const fromSmallestUnit = (amount, currency = 'INR') => {
  // Validate input
  if (typeof amount !== 'number' || isNaN(amount)) {
    throw new Error(`Invalid amount: ${amount}. Amount must be a valid number.`);
  }

  if (amount < 0) {
    throw new Error(`Invalid amount: ${amount}. Amount cannot be negative.`);
  }

  // Divide by 100 to convert from smallest unit to display unit
  // Round to 2 decimal places to handle floating point precision
  const displayUnit = Math.round((amount / 100) * 100) / 100;

  return displayUnit;
};

/**
 * Validate that an amount in smallest unit can be converted back to display unit
 * without precision loss
 * 
 * @param {number} amount - Amount in display unit (rupees/dollars)
 * @param {string} currency - Currency code (INR, USD, etc.)
 * @returns {boolean} - True if round-trip conversion maintains precision
 * 
 * @example
 * validatePrecision(100, 'INR') // Returns true
 * validatePrecision(99.99, 'INR') // Returns true
 * validatePrecision(99.999, 'INR') // Returns false (more than 2 decimal places)
 */
const validatePrecision = (amount, currency = 'INR') => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return false;
  }

  // Convert to smallest unit and back
  const smallestUnit = toSmallestUnit(amount, currency);
  const roundTrip = fromSmallestUnit(smallestUnit, currency);

  // Check if round-trip conversion matches original amount (within floating point tolerance)
  const tolerance = 0.001; // Allow 0.001 difference due to floating point precision
  return Math.abs(amount - roundTrip) < tolerance;
};

module.exports = {
  toSmallestUnit,
  fromSmallestUnit,
  validatePrecision
};
