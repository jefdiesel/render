const express = require('express');
const { v4: uuidv4 } = require('uuid');
const scanner = require('../services/scanner');
const storage = require('../services/storage');
const emailService = require('../emails');
const config = require('../config');

const router = express.Router();

/**
 * Handle free scan submissions
 * POST /api/free-scan
 */
router.post('/free-scan', async (req, res) => {
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
    await storage.storeScanRequest(scanId, url, email, {
      sendCopyToAdmin: !!sendCopyToAdmin,
      adminEmail: adminEmail || config.email.adminEmail
    });
    
    // Send confirmation email
    await emailService.sendConfirmationEmail(email, url, scanId);
    
    // Initiate scan process in background
    scanner.initiateFreeScan(scanId, url, email, {
      sendCopyToAdmin: !!sendCopyToAdmin,
      adminEmail: adminEmail || config.email.adminEmail
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

/**
 * Check scan status endpoint
 * GET /api/scan-status/:scanId
 */
router.get('/scan-status/:scanId', async (req, res) => {
  try {
    const { scanId } = req.params;
    
    // Get scan data from storage
    const scanData = await storage.getScanData(scanId);
    
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

/**
 * Get scan details endpoint
 * GET /api/scan/:scanId
 */
router.get('/scan/:scanId', async (req, res) => {
  try {
    const { scanId } = req.params;
    
    // Get scan data from storage
    const scanData = await storage.getScanData(scanId);
    
    if (!scanData) {
      return res.status(404).json({ error: 'Scan not found' });
    }
    
    // Prepare reports URLs if scan is complete
    let reports = null;
    if (scanData.status === 'completed') {
      const baseUrl = config.reportsBaseUrl();
      
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

/**
 * Get detailed scan results
 * GET /api/scan/:scanId/details
 */
router.get('/scan/:scanId/details', async (req, res) => {
  try {
    const { scanId } = req.params;
    
    // Get scan data from storage
    const scanData = await storage.getScanData(scanId);
    
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

module.exports = router;
