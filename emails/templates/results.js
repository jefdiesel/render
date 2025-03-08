/**
 * Results email sent when a scan is completed
 */
module.exports = (baseUrl, url, scanId, summary) => {
  // Ensure baseUrl doesn't have trailing slashes and is trimmed
  const cleanBaseUrl = baseUrl.trim().replace(/\/+$/, '');
  const reportUrl = `${cleanBaseUrl}/reports/${scanId}`;  
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${cleanBaseUrl}/images/a11yscan-logo.svg" alt="A11yscan Logo" width="180" height="50" style="display: inline-block;">
      </div>
      
      <h1 style="color: #4f46e5; margin-bottom: 20px;">Your Accessibility Report is Ready</h1>
      
      <p>Hello,</p>
      
      <p>Good news! We've completed the accessibility scan for your website.</p>
      
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Website URL:</strong> ${url}</p>
        <p style="margin: 10px 0 0;"><strong>Scan ID:</strong> ${scanId}</p>
        ${summary.accessibilityScore ? `<p style="margin: 10px 0 0;"><strong>Accessibility Score:</strong> ${summary.accessibilityScore}/100</p>` : ''}
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
      
      <p>This report highlights accessibility issues on your website that may prevent people with disabilities from using it effectively. Addressing these issues will help you:</p>
      
      <ul>
        <li>Provide a better experience for all users</li>
        <li>Reach a wider audience</li>
        <li>Reduce legal risk</li>
        <li>Improve your SEO</li>
      </ul>
      
      <p>Your free report will be available for 7 days. For more comprehensive testing and ongoing monitoring, check out our <a href="${cleanBaseUrl}/#pricing" style="color: #4f46e5;">paid plans</a>.</p>
      
      <p>Thank you for making the web more accessible for everyone!</p>
      
      <p>Best regards,<br>The A11yscan Team</p>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center;">
        <p>© ${new Date().getFullYear()} A11yscan. All rights reserved.</p>
        <p>If you have any questions, please contact us at <a href="mailto:hello@a11yscan.xyz" style="color: #4f46e5;">hello@a11yscan.xyz</a></p>
      </div>
    </div>
  `;
};
