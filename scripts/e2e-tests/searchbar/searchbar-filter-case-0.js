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

async function testSearchBarFilterCase0(page) {
  console.log(
    '🚀 Starting SearchBar Filter E2E Test - Case 0 (Single Badge - Column Only)...'
  );

  // Step 1: Navigate to the page
  console.log('📍 Step 1: Navigating to Item Master page...');
  await page.goto('http://localhost:5173/master-data/item-master/items');
  await page.waitForTimeout(2000);

  // Step 2: Click on search bar
  console.log('🔍 Step 2: Clicking on search bar...');
  await page.getByRole('textbox', { name: 'Cari item...' }).click();

  // Step 3: Type # to open column selector
  console.log('📋 Step 3: Opening column selector with #...');
  await page.getByRole('textbox', { name: 'Cari item...' }).fill('#');
  await page.waitForTimeout(500);

  // Step 4: Select "Harga Pokok" column
  console.log('✅ Step 4: Selecting "Harga Pokok" column...');
  await page.getByText('Harga Pokok').first().click();
  await page.waitForTimeout(500);

  // Step 5: Take screenshot (BEFORE typing # for operator)
  console.log('📸 Step 5: Taking screenshot...');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const screenshotPath = `.playwright-mcp/searchbar-filter-case-0-${timestamp}.jpeg`;

  await page.screenshot({
    path: screenshotPath,
    type: 'jpeg',
    quality: 90,
  });

  console.log('✅ Test completed successfully!');
  console.log(`📸 Screenshot saved to: ${screenshotPath}`);
  console.log('');
  console.log('Expected badge: [Harga Pokok]');
  console.log('Note: Only column badge visible (1 badge)');

  return screenshotPath;
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testSearchBarFilterCase0 };
}

// Example usage in Playwright MCP browser_run_code:
/*
await testSearchBarFilterCase0(page);
*/
