// config/index.js
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

module.exports = {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',
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
  cors: {
    // Use environment variables if available, otherwise use defaults
    origin: process.env.CORS_ALLOW_ORIGIN 
      ? process.env.CORS_ALLOW_ORIGIN.split(',') 
      : (process.env.NODE_ENV === 'production' 
        ? ['https://a11yscan.xyz', 'https://www.a11yscan.xyz', 'https://render-docker-fdf0.onrender.com'] 
        : ['http://localhost:3000']),
    
    // Allow necessary methods
    methods: process.env.CORS_ALLOW_METHODS 
      ? process.env.CORS_ALLOW_METHODS.split(',') 
      : ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
    
    // Comprehensive headers
    allowedHeaders: process.env.CORS_ALLOW_HEADERS
      ? process.env.CORS_ALLOW_HEADERS.split(',')
      : ['Content-Type', 'X-API-Key', 'Origin', 'Accept', 'Authorization'],
    
    // Enable credentials support
    credentials: true,
    
    // Additional CORS configuration
    preflightContinue: false,
    optionsSuccessStatus: 204
  },
  paths: {
    data: path.join(__dirname, '..', 'data'),
    public: path.join(__dirname, '..', 'public'),
    images: path.join(__dirname, '..', 'public', 'images'),
    reports: path.join(__dirname, '..', 'reports'),
    pdfReports: path.join(__dirname, '..', 'reports', 'pdf'),
    csvReports: path.join(__dirname, '..', 'reports', 'csv')
  },
  scan: {
    deepScanThreshold: 90, // Score threshold to trigger deep scan
    maxPages: 5 // Maximum pages for free scan
  },
  storage: {
    // Whether to use R2 or local filesystem
    useR2: process.env.STORAGE_USE_R2 === 'true',
    
    // R2 folder paths
    r2: {
      reports: 'reports',
      pdf: 'reports/pdf',
      csv: 'reports/csv',
      images: 'images',
      data: 'data'
    }
  },
  baseUrl: () => {
    // Always use APP_PUBLIC_URL in production
    if (process.env.NODE_ENV === 'production' && process.env.APP_PUBLIC_URL) {
      return process.env.APP_PUBLIC_URL.trim();
    }
    
    // Force production URL even in development mode
    if (process.env.FORCE_PRODUCTION_URLS === 'true' && process.env.APP_PUBLIC_URL) {
      return process.env.APP_PUBLIC_URL.trim();
    }
    
    // Default for local development
    return `http://localhost:${module.exports.port}`;
  },
  reportsBaseUrl: () => {
    // If using R2 with custom domain for reports
    if (process.env.STORAGE_USE_R2 === 'true' && process.env.R2_PUBLIC_DOMAIN) {
      const domain = process.env.R2_PUBLIC_DOMAIN.trim();
      return domain.startsWith('http') ? domain : `https://${domain}`;
    }
    
    // Otherwise use app URL - prioritize APP_PUBLIC_URL
    if (process.env.NODE_ENV === 'production' && process.env.APP_PUBLIC_URL) {
      return process.env.APP_PUBLIC_URL.trim();
    }
    
    // Force production URL even in development
    if (process.env.FORCE_PRODUCTION_URLS === 'true' && process.env.APP_PUBLIC_URL) {
      return process.env.APP_PUBLIC_URL.trim();
    }
    
    // Fallback to default URL
    return process.env.NODE_ENV === 'production'
      ? 'https://render-docker-fdf0.onrender.com'
      : `http://localhost:${module.exports.port}`;
  }
};
