/**
 * Confirmation email sent when a scan is initiated
 */
module.exports = (baseUrl, url, scanId) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${baseUrl}/images/a11yscan-logo.svg" alt="A11yscan Logo" width="180" height="50" style="display: inline-block;">
      </div>
      
      <h1 style="color: #4f46e5; margin-bottom: 20px;">Your Accessibility Scan Has Started</h1>
      
      <p>Hello,</p>
      
      <p>Thank you for using A11yscan! We've started scanning your website for accessibility issues.</p>
      
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Website URL:</strong> ${url}</p>
        <p style="margin: 10px 0 0;"><strong>Scan ID:</strong> ${scanId}</p>
      </div>
      
      <p>We're scanning up to 5 pages on your site to identify potential accessibility issues. This process typically takes 5-10 minutes to complete.</p>
      
      <p>Once the scan is finished, we'll send you another email with your detailed accessibility report.</p>
      
      <p>In the meantime, you can check your scan status <a href="${baseUrl}/scan-status.html?id=${scanId}" style="color: #4f46e5;">here</a>.</p>
      
      <p>Thank you for making the web more accessible for everyone!</p>
      
      <p>Best regards,<br>The A11yscan Team</p>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center;">
        <p>© ${new Date().getFullYear()} A11yscan. All rights reserved.</p>
        <p>If you have any questions, please contact us at <a href="mailto:hello@a11yscan.xyz" style="color: #4f46e5;">hello@a11yscan.xyz</a></p>
      </div>
    </div>
  `;
};
