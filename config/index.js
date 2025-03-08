// config/index.js
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

module.exports = {
  // Server configuration
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',

  // Email service configuration
  email: {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    from: process.env.EMAIL_FROM || 'hello@a11yscan.xyz',
    errorEmail: process.env.ERROR_EMAIL || 'errors@a11yscan.xyz',
    adminEmail: process.env.ADMIN_EMAIL || 'hello@a11yscan.xyz'
  },

  // CORS configuration
  cors: {
    // Explicitly defined allowed origins
    origin: [
      'https://a11yscan.xyz', 
      'http://a11yscan.xyz',
      'https://www.a11yscan.xyz',
      'https://funcles.xyz',
      'http://localhost:3000', 
      'http://localhost:8080',
      'http://127.0.0.1:3000',
      'https://render-docker-fdf0.onrender.com'
    ],
    
    // Allowed HTTP methods
    methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
    
    // Allowed headers
    allowedHeaders: [
      'Content-Type', 
      'X-API-Key', 
      'Origin', 
      'Accept', 
      'Authorization'
    ],
    
    // Enable credentials support
    credentials: true,
    
    // Disable preflight continuation
    preflightContinue: false,
    
    // Successful options request status
    optionsSuccessStatus: 204
  },

  // File system paths
  paths: {
    data: path.join(__dirname, '..', 'data'),
    public: path.join(__dirname, '..', 'public'),
    images: path.join(__dirname, '..', 'public', 'images'),
    reports: path.join(__dirname, '..', 'reports'),
    pdfReports: path.join(__dirname, '..', 'reports', 'pdf'),
    csvReports: path.join(__dirname, '..', 'reports', 'csv')
  },

  // Scanning configuration
  scan: {
    // Threshold for triggering a deep scan
    deepScanThreshold: 90,
    
    // Maximum number of pages to scan in free tier
    maxPages: 5
  },

  // Storage configuration
  storage: {
    // Whether to use R2 storage
    useR2: process.env.STORAGE_USE_R2 === 'true',
    
    // R2 storage paths
    r2: {
      reports: 'reports',
      pdf: 'reports/pdf',
      csv: 'reports/csv',
      images: 'images',
      data: 'data'
    }
  },

  // Base URL generation functions
  baseUrl: () => {
    return process.env.NODE_ENV === 'production'
      ? (process.env.APP_PUBLIC_URL || 'https://a11yscan.xyz')
      : `http://localhost:${module.exports.port}`;
  },

  // Reports base URL generation
  reportsBaseUrl: () => {
    // Use reports domain if specified
    return process.env.REPORTS_DOMAIN || (
      process.env.NODE_ENV === 'production'
        ? 'https://funcles.xyz'
        : `http://localhost:${module.exports.port}`
    );
  },

  // Report URL generator
  reportUrlGenerator: (scanId, type) => {
    const baseUrl = module.exports.reportsBaseUrl();
    const validTypes = ['pdf', 'csv'];
    
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid report type: ${type}`);
    }

    return `${baseUrl}/reports/${type}/${scanId}.${type}`;
  }
};
