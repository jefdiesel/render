// services/storage.js
const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const config = require('../config');
const r2Storage = config.storage.useR2 ? require('./storage/r2') : null;

/**
 * Ensure necessary directories exist
 * @returns {Promise<void>}
 */
async function ensureDirectoriesExist() {
  // Still create local directories even if using R2
  // They're useful for temporary storage
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
    if (config.storage.useR2) {
      try {
        // For R2, we'll serialize the JSON and upload as a buffer
        const jsonData = JSON.stringify(scanData, null, 2);
        const buffer = Buffer.from(jsonData, 'utf8');
        const key = `${config.storage.r2.data}/${scanId}.json`;
        
        await r2Storage.uploadBuffer(buffer, key, 'application/json');
      } catch (error) {
        console.error('R2 storage failed, falling back to local storage:', error.message);
        // Fall back to local storage
        await fsPromises.writeFile(
          path.join(config.paths.data, `${scanId}.json`),
          JSON.stringify(scanData, null, 2)
        );
      }
    } else {
      // For local storage, write to file
      await fsPromises.writeFile(
        path.join(config.paths.data, `${scanId}.json`),
        JSON.stringify(scanData, null, 2)
      );
    }
    
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
    let data;
    
    if (config.storage.useR2) {
      try {
        // For R2, download the file to a temporary location and read it
        const key = `${config.storage.r2.data}/${scanId}.json`;
        const tempPath = path.join(config.paths.data, `${scanId}_temp.json`);
        
        try {
          // Download file from R2
          await r2Storage.downloadFile(key, tempPath);
          
          // Read the data
          data = await fsPromises.readFile(tempPath, 'utf8');
          
          // Clean up temp file
          await fsPromises.unlink(tempPath);
        } catch (error) {
          console.error(`Error downloading scan data from R2 for ${scanId}, trying local storage:`, error.message);
          // Try local storage as fallback
          const filePath = path.join(config.paths.data, `${scanId}.json`);
          data = await fsPromises.readFile(filePath, 'utf8');
        }
      } catch (error) {
        console.error(`Error retrieving scan data for ${scanId}:`, error);
        return null;
      }
    } else {
      // For local storage, read directly
      const filePath = path.join(config.paths.data, `${scanId}.json`);
      data = await fsPromises.readFile(filePath, 'utf8');
    }
    
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
    
    if (config.storage.useR2) {
      try {
        // For R2, serialize and upload
        const jsonData = JSON.stringify(updatedData, null, 2);
        const buffer = Buffer.from(jsonData, 'utf8');
        const key = `${config.storage.r2.data}/${scanId}.json`;
        
        await r2Storage.uploadBuffer(buffer, key, 'application/json');
      } catch (error) {
        console.error(`R2 storage update failed, falling back to local storage: ${error.message}`);
        // Fall back to local storage
        await fsPromises.writeFile(
          path.join(config.paths.data, `${scanId}.json`),
          JSON.stringify(updatedData, null, 2)
        );
      }
    } else {
      // For local storage, write to file
      await fsPromises.writeFile(
        path.join(config.paths.data, `${scanId}.json`),
        JSON.stringify(updatedData, null, 2)
      );
    }
    
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
