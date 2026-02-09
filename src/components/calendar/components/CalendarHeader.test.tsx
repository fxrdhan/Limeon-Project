import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CalendarHeader from './CalendarHeader';

const dropdownMock = vi.hoisted(() => vi.fn());

vi.mock('@/components/dropdown', () => ({
  default: (props: Record<string, unknown>) => {
    dropdownMock(props);
    const selectorName = String(props.name);
    return (
      <button
        type="button"
        data-testid={selectorName}
        onClick={() =>
          (props.onChange as (value: string) => void)(
            selectorName === 'month-selector' ? '10' : '2030'
          )
        }
      >
        {selectorName}
      </button>
    );
  },
}));

describe('CalendarHeader', () => {
  it('renders month/year dropdowns and navigation actions', () => {
    const onNavigatePrev = vi.fn();
    const onNavigateNext = vi.fn();
    const onMonthChange = vi.fn();
    const onYearChange = vi.fn();

    render(
      <CalendarHeader
        displayDate={new Date('2026-02-08T00:00:00.000Z')}
        onNavigatePrev={onNavigatePrev}
        onNavigateNext={onNavigateNext}
        onMonthChange={onMonthChange}
        onYearChange={onYearChange}
      />
    );

    expect(dropdownMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        name: 'month-selector',
        value: '1',
        options: expect.arrayContaining([{ id: '0', name: 'Januari' }]),
      })
    );
    expect(dropdownMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        name: 'year-selector',
        value: '2026',
      })
    );

    fireEvent.click(screen.getByTestId('month-selector'));
    fireEvent.click(screen.getByTestId('year-selector'));
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));

    expect(onMonthChange).toHaveBeenCalledWith(10);
    expect(onYearChange).toHaveBeenCalledWith(2030);
    expect(onNavigatePrev).toHaveBeenCalledTimes(1);
    expect(onNavigateNext).toHaveBeenCalledTimes(1);
  });
});
