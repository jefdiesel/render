/**
 * Deep scan notification email when a site scores above threshold
 */
module.exports = (baseUrl, reportsBaseUrl, url, scanId, score) => {
  // Ensure URLs don't have trailing slashes and are trimmed
  const cleanBaseUrl = baseUrl.trim().replace(/\/+$/, '');
  const cleanReportsBaseUrl = reportsBaseUrl.trim().replace(/\/+$/, '');
  
  // Use reports URL for the report link
  const reportUrl = `${cleanReportsBaseUrl}/reports/${scanId}`;
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${cleanBaseUrl}/images/a11yscan-logo.svg" alt="A11yscan Logo" width="180" height="50" style="display: inline-block;">
      </div>
      
      <h1 style="color: #4f46e5; margin-bottom: 20px;">High Scoring Website Detected</h1>
      
      <p>Hello,</p>
      
      <p>A website has scored <strong>${score}/100</strong> on our accessibility scan, making it a good candidate for a comprehensive deep scan.</p>
      
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Website URL:</strong> ${url}</p>
        <p style="margin: 10px 0 0;"><strong>Scan ID:</strong> ${scanId}</p>
        <p style="margin: 10px 0 0;"><strong>Score:</strong> ${score}/100</p>
      </div>
      
      <p>This site may be a good prospect for showcasing the benefits of our premium services.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${reportUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">View Scan Report</a>
      </div>
      
      <p>Best regards,<br>The A11yscan System</p>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center;">
        <p>© ${new Date().getFullYear()} A11yscan. All rights reserved.</p>
      </div>
    </div>
  `;
};
