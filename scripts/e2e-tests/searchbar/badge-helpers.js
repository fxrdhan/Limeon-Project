/**
 * Shared Badge Creation Helpers for E2E Tests
 *
 * This file contains reusable functions to create different badge configurations
 * Used by filter-case-*.js and sync-validation.js tests
 */

/**
 * Creates a column-only badge (1 badge)
 * @param {Page} page - Playwright page object
 * @param {string} columnName - Column name to select (default: "Harga Pokok")
 */
async function createColumnBadge(page, columnName = 'Harga Pokok') {
  await page.getByRole('textbox', { name: 'Cari item...' }).click();
  await page.getByRole('textbox', { name: 'Cari item...' }).fill('#');
  await page.waitForTimeout(500);
  await page.getByText(columnName).first().click();
  await page.waitForTimeout(500);
}

/**
 * Creates column + operator badges (2 badges)
 * Operator selector auto-opens after column selection
 * @param {Page} page - Playwright page object
 * @param {string} columnName - Column name to select
 * @param {string} operator - Operator to select (e.g., "Greater Than")
 */
async function createColumnOperatorBadges(
  page,
  columnName = 'Harga Pokok',
  operator = 'Greater Than'
) {
  await page.getByRole('textbox', { name: 'Cari item...' }).click();
  await page.getByRole('textbox', { name: 'Cari item...' }).fill('#');
  await page.waitForTimeout(500);
  await page.getByText(columnName).first().click();
  await page.waitForTimeout(500);
  // Operator selector auto-opens
  await page.getByText(operator, { exact: true }).click();
  await page.waitForTimeout(500);
}

/**
 * Creates simple filter with column + operator + value (3 badges)
 * @param {Page} page - Playwright page object
 * @param {string} columnName - Column name to select
 * @param {string} operator - Operator to select
 * @param {string} value - Value to enter
 * @param {boolean} applyFilter - Whether to press Enter to apply (default: true)
 */
async function createSimpleFilter(
  page,
  columnName = 'Harga Pokok',
  operator = 'Greater Than',
  value = '50000',
  applyFilter = true
) {
  await page.getByRole('textbox', { name: 'Cari item...' }).click();
  await page.getByRole('textbox', { name: 'Cari item...' }).fill('#');
  await page.waitForTimeout(500);
  await page.getByText(columnName).first().click();
  await page.waitForTimeout(500);
  // Operator selector auto-opens
  await page.getByText(operator, { exact: true }).click();
  await page.waitForTimeout(500);
  await page.getByRole('textbox', { name: 'Cari...' }).fill(value);
  await page.waitForTimeout(500);

  if (applyFilter) {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
  }
}

/**
 * Creates multi-condition filter without second value (5 badges)
 * @param {Page} page - Playwright page object
 * @param {string} columnName - Column name to select
 * @param {string} operator1 - First operator
 * @param {string} value1 - First value
 * @param {string} joinOperator - Join operator ("AND" or "OR")
 * @param {string} operator2 - Second operator
 */
async function createMultiConditionPartial(
  page,
  columnName = 'Harga Pokok',
  operator1 = 'Greater Than',
  value1 = '50000',
  joinOperator = 'AND',
  operator2 = 'Less Than'
) {
  // Create first condition
  await page.getByRole('textbox', { name: 'Cari item...' }).click();
  await page.getByRole('textbox', { name: 'Cari item...' }).fill('#');
  await page.waitForTimeout(500);
  await page.getByText(columnName).first().click();
  await page.waitForTimeout(500);
  await page.getByText(operator1, { exact: true }).click();
  await page.waitForTimeout(500);
  await page.getByRole('textbox', { name: 'Cari...' }).fill(value1);
  await page.waitForTimeout(500);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000);

  // Add join operator
  await page.getByRole('textbox', { name: 'Cari...' }).fill(`${value1} #`);
  await page.waitForTimeout(500);
  await page.getByText(joinOperator, { exact: true }).click();
  await page.waitForTimeout(500);

  // Add second operator (auto-opens)
  await page.getByText(operator2, { exact: true }).click();
  await page.waitForTimeout(500);
}

/**
 * Creates complete multi-condition filter (6 badges)
 * @param {Page} page - Playwright page object
 * @param {string} columnName - Column name to select
 * @param {string} operator1 - First operator
 * @param {string} value1 - First value
 * @param {string} joinOperator - Join operator ("AND" or "OR")
 * @param {string} operator2 - Second operator
 * @param {string} value2 - Second value
 * @param {boolean} applyFilter - Whether to press Enter to apply (default: true)
 */
async function createMultiConditionComplete(
  page,
  columnName = 'Harga Pokok',
  operator1 = 'Greater Than',
  value1 = '50000',
  joinOperator = 'AND',
  operator2 = 'Less Than',
  value2 = '100000',
  applyFilter = true
) {
  // Create first condition
  await page.getByRole('textbox', { name: 'Cari item...' }).click();
  await page.getByRole('textbox', { name: 'Cari item...' }).fill('#');
  await page.waitForTimeout(500);
  await page.getByText(columnName).first().click();
  await page.waitForTimeout(500);
  await page.getByText(operator1, { exact: true }).click();
  await page.waitForTimeout(500);
  await page.getByRole('textbox', { name: 'Cari...' }).fill(value1);
  await page.waitForTimeout(500);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000);

  // Add join operator
  await page.getByRole('textbox', { name: 'Cari...' }).fill(`${value1} #`);
  await page.waitForTimeout(500);
  await page.getByText(joinOperator, { exact: true }).click();
  await page.waitForTimeout(500);

  // Add second operator (auto-opens)
  await page.getByText(operator2, { exact: true }).click();
  await page.waitForTimeout(500);

  // Add second value
  await page.getByRole('textbox', { name: 'Cari...' }).fill(value2);
  await page.waitForTimeout(500);

  if (applyFilter) {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
  }
}

/**
 * Navigate to Item Master page
 * @param {Page} page - Playwright page object
 */
async function navigateToItemMaster(page) {
  await page.goto('http://localhost:5173/master-data/item-master/items');
  await page.waitForTimeout(2000);
}

// Export all helpers
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createColumnBadge,
    createColumnOperatorBadges,
    createSimpleFilter,
    createMultiConditionPartial,
    createMultiConditionComplete,
    navigateToItemMaster,
  };
}
