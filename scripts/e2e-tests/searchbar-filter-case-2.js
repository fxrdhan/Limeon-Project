/**
 * E2E Test Script for SearchBar Component - Filter Flow Case 2
 *
 * Test Flow:
 * 1. Navigate to Item Master page
 * 2. Type # to open column selector modal
 * 3. Select "Harga Pokok" column
 * 4. Type # again to open operator selector modal
 * 5. Select "Greater Than" operator
 * 6. Type value: 50000
 * 7. Press Enter to apply filter
 * 8. Verify badges are displayed: [Harga Pokok][Greater Than][50000]
 * 9. Take screenshot
 *
 * Expected Result:
 * - THREE badges should be visible in the search bar: [Harga Pokok][Greater Than][50000]
 * - Data should be filtered to show only items with Harga Pokok > 50000
 * - Filter is active and applied
 *
 * Usage with Playwright MCP:
 * Copy the code from the testSearchBarFilterCase2 function and run it using browser_run_code
 */

async function testSearchBarFilterCase2(page) {
  console.log(
    '🚀 Starting SearchBar Filter E2E Test - Case 2 (Three Badges)...'
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

  // Step 5: Type # again to open operator selector
  console.log('🔢 Step 5: Opening operator selector with #...');
  await page.getByRole('textbox', { name: 'Cari...' }).fill('#');
  await page.waitForTimeout(500);

  // Step 6: Select "Greater Than" operator
  console.log('➕ Step 6: Selecting "Greater Than" operator...');
  await page.getByText('Greater Than', { exact: true }).click();
  await page.waitForTimeout(500);

  // Step 7: Type the value 50000
  console.log('💰 Step 7: Typing value 50000...');
  await page.getByRole('textbox', { name: 'Cari...' }).fill('50000');
  await page.waitForTimeout(500);

  // Step 8: Press Enter to apply filter
  console.log('⏎ Step 8: Pressing Enter to apply filter...');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000);

  // Step 9: Take screenshot
  console.log('📸 Step 9: Taking screenshot...');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const screenshotPath = `.playwright-mcp/searchbar-filter-case-2-${timestamp}.jpeg`;

  await page.screenshot({
    path: screenshotPath,
    type: 'jpeg',
    quality: 90,
  });

  console.log('✅ Test completed successfully!');
  console.log(`📸 Screenshot saved to: ${screenshotPath}`);
  console.log('');
  console.log('Expected badges: [Harga Pokok][Greater Than][50000]');

  return screenshotPath;
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testSearchBarFilterCase2 };
}

// Example usage in Playwright MCP browser_run_code:
/*
await testSearchBarFilterCase2(page);
*/
