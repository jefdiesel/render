const { generatePdfReport } = require('./pdf');
const { generateCsvReport } = require('./csv');

/**
 * Generate reports for scan results
 * @param {string} scanId - Scan ID
 * @param {string} url - Scanned URL
 * @param {Array} results - Scan results
 * @param {Object} summary - Scan summary
 * @returns {Promise<boolean>}
 */
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

module.exports = {
  generateReports,
  generatePdfReport,
  generateCsvReport
};
