const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
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
const corsOptions = require('./config/corsConfig.js');
const { sendFacebookEvent } = require('./integration/facebookPixel.js');

// Import routes
const googleAnalyticsRouter = require('./integration/googleAnalytics.js');
const facebookPixelRouter = require('./integration/facebookPixel.js');
const facebookCatalogRouter = require('./integration/facebookCatalog.js');
const dashboardAnalyticsRouter = require('./integration/dashboardAnalytics.js');

// Initialize dotenv
dotenv.config();

// Debug environment variables on startup
console.log('Environment variables loaded:', {
    API_URL: process.env.API_URL,
    BACKEND_URL: process.env.BACKEND_URL,
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    DB_HOST: process.env.DB_HOST,
    DB_DATABASE: process.env.DB_DATABASE
});

const app = express();

// CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests
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
app.use(cookieParser());

// Logging middleware
if (process.env.NODE_ENV === 'production') {
    app.use(morgan('combined'));
} else {
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

// Serve static files
app.use('/uploads', express.static(uploadsDir));

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
        console.error('Health check error:', error);
        res.status(503).json({
            status: 'error',
            message: 'Service unavailable',
            timestamp: Date.now()
        });
    }
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
app.use('/api/google-analytics', googleAnalyticsRouter);
app.use('/api/facebook-pixel', facebookPixelRouter);
app.use('/api/facebook-catalog', facebookCatalogRouter);
app.use('/api/dashboard', dashboardAnalyticsRouter);

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
        console.error('Facebook Pixel error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found',
        path: req.originalUrl
    });
});

// Enhanced error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    // Log additional error details in production
    if (process.env.NODE_ENV === 'production') {
        console.error('Error details:', {
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
        console.log('Starting CrossCoin API server...');
        console.log(`Environment: ${process.env.NODE_ENV}`);
        console.log(`Port: ${PORT}`);
        
        // Test database connection first
        console.log('Testing database connection...');
        await sequelize.authenticate();
        console.log('✓ Database connection successful');
        
        // Create all tables
        console.log('Setting up database...');
        await setupDatabase();
        console.log('✓ Database setup completed');

        // Initialize SEO data
        console.log('Initializing SEO data...');
        await initializeSeoData();
        console.log('✓ SEO data initialized');
        
        // Start server
        const server = app.listen(PORT, () => {
            console.log(`✓ Server is running on port ${PORT}`);
            console.log(`✓ Health check available at: http://localhost:${PORT}/api/health`);
            console.log(`✓ API base URL: http://localhost:${PORT}/api`);
        });
        
        // Graceful shutdown
        process.on('SIGTERM', () => {
            console.log('SIGTERM received, shutting down gracefully');
            server.close(() => {
                console.log('Process terminated');
                process.exit(0);
            });
        });
        
        process.on('SIGINT', () => {
            console.log('SIGINT received, shutting down gracefully');
            server.close(() => {
                console.log('Process terminated');
                process.exit(0);
            });
        });
        
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

startServer();