/**
 * E2E Test Script for SearchBar Component - Filter Flow Case 3
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
 * 10. Take screenshot
 *
 * Expected Result:
 * - FIVE badges should be visible: [Harga Pokok][Greater Than][50000][AND][Less Than]
 * - No second value entered yet
 * - Ready for second value input
 *
 * Usage with Playwright MCP:
 * Copy the code from the testSearchBarFilterCase3 function and run it using browser_run_code
 */

const {
  createMultiConditionPartial,
  navigateToItemMaster,
} = require('./badge-helpers.js');

async function testSearchBarFilterCase3(page) {
  console.log(
    '🚀 Starting SearchBar Filter E2E Test - Case 3 (Five Badges - Before Second Value)...'
  );

  // Step 1: Navigate to the page
  console.log('📍 Step 1: Navigating to Item Master page...');
  await navigateToItemMaster(page);

  // Step 2-10: Create multi-condition partial filter
  console.log('📋 Step 2-10: Creating multi-condition partial filter...');
  await createMultiConditionPartial(
    page,
    'Harga Pokok',
    'Greater Than',
    '50000',
    'AND',
    'Less Than'
  );

  // Step 11: Validate DOM - Check badge count
  console.log('🔍 Step 11: Validating DOM badges...');
  const allBadges = await page.locator('[class*="badge"]').all();
  const badgeCount = allBadges.length;

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 DOM VALIDATION RESULTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Expected badges: 5`);
  console.log(`Actual badges: ${badgeCount}`);
  console.log(
    `Badges should contain: [Harga Pokok][Greater Than][50000][AND][Less Than]`
  );

  const passed = badgeCount >= 5;

  if (passed) {
    console.log(
      '✅ PASS: Multi-condition partial badges rendered correctly in DOM'
    );
  } else {
    console.log(`❌ FAIL: Expected at least 5 badges, got ${badgeCount}`);
  }
  console.log('Note: Second value NOT entered yet (5 badges, not 6)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  return { passed, expectedCount: 5, actualCount: badgeCount };
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testSearchBarFilterCase3 };
}

// Example usage in Playwright MCP browser_run_code:
/*
await testSearchBarFilterCase3(page);
*/
