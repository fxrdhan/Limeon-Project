/**
 * E2E Test Script for SearchBar Component - Filter Flow Case 1
 *
 * Test Flow:
 * 1. Navigate to Item Master page
 * 2. Type # to open column selector modal
 * 3. Select "Harga Pokok" column (operator selector auto-opens)
 * 4. Select "Greater Than" operator
 * 5. Take screenshot (WITHOUT entering value)
 *
 * Expected Result:
 * - TWO badges should be visible in the search bar: [Harga Pokok][Greater Than]
 * - No value badge yet (value not entered)
 * - Operator selector should still be visible or just closed
 *
 * Usage with Playwright MCP:
 * Copy the code from the testSearchBarFilterCase1 function and run it using browser_run_code
 */

const {
  createColumnOperatorBadges,
  navigateToItemMaster,
} = require('./badge-helpers.js');

async function testSearchBarFilterCase1(page) {
  console.log('🚀 Starting SearchBar Filter E2E Test - Case 1 (Two Badges)...');

  // Step 1: Navigate to the page
  console.log('📍 Step 1: Navigating to Item Master page...');
  await navigateToItemMaster(page);

  // Step 2-5: Create column + operator badges
  console.log('📋 Step 2-5: Creating column and operator badges...');
  await createColumnOperatorBadges(page, 'Harga Pokok', 'Greater Than');
  await page.waitForTimeout(500);

  // Step 6: Validate DOM - Check badge count
  console.log('🔍 Step 6: Validating DOM badges...');
  const allBadges = await page.locator('[class*="badge"]').all();
  const badgeCount = allBadges.length;

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 DOM VALIDATION RESULTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Expected badges: 2`);
  console.log(`Actual badges: ${badgeCount}`);
  console.log(`Badges should contain: [Harga Pokok][Greater Than]`);

  const passed = badgeCount >= 2;

  if (passed) {
    console.log(
      '✅ PASS: Column and operator badges rendered correctly in DOM'
    );
  } else {
    console.log(`❌ FAIL: Expected at least 2 badges, got ${badgeCount}`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  return { passed, expectedCount: 2, actualCount: badgeCount };
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testSearchBarFilterCase1 };
}

// Example usage in Playwright MCP browser_run_code:
/*
await testSearchBarFilterCase1(page);
*/
