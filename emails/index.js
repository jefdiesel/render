const transporter = require('./transporter');
const config = require('../config');

// Import email templates
const confirmationTemplate = require('./templates/confirmation');
const resultsTemplate = require('./templates/results');
const adminResultsTemplate = require('./templates/admin-results');
const deepScanTemplate = require('./templates/deep-scan');
const errorTemplate = require('./templates/error');

/**
 * Send an email
 * @param {Object} options - Email options
 * @returns {Promise<boolean>}
 */
async function sendEmail(options) {
  try {
    await transporter.sendMail({
      from: `"A11yscan" <${config.email.from}>`,
      ...options
    });
    return true;
  } catch (error) {
    console.error(`Error sending email: ${error.message}`);
    throw error;
  }
}

/**
 * Get the appropriate base URL for emails
 * @returns {string} - Base URL to use in emails
 */
function getEmailBaseUrl() {
  // Always use APP_PUBLIC_URL in production, regardless of other settings
  if (process.env.NODE_ENV === 'production' && process.env.APP_PUBLIC_URL) {
    console.log(`Using production APP_PUBLIC_URL for email: ${process.env.APP_PUBLIC_URL}`);
    return process.env.APP_PUBLIC_URL.trim();
  }
  
  // Force production URL even in development mode if we're sending real emails
  if (process.env.FORCE_PRODUCTION_URLS === 'true' && process.env.APP_PUBLIC_URL) {
    console.log(`Using FORCE_PRODUCTION_URLS APP_PUBLIC_URL for email: ${process.env.APP_PUBLIC_URL}`);
    return process.env.APP_PUBLIC_URL.trim();
  }
  
  // Fallback to config URL
  console.log(`Using config.baseUrl() for email: ${config.baseUrl()}`);
  return config.baseUrl();
}

/**
 * Send confirmation email when a scan is started
 * @param {string} email - Recipient email
 * @param {string} url - Scanned URL
 * @param {string} scanId - Scan ID
 * @returns {Promise<boolean>}
 */
async function sendConfirmationEmail(email, url, scanId) {
  try {
    const baseUrl = getEmailBaseUrl();
    console.log(`Using baseUrl for confirmation email: ${baseUrl}`);
    const html = confirmationTemplate(baseUrl, url, scanId);
    
    await sendEmail({
      to: email,
      subject: 'Your A11yscan Accessibility Scan Has Started',
      html
    });
    
    console.log(`Confirmation email sent to ${email} for scan ${scanId}`);
    return true;
  } catch (error) {
    console.error(`Error sending confirmation email for ${scanId}:`, error);
    throw error;
  }
}

/**
 * Send results email when a scan is completed
 * @param {string} email - Recipient email
 * @param {string} url - Scanned URL
 * @param {string} scanId - Scan ID
 * @param {Object} summary - Scan summary
 * @returns {Promise<boolean>}
 */
async function sendResultsEmail(email, url, scanId, summary) {
  try {
    const baseUrl = getEmailBaseUrl();
    console.log(`Using baseUrl for results email: ${baseUrl}`);
    const html = resultsTemplate(baseUrl, url, scanId, summary);
    
    await sendEmail({
      to: email,
      subject: 'Your A11yscan Accessibility Report is Ready',
      html
    });
    
    console.log(`Results email sent to ${email} for scan ${scanId}`);
    return true;
  } catch (error) {
    console.error(`Error sending results email for ${scanId}:`, error);
    throw error;
  }
}

/**
 * Send admin results email when a scan is completed
 * @param {string} adminEmail - Admin email
 * @param {string} url - Scanned URL
 * @param {string} userEmail - User email
 * @param {string} scanId - Scan ID
 * @param {Object} summary - Scan summary
 * @returns {Promise<boolean>}
 */
async function sendAdminResultsEmail(adminEmail, url, userEmail, scanId, summary) {
  try {
    const baseUrl = getEmailBaseUrl();
    console.log(`Using baseUrl for admin results email: ${baseUrl}`);
    const html = adminResultsTemplate(baseUrl, url, userEmail, scanId, summary);
    
    await sendEmail({
      to: adminEmail,
      subject: `[ADMIN] New Scan Results for ${url}`,
      html
    });
    
    console.log(`Admin results email sent to ${adminEmail} for scan ${scanId}`);
    return true;
  } catch (error) {
    console.error(`Error sending admin results email for ${scanId}:`, error);
    throw error;
  }
}

/**
 * Send deep scan notification email
 * @param {string} adminEmail - Admin email
 * @param {string} url - Scanned URL
 * @param {string} scanId - Scan ID
 * @param {number} score - Accessibility score
 * @returns {Promise<boolean>}
 */
async function sendDeepScanNotification(adminEmail, url, scanId, score) {
  try {
    const baseUrl = getEmailBaseUrl();
    console.log(`Using baseUrl for deep scan email: ${baseUrl}`);
    const html = deepScanTemplate(baseUrl, url, scanId, score);
    
    await sendEmail({
      to: adminEmail,
      subject: `[ALERT] High Scoring Site (${score}/100) - Deep Scan Candidate`,
      html
    });
    
    console.log(`Deep scan notification sent to ${adminEmail} for ${url} (Score: ${score})`);
    return true;
  } catch (error) {
    console.error(`Error sending deep scan notification for ${url}:`, error);
    throw error;
  }
}

/**
 * Send error email when a scan fails
 * @param {string} email - Recipient email
 * @param {string} url - Scanned URL
 * @param {string} scanId - Scan ID
 * @param {string} errorMessage - Error message
 * @returns {Promise<boolean>}
 */
async function sendErrorEmail(email, url, scanId, errorMessage) {
  try {
    const baseUrl = getEmailBaseUrl();
    console.log(`Using baseUrl for error email: ${baseUrl}`);
    const html = errorTemplate(baseUrl, url, scanId, errorMessage);
    
    await sendEmail({
      to: email,
      subject: 'Issue with Your A11yscan Accessibility Scan',
      html
    });
    
    console.log(`Error email sent to ${email} for scan ${scanId}`);
    return true;
  } catch (error) {
    console.error(`Failed to send error email for ${scanId}:`, error);
    throw error;
  }
}

module.exports = {
  sendConfirmationEmail,
  sendResultsEmail,
  sendAdminResultsEmail,
  sendDeepScanNotification,
  sendErrorEmail
};
