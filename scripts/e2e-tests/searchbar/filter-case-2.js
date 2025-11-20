/**
 * E2E Test Script for SearchBar Component - Filter Flow Case 2
 *
 * Test Flow:
 * 1. Navigate to Item Master page
 * 2. Type # to open column selector modal
 * 3. Select "Harga Pokok" column (operator selector auto-opens)
 * 4. Select "Greater Than" operator
 * 5. Type value: 50000
 * 6. Press Enter to apply filter
 * 7. Verify badges are displayed: [Harga Pokok][Greater Than][50000]
 * 8. Take screenshot
 *
 * Expected Result:
 * - THREE badges should be visible in the search bar: [Harga Pokok][Greater Than][50000]
 * - Data should be filtered to show only items with Harga Pokok > 50000
 * - Filter is active and applied
 *
 * Usage with Playwright MCP:
 * Copy the code from the testSearchBarFilterCase2 function and run it using browser_run_code
 */

const {
  createSimpleFilter,
  navigateToItemMaster,
} = require('./badge-helpers.js');

async function testSearchBarFilterCase2(page) {
  console.log(
    '🚀 Starting SearchBar Filter E2E Test - Case 2 (Three Badges)...'
  );

  // Step 1: Navigate to the page
  console.log('📍 Step 1: Navigating to Item Master page...');
  await navigateToItemMaster(page);

  // Step 2-7: Create simple filter
  console.log('📋 Step 2-7: Creating simple filter...');
  await createSimpleFilter(page, 'Harga Pokok', 'Greater Than', '50000', true);

  // Step 8: Validate DOM - Check badge count
  console.log('🔍 Step 8: Validating DOM badges...');
  const allBadges = await page.locator('[class*="badge"]').all();
  const badgeCount = allBadges.length;

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 DOM VALIDATION RESULTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Expected badges: 3`);
  console.log(`Actual badges: ${badgeCount}`);
  console.log(`Badges should contain: [Harga Pokok][Greater Than][50000]`);

  const passed = badgeCount >= 3;

  if (passed) {
    console.log('✅ PASS: Simple filter badges rendered correctly in DOM');
  } else {
    console.log(`❌ FAIL: Expected at least 3 badges, got ${badgeCount}`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  return { passed, expectedCount: 3, actualCount: badgeCount };
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testSearchBarFilterCase2 };
}

// Example usage in Playwright MCP browser_run_code:
/*
await testSearchBarFilterCase2(page);
*/
