const {join} = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Changes the cache location for Puppeteer
  cacheDirectory: join(process.env.TMPDIR || '/tmp', 'puppeteer'),
  
  // Only download Chrome in development, use system Chrome in production
  chrome: {
    skipDownload: process.env.NODE_ENV === 'production',
  },
};
