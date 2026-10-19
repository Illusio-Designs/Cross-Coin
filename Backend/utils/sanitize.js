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
 * Sanitize a RICH-TEXT HTML string (e.g. a product description from the Tiptap
 * editor). Unlike `sanitize`, this KEEPS a safe subset of formatting tags —
 * including <img> (images the editor uploads to ImageKit) — while still
 * stripping scripts, event handlers and dangerous URIs. Use this for fields
 * that are meant to hold formatted HTML; `sanitize` (strip-all) would delete
 * every tag and silently destroy images + formatting on save.
 * @param {string} str - User-supplied HTML
 * @returns {string} Sanitized HTML
 */
const sanitizeRichText = (str) => {
    if (typeof str !== 'string') return str;
    return DOMPurify.sanitize(str, {
        ALLOWED_TAGS: [
            'p', 'br', 'hr', 'span', 'div',
            'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'sub', 'sup', 'mark',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
            'a', 'img', 'figure', 'figcaption',
            'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
        ],
        ALLOWED_ATTR: [
            'href', 'target', 'rel', 'title',
            'src', 'alt', 'width', 'height', 'loading',
            'class', 'style', 'colspan', 'rowspan',
        ],
        // DOMPurify's default URI policy already permits http/https/mailto/tel
        // and site-relative URLs while blocking javascript: and other
        // script-bearing schemes, so we don't override it here. The editor
        // uploads images to ImageKit and inserts the CDN (https) URL.
    });
};

/**
 * Sanitize an object's string fields recursively (shallow — top-level only).
 * @param {Object} obj
 * @param {string[]} fields - Field names to sanitize
 * @returns {Object} Object with sanitized fields
 */

module.exports = { sanitize, sanitizeRichText };
