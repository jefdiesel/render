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
  EMAIL_USER: config.email.user ? '[REDACTED]' : undefined
});

// Add this additional logging
console.log('App Configuration:', {
  PORT: config.port,
  NODE_ENV: config.env,
  APP_PUBLIC_URL: process.env.APP_PUBLIC_URL,
  STORAGE_USE_R2: process.env.STORAGE_USE_R2,
  baseUrl: config.baseUrl(),
  reportsBaseUrl: config.reportsBaseUrl()
});

// Comprehensive CORS middleware
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://a11yscan.xyz', 
      'http://a11yscan.xyz',
      'https://www.a11yscan.xyz',
      'https://funcles.xyz',
      'http://localhost:3000', 
      'http://localhost:8080',
      'http://127.0.0.1:3000',
      'https://render-docker-fdf0.onrender.com'
    ];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: [
    'Content-Type', 
    'X-API-Key', 
    'Origin', 
    'Accept', 
    'Authorization'
  ],
  credentials: true,
  optionsSuccessStatus: 204
};

// Apply CORS middleware early
app.use(cors(corsOptions));

// Handle OPTIONS preflight requests explicitly
app.options('*', cors(corsOptions));

// Logging middleware for request tracking
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.path}`);
  console.log(`[ORIGIN] ${req.get('origin') || 'No Origin'}`);
  next();
});

// Middleware
app.use(bodyParser.json({
  // Increase payload size limit
  limit: '50mb'
}));
app.use(bodyParser.urlencoded({ 
  extended: true,
  limit: '50mb'
}));

// Additional CORS error handler
app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ 
      error: 'Origin not allowed', 
      details: `Origin ${req.get('origin')} is not permitted` 
    });
  }
  next(err);
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
  validate: { trustProxy: false }
});

// Apply rate limiting to the free scan endpoint
app.use('/api/free-scan', limiter);

// Serve static files
app.use(express.static(path.join(__dirname, 'public'), {
  // Improve static file serving
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.set('Cache-Control', 'no-cache');
    }
  }
}));

// Register routes
app.use(routes);

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  
  // Determine error response based on error type
  const statusCode = err.status || 500;
  const errorResponse = {
    error: 'An unexpected error occurred',
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  };

  res.status(statusCode).json(errorResponse);
});

// Ensure necessary directories exist at startup
storage.ensureDirectoriesExist()
  .then(() => {
    // Start the server
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Allowed Origins: ${corsOptions.origin.join(', ')}`);
    });

    // Configure server timeout
    server.setTimeout(5 * 60 * 1000); // 5 minutes
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
