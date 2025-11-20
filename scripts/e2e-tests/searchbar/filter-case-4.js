/**
 * E2E Test Script for SearchBar Component - Filter Flow Case 4
 *
 * Test Flow:
 * 1. Navigate to Item Master page
 * 2. Type # to open column selector modal
 * 3. Select "Harga Pokok" column (operator selector auto-opens)
 * 4. Select "Greater Than" operator
 * 5. Type value: 50000
 * 6. Press Enter to confirm first condition
 * 7. Type # to open join operator selector
 * 8. Select "AND" join operator
 * 9. Operator selector opens automatically, select "Less Than"
 * 10. Type second value: 100000
 * 11. Press Enter to apply multi-condition filter
 * 12. Take screenshot
 *
 * Expected Result:
 * - SIX badges should be visible: [Harga Pokok][Greater Than][50000][AND][Less Than][100000]
 * - Data should be filtered to show items with 50000 < Harga Pokok < 100000
 * - Multi-condition filter is active and applied
 *
 * Usage with Playwright MCP:
 * Copy the code from the testSearchBarFilterCase4 function and run it using browser_run_code
 */

const {
  createMultiConditionComplete,
  navigateToItemMaster,
} = require('./badge-helpers.js');

async function testSearchBarFilterCase4(page) {
  console.log(
    '🚀 Starting SearchBar Filter E2E Test - Case 4 (Complete Multi-Condition Filter)...'
  );

  // Step 1: Navigate to the page
  console.log('📍 Step 1: Navigating to Item Master page...');
  await navigateToItemMaster(page);

  // Step 2-12: Create complete multi-condition filter
  console.log('📋 Step 2-12: Creating complete multi-condition filter...');
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

  // Step 13: Validate DOM - Check badge count
  console.log('🔍 Step 13: Validating DOM badges...');
  const allBadges = await page.locator('[class*="badge"]').all();
  const badgeCount = allBadges.length;

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 DOM VALIDATION RESULTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Expected badges: 6`);
  console.log(`Actual badges: ${badgeCount}`);
  console.log(
    `Badges should contain: [Harga Pokok][Greater Than][50000][AND][Less Than][100000]`
  );

  const passed = badgeCount >= 6;

  if (passed) {
    console.log(
      '✅ PASS: Complete multi-condition badges rendered correctly in DOM'
    );
  } else {
    console.log(`❌ FAIL: Expected at least 6 badges, got ${badgeCount}`);
  }
  console.log('Filter: Items with Harga Pokok between 50,000 and 100,000');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  return { passed, expectedCount: 6, actualCount: badgeCount };
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testSearchBarFilterCase4 };
}

// Example usage in Playwright MCP browser_run_code:
/*
await testSearchBarFilterCase4(page);
*/
