/**
 * Common function to clean URLs
 * @param {string} url - URL to clean
 * @returns {string} - Cleaned URL
 */
function cleanUrl(url) {
  return url ? url.trim().replace(/\/+$/, '') : '';
}

/**
 * Get the current year for copyright notices
 * @returns {number} - Current year
 */
function getCurrentYear() {
  return new Date().getFullYear();
}

/**
 * Results email sent when a scan is completed
 */
function results(appUrl, reportsUrl, url, scanId, summary) {
  const cleanAppUrl = cleanUrl(appUrl);
  const cleanReportsUrl = cleanUrl(reportsUrl);
  const reportUrl = `${cleanReportsUrl}/reports/${scanId}`;
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 
0 auto;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${cleanAppUrl}/images/a11yscan-logo.svg" alt="A11yscan 
Logo" width="180" height="50" style="display: inline-block;">
      </div>
      
      <h1 style="color: #4f46e5; margin-bottom: 20px;">Your Accessibility 
Report is Ready</h1>
      
      <p>Hello,</p>
      
      <p>Good news! We've completed the accessibility scan for your 
website.</p>
      
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 
5px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Website URL:</strong> ${url}</p>
        <p style="margin: 10px 0 0;"><strong>Scan ID:</strong> 
${scanId}</p>
        ${summary.accessibilityScore ? `<p style="margin: 10px 0 
0;"><strong>Accessibility Score:</strong> 
${summary.accessibilityScore}/100</p>` : ''}
      </div>
      
      <h2 style="color: #4f46e5; margin: 25px 0 15px;">Summary of 
Findings</h2>
      
      <div style="margin-bottom: 20px;">
        <p><strong>Pages Scanned:</strong> ${summary.pagesScanned}</p>
        <p><strong>Total Issues Found:</strong> ${summary.totalIssues}</p>
        <ul>
          <li><strong style="color: #ef4444;">Critical Issues:</strong> 
${summary.criticalIssues}</li>
          <li><strong style="color: #f59e0b;">Warning Issues:</strong> 
${summary.warningIssues}</li>
          <li><strong style="color: #3b82f6;">Info Issues:</strong> 
${summary.infoIssues}</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${reportUrl}" style="background-color: #4f46e5; color: 
white; padding: 12px 24px; text-decoration: none; border-radius: 5px; 
font-weight: bold; display: inline-block;">View Full Report</a>
      </div>
      
      <p>This report highlights accessibility issues on your website that 
may prevent people with disabilities from using it effectively. Addressing 
these issues will help you:</p>
      
      <ul>
        <li>Provide a better experience for all users</li>
        <li>Reach a wider audience</li>
        <li>Reduce legal risk</li>
        <li>Improve your SEO</li>
      </ul>
      
      <p>Your free report will be available for 7 days. For more 
comprehensive testing and ongoing monitoring, check out our <a 
href="${cleanAppUrl}/#pricing" style="color: #4f46e5;">paid plans</a>.</p>
      
      <p>Thank you for making the web more accessible for everyone!</p>
      
      <p>Best regards,<br>The A11yscan Team</p>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px 
solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center;">
        <p>© ${getCurrentYear()} A11yscan. All rights reserved.</p>
        <p>If you have any questions, please contact us at <a 
href="mailto:hello@a11yscan.xyz" style="color: 
#4f46e5;">hello@a11yscan.xyz</a></p>
      </div>
    </div>
  `;
}

/**
 * Admin notification email sent when a scan is completed
 */
function adminResults(appUrl, reportsUrl, url, userEmail, scanId, summary) 
{
  const cleanAppUrl = cleanUrl(appUrl);
  const cleanReportsUrl = cleanUrl(reportsUrl);
  const reportUrl = `${cleanReportsUrl}/reports/${scanId}`;
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 
0 auto;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${cleanAppUrl}/images/a11yscan-logo.svg" alt="A11yscan 
Logo" width="180" height="50" style="display: inline-block;">
      </div>
      
      <h1 style="color: #4f46e5; margin-bottom: 20px;">New Accessibility 
Scan Completed</h1>
      
      <p>Hello Admin,</p>
      
      <p>A new accessibility scan has been completed for a user.</p>
      
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 
5px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Website URL:</strong> ${url}</p>
        <p style="margin: 10px 0 0;"><strong>User Email:</strong> 
${userEmail}</p>
        <p style="margin: 10px 0 0;"><strong>Scan ID:</strong> 
${scanId}</p>
        <p style="margin: 10px 0 0;"><strong>Accessibility Score:</strong> 
${summary.accessibilityScore}/100</p>
      </div>
      
      <h2 style="color: #4f46e5; margin: 25px 0 15px;">Summary of 
Findings</h2>
      
      <div style="margin-bottom: 20px;">
        <p><strong>Pages Scanned:</strong> ${summary.pagesScanned}</p>
        <p><strong>Total Issues Found:</strong> ${summary.totalIssues}</p>
        <ul>
          <li><strong style="color: #ef4444;">Critical Issues:</strong> 
${summary.criticalIssues}</li>
          <li><strong style="color: #f59e0b;">Warning Issues:</strong> 
${summary.warningIssues}</li>
          <li><strong style="color: #3b82f6;">Info Issues:</strong> 
${summary.infoIssues}</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${reportUrl}" style="background-color: #4f46e5; color: 
white; padding: 12px 24px; text-decoration: none; border-radius: 5px; 
font-weight: bold; display: inline-block;">View Full Report</a>
      </div>
      
      <p>Best regards,<br>The A11yscan System</p>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px 
solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center;">
        <p>© ${getCurrentYear()} A11yscan. All rights reserved.</p>
      </div>
    </div>
  `;
}

/**
 * Confirmation email sent when a scan is initiated
 */
function confirmation(appUrl, reportsUrl, url, scanId) {
  const cleanAppUrl = cleanUrl(appUrl);
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 
0 auto;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${cleanAppUrl}/images/a11yscan-logo.svg" alt="A11yscan 
Logo" width="180" height="50" style="display: inline-block;">
      </div>
      
      <h1 style="color: #4f46e5; margin-bottom: 20px;">Your Accessibility 
Scan Has Started</h1>
      
      <p>Hello,</p>
      
      <p>Thank you for using A11yscan! We've started scanning your website 
for accessibility issues.</p>
      
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 
5px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Website URL:</strong> ${url}</p>
        <p style="margin: 10px 0 0;"><strong>Scan ID:</strong> 
${scanId}</p>
      </div>
      
      <p>We're scanning up to 5 pages on your site to identify potential 
accessibility issues. This process typically takes 5-10 minutes to 
complete.</p>
      
      <p>Once the scan is finished, we'll send you another email with your 
detailed accessibility report.</p>
      
      <p>In the meantime, you can check your scan status <a 
href="${cleanAppUrl}/scan-status.html?id=${scanId}" style="color: 
#4f46e5;">here</a>.</p>
      
      <p>Thank you for making the web more accessible for everyone!</p>
      
      <p>Best regards,<br>The A11yscan Team</p>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px 
solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center;">
        <p>© ${getCurrentYear()} A11yscan. All rights reserved.</p>
        <p>If you have any questions, please contact us at <a 
href="mailto:hello@a11yscan.xyz" style="color: 
#4f46e5;">hello@a11yscan.xyz</a></p>
      </div>
    </div>
  `;
}

/**
 * Deep scan notification email when a site scores above threshold
 */
function deepScan(appUrl, reportsUrl, url, scanId, score) {
  const cleanAppUrl = cleanUrl(appUrl);
  const cleanReportsUrl = cleanUrl(reportsUrl);
  const reportUrl = `${cleanReportsUrl}/reports/${scanId}`;
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 
0 auto;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${cleanAppUrl}/images/a11yscan-logo.svg" alt="A11yscan 
Logo" width="180" height="50" style="display: inline-block;">
      </div>
      
      <h1 style="color: #4f46e5; margin-bottom: 20px;">High Scoring 
Website Detected</h1>
      
      <p>Hello,</p>
      
      <p>A website has scored <strong>${score}/100</strong> on our 
accessibility scan, making it a good candidate for a comprehensive deep 
scan.</p>
      
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 
5px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Website URL:</strong> ${url}</p>
        <p style="margin: 10px 0 0;"><strong>Scan ID:</strong> 
${scanId}</p>
        <p style="margin: 10px 0 0;"><strong>Score:</strong> 
${score}/100</p>
      </div>
      
      <p>This site may be a good prospect for showcasing the benefits of 
our premium services.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${reportUrl}" style="background-color: #4f46e5; color: 
white; padding: 12px 24px; text-decoration: none; border-radius: 5px; 
font-weight: bold; display: inline-block;">View Scan Report</a>
      </div>
      
      <p>Best regards,<br>The A11yscan System</p>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px 
solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center;">
        <p>© ${getCurrentYear()} A11yscan. All rights reserved.</p>
      </div>
    </div>
  `;
}

/**
 * Error notification email when a scan fails
 */
function error(appUrl, reportsUrl, url, scanId, errorMessage) {
  const cleanAppUrl = cleanUrl(appUrl);
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 
0 auto;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${cleanAppUrl}/images/a11yscan-logo.svg" alt="A11yscan 
Logo" width="180" height="50" style="display: inline-block;">
      </div>
      
      <h1 style="color: #4f46e5; margin-bottom: 20px;">Issue with Your 
Accessibility Scan</h1>
      
      <p>Hello,</p>
      
      <p>We encountered an issue while scanning your website for 
accessibility issues.</p>
      
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 
5px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Website URL:</strong> ${url}</p>
        <p style="margin: 10px 0 0;"><strong>Scan ID:</strong> 
${scanId}</p>
      </div>
      
      <div style="background-color: #fee2e2; padding: 15px; border-radius: 
5px; margin: 20px 0; color: #b91c1c;">
        <p style="margin: 0;"><strong>Error:</strong> ${errorMessage}</p>
      </div>
      
      <p>This could be due to several reasons:</p>
      
      <ul>
        <li>The website is not accessible or requires authentication</li>
        <li>The website has a robots.txt file blocking our scanner</li>
        <li>The website has security measures preventing automated 
scanning</li>
        <li>There might be temporary connectivity issues</li>
      </ul>
      
      <p>Please try again later or contact us if you continue experiencing 
issues.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${cleanAppUrl}/#scan" style="background-color: #4f46e5; 
color: white; padding: 12px 24px; text-decoration: none; border-radius: 
5px; font-weight: bold; display: inline-block;">Try Again</a>
      </div>
      
      <p>Thank you for your understanding.</p>
      
      <p>Best regards,<br>The A11yscan Team</p>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px 
solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center;">
        <p>© ${getCurrentYear()} A11yscan. All rights reserved.</p>
        <p>If you have any questions, please contact us at <a 
href="mailto:hello@a11yscan.xyz" style="color: 
#4f46e5;">hello@a11yscan.xyz</a></p>
      </div>
    </div>
  `;
}

module.exports = {
  results,
  adminResults,
  confirmation,
  deepScan,
  error
};
