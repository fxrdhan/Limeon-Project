import { expect, test, type Locator, type Page } from '@playwright/test';

const harnessPath = '/tests/playwright/fixtures/combobox.html';

const openComboboxHarness = async (page: Page) => {
  await page.goto(harnessPath);
  await expect(
    page.getByRole('heading', { name: /combobox regression harness/i })
  ).toBeVisible();
};

const getBoundingBox = async (locator: Locator, name: string) => {
  const box = await locator.boundingBox();
  if (!box) throw new Error(`${name} bounding box is unavailable`);

  return box;
};

test.describe('combobox browser regressions', () => {
  test('searches and commits a selection with keyboard input', async ({
    page,
  }) => {
    await openComboboxHarness(page);

    const trigger = page.getByRole('combobox', { name: /^Obat\b/i });
    await trigger.click();

    const searchInput = page.getByRole('searchbox', { name: /^Cari obat$/i });
    await searchInput.fill('para');

    await expect(
      page.getByRole('option', { name: /Paracetamol Tablet/i })
    ).toBeVisible();
    await expect(
      page.getByRole('option', { name: /Amoxicillin/i })
    ).toHaveCount(0);
    await expect(
      page.locator('[data-pharma-combobox-highlight]').first()
    ).toBeVisible();

    await page.keyboard.press('Enter');

    await expect(trigger).toContainText('Paracetamol Tablet');
    await expect(
      page.locator('input[type="hidden"][name="medicine_id"]')
    ).toHaveValue('med-paracetamol');
    await expect(page.getByRole('listbox')).toHaveCount(0);
  });

  test('keeps primitive label connected to a custom trigger id', async ({
    page,
  }) => {
    await openComboboxHarness(page);

    await expect(
      page.locator('label', { hasText: 'Primitive custom trigger' })
    ).toHaveAttribute('for', 'primitive-custom-trigger');
  });

  test('closes the portaled popup after pressing outside', async ({ page }) => {
    await openComboboxHarness(page);

    const trigger = page.getByRole('combobox', { name: /^Obat\b/i });
    await trigger.click();

    await expect(page.getByRole('listbox')).toBeVisible();
    await page
      .getByRole('heading', { name: /combobox regression harness/i })
      .click();

    await expect(page.getByRole('listbox')).toHaveCount(0);
  });

  test('continues keyboard navigation from the selected visual highlight after reopening', async ({
    page,
  }) => {
    await openComboboxHarness(page);

    const trigger = page.getByRole('combobox', { name: /^Obat\b/i });
    await trigger.click();

    const searchInput = page.getByRole('searchbox', { name: /^Cari obat$/i });
    await searchInput.fill('para');
    await page.keyboard.press('Enter');
    await expect(trigger).toContainText('Paracetamol Tablet');

    await trigger.click();
    const paracetamolOption = page.getByRole('option', {
      name: /Paracetamol Tablet/i,
    });
    await expect(
      paracetamolOption.locator('[data-pharma-combobox-highlight]')
    ).toBeVisible();

    await searchInput.click();
    await page.keyboard.press('ArrowDown');

    await expect(
      page
        .getByRole('option', { name: /Vitamin C 500 mg/i })
        .locator('[data-pharma-combobox-highlight]')
    ).toBeVisible();
  });

  test('continues keyboard navigation from an auto-scrolled selected option', async ({
    page,
  }) => {
    await openComboboxHarness(page);

    const trigger = page.getByRole('combobox', { name: /^Kategori\b/i });
    await trigger.click();

    const searchInput = page.getByRole('searchbox', {
      name: /^Cari kategori$/i,
    });
    const selectedOption = page.getByRole('option', { name: /Mukolitik/i });
    await expect(
      selectedOption.locator('[data-pharma-combobox-highlight]')
    ).toBeVisible();

    await searchInput.click();
    await page.keyboard.press('ArrowDown');

    await expect(
      page
        .getByRole('option', { name: /Mydriatic/i })
        .locator('[data-pharma-combobox-highlight]')
    ).toBeVisible();
  });

  test('continues upward keyboard navigation from an auto-scrolled selected option', async ({
    page,
  }) => {
    await openComboboxHarness(page);

    const trigger = page.getByRole('combobox', { name: /^Kategori\b/i });
    await trigger.click();

    const searchInput = page.getByRole('searchbox', {
      name: /^Cari kategori$/i,
    });
    const selectedOption = page.getByRole('option', { name: /Mukolitik/i });
    await expect(
      selectedOption.locator('[data-pharma-combobox-highlight]')
    ).toBeVisible();

    await searchInput.click();
    await page.keyboard.press('ArrowUp');

    await expect(
      page
        .getByRole('option', { name: /Antihistamin/i })
        .locator('[data-pharma-combobox-highlight]')
    ).toBeVisible();
  });

  test('restores selected option scroll position after clearing search', async ({
    page,
  }) => {
    await openComboboxHarness(page);

    const trigger = page.getByRole('combobox', { name: /^Kategori\b/i });
    await trigger.click();

    const searchInput = page.getByRole('searchbox', {
      name: /^Cari kategori$/i,
    });
    const listbox = page.getByRole('listbox');
    const selectedOption = page.getByRole('option', { name: /Mukolitik/i });
    await expect(
      selectedOption.locator('[data-pharma-combobox-highlight]')
    ).toBeVisible();

    const initialScrollTop = await listbox.evaluate(
      element => element.scrollTop
    );
    const initialSelectedOffset = await selectedOption.evaluate(element => {
      const list = element.closest('[role="listbox"]');
      if (!list) throw new Error('Listbox ancestor is unavailable');

      return (
        element.getBoundingClientRect().top - list.getBoundingClientRect().top
      );
    });

    await searchInput.fill('i');
    await listbox.evaluate((element, scrollTop) => {
      element.scrollTop = Math.max(0, scrollTop - 24);
    }, initialScrollTop);
    await searchInput.fill('');

    await expect
      .poll(() => listbox.evaluate(element => element.scrollTop))
      .toBe(initialScrollTop);
    await expect
      .poll(() =>
        selectedOption.evaluate(element => {
          const list = element.closest('[role="listbox"]');
          if (!list) throw new Error('Listbox ancestor is unavailable');

          return (
            element.getBoundingClientRect().top -
            list.getBoundingClientRect().top
          );
        })
      )
      .toBe(initialSelectedOffset);
  });

  test('keeps the positioner from clipping popup shadow', async ({ page }) => {
    await openComboboxHarness(page);

    await page.getByRole('combobox', { name: /^Obat\b/i }).click();

    const popup = page.locator('[data-combobox-popup]');
    await expect(popup).toBeVisible();
    await expect(popup).not.toHaveCSS('box-shadow', 'none');

    const positionerOverflow = await popup.evaluate(element => {
      const positioner = element.parentElement;
      if (!positioner) return null;

      return getComputedStyle(positioner).overflow;
    });
    expect(positionerOverflow).toBe('visible');
  });

  test('flips the popup above a trigger near the viewport bottom', async ({
    page,
  }) => {
    await page.setViewportSize({ height: 560, width: 900 });
    await openComboboxHarness(page);

    await page.getByTestId('bottom-stage').scrollIntoViewIfNeeded();

    const trigger = page.getByRole('combobox', {
      name: /^Posisi bawah\b/i,
    });
    await trigger.click();

    const popup = page.locator('[data-combobox-popup]');
    await expect(popup).toBeVisible();

    const triggerBox = await getBoundingBox(trigger, 'bottom trigger');
    const popupBox = await getBoundingBox(popup, 'bottom popup');
    const viewport = page.viewportSize();
    if (!viewport) throw new Error('Viewport size is unavailable');

    expect(popupBox.y + popupBox.height).toBeLessThanOrEqual(triggerBox.y + 1);
    expect(popupBox.y).toBeGreaterThanOrEqual(0);
    expect(popupBox.x).toBeGreaterThanOrEqual(0);
    expect(popupBox.x + popupBox.width).toBeLessThanOrEqual(viewport.width + 1);
  });

  test.describe('mobile viewport regressions', () => {
    test.use({
      hasTouch: true,
      isMobile: true,
      viewport: { height: 700, width: 390 },
    });

    test('opens and selects an option by touch without horizontal overflow', async ({
      page,
    }) => {
      await openComboboxHarness(page);

      const trigger = page.getByRole('combobox', { name: /^Kategori\b/i });
      await trigger.tap();

      const popup = page.locator('[data-combobox-popup]');
      await expect(popup).toBeVisible();

      const popupBox = await getBoundingBox(popup, 'mobile popup');
      const viewport = page.viewportSize();
      if (!viewport) throw new Error('Viewport size is unavailable');

      expect(popupBox.x).toBeGreaterThanOrEqual(0);
      expect(popupBox.x + popupBox.width).toBeLessThanOrEqual(
        viewport.width + 1
      );

      await page.getByRole('option', { name: /Mydriatic/i }).tap();

      await expect(trigger).toContainText('Mydriatic');
      await expect(
        page.locator('input[type="hidden"][name="category_id"]')
      ).toHaveValue('cat-mydriatic');
    });
  });
});
