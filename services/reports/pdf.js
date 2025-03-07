// services/reports/pdf.js
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const config = require('../../config');
const r2Storage = config.storage.useR2 ? require('../storage/r2') : null;

/**
 * Generate PDF report
 * @param {string} scanId - Scan ID
 * @param {string} url - Scanned URL
 * @param {Array} results - Scan results
 * @param {Object} summary - Scan summary
 * @returns {Promise<{path: string, url?: string}>} - PDF file info
 */
async function generatePdfReport(scanId, url, results, summary) {
  try {
    // Path for local storage
    const pdfPath = path.join(config.paths.pdfReports, `${scanId}.pdf`);
    
    // Create a PDF document 
    const doc = new PDFDocument({ margin: 50 });
    
    // Create a write stream - using regular fs, not promises
    let writeStream;
    
    if (config.storage.useR2) {
      // If using R2, we'll write to a local temp file first
      writeStream = fs.createWriteStream(pdfPath);
    } else {
      // If using local storage, write directly to destination
      writeStream = fs.createWriteStream(pdfPath);
    }
    
    // Pipe the PDF to the write stream
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
    
    // Simple footer, just the scan ID
    doc.fontSize(8).text(
      `A11yscan Accessibility Report - ${scanId}`,
      50, 
      doc.page.height - 50,
      { align: 'center' }
    );
    
    // Finalize the PDF
    doc.end();
    
    // Wait for the write stream to finish
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
    
    // If using R2, upload the file and return the URL
    if (config.storage.useR2) {
      const key = `${config.storage.r2.pdf}/${scanId}.pdf`;
      const result = await r2Storage.uploadFile(pdfPath, key, 'application/pdf');
      
      // Optionally, delete the local file after upload
      fs.unlinkSync(pdfPath);
      
      return {
        path: pdfPath,
        url: result.url
      };
    }
    
    // If using local storage, return the local path
    return {
      path: pdfPath
    };
    
  } catch (error) {
    console.error(`Error generating PDF report for ${scanId}:`, error);
    throw error;
  }
}

module.exports = {
  generatePdfReport
};
