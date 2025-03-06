const {join} = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Changes the cache location for Puppeteer
  cacheDirectory: join(process.env.TMPDIR || '/tmp', 'puppeteer'),
  
  // Always download Chrome 
  chrome: {
    skipDownload: false,
  },
};
