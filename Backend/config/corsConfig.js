// Backend/config/corsConfig.js
const Brand = require('../model/brandModel.js');
const { logger } = require('./logging.js');

// Cache for brand domains (refreshed periodically)
let brandDomainsCache = [];
let lastCacheUpdate = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch all active brand domains from database
 */
const fetchBrandDomains = async () => {
    try {
        const brands = await Brand.findAll({
            where: { status: 'active' },
            attributes: ['domain']
        });
        
        const domains = [];
        brands.forEach(brand => {
            if (brand.domain) {
                // Always add HTTPS
                domains.push(`https://${brand.domain}`);
                domains.push(`https://www.${brand.domain}`);
                // Only add HTTP origins in non-production (development/staging)
                if (process.env.NODE_ENV !== 'production') {
                    domains.push(`http://${brand.domain}`);
                    domains.push(`http://www.${brand.domain}`);
                }
            }
        });
        
        return domains;
    } catch (error) {
        // Requirement 5.6: log at warn level and fall back to static origins (not empty array)
        logger.warn('Error fetching brand domains for CORS, falling back to static origins:', error.message);
        return staticAllowedOrigins;
    }
};

/**
 * Get brand domains with caching
 */
const getBrandDomains = async () => {
    const now = Date.now();
    
    // Refresh cache if expired or empty
    if (!lastCacheUpdate || (now - lastCacheUpdate) > CACHE_DURATION || brandDomainsCache.length === 0) {
        brandDomainsCache = await fetchBrandDomains();
        lastCacheUpdate = now;
    }
    
    return brandDomainsCache;
};

// Static allowed origins (development, staging, etc.)
const staticAllowedOrigins = [
    // Development
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3006',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3002',
    'http://127.0.0.1:3006',
    
    // Backend
    'http://localhost:5000',
    'http://127.0.0.1:5000',
    
    // Production domains (fallback if database is not available)
    'https://crosscoin.in',
    'https://www.crosscoin.in',
    'http://crosscoin.in',
    'http://www.crosscoin.in',
    
    // API domain
    'https://api.crosscoin.in',
    'http://api.crosscoin.in',
    
    // Knitwink domains
    'https://knitwink.com',
    'https://www.knitwink.com',
    'http://knitwink.com',
    'http://www.knitwink.com',

    // Velmique domain
    'https://velmique.co.in',
    'https://www.velmique.co.in',
    'http://velmique.co.in',
    'http://www.velmique.co.in',


    // Environment variables
    process.env.API_URL,
    process.env.BACKEND_URL,
    process.env.FRONTEND_URL
].filter(Boolean); // Remove undefined values

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, curl, etc.)
        if (!origin) {
            return callback(null, true);
        }
        
        // Allow Vercel preview deployments (strict suffix check)
        if (origin.endsWith('.vercel.app') || origin === 'https://vercel.app') {
            return callback(null, true);
        }
        
        // Check static allowed origins
        if (staticAllowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        
        // Check dynamic brand domains asynchronously
        getBrandDomains()
            .then(brandDomains => {
                if (brandDomains.includes(origin)) {
                    return callback(null, true);
                }
                
                if (process.env.NODE_ENV === 'production') {
                  logger.warn(`CORS blocked request from: ${origin}`);
                  return callback(new Error('Not allowed by CORS'));
                } else {
                  logger.warn(`CORS blocked non-production request from: ${origin}`);
                  return callback(new Error('Not allowed by CORS'));
                }
            })
            .catch(error => {
                // Requirement 5.6: log at warn level and fall back to static origins
                logger.warn('CORS brand domain check error, falling back to static origins:', error.message);
                if (staticAllowedOrigins.includes(origin)) {
                    return callback(null, true);
                }
                return callback(new Error('Not allowed by CORS'));
            });
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'X-API-Key',
        'X-Brand-Name',
        'X-Guest-Token',
        'Cache-Control',
        'Pragma'
    ],
    exposedHeaders: ['Content-Range', 'X-Content-Range', 'X-Total-Count', 'Set-Cookie'],
    maxAge: 86400, // 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 204
};

module.exports = corsOptions; 