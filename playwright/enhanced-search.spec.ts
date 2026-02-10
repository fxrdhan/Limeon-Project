import { expect, test } from '@playwright/test';

const HARNESS_PATH = '/playwright/enhanced-search.html';

test.describe('EnhancedSearchBar e2e interactions', () => {
  test('Ctrl+E opens badge inline editor and Ctrl+I returns focus to main input', async ({
    page,
  }) => {
    await page.goto(HARNESS_PATH);

    await page.getByTestId('preset-single').click();
    const searchInput = page.getByPlaceholder('Cari...');
    await searchInput.click();

    await page.keyboard.press('Control+E');
    await expect(page.locator('.badge-edit-input')).toBeVisible();

    await page.keyboard.press('Control+I');
    await expect(searchInput).toBeFocused();
  });

  test('Ctrl+D removes selected badge when navigating with Ctrl+Arrow', async ({
    page,
  }) => {
    await page.goto(HARNESS_PATH);

    await page.getByTestId('preset-single').click();
    const searchInput = page.getByPlaceholder('Cari...');
    await searchInput.click();

    const before = await page.getByTestId('live-value').textContent();
    expect(before).toContain('#contains');

    await page.keyboard.press('Control+ArrowLeft');
    await page.keyboard.press('Control+D');

    await expect(page.getByTestId('live-value')).toContainText(
      '#name #contains '
    );
    await expect(page.getByTestId('live-value')).not.toContainText('aspirin##');
  });

  test('between pattern can be edited from inline badge editor in browser flow', async ({
    page,
  }) => {
    await page.goto(HARNESS_PATH);

    await page.getByTestId('preset-multi-between').click();
    const searchInput = page.getByPlaceholder('Cari...');
    await searchInput.click();

    await page.keyboard.press('Control+E');
    const editor = page.locator('.badge-edit-input').first();
    await expect(editor).toBeVisible();
    await editor.fill('15-25');
    await page.keyboard.press('Enter');

    await expect(page.getByTestId('live-value')).toContainText('#to 15-25##');
  });
});
