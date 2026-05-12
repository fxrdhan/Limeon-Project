import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vite-plus/test';
import Calendar, {
  CalendarPrimitive,
  createCalendarDate,
  formatDateOnlyValue,
  getCalendarHeaderModel,
  parseDateOnlyValue,
} from './index';

const getDateButton = (
  root: HTMLElement,
  day: number,
  month: string,
  year: number
) =>
  within(root).getByRole('button', {
    name: new RegExp(`${day} ${month} ${year}`),
  });

describe('Calendar presets', () => {
  it('keeps datepicker open, selection, noon normalization, and close behavior', async () => {
    const onChange = vi.fn();

    render(
      <Calendar
        value={new Date(2026, 0, 15)}
        onChange={onChange}
        placeholder="Tanggal transaksi"
      />
    );

    fireEvent.click(screen.getByPlaceholderText('Tanggal transaksi'));

    const dialog = await screen.findByRole('dialog', { name: 'Pilih tanggal' });
    const trigger = screen.getByPlaceholderText('Tanggal transaksi');

    expect(trigger.getAttribute('aria-controls')).toBe(dialog.id);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.getAttribute('role')).toBe('combobox');
    expect(dialog.style.position).toBe('fixed');

    const selectedDay = getDateButton(dialog, 15, 'Januari', 2026);

    expect(
      selectedDay.closest('[role="gridcell"]')?.getAttribute('aria-selected')
    ).toBe('true');

    fireEvent.click(getDateButton(dialog, 16, 'Januari', 2026));

    expect(onChange).toHaveBeenCalledTimes(1);
    const selectedDate = onChange.mock.calls[0][0] as Date;
    expect(selectedDate.getFullYear()).toBe(2026);
    expect(selectedDate.getMonth()).toBe(0);
    expect(selectedDate.getDate()).toBe(16);
    expect(selectedDate.getHours()).toBe(12);
    expect(selectedDate.getMinutes()).toBe(0);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it('keeps inline mode rendered in place and selects dates without closing', () => {
    const onChange = vi.fn();

    render(
      <Calendar
        mode="inline"
        value={new Date(2026, 0, 15)}
        onChange={onChange}
      />
    );

    expect(screen.queryByRole('dialog')).toBeNull();

    const selectedDay = getDateButton(document.body, 15, 'Januari', 2026);
    expect(
      selectedDay.closest('[role="gridcell"]')?.getAttribute('aria-selected')
    ).toBe('true');

    fireEvent.click(selectedDay);

    expect(onChange).toHaveBeenCalledTimes(1);
    const selectedDate = onChange.mock.calls[0][0] as Date;
    expect(selectedDate.getFullYear()).toBe(2026);
    expect(selectedDate.getMonth()).toBe(0);
    expect(selectedDate.getDate()).toBe(15);
  });

  it('keeps inline mode display synced with controlled value changes', async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <Calendar
        mode="inline"
        value={new Date(2026, 0, 15)}
        onChange={onChange}
      />
    );

    const firstSelectedDay = getDateButton(document.body, 15, 'Januari', 2026);
    expect(
      firstSelectedDay
        .closest('[role="gridcell"]')
        ?.getAttribute('aria-selected')
    ).toBe('true');

    rerender(
      <Calendar
        mode="inline"
        value={new Date(2026, 1, 20)}
        onChange={onChange}
      />
    );

    await waitFor(() => {
      const nextSelectedDay = getDateButton(
        document.body,
        20,
        'Februari',
        2026
      );
      expect(
        nextSelectedDay
          .closest('[role="gridcell"]')
          ?.getAttribute('aria-selected')
      ).toBe('true');
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps an open datepicker display synced with controlled value changes', async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <Calendar
        value={new Date(2026, 0, 15)}
        onChange={onChange}
        placeholder="Tanggal transaksi"
      />
    );

    fireEvent.click(screen.getByPlaceholderText('Tanggal transaksi'));

    const dialog = await screen.findByRole('dialog', { name: 'Pilih tanggal' });
    expect(within(dialog).getByRole('grid', { name: /Januari 2026/ })).toBe(
      document.activeElement
    );

    rerender(
      <Calendar
        value={new Date(2026, 1, 20)}
        onChange={onChange}
        placeholder="Tanggal transaksi"
      />
    );

    await waitFor(() => {
      const nextGrid = within(dialog).getByRole('grid', {
        name: /Februari 2026/,
      });
      const selectedDay = getDateButton(dialog, 20, 'Februari', 2026);

      expect(
        selectedDay.closest('[role="gridcell"]')?.getAttribute('aria-selected')
      ).toBe('true');
      expect(nextGrid.getAttribute('aria-activedescendant')).toBe(
        selectedDay.closest('[role="gridcell"]')?.id
      );
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps native custom trigger behavior without nesting another button', async () => {
    const onTriggerClick = vi.fn();

    render(
      <Calendar value={null} onChange={() => {}}>
        <button type="button" onClick={onTriggerClick}>
          Open calendar
        </button>
      </Calendar>
    );

    const trigger = screen.getByRole('button', { name: 'Open calendar' });

    expect(trigger.tagName).toBe('BUTTON');
    expect(trigger.querySelector('button')).toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(trigger);

    expect(onTriggerClick).toHaveBeenCalledTimes(1);
    const dialog = await screen.findByRole('dialog', { name: 'Pilih tanggal' });

    expect(trigger.getAttribute('aria-controls')).toBe(dialog.id);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('keeps custom trigger ids and native form date-only values', () => {
    render(
      <form data-testid="custom-trigger-form">
        <label htmlFor="custom-calendar-trigger">Tanggal khusus</label>
        <Calendar
          id="custom-calendar-trigger"
          name="custom_date"
          value={new Date(2026, 0, 15)}
          onChange={() => {}}
        >
          <button type="button">Tanggal khusus</button>
        </Calendar>
      </form>
    );

    const trigger = screen.getByRole('button', { name: 'Tanggal khusus' });
    const form = screen.getByTestId('custom-trigger-form') as HTMLFormElement;

    expect(trigger.getAttribute('id')).toBe('custom-calendar-trigger');
    expect(new FormData(form).get('custom_date')).toBe('2026-01-15');
  });

  it('keeps read-only selected state visible while blocking changes', async () => {
    const onChange = vi.fn();

    render(
      <Calendar value={new Date(2026, 0, 15)} onChange={onChange} readOnly />
    );

    fireEvent.click(screen.getByPlaceholderText('Pilih tanggal'));

    const dialog = await screen.findByRole('dialog', { name: 'Pilih tanggal' });
    const selectedDay = getDateButton(dialog, 15, 'Januari', 2026);
    const nextDay = getDateButton(dialog, 16, 'Januari', 2026);

    expect(
      selectedDay.closest('[role="gridcell"]')?.getAttribute('aria-selected')
    ).toBe('true');
    expect((nextDay as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(nextDay);

    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps disabled datepickers inert and out of native form submission', () => {
    const onChange = vi.fn();

    render(
      <form data-testid="disabled-calendar-form">
        <Calendar
          name="disabled_date"
          value={new Date(2026, 0, 15)}
          onChange={onChange}
          placeholder="Tanggal nonaktif"
          disabled
        />
      </form>
    );

    const trigger = screen.getByPlaceholderText(
      'Tanggal nonaktif'
    ) as HTMLInputElement;
    const form = screen.getByTestId(
      'disabled-calendar-form'
    ) as HTMLFormElement;

    expect(trigger.disabled).toBe(true);
    expect(trigger.getAttribute('aria-disabled')).toBe('true');

    fireEvent.click(trigger);

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
    expect(new FormData(form).has('disabled_date')).toBe(false);
  });

  it('keeps disabled custom triggers inert without changing enabled trigger behavior', () => {
    const onChange = vi.fn();
    const onTriggerClick = vi.fn();

    render(
      <Calendar value={new Date(2026, 0, 15)} onChange={onChange} disabled>
        <button type="button" onClick={onTriggerClick}>
          Disabled custom date
        </button>
      </Calendar>
    );

    const trigger = screen.getByRole('button', {
      name: 'Disabled custom date',
    }) as HTMLButtonElement;

    expect(trigger.disabled).toBe(true);
    expect(trigger.getAttribute('aria-disabled')).toBe('true');

    fireEvent.click(trigger);

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onTriggerClick).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps disabled inline calendars inert across header and date controls', () => {
    const onChange = vi.fn();

    render(
      <Calendar
        mode="inline"
        value={new Date(2026, 0, 15)}
        onChange={onChange}
        disabled
      />
    );

    const grid = screen.getByRole('grid', { name: /Januari 2026/ });
    const monthSelect = screen.getByRole('combobox', {
      name: /Bulan Januari/,
    }) as HTMLButtonElement;
    const yearSelect = screen.getByRole('combobox', {
      name: /Tahun 2026/,
    }) as HTMLButtonElement;
    const previousButton = screen.getByRole('button', {
      name: 'Bulan sebelumnya',
    }) as HTMLButtonElement;
    const nextButton = screen.getByRole('button', {
      name: 'Bulan berikutnya',
    }) as HTMLButtonElement;

    expect(grid.getAttribute('tabindex')).toBe('-1');
    expect(monthSelect.disabled).toBe(true);
    expect(yearSelect.disabled).toBe(true);
    expect(previousButton.disabled).toBe(true);
    expect(nextButton.disabled).toBe(true);

    fireEvent.click(nextButton);
    fireEvent.click(getDateButton(document.body, 16, 'Januari', 2026));

    expect(screen.getByRole('grid', { name: /Januari 2026/ })).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('gives an unlabeled display input an accessible name from its placeholder', () => {
    render(
      <Calendar value={null} onChange={() => {}} placeholder="Tanggal retur" />
    );

    expect(
      screen.getByRole('combobox', { name: 'Tanggal retur' })
    ).toBeTruthy();
  });

  it('cycles focus within the dialog instead of blocking tab navigation', async () => {
    render(
      <Calendar
        value={new Date(2026, 0, 15)}
        onChange={() => {}}
        placeholder="Tanggal transaksi"
      />
    );

    fireEvent.click(screen.getByPlaceholderText('Tanggal transaksi'));

    const dialog = await screen.findByRole('dialog', { name: 'Pilih tanggal' });
    const grid = within(dialog).getByRole('grid', { name: /Januari 2026/ });
    const focusableElements = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter(element => element.tabIndex >= 0);

    await waitFor(() => {
      expect(document.activeElement).toBe(grid);
    });

    fireEvent.keyDown(grid, { key: 'Tab' });
    expect(document.activeElement).toBe(focusableElements[0]);

    focusableElements[focusableElements.length - 1].focus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(document.activeElement).toBe(focusableElements[0]);
  });

  it('keeps the date grid semantic without changing the visual day controls', async () => {
    render(
      <Calendar
        value={new Date(2026, 0, 15)}
        onChange={() => {}}
        placeholder="Tanggal transaksi"
      />
    );

    fireEvent.click(screen.getByPlaceholderText('Tanggal transaksi'));

    const dialog = await screen.findByRole('dialog', { name: 'Pilih tanggal' });
    const grid = within(dialog).getByRole('grid', { name: /Januari 2026/ });
    const selectedDay = getDateButton(dialog, 15, 'Januari', 2026);
    const selectedCell = selectedDay.closest('[role="gridcell"]');

    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(grid.getAttribute('aria-activedescendant')).toBe(selectedCell?.id);
    expect(selectedCell?.getAttribute('aria-selected')).toBe('true');
    expect(within(grid).getAllByRole('row').length).toBeGreaterThan(1);
    expect(selectedDay.getAttribute('tabindex')).toBe('-1');
  });

  it('isolates background content from screen readers while modal datepicker is open', async () => {
    render(
      <main data-testid="app-shell">
        <Calendar
          value={new Date(2026, 0, 15)}
          onChange={() => {}}
          placeholder="Tanggal transaksi"
        />
      </main>
    );

    const appRoot = screen.getByTestId('app-shell').parentElement as
      | (HTMLElement & {
          inert: boolean;
        })
      | null;

    if (!appRoot) {
      throw new Error('Expected rendered app shell to have a root element.');
    }

    const isolatedAppRoot = appRoot as HTMLElement & {
      inert: boolean;
    };

    fireEvent.click(screen.getByPlaceholderText('Tanggal transaksi'));

    const dialog = await screen.findByRole('dialog', { name: 'Pilih tanggal' });
    const grid = within(dialog).getByRole('grid', { name: /Januari 2026/ });

    await waitFor(() => {
      expect(isolatedAppRoot.inert).toBe(true);
      expect(isolatedAppRoot.getAttribute('aria-hidden')).toBe('true');
    });

    fireEvent.keyDown(grid, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    await waitFor(() => {
      expect(isolatedAppRoot.inert).toBe(false);
      expect(isolatedAppRoot.hasAttribute('aria-hidden')).toBe(false);
    });
  });

  it('keeps hover calendars non-modal without moving focus on pointer hover', async () => {
    render(
      <Calendar
        trigger="hover"
        value={new Date(2026, 0, 15)}
        onChange={() => {}}
      >
        <button type="button">Hover date</button>
      </Calendar>
    );

    const trigger = screen.getByRole('button', { name: 'Hover date' });
    trigger.focus();

    fireEvent.mouseEnter(trigger);

    const dialog = await screen.findByRole('dialog', { name: 'Pilih tanggal' });

    expect(dialog.hasAttribute('aria-modal')).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it('keeps hover trigger selectable unless read-only is explicit', async () => {
    const onChange = vi.fn();

    render(
      <Calendar
        trigger="hover"
        value={new Date(2026, 0, 15)}
        onChange={onChange}
      >
        <button type="button">Hover date</button>
      </Calendar>
    );

    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Hover date' }));

    const dialog = await screen.findByRole('dialog', { name: 'Pilih tanggal' });
    fireEvent.click(getDateButton(dialog, 16, 'Januari', 2026));

    expect(onChange).toHaveBeenCalledTimes(1);
    const selectedDate = onChange.mock.calls[0][0] as Date;
    expect(selectedDate.getFullYear()).toBe(2026);
    expect(selectedDate.getMonth()).toBe(0);
    expect(selectedDate.getDate()).toBe(16);
  });

  it('keeps keyboard highlight aligned with the displayed month after navigation', async () => {
    render(
      <Calendar
        value={new Date(2026, 0, 15)}
        onChange={() => {}}
        placeholder="Tanggal transaksi"
      />
    );

    fireEvent.click(screen.getByPlaceholderText('Tanggal transaksi'));

    const dialog = await screen.findByRole('dialog', { name: 'Pilih tanggal' });
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Bulan berikutnya' })
    );

    await waitFor(() => {
      const grid = within(dialog).getByRole('grid', { name: /Februari 2026/ });
      const activeDescendant = grid.getAttribute('aria-activedescendant');

      expect(activeDescendant).toContain('-2026-1-');
      expect(document.getElementById(activeDescendant ?? '')).not.toBeNull();
    });

    const februaryGrid = within(dialog).getByRole('grid', {
      name: /Februari 2026/,
    });
    fireEvent.keyDown(februaryGrid, { key: 'ArrowLeft' });

    await waitFor(() => {
      expect(
        within(dialog)
          .getByRole('grid', { name: /Februari 2026/ })
          .getAttribute('aria-activedescendant')
      ).toContain('-2026-1-');
    });
  });

  it('selects the highlighted date with Enter when focus is on the grid', async () => {
    const onChange = vi.fn();

    render(
      <Calendar
        value={new Date(2026, 0, 15)}
        onChange={onChange}
        placeholder="Tanggal transaksi"
      />
    );

    fireEvent.click(screen.getByPlaceholderText('Tanggal transaksi'));

    const dialog = await screen.findByRole('dialog', { name: 'Pilih tanggal' });
    const grid = within(dialog).getByRole('grid', { name: /Januari 2026/ });

    await waitFor(() => {
      expect(document.activeElement).toBe(grid);
    });

    fireEvent.keyDown(grid, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledTimes(1);
    const selectedDate = onChange.mock.calls[0][0] as Date;
    expect(selectedDate.getFullYear()).toBe(2026);
    expect(selectedDate.getMonth()).toBe(0);
    expect(selectedDate.getDate()).toBe(15);
  });

  it('does not submit internal header selectors from inline calendar forms', () => {
    render(
      <form data-testid="inline-calendar-form">
        <Calendar
          mode="inline"
          value={new Date(2026, 0, 15)}
          onChange={() => {}}
        />
      </form>
    );

    const form = screen.getByTestId('inline-calendar-form') as HTMLFormElement;
    const formData = new FormData(form);

    expect(formData.has('month-selector')).toBe(false);
    expect(formData.has('year-selector')).toBe(false);
  });

  it('keeps inline calendar date controls from submitting surrounding forms', () => {
    const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
    });
    const onChange = vi.fn();

    render(
      <form data-testid="inline-submit-form" onSubmit={onSubmit}>
        <Calendar
          mode="inline"
          name="inline_date"
          value={new Date(2026, 0, 15)}
          onChange={onChange}
        />
      </form>
    );

    fireEvent.click(getDateButton(document.body, 16, 'Januari', 2026));

    const form = screen.getByTestId('inline-submit-form') as HTMLFormElement;
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(new FormData(form).get('inline_date')).toBe('2026-01-15');
  });

  it('selects dates from inline mode with the keyboard', async () => {
    const onChange = vi.fn();

    render(
      <Calendar
        mode="inline"
        value={new Date(2026, 0, 15)}
        onChange={onChange}
      />
    );

    const grid = screen.getByRole('grid', { name: /Januari 2026/ });
    await waitFor(() => {
      expect(grid.getAttribute('aria-activedescendant')).toContain(
        '-2026-0-15'
      );
    });

    fireEvent.keyDown(grid, { key: 'ArrowRight' });
    await waitFor(() => {
      expect(grid.getAttribute('aria-activedescendant')).toContain(
        '-2026-0-16'
      );
    });
    fireEvent.keyDown(grid, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledTimes(1);
    const selectedDate = onChange.mock.calls[0][0] as Date;
    expect(selectedDate.getFullYear()).toBe(2026);
    expect(selectedDate.getMonth()).toBe(0);
    expect(selectedDate.getDate()).toBe(16);
  });

  it('restores focus to the trigger after Escape closes the dialog', async () => {
    render(
      <Calendar
        value={new Date(2026, 0, 15)}
        onChange={() => {}}
        placeholder="Tanggal transaksi"
      />
    );

    const trigger = screen.getByPlaceholderText('Tanggal transaksi');
    fireEvent.click(trigger);

    const dialog = await screen.findByRole('dialog', { name: 'Pilih tanggal' });
    const grid = within(dialog).getByRole('grid', { name: /Januari 2026/ });

    await waitFor(() => {
      expect(document.activeElement).toBe(grid);
    });

    fireEvent.keyDown(grid, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    await waitFor(() => {
      expect(document.activeElement).toBe(trigger);
    });
  });

  it('restores focus to the trigger after non-focusable outside clicks close the dialog', async () => {
    render(
      <>
        <Calendar
          value={new Date(2026, 0, 15)}
          onChange={() => {}}
          placeholder="Tanggal transaksi"
        />
        <div data-testid="outside-surface">Outside surface</div>
      </>
    );

    const trigger = screen.getByPlaceholderText('Tanggal transaksi');
    fireEvent.click(trigger);

    await screen.findByRole('dialog', { name: 'Pilih tanggal' });
    fireEvent.mouseDown(screen.getByTestId('outside-surface'));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    await waitFor(() => {
      expect(document.activeElement).toBe(trigger);
    });
  });

  it('closes on outside combobox popups that are not inside the calendar', async () => {
    render(
      <>
        <Calendar
          value={new Date(2026, 0, 15)}
          onChange={() => {}}
          placeholder="Tanggal transaksi"
        />
        <div data-combobox-popup="" data-testid="external-popup">
          External popup
        </div>
      </>
    );

    fireEvent.click(screen.getByPlaceholderText('Tanggal transaksi'));

    await screen.findByRole('dialog', { name: 'Pilih tanggal' });
    fireEvent.mouseDown(screen.getByTestId('external-popup'));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it('attaches the outside-click listener only while a datepicker is open', async () => {
    const addListenerSpy = vi.spyOn(document, 'addEventListener');
    const removeListenerSpy = vi.spyOn(document, 'removeEventListener');

    render(
      <Calendar
        value={new Date(2026, 0, 15)}
        onChange={() => {}}
        placeholder="Tanggal transaksi"
      />
    );

    expect(
      addListenerSpy.mock.calls.some(([eventName]) => eventName === 'mousedown')
    ).toBe(false);

    fireEvent.click(screen.getByPlaceholderText('Tanggal transaksi'));
    await screen.findByRole('dialog', { name: 'Pilih tanggal' });

    expect(
      addListenerSpy.mock.calls.some(([eventName]) => eventName === 'mousedown')
    ).toBe(true);

    fireEvent.keyDown(screen.getByRole('grid', { name: /Januari 2026/ }), {
      key: 'Escape',
    });

    await waitFor(() => {
      expect(
        removeListenerSpy.mock.calls.some(
          ([eventName]) => eventName === 'mousedown'
        )
      ).toBe(true);
    });

    addListenerSpy.mockRestore();
    removeListenerSpy.mockRestore();
  });

  it('clears nullable values from the keyboard without adding a visible control', () => {
    const onChange = vi.fn();

    render(
      <Calendar
        value={new Date(2026, 0, 15)}
        onChange={onChange}
        placeholder="Tanggal transaksi"
      />
    );

    fireEvent.keyDown(screen.getByPlaceholderText('Tanggal transaksi'), {
      key: 'Backspace',
    });

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('clamps month and year changes instead of rolling overflow dates', async () => {
    render(
      <Calendar
        value={new Date(2026, 0, 31)}
        onChange={() => {}}
        placeholder="Tanggal transaksi"
      />
    );

    fireEvent.click(screen.getByPlaceholderText('Tanggal transaksi'));

    const dialog = await screen.findByRole('dialog', { name: 'Pilih tanggal' });
    fireEvent.click(
      within(dialog).getByRole('combobox', { name: /Bulan Januari/ })
    );
    fireEvent.click(await screen.findByRole('option', { name: 'Februari' }));

    await waitFor(() => {
      expect(
        within(dialog).getByRole('grid', { name: /Februari 2026/ })
      ).toBeTruthy();
    });
    expect(
      within(dialog).queryByRole('grid', { name: /Maret 2026/ })
    ).toBeNull();
  });

  it('keeps min and max bounds from navigating to fully invalid months', async () => {
    render(
      <Calendar
        value={new Date(2026, 2, 15)}
        minDate={new Date(2026, 2, 1)}
        maxDate={new Date(2026, 2, 31)}
        onChange={() => {}}
        placeholder="Tanggal transaksi"
      />
    );

    fireEvent.click(screen.getByPlaceholderText('Tanggal transaksi'));

    const dialog = await screen.findByRole('dialog', { name: 'Pilih tanggal' });
    const previousButton = within(dialog).getByRole('button', {
      name: 'Bulan sebelumnya',
    }) as HTMLButtonElement;

    expect(previousButton.disabled).toBe(true);
    fireEvent.click(previousButton);

    expect(
      within(dialog).getByRole('grid', { name: /Maret 2026/ })
    ).toBeTruthy();
  });

  it('derives year options from configured date bounds', async () => {
    render(
      <Calendar
        value={new Date(2026, 0, 15)}
        minDate={new Date(1900, 0, 1)}
        maxDate={new Date(2026, 11, 31)}
        onChange={() => {}}
        placeholder="Tanggal transaksi"
      />
    );

    fireEvent.click(screen.getByPlaceholderText('Tanggal transaksi'));

    const dialog = await screen.findByRole('dialog', { name: 'Pilih tanggal' });
    fireEvent.click(within(dialog).getByRole('combobox', { name: /Tahun/ }));

    expect(await screen.findByRole('option', { name: '1900' })).toBeTruthy();
  });

  it('keeps header combobox popups inside the calendar dialog portal', async () => {
    render(
      <Calendar
        value={new Date(2026, 0, 15)}
        onChange={() => {}}
        placeholder="Tanggal transaksi"
      />
    );

    fireEvent.click(screen.getByPlaceholderText('Tanggal transaksi'));

    const dialog = await screen.findByRole('dialog', { name: 'Pilih tanggal' });
    fireEvent.click(
      within(dialog).getByRole('combobox', { name: /Bulan Januari/ })
    );

    const option = await screen.findByRole('option', { name: 'Februari' });
    const popup = option.closest('[data-combobox-popup]');

    expect(popup).not.toBeNull();
    expect(dialog.contains(popup)).toBe(true);
  });

  it('lets external labels target the display input while native forms submit date-only values', () => {
    render(
      <form data-testid="calendar-form">
        <label htmlFor="birth-date">Tanggal lahir</label>
        <Calendar
          id="birth-date"
          name="birth_date"
          value={new Date(2026, 0, 15)}
          onChange={() => {}}
        />
      </form>
    );

    const input = screen.getByLabelText('Tanggal lahir');
    const form = screen.getByTestId('calendar-form') as HTMLFormElement;

    expect(input.getAttribute('id')).toBe('birth-date');
    expect(input.getAttribute('name')).toBeNull();
    expect(new FormData(form).get('birth_date')).toBe('2026-01-15');
  });

  it('keeps date-only parsing and formatting on local calendar dates', () => {
    const parsedDate = parseDateOnlyValue('2026-01-15');
    const normalizedDate = createCalendarDate(
      new Date(2026, 0, 15, 23, 59, 59)
    );

    expect(parsedDate.getFullYear()).toBe(2026);
    expect(parsedDate.getMonth()).toBe(0);
    expect(parsedDate.getDate()).toBe(15);
    expect(normalizedDate.getFullYear()).toBe(2026);
    expect(normalizedDate.getMonth()).toBe(0);
    expect(normalizedDate.getDate()).toBe(15);
    expect(normalizedDate.getHours()).toBe(12);
    expect(normalizedDate.getMinutes()).toBe(0);
    expect(formatDateOnlyValue(parsedDate)).toBe('2026-01-15');
    expect(formatDateOnlyValue(normalizedDate)).toBe('2026-01-15');
    expect(() => parseDateOnlyValue('2026-02-31')).toThrow(
      'Expected a valid date-only value.'
    );
    expect(() => parseDateOnlyValue('15 Jan 2026')).toThrow(
      'Expected a date-only value in YYYY-MM-DD format.'
    );
  });

  it('keeps inverted date bounds from crashing the header model', () => {
    const model = getCalendarHeaderModel(
      new Date(2026, 0, 1),
      new Date(2027, 0, 1),
      new Date(2025, 11, 31)
    );

    expect(model.yearOptions).toEqual([2025, 2026, 2027]);
    expect(model.isYearDisabled(2026)).toBe(true);
  });
});

describe('Calendar primitive', () => {
  it('renders the grid as a pure primitive outside root context', () => {
    const onDateSelect = vi.fn();

    render(
      <CalendarPrimitive.Grid
        displayDate={new Date(2026, 0, 1)}
        value={new Date(2026, 0, 15)}
        highlightedDate={new Date(2026, 0, 15)}
        onDateSelect={onDateSelect}
        onDateHighlight={() => {}}
        getDayButtonId={date =>
          `primitive-day-${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
        }
      />
    );

    fireEvent.click(getDateButton(document.body, 16, 'Januari', 2026));

    expect(onDateSelect).toHaveBeenCalledTimes(1);
    const selectedDate = onDateSelect.mock.calls[0][0] as Date;
    expect(selectedDate.getFullYear()).toBe(2026);
    expect(selectedDate.getMonth()).toBe(0);
    expect(selectedDate.getDate()).toBe(16);
  });

  it('exposes a root and trigger composition surface', async () => {
    render(
      <CalendarPrimitive.Root value={null} onChange={() => {}}>
        <CalendarPrimitive.Trigger>Pick date</CalendarPrimitive.Trigger>
        <CalendarPrimitive.Portal>
          <div>Primitive popup</div>
        </CalendarPrimitive.Portal>
      </CalendarPrimitive.Root>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Pick date' }));

    expect(await screen.findByText('Primitive popup')).toBeTruthy();
  });

  it('lets primitive portal render into a custom container', async () => {
    const portalHost = document.createElement('div');
    document.body.append(portalHost);

    try {
      render(
        <CalendarPrimitive.Root value={null} onChange={() => {}}>
          <CalendarPrimitive.Trigger>Pick date</CalendarPrimitive.Trigger>
          <CalendarPrimitive.Portal container={portalHost}>
            <div>Primitive custom popup</div>
          </CalendarPrimitive.Portal>
        </CalendarPrimitive.Root>
      );

      fireEvent.click(screen.getByRole('button', { name: 'Pick date' }));

      expect(await screen.findByText('Primitive custom popup')).toBeTruthy();
      expect(portalHost.textContent).toContain('Primitive custom popup');
    } finally {
      portalHost.remove();
    }
  });

  it('isolates modal background siblings when primitive portal is nested', async () => {
    const NestedPortalCalendar = () => {
      const [portalHost, setPortalHost] = useState<HTMLDivElement | null>(null);

      return (
        <section>
          <button type="button">Outside action</button>
          <div data-testid="nested-portal-host" ref={setPortalHost} />
          {portalHost && (
            <CalendarPrimitive.Root value={null} onChange={() => {}}>
              <CalendarPrimitive.Trigger>Pick date</CalendarPrimitive.Trigger>
              <CalendarPrimitive.Portal container={portalHost}>
                <div>Nested primitive popup</div>
              </CalendarPrimitive.Portal>
            </CalendarPrimitive.Root>
          )}
        </section>
      );
    };

    render(<NestedPortalCalendar />);

    const outsideAction = screen.getByRole('button', {
      name: 'Outside action',
    }) as HTMLButtonElement & {
      inert: boolean;
    };

    fireEvent.click(await screen.findByRole('button', { name: 'Pick date' }));

    const dialog = await screen.findByRole('dialog', { name: 'Pilih tanggal' });
    expect(screen.getByTestId('nested-portal-host').textContent).toContain(
      'Nested primitive popup'
    );

    await waitFor(() => {
      expect(outsideAction.inert).toBe(true);
      expect(outsideAction.getAttribute('aria-hidden')).toBe('true');
    });

    fireEvent.keyDown(dialog, { key: 'Escape' });

    await waitFor(() => {
      expect(outsideAction.inert).toBe(false);
      expect(outsideAction.hasAttribute('aria-hidden')).toBe(false);
    });
  });

  it('isolates modal background when a primitive portal renders into a shadow root', async () => {
    const portalHost = document.createElement('div');
    document.body.append(portalHost);
    const shadowRoot = portalHost.attachShadow({ mode: 'open' });

    try {
      const { container } = render(
        <CalendarPrimitive.Root value={null} onChange={() => {}}>
          <CalendarPrimitive.Trigger>
            Pick shadow date
          </CalendarPrimitive.Trigger>
          <CalendarPrimitive.Portal container={shadowRoot}>
            <div>Shadow primitive popup</div>
          </CalendarPrimitive.Portal>
        </CalendarPrimitive.Root>
      );
      const appRoot = container as HTMLElement & { inert: boolean };

      fireEvent.click(screen.getByRole('button', { name: 'Pick shadow date' }));

      await waitFor(() => {
        expect(shadowRoot.querySelector('[role="dialog"]')).not.toBeNull();
      });
      await waitFor(() => {
        expect(appRoot.inert).toBe(true);
        expect(appRoot.getAttribute('aria-hidden')).toBe('true');
      });

      const dialog = shadowRoot.querySelector<HTMLElement>('[role="dialog"]');
      if (!dialog) throw new Error('Expected shadow calendar dialog.');

      fireEvent.keyDown(dialog, { key: 'Escape' });

      await waitFor(() => {
        expect(appRoot.inert).toBe(false);
        expect(appRoot.hasAttribute('aria-hidden')).toBe(false);
      });
    } finally {
      portalHost.remove();
    }
  });

  it('keeps shared background isolated until the last stacked portal closes', async () => {
    const { container } = render(
      <main>
        <CalendarPrimitive.Root value={null} onChange={() => {}}>
          <CalendarPrimitive.Trigger>Pick first date</CalendarPrimitive.Trigger>
          <CalendarPrimitive.Portal>
            <div>First primitive popup</div>
          </CalendarPrimitive.Portal>
        </CalendarPrimitive.Root>
        <CalendarPrimitive.Root value={null} onChange={() => {}}>
          <CalendarPrimitive.Trigger>
            Pick second date
          </CalendarPrimitive.Trigger>
          <CalendarPrimitive.Portal>
            <div>Second primitive popup</div>
          </CalendarPrimitive.Portal>
        </CalendarPrimitive.Root>
      </main>
    );
    const appRoot = container as HTMLElement & { inert: boolean };
    const firstTrigger = screen.getByRole('button', {
      name: 'Pick first date',
    });
    const secondTrigger = screen.getByRole('button', {
      name: 'Pick second date',
    });

    fireEvent.click(firstTrigger);
    const firstDialog = (
      await screen.findByText('First primitive popup')
    ).closest<HTMLElement>('[role="dialog"]');
    if (!firstDialog) throw new Error('Expected first calendar dialog.');

    await waitFor(() => {
      expect(appRoot.inert).toBe(true);
      expect(appRoot.getAttribute('aria-hidden')).toBe('true');
    });

    fireEvent.click(secondTrigger);
    const secondDialog = (
      await screen.findByText('Second primitive popup')
    ).closest<HTMLElement>('[role="dialog"]');
    if (!secondDialog) throw new Error('Expected second calendar dialog.');

    fireEvent.keyDown(firstDialog, { key: 'Escape' });

    await waitFor(() => {
      expect(firstDialog.isConnected).toBe(false);
    });
    expect(secondDialog.isConnected).toBe(true);
    expect(appRoot.inert).toBe(true);
    expect(appRoot.getAttribute('aria-hidden')).toBe('true');

    fireEvent.keyDown(secondDialog, { key: 'Escape' });

    await waitFor(() => {
      expect(secondDialog.isConnected).toBe(false);
    });
    await waitFor(() => {
      expect(appRoot.inert).toBe(false);
      expect(appRoot.hasAttribute('aria-hidden')).toBe(false);
    });
  });
});
