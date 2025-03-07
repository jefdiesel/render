const puppeteer = require('puppeteer');

/**
 * Launch browser for scanning
 * @returns {Promise<Browser>} Puppeteer Browser instance
 */
async function launchBrowser() {
  try {
    console.log('Launching browser with Puppeteer bundled Chrome');
    
    const browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
      headless: true,
    });
    
    console.log('Browser launched successfully with bundled Chrome');
    return browser;
  } catch (error) {
    console.error('Failed to launch browser:', error);
    throw error;
  }
}

/**
 * Extract links from a page
 * @param {Page} page - Puppeteer Page object
 * @param {string} baseUrl - Base URL for the scan
 * @returns {Promise<string[]>} Array of URLs found on the page
 */
async function extractLinks(page, baseUrl) {
  try {
    // Parse the base URL
    const baseUrlObj = new URL(baseUrl);
    const baseHostname = baseUrlObj.hostname;
    const baseOrigin = baseUrlObj.origin;
    
    // Extract links via browser context
    const links = await page.evaluate((baseHostname, baseOrigin) => {
      // Get all links on the page
      const allLinks = Array.from(document.querySelectorAll('a[href]'))
        .map(a => {
          try {
            // Get the full href
            const href = a.href;
            if (!href) return null;
            
            // Parse the URL
            const url = new URL(href);
            
            // Only include links to the same hostname
            if (url.hostname !== baseHostname) return null;
            
            // Skip hash links (same page anchors)
            if (url.pathname === window.location.pathname && url.hash) return null;
            
            // Skip mailto, tel, etc.
            if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
            
            // Return the normalized URL (without hash)
            return url.origin + url.pathname + url.search;
          } catch (e) {
            return null;
          }
        })
        .filter(Boolean); // Remove nulls
      
      // Remove duplicates
      return [...new Set(allLinks)];
    }, baseHostname, baseOrigin);
    
    return links;
  } catch (error) {
    console.error('Error extracting links:', error);
    return [];
  }
}

module.exports = {
  launchBrowser,
  extractLinks
};
