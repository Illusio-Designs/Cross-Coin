const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const { sequelize } = require('./config/db.js');
const routesManager = require('./routes/routesManager.js');
const passport = require('./config/passport.js');
const session = require('express-session');
const { dirname, join } = require('path');
const { fileURLToPath } = require('url');
const { initializeSeoData } = require('./utils/initializeSeoData.js');
const fs = require('fs');
const { setupDatabase } = require('./scripts/setupDatabase.js');
const corsOptions = require('./config/corsConfig.js');
const { sendFacebookEvent } = require('./integration/facebookPixel.js');

// Get the directory name of the current module
// In CommonJS, __filename and __dirname are already available

// Import routes
const googleAnalyticsRouter = require('./integration/googleAnalytics.js');
const facebookPixelRouter = require('./integration/facebookPixel.js');
const facebookCatalogRouter = require('./integration/facebookCatalog.js');
const dashboardAnalyticsRouter = require('./integration/dashboardAnalytics.js');

// Initialize dotenv
dotenv.config();

const app = express();

// CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(cookieParser());
app.use(morgan('dev'));

// Redis session store setup
let sessionStore;
if (process.env.NODE_ENV === 'production' && process.env.REDIS_URL) {
  const RedisStore = require('connect-redis')(session);
  const redis = require('redis');
  const redisClient = redis.createClient({ url: process.env.REDIS_URL });
  redisClient.connect().catch(console.error);
  sessionStore = new RedisStore({ client: redisClient });
  console.log('Using Redis for session storage.');
} else {
  sessionStore = undefined; // Use default MemoryStore in development
  console.log('Using MemoryStore for session storage (development only).');
}

// Session configuration
app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Initialize Passport and restore authentication state from session
app.use(passport.initialize());
app.use(passport.session());

// Create uploads directory if it doesn't exist
const uploadsDir = join(__dirname, 'uploads');
const seoUploadsDir = join(uploadsDir, 'seo');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(seoUploadsDir)) {
    fs.mkdirSync(seoUploadsDir, { recursive: true });
}

// Serve static files
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// Health check API endpoint
app.get('/api/health', (req, res) => {
    const healthData = {
        uptime: process.uptime(),
        timestamp: Date.now(),
        status: 'ok',
        database: {
            status: sequelize.authenticate().then(() => 'connected').catch(() => 'disconnected')
        }
    };
    
    res.status(200).json(healthData);
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
    res.status(500).json({ success: false, message: err.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        // Create all tables
        await setupDatabase();

        // Now it's safe to initialize SEO data
        await initializeSeoData();
        
        // Start server
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

module.exports = app;