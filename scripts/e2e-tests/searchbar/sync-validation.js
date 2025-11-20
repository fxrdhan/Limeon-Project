/**
 * E2E Test Script for SearchBar-AGGrid Filter Synchronization
 *
 * Purpose:
 * Validate that SearchBar badges and AG Grid Filter Panel are in sync.
 * Uses Playwright MCP locators to extract filter panel text and verify synchronization.
 *
 * Test Cases:
 * - Case 2: 3 badges (Column + Operator + Value) → Simple filter: "> 50000"
 * - Case 4: 6 badges (Multi-condition complete) → Range filter: "> 50000 AND < 100000"
 *
 * Expected Results:
 * ✅ Badge representation should match AG Grid Filter Panel text exactly
 * ✅ Filter logic should be consistent between badge and grid
 * ✅ When badges show [Harga Pokok][Greater Than][50000], panel shows "Harga Pokok > 50000"
 * ✅ When badges show 6-badge multi-condition, panel shows "Harga Pokok > 50000 AND < 100000"
 *
 * Usage with Playwright MCP:
 * Copy the code from the testSearchBarSyncValidation function and run it using browser_run_code
 */

// Import badge creation helpers
const {
  createSimpleFilter,
  createMultiConditionComplete,
  navigateToItemMaster,
} = require('./badge-helpers.js');

async function testSearchBarSyncValidation(page) {
  console.log('🚀 Starting SearchBar-AGGrid Sync Validation Test...');
  console.log('');

  const results = [];

  // Helper to extract filter panel heading from current page
  async function getFilterPanelText() {
    try {
      // Look for the Harga Pokok filter heading in the filter panel
      const heading = await page
        .locator('heading[level="2"]')
        .filter({ hasText: 'Harga Pokok' })
        .textContent({ timeout: 2000 });
      return heading;
    } catch (e) {
      return 'Harga Pokok is (All)';
    }
  }

  // === Test Case 2: Simple Filter ===
  console.log('📝 Case 2: Testing Simple Filter (3 badges)...');

  await navigateToItemMaster(page);
  await createSimpleFilter(page, 'Harga Pokok', 'Greater Than', '50000', true);
  await page.waitForTimeout(500); // Extra time for filter panel to update

  const filterPanel2 = await getFilterPanelText();
  const isSync2 = filterPanel2.includes('> 50000');

  console.log(`  📋 Expected Badges: 3 → [Harga Pokok][Greater Than][50000]`);
  console.log(`  🔧 Filter Panel: "${filterPanel2}"`);
  console.log(`  ✅ Expected Pattern: "> 50000"`);
  console.log(
    `  ${isSync2 ? '✅' : '❌'} Sync Status: ${isSync2 ? 'MATCHED' : 'NOT MATCHED'}`
  );
  console.log('');

  results.push({
    case: 'Case 2 (Simple Filter)',
    passed: isSync2,
    filterPanel: filterPanel2,
    expected: '> 50000',
  });

  // === Test Case 4: Multi-Condition Filter ===
  console.log('📝 Case 4: Testing Multi-Condition Filter (6 badges)...');

  await navigateToItemMaster(page);
  await createMultiConditionComplete(
    page,
    'Harga Pokok',
    'Greater Than',
    '50000',
    'AND',
    'Less Than',
    '100000',
    true
  );
  await page.waitForTimeout(500); // Extra time for filter panel to update

  const filterPanel4 = await getFilterPanelText();
  const isSync4 = filterPanel4.includes('> 50000 AND < 100000');

  console.log(
    `  📋 Expected Badges: 6 → [Harga Pokok][Greater Than][50000][AND][Less Than][100000]`
  );
  console.log(`  🔧 Filter Panel: "${filterPanel4}"`);
  console.log(`  ✅ Expected Pattern: "> 50000 AND < 100000"`);
  console.log(
    `  ${isSync4 ? '✅' : '❌'} Sync Status: ${isSync4 ? 'MATCHED' : 'NOT MATCHED'}`
  );
  console.log('');

  results.push({
    case: 'Case 4 (Multi-Condition)',
    passed: isSync4,
    filterPanel: filterPanel4,
    expected: '> 50000 AND < 100000',
  });

  // === Summary ===
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 SYNC VALIDATION SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  results.forEach(r => {
    console.log(
      `${r.passed ? '✅' : '❌'} ${r.case}: ${r.passed ? 'PASSED' : 'FAILED'}`
    );
    console.log(`   Filter Panel: "${r.filterPanel}"`);
    console.log(`   Expected: "${r.expected}"`);
    console.log('');
  });

  const totalPassed = results.filter(r => r.passed).length;
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📈 Overall: ${totalPassed}/${results.length} tests passed`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  if (totalPassed === results.length) {
    console.log('✅ ALL TESTS PASSED!');
    console.log('✨ Badge-to-Filter synchronization is working correctly.');
    console.log('');
    console.log('Key Findings:');
    console.log('• SearchBar badges accurately represent the filter state');
    console.log('• AG Grid Filter Panel shows matching filter patterns');
    console.log(
      '• Filter logic is consistent between badge UI and grid filtering'
    );
  } else {
    console.log('❌ SOME TESTS FAILED!');
    console.log('Please review the sync validation results above.');
  }

  return results;
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testSearchBarSyncValidation };
}

// Example usage in Playwright MCP browser_run_code:
/*
await testSearchBarSyncValidation(page);
*/
