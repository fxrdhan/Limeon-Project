import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useCalendarNavigation } from './useCalendarNavigation';

describe('useCalendarNavigation', () => {
  it('navigates year backward and forward', () => {
    const setDisplayDate = vi.fn();

    const { result } = renderHook(() =>
      useCalendarNavigation({
        currentView: 'days',
        setDisplayDate,
      })
    );

    act(() => {
      result.current.navigateYear('prev');
      result.current.navigateYear('next');
    });

    const prevUpdater = setDisplayDate.mock.calls[0][0] as (prev: Date) => Date;
    const nextUpdater = setDisplayDate.mock.calls[1][0] as (prev: Date) => Date;

    expect(prevUpdater(new Date('2026-03-10')).getFullYear()).toBe(2025);
    expect(nextUpdater(new Date('2026-03-10')).getFullYear()).toBe(2027);
  });

  it('navigates days/months/years views with corresponding date shifts', () => {
    const setDisplayDate = vi.fn();

    const { result, rerender } = renderHook(
      ({ currentView }) =>
        useCalendarNavigation({
          currentView,
          setDisplayDate,
        }),
      {
        initialProps: {
          currentView: 'days' as const,
        },
      }
    );

    act(() => {
      result.current.navigateViewDate('next');
    });

    const daysUpdater = setDisplayDate.mock.calls[0][0] as (prev: Date) => Date;
    const afterDays = daysUpdater(new Date('2026-05-20'));
    expect(afterDays.getDate()).toBe(1);
    expect(afterDays.getMonth()).toBe(5);

    rerender({ currentView: 'months' });
    act(() => {
      result.current.navigateViewDate('prev');
    });

    const monthsUpdater = setDisplayDate.mock.calls[1][0] as (
      prev: Date
    ) => Date;
    expect(monthsUpdater(new Date('2026-05-20')).getFullYear()).toBe(2025);

    rerender({ currentView: 'years' });
    act(() => {
      result.current.navigateViewDate('next');
    });

    const yearsUpdater = setDisplayDate.mock.calls[2][0] as (
      prev: Date
    ) => Date;
    expect(yearsUpdater(new Date('2026-05-20')).getFullYear()).toBe(2036);
  });
});
