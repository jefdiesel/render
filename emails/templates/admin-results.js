/**
 * Admin notification email sent when a scan is completed
 */
module.exports = (baseUrl, url, userEmail, scanId, summary) => {
  const reportUrl = `${baseUrl}/reports/${scanId}`;
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${baseUrl}/images/a11yscan-logo.svg" alt="A11yscan Logo" width="180" height="50" style="display: inline-block;">
      </div>
      
      <h1 style="color: #4f46e5; margin-bottom: 20px;">New Accessibility Scan Completed</h1>
      
      <p>Hello Admin,</p>
      
      <p>A new accessibility scan has been completed for a user.</p>
      
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Website URL:</strong> ${url}</p>
        <p style="margin: 10px 0 0;"><strong>User Email:</strong> ${userEmail}</p>
        <p style="margin: 10px 0 0;"><strong>Scan ID:</strong> ${scanId}</p>
        <p style="margin: 10px 0 0;"><strong>Accessibility Score:</strong> ${summary.accessibilityScore}/100</p>
      </div>
      
      <h2 style="color: #4f46e5; margin: 25px 0 15px;">Summary of Findings</h2>
      
      <div style="margin-bottom: 20px;">
        <p><strong>Pages Scanned:</strong> ${summary.pagesScanned}</p>
        <p><strong>Total Issues Found:</strong> ${summary.totalIssues}</p>
        <ul>
          <li><strong style="color: #ef4444;">Critical Issues:</strong> ${summary.criticalIssues}</li>
          <li><strong style="color: #f59e0b;">Warning Issues:</strong> ${summary.warningIssues}</li>
          <li><strong style="color: #3b82f6;">Info Issues:</strong> ${summary.infoIssues}</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${reportUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">View Full Report</a>
      </div>
      
      <p>Best regards,<br>The A11yscan System</p>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center;">
        <p>© ${new Date().getFullYear()} A11yscan. All rights reserved.</p>
      </div>
    </div>
  `;
};
