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

// Comprehensive CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // List of allowed origins
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
    if (!origin || allowedOrigins.includes(origin)) {
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
  optionsSuccessStatus: 204,
  preflightContinue: false
};

// Trust proxy for CORS and rate limiting
app.set('trust proxy', 1);

// Apply CORS middleware as early as possible
app.use(cors(corsOptions));

// Handle OPTIONS preflight requests explicitly
app.options('*', cors(corsOptions));

// Logging middleware for debugging
app.use((req, res, next) => {
  console.log(`[CORS DEBUG] Origin: ${req.get('origin') || 'No Origin'}`);
  console.log(`[CORS DEBUG] Method: ${req.method}`);
  next();
});

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Additional CORS error handler
app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ 
      error: true,
      message: 'Origin not allowed',
      details: `Origin ${req.get('origin')} is not permitted` 
    });
  }
  next(err);
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: { 
    error: true, 
    message: 'Too many requests, please try again later.' 
  },
  validate: { trustProxy: false }
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
    error: true,
    message: 'An unexpected error occurred',
    details: err.message
  });
});

// Start server
storage.ensureDirectoriesExist()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Allowed Origins: ${corsOptions.origin.toString()}`);
    });
  })
  .catch(error => {
    console.error('Error creating directories:', error);
    process.exit(1);
  });

module.exports = app;
