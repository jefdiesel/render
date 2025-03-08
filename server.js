const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const routes = require('./routes');
const storage = require('./services/storage');

// Create the Express app
const app = express();
const PORT = config.port;

// Trust proxy - important for rate limiting behind a proxy
app.set('trust proxy', 'loopback, linklocal, uniquelocal');

// Log configuration at startup
console.log('Email Config at Runtime:', {
  EMAIL_HOST: config.email.host,
  EMAIL_PORT: config.email.port,
  EMAIL_SECURE: config.email.secure,
  EMAIL_USER: config.email.user,
  EMAIL_PASS: config.email.pass ? '[REDACTED]' : undefined
});

// Add this additional logging
console.log('App Configuration:', {
  PORT: config.port,
  NODE_ENV: config.env,
  APP_PUBLIC_URL: process.env.APP_PUBLIC_URL,
  STORAGE_USE_R2: process.env.STORAGE_USE_R2,
  baseUrl: config.baseUrl(),
  reportsBaseUrl: config.reportsBaseUrl(),
  CORS_ORIGINS: config.cors.origin
});

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configure CORS with detailed options
const corsOptions = {
  ...config.cors,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Additional CORS handling - ensure this is before any routes
app.use((req, res, next) => {
  // Read origins from config
  const allowedOrigins = Array.isArray(config.cors.origin) 
    ? config.cors.origin 
    : [config.cors.origin];
  
  const origin = req.headers.origin;
  
  // Check if the origin is in our allowed list
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', config.cors.methods.join(','));
    res.setHeader('Access-Control-Allow-Headers', config.cors.allowedHeaders.join(','));
    
    if (config.cors.credentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
  }
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(204).send();
  }
  
  next();
});

// Logging middleware for CORS debugging
app.use((req, res, next) => {
  console.log(`[CORS DEBUG] Request from origin: ${req.get('origin')}`);
  console.log(`[CORS DEBUG] Request method: ${req.method}`);
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
  validate: { trustProxy: false }  // This disables the validation warning
});

// Apply rate limiting to the free scan endpoint
app.use('/api/free-scan', limiter);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Register routes
app.use(routes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({
    error: 'An unexpected error occurred',
    message: err.message || 'Internal Server Error'
  });
});

// Ensure necessary directories exist at startup
storage.ensureDirectoriesExist()
  .then(() => {
    // Start the server
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Allowed CORS origins: ${Array.isArray(config.cors.origin) ? config.cors.origin.join(', ') : config.cors.origin}`);
    });
  })
  .catch(error => {
    console.error('Error creating directories:', error);
    process.exit(1);
  });

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Give time for logging before exiting
  setTimeout(() => process.exit(1), 1000);
});

module.exports = app; // For testing purposes
