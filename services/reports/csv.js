const path = require('path');
const { createObjectCsvWriter } = require('csv-writer');
const config = require('../../config');

/**
 * Generate CSV report
 * @param {string} scanId - Scan ID
 * @param {Array} results - Scan results
 * @returns {Promise<boolean>}
 */
async function generateCsvReport(scanId, results) {
  try {
    const csvPath = path.join(config.paths.csvReports, `${scanId}.csv`);
    
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

module.exports = {
  generateCsvReport
};
