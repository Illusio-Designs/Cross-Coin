// Backend/config/corsConfig.js
const Brand = require('../model/brandModel.js');

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
                // Add both with and without www
                domains.push(`https://${brand.domain}`);
                domains.push(`https://www.${brand.domain}`);
                domains.push(`http://${brand.domain}`); // For development
                domains.push(`http://www.${brand.domain}`);
            }
        });
        
        return domains;
    } catch (error) {
        console.error('Error fetching brand domains:', error);
        return [];
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
        console.log('✅ Brand domains cache updated:', brandDomainsCache);
    }
    
    return brandDomainsCache;
};

// Static allowed origins (development, staging, etc.)
const staticAllowedOrigins = [
    // Development
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3002',
    
    // Backend
    'http://localhost:5000',
    'http://127.0.0.1:5000',
    
    // Production domains (fallback if database is not available)
    'https://crosscoin.in',
    'https://www.crosscoin.in',
    'http://crosscoin.in',
    'http://www.crosscoin.in',
    
    // API domain
    process.env.API_URL,
    process.env.BACKEND_URL
].filter(Boolean); // Remove undefined values

const corsOptions = {
    origin: async function (origin, callback) {
        console.log('🔍 CORS check for origin:', origin);
        
        // Allow requests with no origin (mobile apps, Postman, curl, etc.)
        if (!origin) {
            console.log('✅ CORS: Allowing request with no origin');
            return callback(null, true);
        }
        
        // Allow Vercel preview deployments
        if (origin.includes('vercel.app')) {
            console.log('✅ CORS: Allowing Vercel deployment:', origin);
            return callback(null, true);
        }
        
        // Check static allowed origins
        if (staticAllowedOrigins.includes(origin)) {
            console.log('✅ CORS: Allowing static origin:', origin);
            return callback(null, true);
        }
        
        // Check dynamic brand domains
        const brandDomains = await getBrandDomains();
        if (brandDomains.includes(origin)) {
            console.log('✅ CORS: Allowing brand domain:', origin);
            return callback(null, true);
        }
        
        // Log blocked request with details
        console.warn(`❌ CORS blocked request from: ${origin}`);
        console.warn('Static allowed origins:', staticAllowedOrigins);
        console.warn('Brand domains:', brandDomains);
        return callback(new Error('Not allowed by CORS'));
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
        'X-Brand-Name' // ✅ ADD THIS for brand identification
    ],
    exposedHeaders: ['Content-Range', 'X-Content-Range', 'X-Total-Count'],
    maxAge: 86400, // 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 204
};

module.exports = corsOptions; 