// Backend/config/corsConfig.js
const allowedOrigins = [
  // Production domains
  'https://crosscoin.in',
  'https://www.crosscoin.in',
  'https://api.crosscoin.in',
  
  // Development domains
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  
  // Additional domains for testing
  'https://staging.crosscoin.in',
  'https://dev.crosscoin.in'
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      console.warn(`CORS blocked request from: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Accept',
    'Origin',
    'X-API-Key'
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range', 'X-Total-Count'],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
};

module.exports = corsOptions; 