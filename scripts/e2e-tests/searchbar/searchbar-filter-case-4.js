/**
 * E2E Test Script for SearchBar Component - Filter Flow Case 4
 *
 * Test Flow:
 * 1. Navigate to Item Master page
 * 2. Type # to open column selector modal
 * 3. Select "Harga Pokok" column
 * 4. Type # again to open operator selector modal
 * 5. Select "Greater Than" operator
 * 6. Type value: 50000
 * 7. Press Enter to confirm first condition
 * 8. Type # to open join operator selector
 * 9. Select "AND" join operator
 * 10. Operator selector opens automatically, select "Less Than"
 * 11. Type second value: 100000
 * 12. Press Enter to apply multi-condition filter
 * 13. Take screenshot
 *
 * Expected Result:
 * - SIX badges should be visible: [Harga Pokok][Greater Than][50000][AND][Less Than][100000]
 * - Data should be filtered to show items with 50000 < Harga Pokok < 100000
 * - Multi-condition filter is active and applied
 *
 * Usage with Playwright MCP:
 * Copy the code from the testSearchBarFilterCase4 function and run it using browser_run_code
 */

async function testSearchBarFilterCase4(page) {
  console.log(
    '🚀 Starting SearchBar Filter E2E Test - Case 4 (Complete Multi-Condition Filter)...'
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

  // Step 7: Type the first value 50000
  console.log('💰 Step 7: Typing first value 50000...');
  await page.getByRole('textbox', { name: 'Cari...' }).fill('50000');
  await page.waitForTimeout(500);

  // Step 8: Press Enter to confirm first condition
  console.log('⏎ Step 8: Pressing Enter to confirm first condition...');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000);

  console.log(
    '✅ First condition confirmed: [Harga Pokok][Greater Than][50000]'
  );

  // Step 9: Type # to open join operator selector
  console.log('🔗 Step 9: Typing # to open join operator selector...');
  await page.getByRole('textbox', { name: 'Cari...' }).fill('50000 #');
  await page.waitForTimeout(500);

  // Step 10: Select "AND" join operator
  console.log('✅ Step 10: Selecting "AND" join operator...');
  await page.getByText('AND', { exact: true }).click();
  await page.waitForTimeout(500);

  console.log('✅ Join operator added: [AND]');

  // Step 11: Operator selector should open automatically, select "Less Than"
  console.log('🔢 Step 11: Selecting "Less Than" operator...');
  await page.getByText('Less Than', { exact: true }).click();
  await page.waitForTimeout(500);

  console.log('✅ Second operator added: [Less Than]');

  // Step 12: Type the second value 100000
  console.log('💰 Step 12: Typing second value 100000...');
  await page.getByRole('textbox', { name: 'Cari...' }).fill('100000');
  await page.waitForTimeout(500);

  // Step 13: Press Enter to apply multi-condition filter
  console.log('⏎ Step 13: Pressing Enter to apply multi-condition filter...');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000);

  // Step 14: Take screenshot
  console.log('📸 Step 14: Taking screenshot...');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const screenshotPath = `.playwright-mcp/searchbar-filter-case-4-${timestamp}.jpeg`;

  await page.screenshot({
    path: screenshotPath,
    type: 'jpeg',
    quality: 90,
  });

  console.log('✅ Test completed successfully!');
  console.log(`📸 Screenshot saved to: ${screenshotPath}`);
  console.log('');
  console.log(
    'Expected badges: [Harga Pokok][Greater Than][50000][AND][Less Than][100000]'
  );
  console.log('Filter: Items with Harga Pokok between 50,000 and 100,000');

  return screenshotPath;
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testSearchBarFilterCase4 };
}

// Example usage in Playwright MCP browser_run_code:
/*
await testSearchBarFilterCase4(page);
*/
