const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const config = require('../config');

/**
 * Ensure necessary directories exist
 * @returns {Promise<void>}
 */
async function ensureDirectoriesExist() {
  const dirs = [
    config.paths.data,
    config.paths.public,
    config.paths.images,
    config.paths.reports,
    config.paths.pdfReports,
    config.paths.csvReports
  ];
  
  for (const dir of dirs) {
    try {
      await fsPromises.mkdir(dir, { recursive: true });
    } catch (error) {
      console.error(`Error creating directory ${dir}:`, error);
    }
  }
}

/**
 * Store scan request in storage
 * @param {string} scanId - Scan ID
 * @param {string} url - URL to scan
 * @param {string} email - User email
 * @param {Object} options - Additional options
 * @returns {Promise<boolean>}
 */
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
    deepScanThreshold: config.scan.deepScanThreshold
  };
  
  try {
    // Write scan data to file
    await fsPromises.writeFile(
      path.join(config.paths.data, `${scanId}.json`),
      JSON.stringify(scanData, null, 2)
    );
    
    console.log(`Scan request stored: ${scanId}`);
    return true;
  } catch (error) {
    console.error('Error storing scan request:', error);
    throw error;
  }
}

/**
 * Retrieve scan data from storage
 * @param {string} scanId - Scan ID
 * @returns {Promise<Object|null>}
 */
async function getScanData(scanId) {
  try {
    const filePath = path.join(config.paths.data, `${scanId}.json`);
    const data = await fsPromises.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error retrieving scan data for ${scanId}:`, error);
    return null;
  }
}

/**
 * Update scan data in storage
 * @param {string} scanId - Scan ID
 * @param {Object} updates - Data updates
 * @returns {Promise<boolean>}
 */
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
    await fsPromises.writeFile(
      path.join(config.paths.data, `${scanId}.json`),
      JSON.stringify(updatedData, null, 2)
    );
    
    console.log(`Scan data updated: ${scanId}`);
    return true;
  } catch (error) {
    console.error(`Error updating scan data for ${scanId}:`, error);
    throw error;
  }
}

module.exports = {
  ensureDirectoriesExist,
  storeScanRequest,
  getScanData,
  updateScanData
};
