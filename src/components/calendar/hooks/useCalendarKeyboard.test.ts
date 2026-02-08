import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCalendarKeyboard } from './useCalendarKeyboard';

type View = 'days' | 'months' | 'years';

type EventTargetLike = EventTarget & HTMLDivElement;

const createKeyboardEvent = (
  key: string,
  opts: {
    ctrlKey?: boolean;
    target?: EventTargetLike;
    currentTarget?: EventTargetLike;
  } = {}
) =>
  ({
    key,
    ctrlKey: opts.ctrlKey ?? false,
    preventDefault: vi.fn(),
    target: opts.target ?? ({} as EventTargetLike),
    currentTarget: opts.currentTarget ?? ({} as EventTargetLike),
  }) as unknown as React.KeyboardEvent<HTMLInputElement | HTMLDivElement>;

const buildParams = (
  overrides: Partial<Parameters<typeof useCalendarKeyboard>[0]> = {}
) => {
  const base = {
    isOpen: true,
    currentView: 'days' as View,
    highlightedDate: new Date('2026-02-10T00:00:00.000Z'),
    highlightedMonth: 1,
    highlightedYear: 2026,
    displayDate: new Date('2026-02-01T00:00:00.000Z'),
    value: new Date('2026-02-05T00:00:00.000Z'),
    minDate: undefined,
    maxDate: undefined,
    onDateSelect: vi.fn(),
    onMonthSelect: vi.fn(),
    onYearSelect: vi.fn(),
    openCalendar: vi.fn(),
    closeCalendar: vi.fn(),
    setHighlightedDate: vi.fn(),
    setHighlightedMonth: vi.fn(),
    setHighlightedYear: vi.fn(),
    setDisplayDate: vi.fn(),
    setCurrentView: vi.fn(),
    navigateViewDate: vi.fn(),
    navigateYearWithAnimation: vi.fn(),
    focusPortal: vi.fn(),
  };

  return {
    ...base,
    ...overrides,
  };
};

describe('useCalendarKeyboard', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('opens calendar on Enter when closed and blocks Tab when open', () => {
    const params = buildParams({ isOpen: false });
    const { result, rerender } = renderHook(({ p }) => useCalendarKeyboard(p), {
      initialProps: { p: params },
    });

    const enterEvent = createKeyboardEvent('Enter');
    act(() => {
      result.current.handleInputKeyDown(enterEvent);
    });

    expect(enterEvent.preventDefault).toHaveBeenCalledTimes(1);
    expect(params.openCalendar).toHaveBeenCalledTimes(1);

    const openParams = buildParams({ isOpen: true });
    rerender({ p: openParams });

    const tabEvent = createKeyboardEvent('Tab');
    act(() => {
      result.current.handleInputKeyDown(tabEvent);
    });

    expect(tabEvent.preventDefault).toHaveBeenCalledTimes(1);
  });

  it('submits highlighted selection on Enter for days/months/years and closes fallback', () => {
    const dateParams = buildParams({
      currentView: 'days',
      highlightedDate: new Date('2026-02-20T00:00:00.000Z'),
    });
    const { result, rerender } = renderHook(({ p }) => useCalendarKeyboard(p), {
      initialProps: { p: dateParams },
    });

    act(() => {
      result.current.handleInputKeyDown(createKeyboardEvent('Enter'));
    });
    expect(dateParams.onDateSelect).toHaveBeenCalledWith(
      new Date('2026-02-20T00:00:00.000Z')
    );

    const monthParams = buildParams({
      currentView: 'months',
      highlightedMonth: 4,
    });
    rerender({ p: monthParams });
    act(() => {
      result.current.handleInputKeyDown(createKeyboardEvent('Enter'));
    });
    expect(monthParams.onMonthSelect).toHaveBeenCalledWith(4);

    const yearParams = buildParams({
      currentView: 'years',
      highlightedYear: 2030,
    });
    rerender({ p: yearParams });
    act(() => {
      result.current.handleInputKeyDown(createKeyboardEvent('Enter'));
    });
    expect(yearParams.onYearSelect).toHaveBeenCalledWith(2030);

    const fallbackParams = buildParams({
      currentView: 'days',
      highlightedDate: null,
    });
    rerender({ p: fallbackParams });
    act(() => {
      result.current.handleInputKeyDown(createKeyboardEvent('Enter'));
    });
    expect(fallbackParams.closeCalendar).toHaveBeenCalledTimes(1);
  });

  it('handles escape in input mode and day navigation with date bounds', () => {
    const params = buildParams({
      currentView: 'days',
      highlightedDate: new Date('2026-02-01T00:00:00.000Z'),
      displayDate: new Date('2026-02-01T00:00:00.000Z'),
      minDate: new Date('2026-01-31T00:00:00.000Z'),
      maxDate: new Date('2026-03-10T00:00:00.000Z'),
    });

    const { result } = renderHook(() => useCalendarKeyboard(params));

    const left = createKeyboardEvent('ArrowLeft');
    act(() => {
      result.current.handleInputKeyDown(left);
    });
    expect(left.preventDefault).toHaveBeenCalledTimes(1);
    expect(params.setHighlightedDate).toHaveBeenCalledWith(
      new Date('2026-01-31T00:00:00.000Z')
    );
    const displayCall = (
      params.setDisplayDate as unknown as ReturnType<typeof vi.fn>
    ).mock.calls[0][0] as Date;
    expect(displayCall.getFullYear()).toBe(2026);
    expect(displayCall.getMonth()).toBe(0);
    expect(displayCall.getDate()).toBe(1);

    const tooFar = createKeyboardEvent('ArrowUp');
    act(() => {
      result.current.handleInputKeyDown(tooFar);
    });
    expect(tooFar.preventDefault).toHaveBeenCalledTimes(1);

    const escape = createKeyboardEvent('Escape');
    act(() => {
      result.current.handleInputKeyDown(escape);
    });
    expect(params.closeCalendar).toHaveBeenCalled();
  });

  it('handles ctrl+arrow navigation in days view', () => {
    const params = buildParams({ currentView: 'days' });
    const { result } = renderHook(() => useCalendarKeyboard(params));

    act(() => {
      result.current.handleInputKeyDown(
        createKeyboardEvent('ArrowLeft', { ctrlKey: true })
      );
      result.current.handleInputKeyDown(
        createKeyboardEvent('ArrowRight', { ctrlKey: true })
      );
      result.current.handleInputKeyDown(
        createKeyboardEvent('ArrowUp', { ctrlKey: true })
      );
      result.current.handleInputKeyDown(
        createKeyboardEvent('ArrowDown', { ctrlKey: true })
      );
    });

    expect(params.navigateViewDate).toHaveBeenNthCalledWith(1, 'prev');
    expect(params.navigateViewDate).toHaveBeenNthCalledWith(2, 'next');
    expect(params.navigateYearWithAnimation).toHaveBeenNthCalledWith(1, 'prev');
    expect(params.navigateYearWithAnimation).toHaveBeenNthCalledWith(2, 'next');
  });

  it('navigates months and years with bounds and selection handlers in calendar mode', () => {
    const params = buildParams({
      currentView: 'months',
      highlightedMonth: 10,
      minDate: new Date('2026-01-01T00:00:00.000Z'),
      maxDate: new Date('2026-12-31T00:00:00.000Z'),
      displayDate: new Date('2026-06-01T00:00:00.000Z'),
    });

    const { result, rerender } = renderHook(({ p }) => useCalendarKeyboard(p), {
      initialProps: { p: params },
    });

    act(() => {
      result.current.handleCalendarKeyDown(
        createKeyboardEvent('ArrowRight') as React.KeyboardEvent<HTMLDivElement>
      );
      result.current.handleCalendarKeyDown(
        createKeyboardEvent('ArrowDown') as React.KeyboardEvent<HTMLDivElement>
      );
    });

    expect(params.setHighlightedMonth).toHaveBeenCalledWith(11);

    const yearsParams = buildParams({
      currentView: 'years',
      highlightedYear: 2026,
      minDate: new Date('2025-01-01T00:00:00.000Z'),
      maxDate: new Date('2032-12-31T00:00:00.000Z'),
      displayDate: new Date('2026-01-01T00:00:00.000Z'),
    });
    rerender({ p: yearsParams });

    act(() => {
      result.current.handleCalendarKeyDown(
        createKeyboardEvent('ArrowRight') as React.KeyboardEvent<HTMLDivElement>
      );
    });

    expect(yearsParams.setHighlightedYear).toHaveBeenCalled();

    const target = {} as EventTargetLike;
    const currentTarget = target;
    act(() => {
      result.current.handleCalendarKeyDown(
        createKeyboardEvent('Enter', {
          target,
          currentTarget,
        }) as React.KeyboardEvent<HTMLDivElement>
      );
    });
    expect(yearsParams.onYearSelect).toHaveBeenCalledWith(2026);
  });

  it('handles escape transitions years->months->days and closes from days', () => {
    const yearsParams = buildParams({
      currentView: 'years',
      highlightedYear: 2029,
      value: new Date('2026-08-12T00:00:00.000Z'),
      displayDate: new Date('2026-06-01T00:00:00.000Z'),
    });

    const { result, rerender } = renderHook(({ p }) => useCalendarKeyboard(p), {
      initialProps: { p: yearsParams },
    });

    act(() => {
      result.current.handleCalendarKeyDown(
        createKeyboardEvent('Escape') as React.KeyboardEvent<HTMLDivElement>
      );
    });

    expect(yearsParams.setCurrentView).toHaveBeenCalledWith('months');
    expect(yearsParams.setHighlightedYear).toHaveBeenCalledWith(null);
    expect(yearsParams.focusPortal).toHaveBeenCalled();

    const monthsParams = buildParams({
      currentView: 'months',
      value: new Date('2026-06-15T00:00:00.000Z'),
      displayDate: new Date('2026-06-01T00:00:00.000Z'),
    });
    rerender({ p: monthsParams });

    act(() => {
      result.current.handleCalendarKeyDown(
        createKeyboardEvent('Escape') as React.KeyboardEvent<HTMLDivElement>
      );
    });

    expect(monthsParams.setCurrentView).toHaveBeenCalledWith('days');
    expect(monthsParams.setHighlightedDate).toHaveBeenCalledWith(
      new Date('2026-06-15T00:00:00.000Z')
    );
    expect(monthsParams.setHighlightedMonth).toHaveBeenCalledWith(null);

    const daysParams = buildParams({ currentView: 'days' });
    rerender({ p: daysParams });

    act(() => {
      result.current.handleCalendarKeyDown(
        createKeyboardEvent('Escape') as React.KeyboardEvent<HTMLDivElement>
      );
    });

    expect(daysParams.closeCalendar).toHaveBeenCalled();
  });

  it('ignores arrow navigation when dropdown listbox is open', () => {
    const params = buildParams();
    const { result } = renderHook(() => useCalendarKeyboard(params));

    const listbox = document.createElement('div');
    listbox.setAttribute('role', 'listbox');
    document.body.appendChild(listbox);

    const event = createKeyboardEvent(
      'ArrowDown'
    ) as React.KeyboardEvent<HTMLDivElement>;

    act(() => {
      result.current.handleCalendarKeyDown(event);
    });

    expect(params.setHighlightedDate).not.toHaveBeenCalled();
    expect(
      (event.preventDefault as unknown as ReturnType<typeof vi.fn>).mock.calls
        .length
    ).toBe(0);
  });
});
