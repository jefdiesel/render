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
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://a11yscan.xyz'] 
      : ['http://localhost:3000'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'X-API-Key']
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
    return process.env.NODE_ENV === 'production'
      ? (process.env.APP_PUBLIC_URL || 'https://a11yscan.xyz')
      : `http://localhost:${module.exports.port}`;
  },
  reportsBaseUrl: () => {
    // If using R2 with custom domain for reports
    if (process.env.STORAGE_USE_R2 === 'true' && process.env.R2_PUBLIC_DOMAIN) {
      return `https://${process.env.R2_PUBLIC_DOMAIN}`;
    }
    
    // Otherwise use app URL
    return process.env.NODE_ENV === 'production'
      ? (process.env.APP_PUBLIC_URL || 'https://render-docker-fdf0.onrender.com')
      : `http://localhost:${module.exports.port}`;
  }
};
