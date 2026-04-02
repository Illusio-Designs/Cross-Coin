/**
 * Input sanitization helper using DOMPurify + jsdom
 * Requirement 7.4: sanitize all user-supplied text before DB writes
 */
const { JSDOM } = require('jsdom');
const createDOMPurify = require('dompurify');

const { window } = new JSDOM('');
const DOMPurify = createDOMPurify(window);

/**
 * Sanitize a string to prevent stored XSS.
 * Strips all HTML tags and script payloads.
 * @param {string} str - User-supplied input
 * @returns {string} Sanitized string
 */
const sanitize = (str) => {
    if (typeof str !== 'string') return str;
    return DOMPurify.sanitize(str, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
};

/**
 * Sanitize an object's string fields recursively (shallow — top-level only).
 * @param {Object} obj
 * @param {string[]} fields - Field names to sanitize
 * @returns {Object} Object with sanitized fields
 */
const sanitizeFields = (obj, fields) => {
    if (!obj || typeof obj !== 'object') return obj;
    const result = { ...obj };
    for (const field of fields) {
        if (typeof result[field] === 'string') {
            result[field] = sanitize(result[field]);
        }
    }
    return result;
};

module.exports = { sanitize, sanitizeFields };
