const {join} = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Changes the cache location for Puppeteer
  cacheDirectory: join(process.env.TMPDIR || '/tmp', 'puppeteer'),
  
  // Ensure Chrome is downloaded
  chrome: {
    skipDownload: false,
  },
};
