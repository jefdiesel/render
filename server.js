const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const dotenv = require('dotenv');
const puppeteer = require('puppeteer');
const PDFDocument = require('pdfkit');
const { createObjectCsvWriter } = require('csv-writer');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
app.set('trust proxy', true);

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configure CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://a11yscan.xyz'] 
    : ['http://localhost:3000'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'X-API-Key']
}));

// Rate limiting
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: { error: 'Too many requests, please try again later.' }
standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply rate limiting to the free scan endpoint
app.use('/api/free-scan', limiter);

// Configure email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Ensure necessary directories exist
async function ensureDirectoriesExist() {
  const dirs = [
    path.join(__dirname, 'data'),
    path.join(__dirname, 'public'),
    path.join(__dirname, 'public', 'images'),
    path.join(__dirname, 'reports'),
    path.join(__dirname, 'reports', 'pdf'),
    path.join(__dirname, 'reports', 'csv')
  ];
  
  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      console.error(`Error creating directory ${dir}:`, error);
    }
  }
}

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'A11yscan API is running',
    version: '1.0.0'
  });
});

// Handle free scan submissions
app.post('/api/free-scan', async (req, res) => {
  try {
    const { url, email, consent, sendCopyToAdmin, adminEmail } = req.body;
    
    // Validate request
    if (!url || !email) {
      return res.status(400).json({ error: 'URL and email are required' });
    }
    
    // Validate URL
    try {
      new URL(url);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }
    
    // Validate email (simple regex)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Generate unique scan ID
    const scanId = uuidv4();
    
    // Store scan request with admin details
    await storeScanRequest(scanId, url, email, {
      sendCopyToAdmin: !!sendCopyToAdmin,
      adminEmail: adminEmail || 'hello@a11yscan.xyz'
    });
    
    // Send confirmation email
    await sendConfirmationEmail(email, url, scanId);
// Function to launch browser with error handling
async function launchBrowser() {
  try {
    const browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ],
      headless: 'new', // Use the new headless mode
      defaultViewport: null, // Allows setting viewport dynamically
      executablePath: process.env.CHROMIUM_PATH || puppeteer.executablePath()
    });
    return browser;
  } catch (error) {
    console.error('Failed to launch browser:', error);
    // Log detailed error information
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      chromiumPath: process.env.CHROMIUM_PATH,
      defaultExecutablePath: puppeteer.executablePath()
    });
    
    throw error;
  }
}
    
    // Initiate scan process in background
    initiateFreeScan(scanId, url, email, {
      sendCopyToAdmin: !!sendCopyToAdmin,
      adminEmail: adminEmail || 'hello@a11yscan.xyz'
    }).catch(error => {
      console.error(`Error starting scan ${scanId}:`, error);
    });
    
    // Return success response
    res.status(202).json({ 
      success: true, 
      message: 'Scan request received. You will receive the results via email shortly.',
      scanId
    });
  } catch (error) {
    console.error('Error handling free scan request:', error);
    res.status(500).json({ error: 'An error occurred while processing your request.' });
  }
});

// Check scan status endpoint
app.get('/api/scan-status/:scanId', async (req, res) => {
  try {
    const { scanId } = req.params;
    
    // Get scan data from storage
    const scanData = await getScanData(scanId);
    
    if (!scanData) {
      return res.status(404).json({ error: 'Scan not found' });
    }
    
    res.status(200).json({
      scanId: scanData.scanId,
      url: scanData.url,
      status: scanData.status,
      createdAt: scanData.createdAt,
      completedAt: scanData.completedAt || null,
      pagesScanned: scanData.pagesScanned || 0,
      pagesFound: scanData.pagesFound || 0,
      issues: scanData.issues || null
    });
  } catch (error) {
    console.error('Error checking scan status:', error);
    res.status(500).json({ error: 'An error occurred while checking scan status.' });
  }
});

// Get scan details endpoint
app.get('/api/scan/:scanId', async (req, res) => {
  try {
    const { scanId } = req.params;
    
    // Get scan data from storage
    const scanData = await getScanData(scanId);
    
    if (!scanData) {
      return res.status(404).json({ error: 'Scan not found' });
    }
    
    // Prepare reports URLs if scan is complete
    let reports = null;
    if (scanData.status === 'completed') {
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://render-cpug.onrender.com' 
        : `http://localhost:${PORT}`;
      
      reports = {
        pdf: `${baseUrl}/api/reports/${scanId}/pdf`,
        csv: `${baseUrl}/api/reports/${scanId}/csv`
      };
    }
    
    // Return scan data
    res.status(200).json({
      scanId: scanData.scanId,
      url: scanData.url,
      status: scanData.status,
      requestedAt: scanData.createdAt,
      completedAt: scanData.completedAt || null,
      pagesScanned: scanData.pagesScanned || 0,
      pagesFound: scanData.pagesFound || 0,
      issues: scanData.issues || null,
      reports
    });
  } catch (error) {
    console.error('Error getting scan details:', error);
    res.status(500).json({ error: 'An error occurred while getting scan details.' });
  }
});

// Get detailed scan results
app.get('/api/scan/:scanId/details', async (req, res) => {
  try {
    const { scanId } = req.params;
    
    // Get scan data from storage
    const scanData = await getScanData(scanId);
    
    if (!scanData) {
      return res.status(404).json({ error: 'Scan not found' });
    }
    
    // Return detailed results
    res.status(200).json({
      scanId: scanData.scanId,
      url: scanData.url,
      requestedAt: scanData.createdAt,
      status: scanData.status,
      results: scanData.results || []
    });
  } catch (error) {
    console.error('Error getting detailed scan results:', error);
    res.status(500).json({ error: 'An error occurred while getting detailed scan results.' });
  }
});

// Serve PDF report
app.get('/api/reports/:scanId/pdf', async (req, res) => {
  try {
    const { scanId } = req.params;
    const pdfPath = path.join(__dirname, 'reports', 'pdf', `${scanId}.pdf`);
    
    try {
      await fs.access(pdfPath);
    } catch (error) {
      return res.status(404).json({ error: 'PDF report not found' });
    }
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${scanId}.pdf"`);
    
    const fileStream = fs.createReadStream(pdfPath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error serving PDF report:', error);
    res.status(500).json({ error: 'Error serving PDF report' });
  }
});

// Serve CSV report
app.get('/api/reports/:scanId/csv', async (req, res) => {
  try {
    const { scanId } = req.params;
    const csvPath = path.join(__dirname, 'reports', 'csv', `${scanId}.csv`);
    
    try {
      await fs.access(csvPath);
    } catch (error) {
      return res.status(404).json({ error: 'CSV report not found' });
    }
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${scanId}.csv"`);
    
    const fileStream = fs.createReadStream(csvPath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error serving CSV report:', error);
    res.status(500).json({ error: 'Error serving CSV report' });
  }
});

// Function to store scan request in database or file
async function storeScanRequest(scanId, url, email, options = {}) {
  // This is a simplified version that stores data in a JSON file
  const scanData = {
    scanId,
    url,
    email,
    status: 'pending',
    createdAt: new Date().toISOString(),
    completedAt: null,
    pagesScanned: 0,
    pagesFound: 0,
    issues: null,
    results: [],
    // Store admin notification preferences
    sendCopyToAdmin: options.sendCopyToAdmin || false,
    adminEmail: options.adminEmail || null,
    // Track if this was escalated to a deep scan
    deepScanTriggered: false,
    deepScanThreshold: 90, // Configurable threshold for triggering deep scans
  };
  
  try {
    // Write scan data to file
    await fs.writeFile(
      path.join(__dirname, 'data', `${scanId}.json`),
      JSON.stringify(scanData, null, 2)
    );
    
    console.log(`Scan request stored: ${scanId}`);
    return true;
  } catch (error) {
    console.error('Error storing scan request:', error);
    throw error;
  }
}

// Function to retrieve scan data
async function getScanData(scanId) {
  try {
    const filePath = path.join(__dirname, 'data', `${scanId}.json`);
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error retrieving scan data for ${scanId}:`, error);
    return null;
  }
}

// Function to update scan data
async function updateScanData(scanId, updates) {
  try {
    // Get current scan data
    const scanData = await getScanData(scanId);
    
    if (!scanData) {
      throw new Error(`Scan data not found for ${scanId}`);
    }
    
    // Apply updates
    const updatedData = { ...scanData, ...updates };
    
    // Write updated data back to file
    await fs.writeFile(
      path.join(__dirname, 'data', `${scanId}.json`),
      JSON.stringify(updatedData, null, 2)
    );
    
    console.log(`Scan data updated: ${scanId}`);
    return true;
  } catch (error) {
    console.error(`Error updating scan data for ${scanId}:`, error);
    throw error;
  }
}

// Function to send confirmation email
async function sendConfirmationEmail(email, url, scanId) {
  try {
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://a11yscan.xyz' 
      : `http://localhost:${PORT}`;
      
    const mailOptions = {
      from: `"A11yscan" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: 'Your A11yscan Accessibility Scan Has Started',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="${baseUrl}/images/a11yscan-logo.svg" alt="A11yscan Logo" width="180" height="50" style="display: inline-block;">
          </div>
          
          <h1 style="color: #4f46e5; margin-bottom: 20px;">Your Accessibility Scan Has Started</h1>
          
          <p>Hello,</p>
          
          <p>Thank you for using A11yscan! We've started scanning your website for accessibility issues.</p>
          
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Website URL:</strong> ${url}</p>
            <p style="margin: 10px 0 0;"><strong>Scan ID:</strong> ${scanId}</p>
          </div>
          
          <p>We're scanning up to 5 pages on your site to identify potential accessibility issues. This process typically takes 5-10 minutes to complete.</p>
          
          <p>Once the scan is finished, we'll send you another email with your detailed accessibility report.</p>
          
          <p>In the meantime, you can check your scan status <a href="${baseUrl}/scan-status.html?id=${scanId}" style="color: #4f46e5;">here</a>.</p>
          
          <p>Thank you for making the web more accessible for everyone!</p>
          
          <p>Best regards,<br>The A11yscan Team</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center;">
            <p>© ${new Date().getFullYear()} A11yscan. All rights reserved.</p>
            <p>If you have any questions, please contact us at <a href="mailto:hello@a11yscan.xyz" style="color: #4f46e5;">hello@a11yscan.xyz</a></p>
          </div>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`Confirmation email sent to ${email} for scan ${scanId}`);
    return true;
  } catch (error) {
    console.error(`Error sending confirmation email for ${scanId}:`, error);
    throw error;
  }
}

// Function to send results email
async function sendResultsEmail(email, url, scanId, summary) {
  try {
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://a11yscan.xyz' 
      : `http://localhost:${PORT}`;
      
    const reportUrl = `${baseUrl}/reports/${scanId}`;
    
    const mailOptions = {
      from: `"A11yscan" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: 'Your A11yscan Accessibility Report is Ready',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="${baseUrl}/images/a11yscan-logo.svg" alt="A11yscan Logo" width="180" height="50" style="display: inline-block;">
          </div>
          
          <h1 style="color: #4f46e5; margin-bottom: 20px;">Your Accessibility Report is Ready</h1>
          
          <p>Hello,</p>
          
          <p>Good news! We've completed the accessibility scan for your website.</p>
          
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Website URL:</strong> ${url}</p>
            <p style="margin: 10px 0 0;"><strong>Scan ID:</strong> ${scanId}</p>
            ${summary.accessibilityScore ? `<p style="margin: 10px 0 0;"><strong>Accessibility Score:</strong> ${summary.accessibilityScore}/100</p>` : ''}
          </div>
          
          <h2 style="color: #4f46e5; margin: 25px 0 15px;">Summary of Findings</h2>
          
          <div style="margin-bottom: 20px;">
            <p><strong>Pages Scanned:</strong> ${summary.pagesScanned}</p>
            <p><strong>Total Issues Found:</strong> ${summary.totalIssues}</p>
            <ul>
              <li><strong style="color: #ef4444;">Critical Issues:</strong> ${summary.criticalIssues}</li>
              <li><strong style="color: #f59e0b;">Warning Issues:</strong> ${summary.warningIssues}</li>
              <li><strong style="color: #3b82f6;">Info Issues:</strong> ${summary.infoIssues}</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${reportUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">View Full Report</a>
          </div>
          
          <p>This report highlights accessibility issues on your website that may prevent people with disabilities from using it effectively. Addressing these issues will help you:</p>
          
          <ul>
            <li>Provide a better experience for all users</li>
            <li>Reach a wider audience</li>
            <li>Reduce legal risk</li>
            <li>Improve your SEO</li>
          </ul>
          
          <p>Your free report will be available for 7 days. For more comprehensive testing and ongoing monitoring, check out our <a href="${baseUrl}/#pricing" style="color: #4f46e5;">paid plans</a>.</p>
          
          <p>Thank you for making the web more accessible for everyone!</p>
          
          <p>Best regards,<br>The A11yscan Team</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center;">
            <p>© ${new Date().getFullYear()} A11yscan. All rights reserved.</p>
            <p>If you have any questions, please contact us at <a href="mailto:hello@a11yscan.xyz" style="color: #4f46e5;">hello@a11yscan.xyz</a></p>
          </div>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`Results email sent to ${email} for scan ${scanId}`);
    return true;
  } catch (error) {
    console.error(`Error sending results email for ${scanId}:`, error);
    throw error;
  }
}

// Function to send admin results email
async function sendAdminResultsEmail(adminEmail, url, userEmail, scanId, summary) {
  try {
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://a11yscan.xyz' 
      : `http://localhost:${PORT}`;
      
    const reportUrl = `${baseUrl}/reports/${scanId}`;
    
    const mailOptions = {
      from: `"A11yscan" <${process.env.EMAIL_FROM}>`,
      to: adminEmail,
      subject: `[ADMIN] New Scan Results for ${url}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="${baseUrl}/images/a11yscan-logo.svg" alt="A11yscan Logo" width="180" height="50" style="display: inline-block;">
          </div>
          
          <h1 style="color: #4f46e5; margin-bottom: 20px;">New Accessibility Scan Completed</h1>
          
          <p>Hello Admin,</p>
          
          <p>A new accessibility scan has been completed for a user.</p>
          
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Website URL:</strong> ${url}</p>
            <p style="margin: 10px 0 0;"><strong>User Email:</strong> ${userEmail}</p>
            <p style="margin: 10px 0 0;"><strong>Scan ID:</strong> ${scanId}</p>
            <p style="margin: 10px 0 0;"><strong>Accessibility Score:</strong> ${summary.accessibilityScore}/100</p>
          </div>
          
          <h2 style="color: #4f46e5; margin: 25px 0 15px;">Summary of Findings</h2>
          
          <div style="margin-bottom: 20px;">
            <p><strong>Pages Scanned:</strong> ${summary.pagesScanned}</p>
            <p><strong>Total Issues Found:</strong> ${summary.totalIssues}</p>
            <ul>
              <li><strong style="color: #ef4444;">Critical Issues:</strong> ${summary.criticalIssues}</li>
              <li><strong style="color: #f59e0b;">Warning Issues:</strong> ${summary.warningIssues}</li>
              <li><strong style="color: #3b82f6;">Info Issues:</strong> ${summary.infoIssues}</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${reportUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">View Full Report</a>
          </div>
          
          <p>Best regards,<br>The A11yscan System</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center;">
            <p>© ${new Date().getFullYear()} A11yscan. All rights reserved.</p>
          </div>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`Admin results email sent to ${adminEmail} for scan ${scanId}`);
    return true;
  } catch (error) {
    console.error(`Error sending admin results email for ${scanId}:`, error);
    throw error;
  }
}

// Function to send deep scan notification
async function sendDeepScanNotification(adminEmail, url, scanId, score) {
  try {
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://a11yscan.xyz' 
      : `http://localhost:${PORT}`;
      
    const mailOptions = {
      from: `"A11yscan" <${process.env.EMAIL_FROM}>`,
      to: adminEmail,
      subject: `[ALERT] High Scoring Site (${score}/100) - Deep Scan Candidate`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="${baseUrl}/images/a11yscan-logo.svg" alt="A11yscan Logo" width="180" height="50" style="display: inline-block;">
          </div>
          
          <h1 style="color: #4f46e5; margin-bottom: 20px;">High Scoring Website Detected</h1>
          
          <p>Hello,</p>
          
          <p>A website has scored <strong>${score}/100</strong> on our accessibility scan, making it a good candidate for a comprehensive deep scan.</p>
          
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Website URL:</strong> ${url}</p>
            <p style="margin: 10px 0 0;"><strong>Scan ID:</strong> ${scanId}</p>
            <p style="margin: 10px 0 0;"><strong>Score:</strong> ${score}/100</p>
          </div>
          
          <p>This site may be a good prospect for showcasing the benefits of our premium services.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${baseUrl}/reports/${scanId}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">View Scan Report</a>
          </div>
          
          <p>Best regards,<br>The A11yscan System</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center;">
            <p>© ${new Date().getFullYear()} A11yscan. All rights reserved.</p>
          </div>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`Deep scan notification sent to ${adminEmail} for ${url} (Score: ${score})`);
    return true;
  } catch (error) {
    console.error(`Error sending deep scan notification for ${url}:`, error);
    throw error;
  }
}

// Function to send error email
async function sendErrorEmail(email, url, scanId, errorMessage) {
  try {
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://a11yscan.xyz' 
      : `http://localhost:${PORT}`;
      
    const mailOptions = {
      from: `"A11yscan" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: 'Issue with Your A11yscan Accessibility Scan',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="${baseUrl}/images/a11yscan-logo.svg" alt="A11yscan Logo" width="180" height="50" style="display: inline-block;">
          </div>
          
          <h1 style="color: #4f46e5; margin-bottom: 20px;">Issue with Your Accessibility Scan</h1>
          
          <p>Hello,</p>
          
          <p>We encountered an issue while scanning your website for accessibility issues.</p>
          
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Website URL:</strong> ${url}</p>
            <p style="margin: 10px 0 0;"><strong>Scan ID:</strong> ${scanId}</p>
          </div>
          
          <div style="background-color: #fee2e2; padding: 15px; border-radius: 5px; margin: 20px 0; color: #b91c1c;">
            <p style="margin: 0;"><strong>Error:</strong> ${errorMessage}</p>
          </div>
          
          <p>This could be due to several reasons:</p>
          
          <ul>
            <li>The website is not accessible or requires authentication</li>
            <li>The website has a robots.txt file blocking our scanner</li>
            <li>The website has security measures preventing automated scanning</li>
            <li>There might be temporary connectivity issues</li>
          </ul>
          
          <p>Please try again later or contact us if you continue experiencing issues.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${baseUrl}/#scan" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Try Again</a>
          </div>
          
          <p>Thank you for your understanding.</p>
          
          <p>Best regards,<br>The A11yscan Team</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center;">
            <p>© ${new Date().getFullYear()} A11yscan. All rights reserved.</p>

    <p>If you have any questions, please contact us at <a href="mailto:hello@a11yscan.xyz" style="color: #4f46e5;">hello@a11yscan.xyz</a></p>
          </div>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`Error email sent to ${email} for scan ${scanId}`);
    return true;
  } catch (error) {
    console.error(`Failed to send error email for ${scanId}:`, error);
    throw error;
  }
}

// Function to initiate a free scan (limited to 5 pages)
async function initiateFreeScan(scanId, url, email, options = {}) {
  try {
    // Update scan status to running
    await updateScanData(scanId, { status: 'running' });
    
    // Start the actual scanner
    const result = await performScan(url, scanId, 5);
    
    // Calculate accessibility score (simple example)
    const accessibilityScore = calculateAccessibilityScore(result);
    
    // Update scan status and data
    await updateScanData(scanId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      pagesScanned: result.pagesScanned,
      pagesFound: result.pagesFound,
      issues: result.issues,
      results: result.results,
      accessibilityScore
    });
    
    // Generate PDF and CSV reports
    await generateReports(scanId, url, result.results, {
      pagesScanned: result.pagesScanned,
      totalIssues: result.issues.total,
      criticalIssues: result.issues.critical,
      warningIssues: result.issues.warning,
      infoIssues: result.issues.info,
      accessibilityScore
    });
    
    // Send results email to the user
    await sendResultsEmail(email, url, scanId, {
      pagesScanned: result.pagesScanned,
      totalIssues: result.issues.total,
      criticalIssues: result.issues.critical,
      warningIssues: result.issues.warning,
      infoIssues: result.issues.info,
      accessibilityScore
    });
    
    // Send copy to admin if requested
    if (options.sendCopyToAdmin && options.adminEmail) {
      await sendAdminResultsEmail(options.adminEmail, url, email, scanId, {
        pagesScanned: result.pagesScanned,
        totalIssues: result.issues.total,
        criticalIssues: result.issues.critical,
        warningIssues: result.issues.warning,
        infoIssues: result.issues.info,
        accessibilityScore
      });
    }
    
    // Check if site qualifies for a deep scan
    const scanData = await getScanData(scanId);
    const deepScanThreshold = scanData.deepScanThreshold || 90;
    
    if (accessibilityScore >= deepScanThreshold) {
      // Update scan to indicate deep scan is triggered
      await updateScanData(scanId, { deepScanTriggered: true });
      
      // TODO: Here you would trigger a more comprehensive scan
      console.log(`Site qualifies for deep scan (score: ${accessibilityScore}). Triggering full site scan for ${url}`);
      
      // Send notification about deep scan qualification
      await sendDeepScanNotification(options.adminEmail || 'hello@a11yscan.xyz', url, scanId, accessibilityScore);
    }
    
} catch (error) {
  console.error(`Error in scan ${scanId}:`, error);
  
  // Update scan status to failed
  await updateScanData(scanId, { status: 'failed' });
  
  // Only send error notification to admin, not to the user
  await sendErrorEmail('errors@a11yscan.xyz', url, scanId, 
    `Error scanning ${url} requested by ${email}: ${error.message || 'An unexpected error occurred'}`);
  
  // Still send a notification to the user but without detailed error
  await sendErrorEmail(
    email, 
    url, 
    scanId, 
    'We encountered an issue while scanning your website. Our team has been notified and will investigate.'
      );
    }
  }

// Function to calculate accessibility score
function calculateAccessibilityScore(result) {
  // This is a simplified scoring algorithm
  const totalIssues = result.issues.total;
  const criticalWeight = 5;  // Critical issues are weighted 5x
  const warningWeight = 2;   // Warnings are weighted 2x
  
  // Calculate weighted issues
  const weightedIssues = 
    (result.issues.critical * criticalWeight) + 
    (result.issues.warning * warningWeight) + 
    result.issues.info;
  
  // Base score - 100 is perfect
  let score = 100;
  
  if (totalIssues > 0) {
    // Pages factor - more pages scanned should be less penalizing per issue
    const pagesFactor = Math.sqrt(result.pagesScanned);
    
    // Deduct points based on weighted issues, adjusted by page count
    const penalty = (weightedIssues / pagesFactor) * 2;
    score = Math.max(0, Math.min(100, 100 - penalty));
  }
  
  // Round to nearest integer
  return Math.round(score);
}

// Function to perform the actual scan
// Function to perform the actual scan
async function performScan(url, scanId, maxPages = 5) {
  console.log(`Starting scan of ${url} with scan ID ${scanId}`);
  
  // Launch browser using the new launchBrowser function
  const browser = await launchBrowser();

  try {
    // Set up results structure
    const results = {
      pagesScanned: 0,
      pagesFound: 0,
      issues: {
        total: 0,
        critical: 0,
        warning: 0,
        info: 0
      },
      results: []
    };
    
    // Queue of URLs to scan
    const queue = [url];
    const scanned = new Set();
    const found = new Set([url]);
    
    // Process queue
    while (queue.length > 0 && results.pagesScanned < maxPages) {
      const currentUrl = queue.shift();
      
      // Skip if already scanned
      if (scanned.has(currentUrl)) continue;
      
      console.log(`Scanning page ${results.pagesScanned + 1}/${maxPages}: ${currentUrl}`);
      
      // Mark as scanned
      scanned.add(currentUrl);
      
      try {
        // Create a new page
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36 WCAG-Scanner/1.0');
        
        // Navigate to URL
        await page.goto(currentUrl, { 
          waitUntil: 'networkidle2',
          timeout: 30000
        });
        
        // Wait for page to fully load
        await page.waitForTimeout(2000);
        
        // Run accessibility tests
        const accessibilityResults = await runAccessibilityTests(page);
        
        // Extract links if we need more pages
        let links = [];
        if (results.pagesScanned < maxPages - 1) {
          links = await extractLinks(page, url);
          
          // Add new links to queue and found set
          links.forEach(link => {
            if (!found.has(link)) {
              found.add(link);
              queue.push(link);
            }
          });
        }
        
        // Close page
        await page.close();
        
        // Add to results
        results.results.push({
          url: currentUrl,
          status: 200,
          scannedAt: new Date().toISOString(),
          violationCounts: accessibilityResults.violationCounts,
          violations: accessibilityResults.violations,
          links: links
        });
        
        // Update counts
        results.pagesScanned++;
        results.issues.total += accessibilityResults.violationCounts.total;
        results.issues.critical += accessibilityResults.violationCounts.critical;
        results.issues.warning += accessibilityResults.violationCounts.warning;
        results.issues.info += accessibilityResults.violationCounts.info;
        
      } catch (error) {
        console.error(`Error scanning ${currentUrl}:`, error);
        
        // Add error result
        results.results.push({
          url: currentUrl,
          status: 500,
          scannedAt: new Date().toISOString(),
          error: error.message,
          violationCounts: { total: 0, critical: 0, warning: 0, info: 0 },
          violations: [],
          links: []
        });
        
        results.pagesScanned++;
      }
    }
    
    // Update found pages count
    results.pagesFound = found.size;
    
    return results;
    
  } finally {
    // Close browser
    await browser.close();
  }
}
// Function to run accessibility tests on a page
async function runAccessibilityTests(page) {
  // Inject axe-core library
  await page.addScriptTag({
    path: require.resolve('axe-core')
  });
  
  // Run axe analysis
  const results = await page.evaluate(() => {
    return new Promise(resolve => {
      // @ts-ignore (axe is injected)
      axe.run(document, {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']
        }
      }, (err, results) => {
        if (err) resolve({ error: err.message });
        resolve(results);
      });
    });
  });
  
  // Calculate violation counts
  const violationCounts = {
    total: 0,
    critical: 0,
    warning: 0,
    info: 0
  };
  
  if (results.violations) {
    results.violations.forEach(violation => {
      const nodeCount = violation.nodes?.length || 0;
      violationCounts.total += nodeCount;
      
      // Map impact levels to our severity categories
      switch (violation.impact) {
        case 'critical':
        case 'serious':
          violationCounts.critical += nodeCount;
          break;
        case 'moderate':
        case 'minor':
          violationCounts.warning += nodeCount;
          break;
        default:
          violationCounts.info += nodeCount;
          break;
      }
    });
  }
  
  return {
    violations: results.violations || [],
    passes: results.passes || [],
    incomplete: results.incomplete || [],
    violationCounts
  };
}

// Function to extract links from a page
async function extractLinks(page, baseUrl) {
  try {
    // Parse the base URL
    const baseUrlObj = new URL(baseUrl);
    const baseHostname = baseUrlObj.hostname;
    const baseOrigin = baseUrlObj.origin;
    
    // Extract links via browser context
    const links = await page.evaluate((baseHostname, baseOrigin) => {
      // Get all links on the page
      const allLinks = Array.from(document.querySelectorAll('a[href]'))
        .map(a => {
          try {
            // Get the full href
            const href = a.href;
            if (!href) return null;
            
            // Parse the URL
            const url = new URL(href);
            
            // Only include links to the same hostname
            if (url.hostname !== baseHostname) return null;
            
            // Skip hash links (same page anchors)
            if (url.pathname === window.location.pathname && url.hash) return null;
            
            // Skip mailto, tel, etc.
            if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
            
            // Return the normalized URL (without hash)
            return url.origin + url.pathname + url.search;
          } catch (e) {
            return null;
          }
        })
        .filter(Boolean); // Remove nulls
      
      // Remove duplicates
      return [...new Set(allLinks)];
    }, baseHostname, baseOrigin);
    
    return links;
  } catch (error) {
    console.error('Error extracting links:', error);
    return [];
  }
}

// Function to generate PDF and CSV reports
async function generateReports(scanId, url, results, summary) {
  try {
    await generatePdfReport(scanId, url, results, summary);
    await generateCsvReport(scanId, results);
    console.log(`Reports generated for scan ${scanId}`);
    return true;
  } catch (error) {
    console.error(`Error generating reports for ${scanId}:`, error);
    throw error;
  }
}

// Function to generate PDF report
async function generatePdfReport(scanId, url, results, summary) {
  try {
    const pdfPath = path.join(__dirname, 'reports', 'pdf', `${scanId}.pdf`);
    const doc = new PDFDocument({ margin: 50 });
    
    // Pipe the PDF to a file
    const writeStream = fs.createWriteStream(pdfPath);
    doc.pipe(writeStream);
    
    // Add content to the PDF
    
    // Logo and title
    doc.fontSize(20).text('A11yscan Accessibility Report', { align: 'center' });
    doc.moveDown();
    
    // Scan information
    doc.fontSize(14).text('Scan Information');
    doc.moveDown(0.5);
    doc.fontSize(12).text(`URL: ${url}`);
    doc.text(`Scan ID: ${scanId}`);
    doc.text(`Date: ${new Date().toLocaleDateString()}`);
    doc.text(`Pages Scanned: ${summary.pagesScanned}`);
    if (summary.accessibilityScore) {
      doc.text(`Accessibility Score: ${summary.accessibilityScore}/100`);
    }
    doc.moveDown();
    
    // Summary
    doc.fontSize(14).text('Summary of Findings');
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Total Issues: ${summary.totalIssues}`);
    doc.text(`Critical Issues: ${summary.criticalIssues}`, { continued: true }).fillColor('red').text(' ■', { align: 'right' }).fillColor('black');
    doc.text(`Warning Issues: ${summary.warningIssues}`, { continued: true }).fillColor('orange').text(' ■', { align: 'right' }).fillColor('black');
    doc.text(`Info Issues: ${summary.infoIssues}`, { continued: true }).fillColor('blue').text(' ■', { align: 'right' }).fillColor('black');
    doc.moveDown();
    
    // Add issues by page
    doc.fontSize(14).text('Issues By Page');
    doc.moveDown(0.5);
    
    // Loop through each page result
    for (const pageResult of results) {
      // Skip pages with errors
      if (pageResult.status !== 200) continue;
      
      // Page header
      doc.fontSize(12).text(`Page: ${pageResult.url}`);
      doc.text(`Scanned: ${new Date(pageResult.scannedAt).toLocaleString()}`);
      doc.text(`Issues: ${pageResult.violationCounts.total}`);
      doc.moveDown(0.5);
      
      // No issues found
      if (pageResult.violationCounts.total === 0) {
        doc.fontSize(10).text('No accessibility issues found on this page.');
        doc.moveDown();
        continue;
      }
      
      // Issues table header
      const issueTableTop = doc.y;
      doc.fontSize(10).text('Issue', { width: 200, continued: true });
      doc.text('Impact', { width: 100, continued: true });
      doc.text('Elements', { width: 50 });
      doc.moveDown(0.5);
      
      // Draw header underline
      doc.moveTo(50, doc.y)
         .lineTo(550, doc.y)
         .stroke();
      doc.moveDown(0.5);
      
      // Issues list
      for (const violation of pageResult.violations) {
        const nodeCount = violation.nodes?.length || 0;
        
        // Set color based on impact
        let color = 'black';
        switch (violation.impact) {
          case 'critical':
          case 'serious':
            color = 'red';
            break;
          case 'moderate':
          case 'minor':
            color = 'orange';
            break;
          default:
            color = 'blue';
            break;
        }
        
        // Issue row
        doc.fillColor(color);
        doc.fontSize(9).text(violation.description || violation.id, { width: 200, continued: true });
        doc.text(violation.impact || 'unknown', { width: 100, continued: true });
        doc.text(String(nodeCount), { width: 50 });
        doc.fillColor('black');
        
        // Check if we need a new page
        if (doc.y > 700) {
          doc.addPage();
        }
      }
      
      doc.moveDown();
    }
    
    // Add footer
    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).text(
        `A11yscan Accessibility Report - ${scanId} - Page ${i + 1} of ${totalPages}`,
        50, 
        doc.page.height - 50,
        { align: 'center' }
      );
    }
    
    // Finalize the PDF
    doc.end();
    
    // Wait for the write stream to finish
    return new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
    
  } catch (error) {
    console.error(`Error generating PDF report for ${scanId}:`, error);
    throw error;
  }
}

// Function to generate CSV report
async function generateCsvReport(scanId, results) {
  try {
    const csvPath = path.join(__dirname, 'reports', 'csv', `${scanId}.csv`);
    
    // Prepare data for CSV
    const csvData = [];
    
    // Loop through each page result
    for (const pageResult of results) {
      // Skip pages with errors
      if (pageResult.status !== 200) continue;
      
      // Add each violation
      for (const violation of pageResult.violations) {
        const nodeCount = violation.nodes?.length || 0;
        
        // Add a row for each node (instance) of the violation
        for (let i = 0; i < nodeCount; i++) {
          const node = violation.nodes[i];
          const html = node?.html || '';
          const target = node?.target || '';
          
          csvData.push({
            page: pageResult.url,
            issue: violation.id,
            description: violation.description || '',
            impact: violation.impact || 'unknown',
            wcag: (violation.tags || []).filter(tag => tag.includes('wcag')).join(', '),
            help: violation.help || '',
            helpUrl: violation.helpUrl || '',
            html: html.replace(/"/g, '""'), // Escape quotes for CSV
            target: Array.isArray(target) ? target.join(', ') : target
          });
        }
        
        // If no nodes, still add a summary row
        if (nodeCount === 0) {
          csvData.push({
            page: pageResult.url,
            issue: violation.id,
            description: violation.description || '',
            impact: violation.impact || 'unknown',
            wcag: (violation.tags || []).filter(tag => tag.includes('wcag')).join(', '),
            help: violation.help || '',
            helpUrl: violation.helpUrl || '',
            html: '',
            target: ''
          });
        }
      }
    }
    
    // Create CSV writer
    const csvWriter = createObjectCsvWriter({
      path: csvPath,
      header: [
        { id: 'page', title: 'Page URL' },
        { id: 'issue', title: 'Issue ID' },
        { id: 'description', title: 'Description' },
        { id: 'impact', title: 'Impact' },
        { id: 'wcag', title: 'WCAG Criteria' },
        { id: 'help', title: 'Help Text' },
        { id: 'helpUrl', title: 'Help URL' },
        { id: 'html', title: 'HTML' },
        { id: 'target', title: 'Target' }
      ]
    });
    
    // Write CSV file
    await csvWriter.writeRecords(csvData);
    
    console.log(`CSV report generated for scan ${scanId}`);
    return true;
    
  } catch (error) {
    console.error(`Error generating CSV report for ${scanId}:`, error);
    throw error;
  }
}

// Call this on server start
ensureDirectoriesExist();

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
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
