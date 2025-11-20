/**
 * E2E Test Script for SearchBar Component - Filter Flow Case 0
 *
 * Test Flow:
 * 1. Navigate to Item Master page
 * 2. Type # to open column selector modal
 * 3. Select "Harga Pokok" column
 * 4. Take screenshot
 *
 * Expected Result:
 * - ONE badge should be visible: [Harga Pokok]
 * - No operator or value selected yet
 * - Column badge is shown, ready for operator selection
 *
 * Usage with Playwright MCP:
 * Copy the code from the testSearchBarFilterCase0 function and run it using browser_run_code
 */

const {
  createColumnBadge,
  navigateToItemMaster,
} = require('./badge-helpers.js');

async function testSearchBarFilterCase0(page) {
  console.log(
    '🚀 Starting SearchBar Filter E2E Test - Case 0 (Single Badge - Column Only)...'
  );

  // Step 1: Navigate to the page
  console.log('📍 Step 1: Navigating to Item Master page...');
  await navigateToItemMaster(page);

  // Step 2-4: Create column badge
  console.log('📋 Step 2-4: Creating column badge...');
  await createColumnBadge(page, 'Harga Pokok');

  // Step 5: Validate DOM - Check badge count
  console.log('🔍 Step 5: Validating DOM badges...');
  const badges = await page
    .locator('[class*="badge"]')
    .filter({ hasText: /Harga Pokok/i })
    .all();
  const badgeCount = badges.length;

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 DOM VALIDATION RESULTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Expected badges: 1`);
  console.log(`Actual badges: ${badgeCount}`);
  console.log(`Badge should contain: [Harga Pokok]`);

  const passed = badgeCount >= 1;

  if (passed) {
    console.log('✅ PASS: Column badge rendered correctly in DOM');
  } else {
    console.log(`❌ FAIL: Expected at least 1 badge, got ${badgeCount}`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  return { passed, expectedCount: 1, actualCount: badgeCount };
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testSearchBarFilterCase0 };
}

// Example usage in Playwright MCP browser_run_code:
/*
await testSearchBarFilterCase0(page);
*/
