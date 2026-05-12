import { expect, test, type Locator, type Page } from '@playwright/test';

const harnessPath = '/tests/playwright/fixtures/calendar.html';

const openCalendarHarness = async (page: Page) => {
  await page.goto(harnessPath);
  await expect(
    page.getByRole('heading', { name: /calendar regression harness/i })
  ).toBeVisible();
};

const getBoundingBox = async (locator: Locator, name: string) => {
  const box = await locator.boundingBox();
  if (!box) throw new Error(`${name} bounding box is unavailable`);

  return box;
};

test.describe('calendar browser regressions', () => {
  test('opens the datepicker in a visible fixed portal inside the viewport', async ({
    page,
  }) => {
    await openCalendarHarness(page);

    const trigger = page.getByRole('combobox', {
      name: /^Tanggal transaksi$/i,
    });
    await trigger.click();

    const dialog = page.getByRole('dialog', { name: 'Pilih tanggal' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveCSS('position', 'fixed');

    const dialogBox = await getBoundingBox(dialog, 'calendar dialog');
    const viewport = page.viewportSize();
    if (!viewport) throw new Error('Viewport size is unavailable');

    expect(dialogBox.x).toBeGreaterThanOrEqual(0);
    expect(dialogBox.y).toBeGreaterThanOrEqual(0);
    expect(dialogBox.x + dialogBox.width).toBeLessThanOrEqual(
      viewport.width + 1
    );
    expect(dialogBox.y + dialogBox.height).toBeLessThanOrEqual(
      viewport.height + 1
    );
  });

  test('keeps the animated month grid populated while navigating', async ({
    page,
  }) => {
    await openCalendarHarness(page);

    await page.getByRole('combobox', { name: /^Tanggal transaksi$/i }).click();

    const dialog = page.getByRole('dialog', { name: 'Pilih tanggal' });
    await expect(
      dialog.getByRole('grid', { name: /Januari 2026/ })
    ).toBeVisible();

    await dialog.getByRole('button', { name: 'Bulan berikutnya' }).click();

    const transitionMetrics = await dialog
      .locator('.calendar__animation-content')
      .evaluate(async element => {
        const samples: Array<{ height: number; visibleDayButtons: number }> =
          [];
        const deadline = performance.now() + 350;

        const getVisibleDayButtonCount = () =>
          Array.from(element.querySelectorAll('button')).filter(button => {
            const rect = button.getBoundingClientRect();
            const style = getComputedStyle(button);

            return (
              rect.width > 0 &&
              rect.height > 0 &&
              style.display !== 'none' &&
              style.visibility !== 'hidden'
            );
          }).length;

        while (performance.now() < deadline) {
          samples.push({
            height: element.getBoundingClientRect().height,
            visibleDayButtons: getVisibleDayButtonCount(),
          });
          await new Promise<void>(resolve => {
            requestAnimationFrame(() => resolve());
          });
        }

        return {
          minHeight: Math.min(...samples.map(sample => sample.height)),
          minVisibleDayButtons: Math.min(
            ...samples.map(sample => sample.visibleDayButtons)
          ),
        };
      });

    expect(transitionMetrics.minHeight).toBeGreaterThan(100);
    expect(transitionMetrics.minVisibleDayButtons).toBeGreaterThan(20);
    await expect(
      dialog.getByRole('grid', { name: /Februari 2026/ })
    ).toBeVisible();
  });

  test('restores focus to the trigger after Escape closes the dialog', async ({
    page,
  }) => {
    await openCalendarHarness(page);

    const trigger = page.getByRole('combobox', {
      name: /^Tanggal transaksi$/i,
    });
    await trigger.click();

    const dialog = page.getByRole('dialog', { name: 'Pilih tanggal' });
    const grid = dialog.getByRole('grid', { name: /Januari 2026/ });

    await expect(grid).toBeFocused();
    await page.keyboard.press('Escape');

    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test('keeps hover calendars non-modal and does not steal focus', async ({
    page,
  }) => {
    await openCalendarHarness(page);

    const trigger = page.getByRole('button', { name: /^Tanggal hover$/i });
    await trigger.focus();
    await trigger.hover();

    const dialog = page.getByRole('dialog', { name: 'Pilih tanggal' });
    await expect(dialog).toBeVisible();
    await expect(dialog).not.toHaveAttribute('aria-modal', 'true');
    await expect(trigger).toBeFocused();
  });

  test('keeps header combobox popups inside the calendar dialog', async ({
    page,
  }) => {
    await openCalendarHarness(page);

    await page.getByRole('combobox', { name: /^Tanggal transaksi$/i }).click();

    const dialog = page.getByRole('dialog', { name: 'Pilih tanggal' });
    await dialog.getByRole('combobox', { name: /Bulan Januari/ }).click();

    const februaryOption = page.getByRole('option', { name: 'Februari' });
    await expect(februaryOption).toBeVisible();

    const popupIsInsideDialog = await februaryOption.evaluate(option => {
      const popup = option.closest('[data-combobox-popup]');
      const dialog = option.closest('[role="dialog"]');

      return Boolean(popup && dialog?.contains(popup));
    });

    expect(popupIsInsideDialog).toBe(true);
  });

  test('flips the datepicker above a trigger near the viewport bottom', async ({
    page,
  }) => {
    await page.setViewportSize({ height: 560, width: 900 });
    await openCalendarHarness(page);

    await page.getByTestId('bottom-stage').scrollIntoViewIfNeeded();

    const trigger = page.getByRole('combobox', {
      name: /^Tanggal dekat bawah$/i,
    });
    const triggerBox = await getBoundingBox(trigger, 'bottom calendar trigger');
    await trigger.click();

    const dialog = page.getByRole('dialog', { name: 'Pilih tanggal' });
    await expect(dialog).toBeVisible();

    const dialogBox = await getBoundingBox(dialog, 'bottom calendar dialog');
    const viewport = page.viewportSize();
    if (!viewport) throw new Error('Viewport size is unavailable');

    expect(dialogBox.y + dialogBox.height).toBeLessThanOrEqual(
      triggerBox.y + 1
    );
    expect(dialogBox.x).toBeGreaterThanOrEqual(0);
    expect(dialogBox.x + dialogBox.width).toBeLessThanOrEqual(
      viewport.width + 1
    );
  });

  test('keeps inline calendars interactive without opening a dialog', async ({
    page,
  }) => {
    await openCalendarHarness(page);

    const inlineStage = page.getByTestId('inline-calendar-stage');
    await expect(
      inlineStage.getByRole('grid', { name: /Januari 2026/ })
    ).toBeVisible();

    await inlineStage.getByRole('button', { name: /16 Januari 2026/ }).click();

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(
      inlineStage.locator('input[type="hidden"][name="inline_date"]')
    ).toHaveValue('2026-01-16');
  });

  test.describe('mobile viewport regressions', () => {
    test.use({
      hasTouch: true,
      isMobile: true,
      viewport: { height: 700, width: 390 },
    });

    test('opens the datepicker by touch without horizontal overflow', async ({
      page,
    }) => {
      await openCalendarHarness(page);

      await page.getByRole('combobox', { name: /^Tanggal transaksi$/i }).tap();

      const dialog = page.getByRole('dialog', { name: 'Pilih tanggal' });
      await expect(dialog).toBeVisible();

      const dialogBox = await getBoundingBox(dialog, 'mobile calendar dialog');
      const viewport = page.viewportSize();
      if (!viewport) throw new Error('Viewport size is unavailable');

      expect(dialogBox.x).toBeGreaterThanOrEqual(0);
      expect(dialogBox.x + dialogBox.width).toBeLessThanOrEqual(
        viewport.width + 1
      );
    });
  });
});
