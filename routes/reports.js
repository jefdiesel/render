// routes/reports.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const fsPromises = fs.promises;
const config = require('../config');
const r2Storage = config.storage.useR2 ? require('../services/storage/r2') : null;
const storage = require('../services/storage');

const router = express.Router();

/**
 * Serve PDF report
 * GET /api/reports/:scanId/pdf
 */
router.get('/reports/:scanId/pdf', async (req, res) => {
  try {
    const { scanId } = req.params;
    
    // Check if using R2 storage
    if (config.storage.useR2) {
      // Get scan data to check if report exists
      const scanData = await storage.getScanData(scanId);
      
      if (!scanData || scanData.status !== 'completed') {
        return res.status(404).json({ error: 'PDF report not found' });
      }
      
      const key = `${config.storage.r2.pdf}/${scanId}.pdf`;
      
      // Stream directly from R2 to the response
      return r2Storage.streamFileToResponse(key, res, 'application/pdf', `${scanId}.pdf`);
    }
    
    // If using local storage, serve file from filesystem
    const pdfPath = path.join(config.paths.pdfReports, `${scanId}.pdf`);
    
    try {
      await fsPromises.access(pdfPath);
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

/**
 * Serve CSV report
 * GET /api/reports/:scanId/csv
 */
router.get('/reports/:scanId/csv', async (req, res) => {
  try {
    const { scanId } = req.params;
    
    // Check if using R2 storage
    if (config.storage.useR2) {
      // Get scan data to check if report exists
      const scanData = await storage.getScanData(scanId);
      
      if (!scanData || scanData.status !== 'completed') {
        return res.status(404).json({ error: 'CSV report not found' });
      }
      
      const key = `${config.storage.r2.csv}/${scanId}.csv`;
      
      // Stream directly from R2 to the response
      return r2Storage.streamFileToResponse(key, res, 'text/csv', `${scanId}.csv`);
    }
    
    // If using local storage, serve file from filesystem
    const csvPath = path.join(config.paths.csvReports, `${scanId}.csv`);
    
    try {
      await fsPromises.access(csvPath);
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

module.exports = router;
