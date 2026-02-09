import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CALENDAR_CONSTANTS } from '../constants';
import { useCalendarHover } from './useCalendarHover';

describe('useCalendarHover', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('opens on trigger hover and focuses portal after configured delays', () => {
    const openCalendar = vi.fn();
    const closeCalendar = vi.fn();
    const portal = document.createElement('div');
    const focusSpy = vi.spyOn(portal, 'focus').mockImplementation(() => {});

    const { result } = renderHook(() =>
      useCalendarHover({
        openCalendar,
        closeCalendar,
        portalRef: { current: portal },
      })
    );

    act(() => {
      result.current.handleTriggerMouseEnter();
      vi.advanceTimersByTime(CALENDAR_CONSTANTS.HOVER_OPEN_DELAY);
    });

    expect(openCalendar).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(CALENDAR_CONSTANTS.PORTAL_FOCUS_DELAY);
    });

    expect(focusSpy).toHaveBeenCalledTimes(1);
  });

  it('closes on mouse leave when portal is not hovered and skips close when still hovered', () => {
    const openCalendar = vi.fn();
    const closeCalendar = vi.fn();
    const portal = document.createElement('div');
    const matchesSpy = vi
      .spyOn(portal, 'matches')
      .mockImplementation((selector: string) => selector === ':hover');

    const { result } = renderHook(() =>
      useCalendarHover({
        openCalendar,
        closeCalendar,
        portalRef: { current: portal },
      })
    );

    act(() => {
      result.current.handleTriggerMouseLeave();
      vi.advanceTimersByTime(CALENDAR_CONSTANTS.HOVER_CLOSE_DELAY);
    });

    expect(closeCalendar).not.toHaveBeenCalled();

    matchesSpy.mockImplementation(() => false);

    act(() => {
      result.current.handleTriggerMouseLeave();
      vi.advanceTimersByTime(CALENDAR_CONSTANTS.HOVER_CLOSE_DELAY);
    });

    expect(closeCalendar).toHaveBeenCalledTimes(1);
  });

  it('handles calendar mouse enter/leave close intent timers', () => {
    const openCalendar = vi.fn();
    const closeCalendar = vi.fn();

    const { result } = renderHook(() =>
      useCalendarHover({
        openCalendar,
        closeCalendar,
        portalRef: { current: document.createElement('div') },
      })
    );

    act(() => {
      result.current.handleTriggerMouseLeave();
      result.current.handleCalendarMouseEnter();
      vi.advanceTimersByTime(CALENDAR_CONSTANTS.HOVER_CLOSE_DELAY);
    });

    expect(closeCalendar).not.toHaveBeenCalled();

    act(() => {
      result.current.handleCalendarMouseLeave();
      vi.advanceTimersByTime(CALENDAR_CONSTANTS.HOVER_CLOSE_DELAY);
    });

    expect(closeCalendar).toHaveBeenCalledTimes(1);
  });
});
