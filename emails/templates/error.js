/**
 * Error notification email when a scan fails
 */
module.exports = (baseUrl, url, scanId, errorMessage) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${baseUrl}/images/a11yscan-logo.svg" alt="A11yscan Logo" width="180" height="50" style="display: inline-block;">
      </div>
      
      <h1 style="color: #4f46e5; margin-bottom: 20px;">Issue with Your Accessibility Scan</h1>
      
      <p>Hello,</p>
      
      <p>We encountered an issue while scanning your website for accessibility issues.</p>
      
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Website URL:</strong> ${url}</p>
        <p style="margin: 10px 0 0;"><strong>Scan ID:</strong> ${scanId}</p>
      </div>
      
      <div style="background-color: #fee2e2; padding: 15px; border-radius: 5px; margin: 20px 0; color: #b91c1c;">
        <p style="margin: 0;"><strong>Error:</strong> ${errorMessage}</p>
      </div>
      
      <p>This could be due to several reasons:</p>
      
      <ul>
        <li>The website is not accessible or requires authentication</li>
        <li>The website has a robots.txt file blocking our scanner</li>
        <li>The website has security measures preventing automated scanning</li>
        <li>There might be temporary connectivity issues</li>
      </ul>
      
      <p>Please try again later or contact us if you continue experiencing issues.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${baseUrl}/#scan" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Try Again</a>
      </div>
      
      <p>Thank you for your understanding.</p>
      
      <p>Best regards,<br>The A11yscan Team</p>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center;">
        <p>© ${new Date().getFullYear()} A11yscan. All rights reserved.</p>
        <p>If you have any questions, please contact us at <a href="mailto:hello@a11yscan.xyz" style="color: #4f46e5;">hello@a11yscan.xyz</a></p>
      </div>
    </div>
  `;
};
