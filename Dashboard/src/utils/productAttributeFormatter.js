/**
 * Utility functions for formatting product attributes
 */

/**
 * Clean and format product attributes for display
 * @param {Object|string} attributes - The attributes object or malformed string
 * @returns {Object} - Cleaned attributes object
 */
export const cleanProductAttributes = (attributes) => {
    if (!attributes) return {};
    
    // If it's already a proper object, return as is
    if (typeof attributes === 'object' && !Array.isArray(attributes)) {
        // Check if it's a malformed object with numbered keys
        const keys = Object.keys(attributes);
        const hasNumberedKeys = keys.some(key => /^\d+$/.test(key));
        
        if (hasNumberedKeys) {
            // This is malformed data, try to extract meaningful attributes
            return extractAttributesFromMalformedData(attributes);
        }
        
        return attributes;
    }
    
    // If it's a string, try to parse or extract attributes
    if (typeof attributes === 'string') {
        return extractAttributesFromString(attributes);
    }
    
    return {};
};

/**
 * Extract attributes from malformed numbered object
 * @param {Object} malformedData - Object with numbered keys
 * @returns {Object} - Cleaned attributes
 */
const extractAttributesFromMalformedData = (malformedData) => {
    try {
        // Convert the malformed object back to a string
        const str = Object.values(malformedData).join('');
        return extractAttributesFromString(str);
    } catch (error) {
        return {};
    }
};

/**
 * Extract attributes from a string representation
 * @param {string} str - String containing attribute data
 * @returns {Object} - Extracted attributes
 */
const extractAttributesFromString = (str) => {
    const attributes = {};
    
    // Common attribute patterns to look for
    const patterns = {
        size: /(?:size|Size)[":\s]*([^",\]]+)/i,
        type: /(?:type|Type)[":\s]*([^",\]]+)/i,
        color: /(?:color|Color)[":\s]*([^",\]]+)/i,
        season: /(?:season|Season)[":\s]*([^",\]]+)/i,
        activity: /(?:activity|Activity)[":\s]*([^",\]]+)/i,
        pack: /(?:pack|Pack)[":\s]*([^",\]]+)/i,
        style: /(?:style|Style)[":\s]*([^",\]]+)/i,
        length: /(?:length|Length)[":\s]*([^",\]]+)/i,
        gender: /(?:gender|Gender)[":\s]*([^",\]]+)/i,
        material: /(?:material|Material)[":\s]*([^",\]]+)/i
    };
    
    // Extract each attribute using patterns
    Object.entries(patterns).forEach(([key, pattern]) => {
        const match = str.match(pattern);
        if (match && match[1]) {
            attributes[key] = match[1].trim().replace(/["\[\]]/g, '');
        }
    });
    
    // Fallback: try to extract from known values
    const knownValues = {
        'Free Size': 'size',
        'Ankle Socks': 'type',
        'Medium Blue': 'color',
        'All Season': 'season',
        'Relaxation': 'activity',
        'Pack of 1': 'pack',
        'Toes Alligner': 'style',
        'Full Length': 'length',
        'Unisex': 'gender',
        'Cotton': 'material'
    };
    
    Object.entries(knownValues).forEach(([value, key]) => {
        if (str.includes(value) && !attributes[key]) {
            attributes[key] = value;
        }
    });
    
    return attributes;
};

/**
 * Format attributes for display
 * @param {Object} attributes - Cleaned attributes object
 * @returns {string} - Formatted string for display
 */
export const formatAttributesForDisplay = (attributes) => {
    if (!attributes || typeof attributes !== 'object') return 'N/A';
    
    const cleanedAttributes = cleanProductAttributes(attributes);
    const entries = Object.entries(cleanedAttributes);
    
    if (entries.length === 0) return 'N/A';
    
    return entries
        .map(([key, value]) => `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`)
        .join(', ');
};

/**
 * Get individual attribute components for React rendering
 * @param {Object} attributes - Cleaned attributes object
 * @returns {Array} - Array of {key, value} objects
 */
export const getAttributeComponents = (attributes) => {
    if (!attributes || typeof attributes !== 'object') return [];
    
    const cleanedAttributes = cleanProductAttributes(attributes);
    
    return Object.entries(cleanedAttributes).map(([key, value]) => ({
        key: key.charAt(0).toUpperCase() + key.slice(1),
        value: value
    }));
};
