/**
 * Address Quality Service
 * Validates addresses and calculates quality scores for COD serviceability
 */

const { sequelize } = require('../config/db.js');
const crypto = require('crypto');
const { logger } = require('../config/logging.js');

/**
 * Validate address completeness
 * @param {Object} address - Address object to validate
 * @returns {Object} - Validation result with isComplete flag and missing fields
 */
function validateAddressCompleteness(address) {
    const requiredFields = ['line1', 'city', 'state', 'pincode', 'phone'];
    const missingFields = [];

    for (const field of requiredFields) {
        if (!address[field] || address[field].toString().trim() === '') {
            missingFields.push(field);
        }
    }

    return {
        isComplete: missingFields.length === 0,
        missingFields
    };
}

/**
 * Validate pincode format (6 digits)
 * @param {string} pincode - Pincode to validate
 * @returns {boolean} - True if valid
 */
function validatePincode(pincode) {
    if (!pincode) return false;
    const pincodeStr = pincode.toString().trim();
    return /^\d{6}$/.test(pincodeStr);
}

/**
 * Validate phone number format (10 digits)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid
 */
function validatePhoneNumber(phone) {
    if (!phone) return false;
    const phoneStr = phone.toString().replace(/\D/g, '');
    return phoneStr.length === 10 || (phoneStr.length === 12 && phoneStr.startsWith('91'));
}

/**
 * Calculate address quality score (0-100)
 * @param {Object} address - Address object
 * @returns {Promise<Object>} - Quality score and factors
 */
async function calculateAddressQuality(address) {
    let score = 0;
    const factors = {
        pincodeValid: false,
        phoneValid: false,
        addressComplete: false,
        landmarkProvided: false,
        historicalDeliverySuccess: 0
    };

    // Check pincode validity (25 points)
    if (validatePincode(address.pincode)) {
        factors.pincodeValid = true;
        score += 25;
    }

    // Check phone validity (20 points)
    if (validatePhoneNumber(address.phone)) {
        factors.phoneValid = true;
        score += 20;
    }

    // Check address completeness (25 points)
    const completeness = validateAddressCompleteness(address);
    if (completeness.isComplete) {
        factors.addressComplete = true;
        score += 25;
    }

    // Landmark presence (10 points) — significantly improves last-mile
    // delivery success rate in India per courier feedback.
    const landmark = String(address.landmark || address.line2 || '').trim();
    if (landmark.length >= 3) {
        factors.landmarkProvided = true;
        score += 10;
    }

    // Historical delivery success (20 points)
    // Query historical delivery data from database
    try {
        const addressHash = getAddressHash(address);
        const [results] = await sequelize.query(
            `SELECT quality_score, delivery_success_count, delivery_failure_count 
             FROM address_quality_scores 
             WHERE address_hash = ? OR pincode = ?
             ORDER BY address_hash = ? DESC, last_updated DESC
             LIMIT 1`,
            {
                replacements: [addressHash, address.pincode, addressHash],
                type: sequelize.QueryTypes.SELECT
            }
        );

        if (results) {
            const totalDeliveries = results.delivery_success_count + results.delivery_failure_count;
            if (totalDeliveries > 0) {
                // Calculate success rate from historical data
                const successRate = (results.delivery_success_count / totalDeliveries) * 100;
                factors.historicalDeliverySuccess = Math.round(successRate);
                
                // Award points based on success rate (0-20 points)
                score += Math.round((successRate / 100) * 20);
            } else {
                // Use stored quality score if no delivery history yet
                factors.historicalDeliverySuccess = results.quality_score || 50;
                score += Math.round((results.quality_score / 100) * 20) || 10;
            }
        } else {
            // No historical data - assign default score based on address completeness
            if (completeness.isComplete && factors.pincodeValid && factors.phoneValid) {
                factors.historicalDeliverySuccess = 100;
                score += 20;
            } else if (completeness.isComplete) {
                factors.historicalDeliverySuccess = 50;
                score += 10;
            }
        }
    } catch (error) {
        logger.warn('Address quality: historical delivery lookup failed:', error.message);
        // Fallback to default scoring if database query fails
        if (completeness.isComplete && factors.pincodeValid && factors.phoneValid) {
            factors.historicalDeliverySuccess = 100;
            score += 20;
        } else if (completeness.isComplete) {
            factors.historicalDeliverySuccess = 50;
            score += 10;
        }
    }

    // Determine recommendation based on score
    let recommendation = 'either';
    if (score < 60) {
        recommendation = 'prepaid';
    } else if (score >= 80) {
        recommendation = 'cod';
    }

    return {
        score,
        factors,
        recommendation
    };
}

/**
 * Generate hash for address tracking
 * @param {Object} address - Address object
 * @returns {string} - SHA256 hash of address
 */
function getAddressHash(address) {
    // Match the ShippingAddress model's beforeSave hook EXACTLY so that
    // shipping_addresses.address_hash and address_quality_scores.address_hash
    // are interchangeable join keys. Field order + casing must stay in sync.
    const addressString = [
        String(address.line1 || address.address || '').trim(),
        String(address.line2 || address.landmark || '').trim(),
        String(address.city || '').trim(),
        String(address.state || '').trim(),
        String(address.pincode || '').trim()
    ].join('|').toLowerCase();

    return crypto.createHash('sha256').update(addressString).digest('hex');
}

module.exports = {
    validateAddressCompleteness,
    validatePincode,
    validatePhoneNumber,
    calculateAddressQuality,
    getAddressHash
};
