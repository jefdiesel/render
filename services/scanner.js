const { launchBrowser, extractLinks } = require('./browser');
const { runAccessibilityTests, calculateAccessibilityScore } = require('../utils/accessibility');
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
    const reports = await reportsService.generateReports(scanId, url, result.results, {
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
      await emailService.sendAdminResultsEmail(options.adminEmail, url, email, scanId, {
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
    const deepScanThreshold = scanData.deepScanThreshold || config.scan.deepScanThreshold;
    
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
      `Error scanning ${url} requested by ${email}: ${error.message || 'An unexpected error occurred'}`
    );
    
    // Still send a notification to the user but without detailed error
    await emailService.sendErrorEmail(
      email, 
      url, 
      scanId, 
      'We encountered an issue while scanning your website. Our team has been notified and will investigate.'
    );
  }
}

/**
 * Perform the actual scan
 * @param {string} url - URL to scan
 * @param {string} scanId - Scan ID
 * @param {number} maxPages - Maximum pages to scan
 * @returns {Promise<Object>} Scan results
 */
async function performScan(url, scanId, maxPages = 5) {
  console.log(`Starting scan of ${url} with scan ID ${scanId}`);
  
  // Launch browser
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
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36 
WCAG-Scanner/1.0');
        
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

module.exports = {
  initiateFreeScan,
  performScan
};
