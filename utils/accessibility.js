/**
 * Run accessibility tests on a page
 * @param {Page} page - Puppeteer Page object
 * @returns {Promise<Object>} Accessibility test results
 */
async function runAccessibilityTests(page) {
  // Inject axe-core library
  await page.addScriptTag({
    path: require.resolve('axe-core')
  });
  
  // Run axe analysis
  const results = await page.evaluate(() => {
    return new Promise(resolve => {
      // @ts-ignore (axe is injected)
      axe.run(document, {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']
        }
      }, (err, results) => {
        if (err) resolve({ error: err.message });
        resolve(results);
      });
    });
  });
  
  // Calculate violation counts
  const violationCounts = {
    total: 0,
    critical: 0,
    warning: 0,
    info: 0
  };
  
  if (results.violations) {
    results.violations.forEach(violation => {
      const nodeCount = violation.nodes?.length || 0;
      violationCounts.total += nodeCount;
      
      // Map impact levels to our severity categories
      switch (violation.impact) {
        case 'critical':
        case 'serious':
          violationCounts.critical += nodeCount;
          break;
        case 'moderate':
        case 'minor':
          violationCounts.warning += nodeCount;
          break;
        default:
          violationCounts.info += nodeCount;
          break;
      }
    });
  }
  
  return {
    violations: results.violations || [],
    passes: results.passes || [],
    incomplete: results.incomplete || [],
    violationCounts
  };
}

/**
 * Calculate accessibility score based on test results
 * @param {Object} result - Scan results
 * @returns {number} Accessibility score (0-100)
 */
function calculateAccessibilityScore(result) {
  // This is a simplified scoring algorithm
  const totalIssues = result.issues.total;
  const criticalWeight = 5;  // Critical issues are weighted 5x
  const warningWeight = 2;   // Warnings are weighted 2x
  
  // Calculate weighted issues
  const weightedIssues = 
    (result.issues.critical * criticalWeight) + 
    (result.issues.warning * warningWeight) + 
    result.issues.info;
  
  // Base score - 100 is perfect
  let score = 100;
  
  if (totalIssues > 0) {
    // Pages factor - more pages scanned should be less penalizing per issue
    const pagesFactor = Math.sqrt(result.pagesScanned);
    
    // Deduct points based on weighted issues, adjusted by page count
    const penalty = (weightedIssues / pagesFactor) * 2;
    score = Math.max(0, Math.min(100, 100 - penalty));
  }
  
  // Round to nearest integer
  return Math.round(score);
}

module.exports = {
  runAccessibilityTests,
  calculateAccessibilityScore
};
