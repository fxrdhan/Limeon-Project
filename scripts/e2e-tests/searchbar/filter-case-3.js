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

async function testSearchBarFilterCase3(page) {
  console.log(
    '🚀 Starting SearchBar Filter E2E Test - Case 3 (Five Badges - Before Second Value)...'
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

  // Step 4: Select "Harga Pokok" column (operator selector auto-opens)
  console.log(
    '✅ Step 4: Selecting "Harga Pokok" column (operator selector auto-opens)...'
  );
  await page.getByText('Harga Pokok').first().click();
  await page.waitForTimeout(500);

  // Step 5: Select "Greater Than" operator
  console.log('➕ Step 5: Selecting "Greater Than" operator...');
  await page.getByText('Greater Than', { exact: true }).click();
  await page.waitForTimeout(500);

  // Step 6: Type the first value 50000
  console.log('💰 Step 6: Typing first value 50000...');
  await page.getByRole('textbox', { name: 'Cari...' }).fill('50000');
  await page.waitForTimeout(500);

  // Step 7: Press Enter to confirm first condition
  console.log('⏎ Step 7: Pressing Enter to confirm first condition...');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000);

  console.log(
    '✅ First condition confirmed: [Harga Pokok][Greater Than][50000]'
  );

  // Step 8: Type # to open join operator selector
  console.log('🔗 Step 8: Typing # to open join operator selector...');
  await page.getByRole('textbox', { name: 'Cari...' }).fill('50000 #');
  await page.waitForTimeout(500);

  // Step 9: Select "AND" join operator
  console.log('✅ Step 9: Selecting "AND" join operator...');
  await page.getByText('AND', { exact: true }).click();
  await page.waitForTimeout(500);

  console.log('✅ Join operator added: [AND]');

  // Step 10: Operator selector should open automatically, select "Less Than"
  console.log('🔢 Step 10: Selecting "Less Than" operator (auto-opened)...');
  await page.getByText('Less Than', { exact: true }).click();
  await page.waitForTimeout(500);

  console.log('✅ Second operator added: [Less Than]');

  // Step 11: Take screenshot (BEFORE typing second value)
  console.log('📸 Step 11: Taking screenshot...');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const screenshotPath = `.playwright-mcp/filter-case-3-${timestamp}.jpeg`;

  await page.screenshot({
    path: screenshotPath,
    type: 'jpeg',
    quality: 90,
  });

  console.log('✅ Test completed successfully!');
  console.log(`📸 Screenshot saved to: ${screenshotPath}`);
  console.log('');
  console.log(
    'Expected badges: [Harga Pokok][Greater Than][50000][AND][Less Than]'
  );
  console.log('Note: Second value NOT entered yet (5 badges, not 6)');

  return screenshotPath;
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testSearchBarFilterCase3 };
}

// Example usage in Playwright MCP browser_run_code:
/*
await testSearchBarFilterCase3(page);
*/
