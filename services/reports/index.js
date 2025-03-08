const { generatePdfReport } = require('./pdf');
const { generateCsvReport } = require('./csv');
const config = require('../../config');

/**
 * Generate reports for scan results
 * @param {string} scanId - Scan ID
 * @param {string} url - Scanned URL
 * @param {Array} results - Scan results
 * @param {Object} summary - Scan summary
 * @returns {Promise<{
 *   pdf: {path: string, url: string}, 
 *   csv: {path: string, url: string}
 * }>}
 */
async function generateReports(scanId, url, results, summary) {
  try {
    // Generate PDF report
    const pdfReport = await generatePdfReport(scanId, url, results, summary);
    
    // Generate CSV report
    const csvReport = await generateCsvReport(scanId, results);
    
    // Generate explicit URLs using the config method
    const pdfUrl = config.reportUrlGenerator(scanId, 'pdf');
    const csvUrl = config.reportUrlGenerator(scanId, 'csv');
    
    // Update the report objects with the generated URLs
    pdfReport.url = pdfUrl;
    csvReport.url = csvUrl;
    
    console.log(`Reports generated for scan ${scanId}`);
    console.log(`PDF Report URL: ${pdfUrl}`);
    console.log(`CSV Report URL: ${csvUrl}`);
    
    return {
      pdf: pdfReport,
      csv: csvReport
    };
  } catch (error) {
    console.error(`Error generating reports for ${scanId}:`, error);
    throw error;
  }
}

module.exports = {
  generateReports,
  generatePdfReport,
  generateCsvReport
};
