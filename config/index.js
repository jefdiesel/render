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
      ? ['https://a11yscan.xyz', 'https://funcles.xyz'] 
      : [
          'http://localhost:3000', 
          'https://render-docker-fdf0.onrender.com',
          'http://localhost:8080',
          'http://127.0.0.1:3000'
        ],
    methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
    allowedHeaders: [
      'Content-Type', 
      'X-API-Key', 
      'Origin', 
      'Accept', 
      'Authorization'
    ],
    credentials: true,
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
    deepScanThreshold: 90,
    maxPages: 5
  },
  storage: {
    useR2: process.env.STORAGE_USE_R2 === 'true',
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
    // Use the REPORTS_DOMAIN for report URLs
    return process.env.REPORTS_DOMAIN || (
      process.env.NODE_ENV === 'production'
        ? 'https://funcles.xyz'
        : `http://localhost:${module.exports.port}`
    );
  },
  reportUrlGenerator: (scanId, type) => {
    const baseUrl = module.exports.reportsBaseUrl();
    const validTypes = ['pdf', 'csv'];
    
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid report type: ${type}`);
    }

    return `${baseUrl}/reports/${type}/${scanId}.${type}`;
  }
};
