const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const { sequelize } = require('./config/db.js');
const routesManager = require('./routes/routesManager.js');
const passport = require('./config/passport.js');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const dbConfig = require('./config/db');
const { dirname, join } = require('path');
const { fileURLToPath } = require('url');
const { initializeSeoData } = require('./utils/initializeSeoData.js');
const fs = require('fs');
const { setupDatabase } = require('./scripts/setupDatabase.js');
const { runMigrations } = require('./scripts/migrateToImageKit.js');
const corsOptions = require('./config/corsConfig.js');
const { sendFacebookEvent } = require('./integration/facebookPixel.js');
const { initializeCronJobs } = require('./config/cronJobs.js');
const { logger, getLoggingConfig } = require('./config/logging.js');

// Import routes
const facebookPixelRouter = require('./integration/facebookPixel.js');
const facebookCatalogRouter = require('./integration/facebookCatalog.js');
const dashboardAnalyticsRouter = require('./integration/dashboardAnalytics.js');
const utmRoutes = require('./routes/utmRoutes.js');
const brandSettingsRoutes = require('./routes/brandSettingsRoutes.js');
const brandRoutes = require('./routes/brandRoutes.js');
const brandAssignmentRoutes = require('./routes/brandAssignmentRoutes.js');
const adminLookbookRoutes = require('./routes/adminLookbookRoutes.js');
const adminReelRoutes = require('./routes/adminReelRoutes.js');

// Initialize dotenv
dotenv.config();

// Debug environment variables on startup (only in development)
if (process.env.NODE_ENV !== 'production') {
    console.log('Environment variables loaded:', {
        API_URL: process.env.API_URL,
        BACKEND_URL: process.env.BACKEND_URL,
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT,
        DB_HOST: process.env.DB_HOST,
        DB_DATABASE: process.env.DB_DATABASE
    });
}

const app = express();

// Security headers - MUST be first middleware
const helmet = require('helmet');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https://ik.imagekit.io", "https://www.facebook.com"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    }
  },
  hsts: process.env.NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true } : false
}));

// Rate limiting
const rateLimit = require('express-rate-limit');

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later' }
});

const generalRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later' }
});

app.use('/api/users/login', authRateLimiter);
app.use('/api/users/register', authRateLimiter);
app.use('/api/', generalRateLimiter);

// CORS middleware - MUST be before other middleware
app.use(cors(corsOptions));

// Handle preflight requests for all routes
app.options('*', cors(corsOptions));

// Body parsing middleware with increased limits for production
app.use(express.json({ 
    limit: process.env.MAX_FILE_SIZE || '5mb',
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));
app.use(express.urlencoded({ 
    extended: true, 
    limit: process.env.MAX_FILE_SIZE || '5mb' 
}));

// Compression middleware
app.use(compression());

app.use(cookieParser());

// Logging middleware
const loggingConfig = getLoggingConfig();
if (process.env.NODE_ENV === 'production') {
    // In production, use minimal HTTP request logging
    if (!loggingConfig.disableHttpLogging) {
        app.use(morgan('combined'));
    }
} else {
    // In development, use detailed logging
    app.use(morgan('dev'));
}

// MySQL session store options
const sessionStore = new MySQLStore({
  host: dbConfig.host,
  port: dbConfig.port || 3306,
  user: dbConfig.username,
  password: dbConfig.password,
  database: dbConfig.database,
  // You can add more options if needed
});

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
  }
}));

// Initialize Passport and restore authentication state from session
app.use(passport.initialize());
app.use(passport.session());

// Create uploads directory if it doesn't exist
const uploadsDir = join(__dirname, process.env.UPLOAD_PATH || 'uploads');
const seoUploadsDir = join(uploadsDir, 'seo');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(seoUploadsDir)) {
    fs.mkdirSync(seoUploadsDir, { recursive: true });
}

// Serve static files with logging
app.use('/uploads', (req, res, next) => {
    logger.debug('Static file request:', req.originalUrl);
    next();
}, express.static(uploadsDir));

// Handle trailing slashes in uploads URLs - ONLY if URL actually ends with /
app.use('/uploads', (req, res, next) => {
    // Only redirect if the URL actually ends with a trailing slash
    if (req.originalUrl.endsWith('/') && req.originalUrl !== '/uploads/') {
        logger.debug('Trailing slash detected in uploads URL:', req.originalUrl);
        const newUrl = req.originalUrl.slice(0, -1);
        logger.debug('Redirecting to:', newUrl);
        return res.redirect(301, newUrl);
    }
    next();
});

// Enhanced health check API endpoint
app.get('/api/health', async (req, res) => {
    try {
        const dbStatus = await sequelize.authenticate()
            .then(() => 'connected')
            .catch(() => 'disconnected');
        
    const healthData = {
        uptime: process.uptime(),
        timestamp: Date.now(),
        status: 'ok',
            environment: process.env.NODE_ENV,
            version: process.env.npm_package_version || '1.0.0',
        database: {
                status: dbStatus,
                host: process.env.DB_HOST,
                database: process.env.DB_DATABASE
            },
            memory: {
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
        }
    };
    
    res.status(200).json(healthData);
    } catch (error) {
        logger.error('Health check error:', error);
        res.status(503).json({
            status: 'error',
            message: 'Service unavailable',
            timestamp: Date.now()
        });
    }
});

// CORS debug endpoint
app.get('/api/cors-test', (req, res) => {
    res.json({
        success: true,
        message: 'CORS is working correctly',
        origin: req.headers.origin || 'No origin header',
        timestamp: new Date().toISOString(),
        headers: {
            'access-control-allow-origin': res.getHeader('access-control-allow-origin'),
            'access-control-allow-credentials': res.getHeader('access-control-allow-credentials')
        }
    });
});

// Root endpoint for basic connectivity test
app.get('/', (req, res) => {
    res.json({
        message: 'CrossCoin API is running',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
    });
});

// Mount all routes under /api
app.use('/api', routesManager);

// Use the routes
app.use('/api/facebook-pixel', facebookPixelRouter);
app.use('/api/facebook-catalog', facebookCatalogRouter);
// Dashboard analytics moved to /api/analytics to avoid conflict with /api/dashboard/stats
app.use('/api/analytics', dashboardAnalyticsRouter);
app.use('/api/utm', utmRoutes);
app.use('/api/admin', brandSettingsRoutes);
app.use('/api/admin', brandRoutes);
app.use('/api/admin', brandAssignmentRoutes);
app.use('/api/admin/lookbooks', adminLookbookRoutes);
app.use('/api/admin/reels', adminReelRoutes);

// Endpoint to receive Facebook Pixel events from frontend and sync server-side
app.post('/api/facebook-pixel', async (req, res) => {
    const { event, order } = req.body;
    if (!event || !order) {
        return res.status(400).json({ success: false, message: 'Event and order are required' });
    }
    try {
        await sendFacebookEvent(event, order);
        res.json({ success: true });
    } catch (err) {
        logger.error('Facebook Pixel error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// 404 handler for API routes only
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found',
        path: req.originalUrl
    });
});

// 404 handler for non-API routes (static files, etc.)
app.use('*', (req, res) => {
    res.status(404).send('File not found');
});

// Enhanced error handling middleware
app.use((err, req, res, next) => {
    logger.error('Error:', err);
    
    // Log additional error details in production
    if (process.env.NODE_ENV === 'production') {
        logger.error('Error details:', {
            url: req.url,
            method: req.method,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            timestamp: new Date().toISOString()
        });
    }
    
    // Handle specific error types
    if (err.name === 'SequelizeConnectionError') {
        return res.status(503).json({
            success: false,
            message: 'Database connection error',
            error: process.env.NODE_ENV === 'development' ? err.message : 'Service temporarily unavailable'
        });
    }
    
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: err.errors
        });
    }
    
    // Default error response
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        logger.info('Starting CrossCoin API server...');
        logger.info(`Environment: ${process.env.NODE_ENV}`);
        logger.info(`Port: ${PORT}`);
        
        // Monitor memory usage
        const logMemoryUsage = () => {
            const used = process.memoryUsage();
            logger.debug('Memory Usage:', {
                rss: `${Math.round(used.rss / 1024 / 1024)} MB`,
                heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)} MB`,
                heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)} MB`,
                external: `${Math.round(used.external / 1024 / 1024)} MB`
            });
            
            // Warn if memory usage is high
            const heapUsedMB = used.heapUsed / 1024 / 1024;
            if (heapUsedMB > 400) {
                logger.warn('High memory usage detected! Consider restarting the server.');
                
                // Force garbage collection if available (requires --expose-gc flag)
                if (global.gc) {
                    logger.debug('Running garbage collection...');
                    global.gc();
                }
            }
        };
        
        // Log memory usage every hour (reduced from 30 minutes)
        setInterval(logMemoryUsage, 60 * 60 * 1000);
        
        // Initialize Redis connection
        logger.info('Initializing Redis connection...');
        const redisService = require('./services/redisService.js');
        try {
            await redisService.initialize();
            logger.info('✓ Redis connection initialized');

            // Clear all cache on server start
            const cacheManager = require('./services/cacheManager.js');
            await cacheManager.clear();
            logger.info('✓ Cache cleared on startup');
        } catch (error) {
            logger.warn('Redis initialization failed:', error.message);
            logger.warn('Caching will be disabled. Ensure Redis is running for optimal performance.');
        }
        
        // Test database connection first
        logger.info('Testing database connection...');
        await sequelize.authenticate();
        logger.info('✓ Database connection successful');
        
        // Create all tables
        logger.info('Setting up database...');
        await setupDatabase();
        logger.info('✓ Database setup completed');

        // Run ImageKit migration for existing images
        logger.info('Checking for images to migrate to ImageKit...');
        try {
            await runMigrations();
            logger.info('✓ ImageKit migration completed');
        } catch (error) {
            logger.warn('ImageKit migration skipped or failed:', error.message);
            logger.warn('You can run migration manually later if needed');
        }

        // Initialize SEO data
        logger.info('Initializing SEO data...');
        await initializeSeoData();
        logger.info('✓ SEO data initialized');
        
        // Initialize cron jobs
        logger.info('Initializing cron jobs...');
        initializeCronJobs();
        logger.info('✓ Cron jobs initialized');
        
        // Start server
        const server = app.listen(PORT, () => {
            logger.info(`✓ Server is running on port ${PORT}`);
            logger.info(`✓ Health check available at: http://localhost:${PORT}/api/health`);
            logger.info(`✓ API base URL: http://localhost:${PORT}/api`);
            logMemoryUsage(); // Log initial memory usage
        });
        
        // Graceful shutdown
        process.on('SIGTERM', () => {
            logger.info('SIGTERM received, shutting down gracefully');
            server.close(() => {
                logger.info('Process terminated');
                process.exit(0);
            });
        });
        
        process.on('SIGINT', () => {
            logger.info('SIGINT received, shutting down gracefully');
            server.close(() => {
                logger.info('Process terminated');
                process.exit(0);
            });
        });
        
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught Exception:', error);
            logMemoryUsage();
        });
        
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
            logMemoryUsage();
        });
        
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();