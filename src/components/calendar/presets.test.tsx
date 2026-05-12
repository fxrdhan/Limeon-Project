import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import Calendar, { CalendarPrimitive } from './index';

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
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
    expect(dialog.style.position).toBe('fixed');

    const selectedDay = within(dialog).getByRole('button', { name: '15' });

    expect(
      selectedDay.classList.contains('calendar__day-button--selected')
    ).toBe(true);

    fireEvent.click(within(dialog).getByRole('button', { name: '16' }));

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

  it('keeps inline mode rendered in place without selecting dates', () => {
    const onChange = vi.fn();

    render(
      <Calendar
        mode="inline"
        value={new Date(2026, 0, 15)}
        onChange={onChange}
      />
    );

    expect(screen.queryByRole('dialog')).toBeNull();

    const selectedDay = screen.getByRole('button', { name: '15' });
    expect(
      selectedDay.classList.contains('calendar__day-button--selected')
    ).toBe(true);

    fireEvent.click(selectedDay);

    expect(onChange).not.toHaveBeenCalled();
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

    const firstSelectedDay = screen.getByRole('button', { name: '15' });
    expect(
      firstSelectedDay.classList.contains('calendar__day-button--selected')
    ).toBe(true);

    rerender(
      <Calendar
        mode="inline"
        value={new Date(2026, 1, 20)}
        onChange={onChange}
      />
    );

    await waitFor(() => {
      const nextSelectedDay = screen.getByRole('button', { name: '20' });
      expect(
        nextSelectedDay.classList.contains('calendar__day-button--selected')
      ).toBe(true);
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps custom trigger datepicker behavior through the preset wrapper', async () => {
    render(
      <Calendar value={null} onChange={() => {}}>
        <span>Open calendar</span>
      </Calendar>
    );

    const trigger = screen.getByRole('button', { name: 'Open calendar' });

    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(trigger);

    const dialog = await screen.findByRole('dialog', { name: 'Pilih tanggal' });

    expect(trigger.getAttribute('aria-controls')).toBe(dialog.id);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });
});

describe('Calendar primitive', () => {
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
});
