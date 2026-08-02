// Sentry — must be first so the SDK instruments everything below it.
// No-op unless SENTRY_DSN is set (see instrument.js).
const Sentry = require('./instrument.js');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const { sequelize } = require('./config/db.js');
const routesManager = require('./routes/routesManager.js');
const { join } = require('path');
const { initializeSeoData } = require('./utils/initializeSeoData.js');
const fs = require('fs');
const { setupDatabase } = require('./scripts/setupDatabase.js');
const corsOptions = require('./config/corsConfig.js');
const { logger, getLoggingConfig } = require('./config/logging.js');
const path = require('path');



// Initialize dotenv
dotenv.config();

// ── Startup env validation ────────────────────────────────────────────────────
// Fail fast only for secrets that MUST come from env (not DB-backed per-brand settings).
// Razorpay / WhatsApp / MSG91 / FShip creds are loaded per-brand from brand_settings
// via settingsHelper — they are NOT env vars and should not be validated here.
const REQUIRED_ENV = ['JWT_SECRET'];
const missingRequired = REQUIRED_ENV.filter(k => !process.env[k]);
if (missingRequired.length) {
    console.error(`[Startup] FATAL — missing required environment variables: ${missingRequired.join(', ')}`);
    process.exit(1);
}

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

// Rate limiting — granular per route type
const rateLimit = require('express-rate-limit');

// Strict: auth, OTP, checkout, payments (10 req / 15 min)
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' } },
});

// Medium: order creation, address creation (30 req / 15 min)
const mediumLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests.' } },
});

// Public, cached, read-only GET endpoints. The storefront renders server-side
// on Vercel, so every SSR call reaches this API from a small pool of Vercel IPs
// — with IP-based limiting that whole stream looks like one client and can trip
// the general limiter, 429-ing the storefront under load. These endpoints are
// idempotent and already edge/Redis-cached, so rate-limiting them buys little
// abuse protection; we skip them (GET only) to keep the storefront reliable.
// Writes (POST/PUT/DELETE) to the same paths, and every sensitive/auth endpoint,
// still go through the limiter.
const PUBLIC_READ_PREFIXES = [
  '/api/sliders', '/api/categories', '/api/products', '/api/seo',
  '/api/public', '/api/blogs', '/api/reviews', '/api/lookbooks',
  '/api/reels', '/api/policies', '/api/faqs',
];
const isPublicReadGet = (req) => {
  if ((req.method || 'GET').toUpperCase() !== 'GET') return false;
  const path = (req.originalUrl || req.url || '').split('?')[0];
  return PUBLIC_READ_PREFIXES.some((p) => path.startsWith(p));
};

// General: all other API routes (120 req / min), skipping public cached reads.
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  skip: isPublicReadGet,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests.' } },
});

// Strict routes
app.use('/api/users/login', strictLimiter);
app.use('/api/users/register', strictLimiter);
app.use('/api/orders/checkout', strictLimiter);
app.use('/api/checkout/send-otp', strictLimiter);
app.use('/api/checkout/verify-otp', strictLimiter);
app.use('/api/checkout/initiate', strictLimiter);
app.use('/api/checkout/retry', strictLimiter);
app.use('/api/checkout/guest/initiate', strictLimiter);
app.use('/api/payments/razorpay', strictLimiter);

// Medium routes
app.use('/api/orders', mediumLimiter);
app.use('/api/shipping-addresses', mediumLimiter);

// General
app.use('/api/', generalLimiter);

// CORS middleware - MUST be before other middleware (handles preflight requests)
app.use(cors(corsOptions));

// Body parsing middleware. Image files never travel as JSON (they go through
// multipart upload endpoints), so 1mb is normally plenty — but blog posts save
// their full rich-text `sections` as a JSON body, and a long article (or one an
// admin built before inline images were uploaded as URLs) can exceed 1mb and
// get rejected with 413 on save. Raise the JSON limit to a safe 5mb so genuine
// content saves; urlencoded stays tight since no large form bodies use it.
app.use(express.json({
    limit: '5mb',
    verify: (req, res, buf) => { req.rawBody = buf; }
}));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Compression middleware
app.use(compression());

// Cache-Control middleware (Requirement 2.5)
// Public read-only GET endpoints get public cache; authenticated/write endpoints get no-store
app.use((req, res, next) => {
    // The same API host serves every brand, distinguished only by the
    // X-Brand-Name request header. Any response marked `public` therefore varies
    // by that header — advertise it with Vary so browsers (and any CDN that
    // honours Vary) never serve one brand's cached response to another. This is
    // the standards-correct guard; a shared CDN like Cloudflare should ALSO add
    // X-Brand-Name to its cache key, since Cloudflare's free tier ignores Vary.
    res.vary('X-Brand-Name');

    const originalJson = res.json.bind(res);
    res.json = (body) => {
        if (!res.getHeader('Cache-Control')) {
            const isPublicGet = req.method === 'GET' && !req.headers.authorization && !req.headers['x-brand-name'];
            if (isPublicGet) {
                res.set('Cache-Control', 'public, max-age=300, s-maxage=600, stale-while-revalidate=600');
            } else {
                res.set('Cache-Control', 'no-store');
            }
        }
        return originalJson(body);
    };
    next();
});

app.use(cookieParser());

// Structured request logging (replaces morgan)
const { requestLogger } = require('./config/logging.js');
app.use(requestLogger);

// Passport + session removed — using JWT-only auth

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

// ── robots.txt — tell crawlers this is an API, not a website ─────────────────
app.get('/robots.txt', (req, res) => {
    res.type('text/plain').send('User-agent: *\nDisallow: /\n');
});

// ── Health check endpoints ────────────────────────────────────────────────────

// Main health check
app.get('/api/health', async (req, res) => {
    const mem = process.memoryUsage();
    const dbOk = await sequelize.authenticate().then(() => true).catch(() => false);
    const redisService = require('./services/redisService.js');
    const redisOk = redisService.isReady();
    const allOk = dbOk; // Redis is optional

    res.status(allOk ? 200 : 503).json({
        status: allOk ? 'ok' : 'degraded',
        uptime: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        version: process.env.npm_package_version || '1.0.0',
        services: {
            database: dbOk ? 'connected' : 'disconnected',
            redis: redisOk ? 'connected' : 'disconnected',
        },
        memory: {
            heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
            heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
            rssMB: Math.round(mem.rss / 1024 / 1024),
        },
    });
});

// DB-only health check (for deployment readiness probes)
app.get('/api/health/db', async (req, res) => {
    try {
        await sequelize.authenticate();
        const [result] = await sequelize.query('SELECT 1 as ok');
        res.json({ status: 'ok', latency: 'fast' });
    } catch (e) {
        res.status(503).json({ status: 'error', error: e.message });
    }
});

// Operator metrics — counts and rates for the in-process integration queue,
// memory, uptime. Restricted to ADMIN_METRICS_TOKEN header so it's safe to
// leave on a public host.
app.get('/api/metrics', async (req, res) => {
    // Fail-closed token gate — never expose queue/memory/infra metrics publicly.
    const { checkToken } = require('./middleware/adminAuth.js');
    const gate = checkToken({
        presented: (req.headers['x-metrics-token'] || req.query.token || '').toString(),
        expected: process.env.ADMIN_METRICS_TOKEN,
        isProduction: process.env.NODE_ENV === 'production',
    });
    if (!gate.ok) return res.status(gate.status).json({ success: false, message: gate.message });
    try {
        const integrationQueue = require('./services/integrationQueue.js');
        const queueStats = await integrationQueue.getStats();
        const mem = process.memoryUsage();
        const cpu = process.cpuUsage();
        const redisService = require('./services/redisService.js');

        res.json({
            success: true,
            data: {
                uptime_seconds: Math.round(process.uptime()),
                memory: {
                    heap_used_mb: Math.round(mem.heapUsed / 1024 / 1024),
                    heap_total_mb: Math.round(mem.heapTotal / 1024 / 1024),
                    rss_mb: Math.round(mem.rss / 1024 / 1024),
                    external_mb: Math.round(mem.external / 1024 / 1024),
                },
                cpu: {
                    user_us: cpu.user,
                    system_us: cpu.system,
                },
                integration_queue: queueStats,
                redis_connected: redisService.isReady(),
                node_version: process.version,
                env: process.env.NODE_ENV || 'development',
            },
        });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Redis-only health check
app.get('/api/health/redis', async (req, res) => {
    try {
        const redisService = require('./services/redisService.js');
        if (!redisService.isReady()) throw new Error('Redis not connected');
        await redisService.set('health_check', 'ok', 'EX', 10);
        const val = await redisService.get('health_check');
        res.json({ status: val === 'ok' ? 'ok' : 'error', connected: redisService.isReady() });
    } catch (e) {
        res.status(503).json({ status: 'error', error: e.message });
    }
});

// CSRF token endpoint — frontend calls this on dashboard load to get a
// token to mirror into X-CSRF-Token on subsequent state-changing requests.
// Enforcement is opt-in via CSRF_REQUIRED=true env var.
const { csrfTokenHandler } = require('./middleware/csrf.js');
app.get('/api/csrf/token', csrfTokenHandler);
app.get('/api/v1/csrf/token', csrfTokenHandler);

// OpenAPI spec + Swagger UI. Gated by ADMIN_METRICS_TOKEN when set.
// Skipped if the optional swagger packages aren't installed.
try {
    const { mountSwagger } = require('./config/openapi.js');
    mountSwagger(app);
    logger.info('✓ OpenAPI docs at /api/docs');
} catch (err) {
    logger.warn('OpenAPI mount skipped: ' + err.message);
}

// Client-side error sink — receives drained entries from the storefront
// errorReporter (ErrorBoundary catches + unhandled rejections + window
// errors). Logs at WARN so they end up in logs/app.log alongside other
// operational signals. No DB write — keep it cheap; if volume grows,
// swap the body of the handler for a Sentry call.
app.post('/api/client-errors', (req, res) => {
    try {
        const e = req.body || {};
        const ua = (e.ua || '').toString().slice(0, 200);
        const msg = (e.message || 'unknown').toString().slice(0, 500);
        logger.warn(`[client-error:${e.kind || 'unknown'}] ${msg} | ${e.href || ''} | ${ua}`);
    } catch { /* never throw from a logging endpoint */ }
    res.status(204).end();
});

// CORS debug endpoint
app.get('/api/v1/cors-test', (req, res) => {
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

// All routes under /api and /api/v1 (both supported)
app.use('/api/v1', routesManager);
app.use('/api', routesManager);  // backward compat

// Swagger API docs at /api/docs
require('./docs/swagger.js')(app);

// 404 handler for API routes only
app.use(/^\/api\/v1\//, (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found',
        path: req.originalUrl
    });
});

// 404 handler for non-API routes (static files, etc.)
app.use((req, res) => {
    res.status(404).send('File not found');
});

// Sentry Express error handler — must be registered AFTER all routes but
// BEFORE the centralized error middleware, so it sees every error the
// controllers throw. No-op unless SENTRY_DSN is set.
Sentry.setupExpressErrorHandler(app);

// Centralized error handling — catches all AppError + Sequelize + unknown errors
const errorMiddleware = require('./middleware/errorMiddleware.js');
app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        logger.info('Starting CrossCoin API server...');
        logger.info(`Environment: ${process.env.NODE_ENV}`);
        logger.info(`Port: ${PORT}`);
        
        // Memory monitor — warn at 300MB (safe ceiling on 2GB shared server)
        // API + Worker + MySQL + Redis should all fit under 1.5GB total
        const logMemoryUsage = () => {
            const used = process.memoryUsage();
            const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
            const rssMB = Math.round(used.rss / 1024 / 1024);

            if (heapUsedMB > 300) {
                logger.warn(`[Memory] HIGH — heap: ${heapUsedMB}MB rss: ${rssMB}MB`);
                if (global.gc) global.gc();
            } else {
                logger.info(`[Memory] heap: ${heapUsedMB}MB rss: ${rssMB}MB`);
            }
        };

        // Check every 30 minutes
        setInterval(logMemoryUsage, 30 * 60 * 1000);
        
        // Initialize Redis — skip cache flush on boot (wastes memory and time)
        const redisService = require('./services/redisService.js');
        try {
            await redisService.initialize();
            logger.info('✓ Redis connected');
        } catch (error) {
            logger.warn('Redis unavailable — caching disabled: ' + error.message);
        }
        
        // Test database connection first
        logger.info('Testing database connection...');
        await sequelize.authenticate();
        logger.info('✓ Database connection successful');

        // ── Idempotent migration: users.roles (multi-role support) ─────────
        // Production doesn't run sequelize sync, so ensure the column exists
        // here. Guarded by information_schema → a no-op once applied and safe
        // on every boot. Runs BEFORE the server accepts requests, so the User
        // model's `roles` field never references a missing column (which would
        // otherwise break authentication).
        try {
            const [cols] = await sequelize.query(
                `SELECT COLUMN_NAME FROM information_schema.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'roles'`
            );
            if (!cols.length) {
                logger.info('Migrating: adding users.roles column…');
                await sequelize.query(`ALTER TABLE users ADD COLUMN roles JSON NULL AFTER role`);
                logger.info('✓ users.roles column added');
            }
        } catch (err) {
            logger.error('users.roles column migration failed: ' + err.message);
        }

        // Create all tables — only runs when schema version changes
        const SCHEMA_VERSION = 'v2.0-landmark-and-address-hash';
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

        // Initialize SEO data — only runs once, skipped on subsequent boots
        // Piggybacks on the schema_version table to avoid a DB query every start
        try {
            const [seoRows] = await sequelize.query(`SELECT version FROM schema_version WHERE version = 'seo-init-done' LIMIT 1`);
            if (!seoRows.length) {
                logger.info('Initializing SEO data (first time only)...');
                await initializeSeoData();
                await sequelize.query(`INSERT IGNORE INTO schema_version (version) VALUES ('seo-init-done')`);
                logger.info('✓ SEO data initialized');
            } else {
                logger.info('✓ SEO data already initialized, skipping');
            }
        } catch {
            // Fallback: run it anyway if the check fails
            await initializeSeoData();
        }

        // ── Run cron jobs in-process (saves ~80MB vs child process) ─────────
        try {
          const { initCronJobs } = require('./worker.js');
          initCronJobs();
          logger.info('✓ Cron jobs initialized in-process');
        } catch (err) {
          logger.error('[Worker] Failed to initialize cron jobs:', err.message);
        }

        // ── Integration retry queue workers (Bull on Redis) ───────────────
        // Wires shipping-sync / payment-reconcile / whatsapp-send retries.
        // Falls back to inline execution if Redis isn't available.
        try {
          const { registerWorkers } = require('./services/integrationQueueWorkers.js');
          registerWorkers();
        } catch (err) {
          logger.warn('[Worker] integration queue workers failed to register: ' + err.message);
        }
        
        // Start server
        const server = app.listen(PORT, () => {
            logger.info(`✓ Server is running on port ${PORT}`);
            logger.info(`✓ Health check available at: http://localhost:${PORT}/api/v1/health`);
            logger.info(`✓ API base URL: http://localhost:${PORT}/api/v1`);
            logMemoryUsage(); // Log initial memory usage
            // Nudge: internal endpoints fail closed in prod, so flag missing secrets.
            if (process.env.NODE_ENV === 'production') {
                if (!process.env.ADMIN_METRICS_TOKEN) logger.warn('⚠️  ADMIN_METRICS_TOKEN is not set — /api/metrics is locked (503) until you set it.');
                if (!process.env.CRON_TOKEN && !process.env.ADMIN_METRICS_TOKEN) logger.warn('⚠️  CRON_TOKEN is not set — /api/cron/run will reject (401) until you set it.');
            }
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

            server.close(async () => {
                try {
                    const { close: closeIntegrationQueue } = require('./services/integrationQueue.js');
                    await closeIntegrationQueue();
                } catch (e) { logger.warn('Integration queue close error:', e.message); }
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
            logger.error('Uncaught Exception:', { message: error.message, stack: error.stack });
            logMemoryUsage();
        });
        
        process.on('unhandledRejection', (reason) => {
            logger.error('Unhandled Rejection:', { message: reason?.message || String(reason), stack: reason?.stack });
            logMemoryUsage();
        });
        
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();