import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CALENDAR_CONSTANTS } from '../constants';
import { useCalendarState } from './useCalendarState';

describe('useCalendarState', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('opens calendar immediately and closes with animation delay', () => {
    const onOpen = vi.fn();
    const onClose = vi.fn();

    const { result } = renderHook(() => useCalendarState({ onOpen, onClose }));

    act(() => {
      result.current.openCalendar();
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.isOpening).toBe(true);
    expect(result.current.isClosing).toBe(false);
    expect(onOpen).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.closeCalendar();
    });

    expect(result.current.isClosing).toBe(true);
    expect(result.current.isOpening).toBe(false);
    expect(result.current.isOpen).toBe(true);

    act(() => {
      vi.advanceTimersByTime(CALENDAR_CONSTANTS.ANIMATION_DURATION);
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.isClosing).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('cancels pending close timeout when reopened before animation ends', () => {
    const onClose = vi.fn();

    const { result } = renderHook(() => useCalendarState({ onClose }));

    act(() => {
      result.current.openCalendar();
      result.current.closeCalendar();
    });

    expect(result.current.isClosing).toBe(true);

    act(() => {
      result.current.openCalendar();
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.isClosing).toBe(false);

    act(() => {
      vi.advanceTimersByTime(CALENDAR_CONSTANTS.ANIMATION_DURATION + 5);
    });

    expect(result.current.isOpen).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
  });
});
