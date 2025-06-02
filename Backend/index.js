import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { sequelize } from './config/db.js';
import routesManager from './routes/routesManager.js';
import passport from './config/passport.js';
import session from 'express-session';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { setupDatabase, findAvailablePort } from './scripts/setupDatabase.js';
import { initializeSeoData } from './utils/initializeSeoData.js';
import fs from 'fs';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import routes - convert to ES module imports
import googleAnalyticsRouter from './integration/googleAnalytics.js';
import facebookPixelRouter from './integration/facebookPixel.js';
import facebookCatalogRouter from './integration/facebookCatalog.js';
import dashboardAnalyticsRouter from './integration/dashboardAnalytics.js';

// Initialize dotenv
dotenv.config();

const app = express();

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 86400 // 24 hours
}));

// Body parsing middleware
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(cookieParser());
app.use(morgan('dev'));

// Session configuration
app.use(session({
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
        // Setup database
        await setupDatabase();
        
        // Initialize default SEO data
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

export { app };
export default app;