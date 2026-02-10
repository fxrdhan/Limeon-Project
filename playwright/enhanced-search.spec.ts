import { expect, test } from '@playwright/test';

const HARNESS_PATH = '/playwright/enhanced-search.html';
const COLUMN_SELECTOR_HEADER = 'Pilih kolom untuk pencarian targeted';
const OPERATOR_SELECTOR_HEADER = 'Pilih operator filter untuk kolom';
const JOIN_SELECTOR_HEADER = 'Pilih operator join untuk kondisi';

test.describe('EnhancedSearchBar e2e interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(HARNESS_PATH);
    await expect(
      page.getByRole('heading', {
        name: 'EnhancedSearchBar Playwright Harness',
      })
    ).toBeVisible();
  });

  test('harness preset controls set and reset live value state', async ({
    page,
  }) => {
    await page.getByTestId('preset-single').click();
    await expect(page.getByTestId('live-value')).toContainText(
      '#name #contains aspirin##'
    );

    await page.getByTestId('preset-stock-single').click();
    await expect(page.getByTestId('live-value')).toContainText(
      '#stock #equals 10##'
    );

    await page.getByTestId('preset-reset').click();
    await expect(page.getByTestId('live-value')).toHaveText('');
    await expect(page.getByTestId('clear-count')).toHaveText('0');
  });

  test('typing hash opens column selector and escape clears unmatched hash pattern', async ({
    page,
  }) => {
    const searchInput = page.getByPlaceholder('Cari...');
    await searchInput.click();
    await searchInput.fill('#not-a-real-column');

    await expect(page.getByText(COLUMN_SELECTOR_HEADER)).toBeVisible();
    await page.keyboard.press('Escape');

    await expect(page.getByTestId('live-value')).toHaveText('');
    await expect(page.getByTestId('clear-count')).toHaveText('1');
  });

  test('builds stock equals filter from keyboard-only selector flow', async ({
    page,
  }) => {
    const searchInput = page.getByPlaceholder('Cari...');
    await searchInput.click();
    await page.keyboard.type('#');

    await expect(page.getByText(COLUMN_SELECTOR_HEADER)).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    await expect(page.getByTestId('live-value')).toContainText('#stock #');
    await expect(page.getByText(OPERATOR_SELECTOR_HEADER)).toBeVisible();

    await page.keyboard.press('Enter');

    await expect(page.getByTestId('live-value')).toContainText(
      '#stock #equals '
    );
    await expect(searchInput).toBeFocused();

    await page.keyboard.type('25');
    await page.keyboard.press('Enter');

    await expect(page.getByTestId('live-value')).toContainText(
      '#stock #equals 25##'
    );
  });

  test('join selector applies OR and keeps flow ready for next condition column', async ({
    page,
  }) => {
    await page.getByTestId('preset-join-selector').click();

    await expect(page.getByText(JOIN_SELECTOR_HEADER)).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    await expect(page.getByTestId('live-value')).toContainText(
      '#name #contains aspirin #or #'
    );
    await expect(page.getByText(COLUMN_SELECTOR_HEADER)).toBeVisible();
  });

  test('Ctrl+E opens badge inline editor and Ctrl+I returns focus to main input', async ({
    page,
  }) => {
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

  test('Ctrl+D without active badge selection does not change pattern', async ({
    page,
  }) => {
    await page.getByTestId('preset-single').click();
    const searchInput = page.getByPlaceholder('Cari...');
    await searchInput.click();

    const before = (await page.getByTestId('live-value').textContent()) ?? '';
    await page.keyboard.press('Control+D');

    await expect(page.getByTestId('live-value')).toHaveText(before);
  });

  test('Delete steps back one confirmed badge at a time', async ({ page }) => {
    await page.getByTestId('preset-single').click();
    const searchInput = page.getByPlaceholder('Cari...');
    await searchInput.click();

    await page.keyboard.press('Delete');
    await expect(page.getByTestId('live-value')).toContainText(
      '#name #contains '
    );
    await expect(page.getByTestId('live-value')).not.toContainText('aspirin##');

    await page.keyboard.press('Delete');
    await expect(page.getByTestId('live-value')).toContainText('#name #');
  });

  test('Ctrl+E then Delete clears currently edited badge value', async ({
    page,
  }) => {
    await page.getByTestId('preset-single').click();
    const searchInput = page.getByPlaceholder('Cari...');
    await searchInput.click();

    await page.keyboard.press('Control+E');
    await expect(page.locator('.badge-edit-input')).toBeVisible();
    await page.keyboard.press('Delete');

    await expect(page.getByTestId('live-value')).toContainText(
      '#name #contains '
    );
  });

  test('clicking value badge starts inline edit and Enter commits new value', async ({
    page,
  }) => {
    await page.getByTestId('preset-single').click();

    const valueBadge = page.locator('.bg-slate-100 span').getByText('aspirin');
    await valueBadge.click();
    const editor = page.locator('.badge-edit-input').first();
    await expect(editor).toBeVisible();
    await editor.fill('ibuprofen');
    await page.keyboard.press('Enter');

    await expect(page.getByTestId('live-value')).toContainText(
      '#name #contains ibuprofen##'
    );
  });

  test('between pattern can be edited from inline badge editor in browser flow', async ({
    page,
  }) => {
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

  test('interrupted-column preset opens column selector state', async ({
    page,
  }) => {
    await page.getByTestId('preset-interrupted-column').click();

    await expect(page.getByTestId('live-value')).toContainText(
      '#name #contains aspirin #and #'
    );
    await expect(page.getByText(COLUMN_SELECTOR_HEADER)).toBeVisible();
  });

  test('interrupted-join preset opens join selector state', async ({
    page,
  }) => {
    await page.getByTestId('preset-interrupted-join').click();

    await expect(page.getByTestId('live-value')).toContainText(
      '#name #contains aspirin #'
    );
    await expect(page.getByText(JOIN_SELECTOR_HEADER)).toBeVisible();
  });

  test('interrupted-operator multicol preset opens operator selector state', async ({
    page,
  }) => {
    await page.getByTestId('preset-interrupted-operator-multicol').click();

    await expect(page.getByTestId('live-value')).toContainText(
      '#name #contains aspirin #and #stock #'
    );
    await expect(page.getByText(OPERATOR_SELECTOR_HEADER)).toBeVisible();
  });

  test('interrupted-partial preset can be completed by typing value and Enter', async ({
    page,
  }) => {
    await page.getByTestId('preset-interrupted-partial').click();
    const searchInput = page.getByPlaceholder('Cari...');
    await searchInput.click();
    await page.keyboard.type('44');
    await page.keyboard.press('Enter');

    await expect(page.getByTestId('live-value')).toContainText(
      '#name #contains aspirin #and #stock #equals 44##'
    );
  });

  test('insert-tail preset seeds three confirmed conditions', async ({
    page,
  }) => {
    await page.getByTestId('preset-insert-tail-multicondition').click();

    await expect(page.getByTestId('live-value')).toContainText(
      '#name #contains aspirin #and #stock #equals 10 #and #category #contains pain##'
    );
  });

  test('condition-n-building preset opens selector for the next condition', async ({
    page,
  }) => {
    await page.getByTestId('preset-condition-n-building').click();

    await expect(page.getByTestId('live-value')).toContainText(
      '#name #contains aspirin #and #stock #equals 10 #and #'
    );
    await expect(page.getByText(COLUMN_SELECTOR_HEADER)).toBeVisible();
  });

  test('condition-n-building preset can continue keyboard-only selector flow', async ({
    page,
  }) => {
    await page.getByTestId('preset-condition-n-building').click();
    await expect(page.getByText(COLUMN_SELECTOR_HEADER)).toBeVisible();

    await page.keyboard.press('Enter');
    await expect(page.getByText(OPERATOR_SELECTOR_HEADER)).toBeVisible();
    await page.keyboard.press('Enter');
    await page.keyboard.type('12');
    await page.keyboard.press('Enter');

    await expect(page.getByTestId('live-value')).toContainText('12##');
  });
});
