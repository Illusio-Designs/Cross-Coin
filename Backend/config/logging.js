/**
 * Logging Configuration
 * 
 * Environment-based logging configuration to reduce production logging verbosity
 * and improve I/O performance.
 * 
 * Production: 'warn' level - only warnings and errors
 * Development: 'debug' level - all logs including debug messages
 */

const getLogLevel = () => {
    const env = process.env.NODE_ENV || 'development';
    
    if (env === 'production') {
        return 'warn';
    } else if (env === 'test') {
        return 'error';
    } else {
        return 'debug';
    }
};

const loggingConfig = {
    // Current environment log level
    level: getLogLevel(),
    
    // Environment-specific settings
    production: {
        level: 'warn',
        // Only log warnings and errors in production
        // Disable verbose query logging
        // Disable HTTP request logging
        disableQueryLogging: true,
        disableHttpLogging: true
    },
    
    development: {
        level: 'debug',
        // Log everything in development for debugging
        disableQueryLogging: false,
        disableHttpLogging: false
    },
    
    test: {
        level: 'error',
        // Only log errors in test environment
        disableQueryLogging: true,
        disableHttpLogging: true
    }
};

/**
 * Get logging configuration for current environment
 * @returns {Object} Logging configuration
 */
const getLoggingConfig = () => {
    const env = process.env.NODE_ENV || 'development';
    return loggingConfig[env] || loggingConfig.development;
};

/**
 * Check if logging is enabled for a specific level
 * @param {string} level - Log level to check ('debug', 'info', 'warn', 'error')
 * @returns {boolean} True if logging is enabled for this level
 */
const isLogLevelEnabled = (level) => {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const currentLevel = levels[getLogLevel()] || 0;
    const checkLevel = levels[level] || 0;
    return checkLevel >= currentLevel;
};

/**
 * Logger utility with environment-aware logging
 */
const logger = {
    debug: (message, data = null) => {
        if (isLogLevelEnabled('debug')) {
            console.log(`[DEBUG] ${message}`, data || '');
        }
    },
    
    info: (message, data = null) => {
        if (isLogLevelEnabled('info')) {
            console.log(`[INFO] ${message}`, data || '');
        }
    },
    
    warn: (message, data = null) => {
        if (isLogLevelEnabled('warn')) {
            console.warn(`[WARN] ${message}`, data || '');
        }
    },
    
    error: (message, error = null) => {
        if (isLogLevelEnabled('error')) {
            console.error(`[ERROR] ${message}`, error || '');
        }
    }
};

module.exports = {
    loggingConfig,
    getLoggingConfig,
    isLogLevelEnabled,
    logger
};
