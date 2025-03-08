const { launchBrowser, extractLinks } = require('./browser');
const { runAccessibilityTests, calculateAccessibilityScore } = 
require('../utils/accessibility');
const storage = require('./storage');
const emailService = require('../emails');
const reportsService = require('./reports');
const config = require('../config');

/**
 * Initiate a free scan (limited to 5 pages)
 * @param {string} scanId - Scan ID
 * @param {string} url - URL to scan
 * @param {string} email - User email
 * @param {Object} options - Additional scan options
 * @returns {Promise<void>}
 */
async function initiateFreeScan(scanId, url, email, options = {}) {
  try {
    // Update scan status to running
    await storage.updateScanData(scanId, { status: 'running' });
    
    // Start the actual scanner
    const result = await performScan(url, scanId, config.scan.maxPages);
    
    // Calculate accessibility score
    const accessibilityScore = calculateAccessibilityScore(result);
    
    // Generate reports
    const reports = await reportsService.generateReports(scanId, url, 
result.results, {
      pagesScanned: result.pagesScanned,
      totalIssues: result.issues.total,
      criticalIssues: result.issues.critical,
      warningIssues: result.issues.warning,
      infoIssues: result.issues.info,
      accessibilityScore
    });
    
    // Update scan status and data with report URLs
    await storage.updateScanData(scanId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      pagesScanned: result.pagesScanned,
      pagesFound: result.pagesFound,
      issues: result.issues,
      results: result.results,
      accessibilityScore,
      reportUrls: {
        pdf: reports.pdf.url,
        csv: reports.csv.url
      }
    });
    
    // Send results email to the user with explicit report URLs
    await emailService.sendResultsEmail(email, url, scanId, {
      pagesScanned: result.pagesScanned,
      totalIssues: result.issues.total,
      criticalIssues: result.issues.critical,
      warningIssues: result.issues.warning,
      infoIssues: result.issues.info,
      accessibilityScore,
      reportUrls: {
        pdf: reports.pdf.url,
        csv: reports.csv.url
      }
    });
    
    // Send copy to admin if requested
    if (options.sendCopyToAdmin && options.adminEmail) {
      await emailService.sendAdminResultsEmail(options.adminEmail, url, email, 
scanId, {
        pagesScanned: result.pagesScanned,
        totalIssues: result.issues.total,
        criticalIssues: result.issues.critical,
        warningIssues: result.issues.warning,
        infoIssues: result.issues.info,
        accessibilityScore,
        reportUrls: {
          pdf: reports.pdf.url,
          csv: reports.csv.url
        }
      });
    }
    
    // Check if site qualifies for a deep scan
    const scanData = await storage.getScanData(scanId);
    const deepScanThreshold = scanData.deepScanThreshold || 
config.scan.deepScanThreshold;
    
    if (accessibilityScore >= deepScanThreshold) {
      // Update scan to indicate deep scan is triggered
      await storage.updateScanData(scanId, { deepScanTriggered: true });
      
      // Send notification about deep scan qualification
      await emailService.sendDeepScanNotification(
        options.adminEmail || config.email.adminEmail, 
        url, 
        scanId, 
        accessibilityScore
      );
    }
    
  } catch (error) {
    console.error(`Error in scan ${scanId}:`, error);
    
    // Update scan status to failed
    await storage.updateScanData(scanId, { status: 'failed' });
    
    // Only send error notification to admin, not to the user
    await emailService.sendErrorEmail(
      config.email.errorEmail, 
      url, 
      scanId, 
      `Error scanning ${url} requested by ${email}: ${error.message || 'An 
unexpected error occurred'}`
    );
    
    // Still send a notification to the user but without detailed error
    await emailService.sendErrorEmail(
      email, 
      url, 
      scanId, 
      'We encountered an issue while scanning your website. Our team has been 
notified and will investigate.'
    );
  }
}

// The rest of the file (performScan function) remains the same as in the 
previous implementation
// ... (keep the existing performScan function)

module.exports = {
  initiateFreeScan,
  performScan
};
