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
const { join } = require('path');
const { initializeSeoData } = require('./utils/initializeSeoData.js');
const fs = require('fs');
const { setupDatabase } = require('./scripts/setupDatabase.js');
const corsOptions = require('./config/corsConfig.js');
const { sendFacebookEvent } = require('./integration/facebookPixel.js');
const { logger, getLoggingConfig } = require('./config/logging.js');
const { fork } = require('child_process');
const path = require('path');

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

// Fatal check: SESSION_SECRET must be set in production
if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
    logger.error('FATAL: SESSION_SECRET environment variable is not set. Refusing to start in production.');
    process.exit(1);
};

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

// Trust reverse proxy (Nginx) — required for correct IP in rate limiting and req.ip
app.set('trust proxy', 1);

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

// Cache-Control middleware (Requirement 2.5)
// Public read-only GET endpoints get public cache; authenticated/write endpoints get no-store
app.use((req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = (body) => {
        if (!res.getHeader('Cache-Control')) {
            const isPublicGet = req.method === 'GET' && !req.headers.authorization && !req.headers['x-brand-name'];
            if (isPublicGet) {
                res.set('Cache-Control', 'public, max-age=300');
            } else {
                res.set('Cache-Control', 'no-store');
            }
        }
        return originalJson(body);
    };
    next();
});

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
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-only-session-secret-change-in-production',
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

// Serve static files with Cache-Control and ETag headers (Requirement 4.4)
app.use('/uploads', (req, res, next) => {
    res.set('Cache-Control', 'public, max-age=86400');
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
    const isProd = process.env.NODE_ENV === 'production';

    if (!isProd) {
        logger.error('Error:', err);
    } else {
        // In production, log without stack/SQL details in response
        logger.error('Error:', { message: err.message, url: req.url, method: req.method, ip: req.ip });
    }
    
    // Handle specific error types
    if (err.name === 'SequelizeConnectionError') {
        return res.status(503).json({
            success: false,
            message: 'Database connection error',
            error: isProd ? 'Service temporarily unavailable' : err.message
        });
    }
    
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: err.errors
        });
    }

    // Multer file size error
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ success: false, message: 'File too large' });
    }

    // Multer invalid file type
    if (err.message && err.message.startsWith('Invalid file type')) {
        return res.status(400).json({ success: false, message: err.message });
    }
    
    // Default error response — never expose stack/SQL in production
    res.status(err.status || 500).json({
        success: false,
        message: isProd ? 'Something went wrong' : (err.message || 'Something went wrong!'),
        error: isProd ? undefined : err.stack
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
        
        // Create all tables — only runs when schema version changes
        const SCHEMA_VERSION = 'v1.4-whatsapp-features';
        let needsSetup = false;
        try {
            await sequelize.query(`CREATE TABLE IF NOT EXISTS schema_version (version VARCHAR(50) PRIMARY KEY, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
            const [rows] = await sequelize.query(`SELECT version FROM schema_version LIMIT 1`);
            needsSetup = rows.length === 0 || rows[0].version !== SCHEMA_VERSION;
        } catch { needsSetup = true; }

        if (needsSetup) {
            logger.info('Setting up database (schema version changed)...');
            await setupDatabase();
            await sequelize.query(`DELETE FROM schema_version`);
            await sequelize.query(`INSERT INTO schema_version (version) VALUES ('${SCHEMA_VERSION}')`);
            logger.info('✓ Database setup completed');
        } else {
            logger.info('✓ Database schema up-to-date, skipping setup');
        }

        // Initialize SEO data
        logger.info('Initializing SEO data...');
        await initializeSeoData();
        logger.info('✓ SEO data initialized');

        // ── Spawn background worker (separate process) ──────────────────────
        // Runs all cron jobs in its own process so they never compete with
        // API request handling. Auto-restarts on crash with backoff.
        const spawnWorker = () => {
          const worker = fork(path.join(__dirname, 'worker.js'), [], {
            env: process.env,
            silent: false, // worker logs go to same stdout/stderr
          });

          worker.on('exit', (code, signal) => {
            if (signal === 'SIGTERM' || signal === 'SIGINT') return; // intentional shutdown
            logger.warn(`[Worker] exited (code=${code}), restarting in 10s…`);
            setTimeout(spawnWorker, 10_000);
          });

          worker.on('error', (err) => {
            logger.error('[Worker] spawn error:', err.message);
          });

          logger.info(`[Worker] started (pid=${worker.pid})`);
          return worker;
        };

        let workerProcess = spawnWorker();
        
        // Start server
        const server = app.listen(PORT, () => {
            logger.info(`✓ Server is running on port ${PORT}`);
            logger.info(`✓ Health check available at: http://localhost:${PORT}/api/health`);
            logger.info(`✓ API base URL: http://localhost:${PORT}/api`);
            logMemoryUsage(); // Log initial memory usage
        });
        
        // Graceful shutdown
        const gracefulShutdown = (signal) => {
            logger.info(`${signal} received, shutting down gracefully`);
            // Force exit after 10 seconds
            const forceExit = setTimeout(() => {
                logger.error('Graceful shutdown timed out, forcing exit');
                process.exit(1);
            }, 10000);
            forceExit.unref();

            // Stop worker first
            if (workerProcess && !workerProcess.killed) {
                workerProcess.kill('SIGTERM');
            }

            server.close(async () => {
                try {
                    const redisService = require('./services/redisService.js');
                    await redisService.close();
                } catch (e) { logger.warn('Redis close error:', e.message); }
                try {
                    await sequelize.close();
                } catch (e) { logger.warn('DB close error:', e.message); }
                logger.info('Process terminated');
                process.exit(0);
            });
        };

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        
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