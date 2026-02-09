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

  it('executes timer-clearing branches with mocked React primitives', async () => {
    vi.resetModules();

    const clearTimeoutSpy = vi
      .spyOn(globalThis, 'clearTimeout')
      .mockImplementation(() => {});

    let refCalls = 0;
    let stateCalls = 0;
    const setStateSpy = vi.fn();

    vi.doMock('react', async () => {
      const actual = await vi.importActual<typeof import('react')>('react');
      return {
        ...actual,
        useRef: (initial: unknown) => {
          refCalls += 1;
          if (refCalls <= 2) {
            return { current: setTimeout(() => {}, 1) };
          }
          return { current: initial };
        },
        useCallback: <T extends (...args: never[]) => unknown>(fn: T) => fn,
        useState: (initial: unknown) => {
          stateCalls += 1;
          const value =
            typeof initial === 'function'
              ? (initial as () => unknown)()
              : initial;

          // Fourth call is the pseudo-cleanup useState in this hook.
          if (stateCalls === 4 && typeof value === 'function') {
            (value as () => void)();
          }

          return [value, setStateSpy] as const;
        },
      };
    });

    const { useCalendarState: mockedUseCalendarState } =
      await import('./useCalendarState');

    const calendarState = mockedUseCalendarState({
      onOpen: vi.fn(),
      onClose: vi.fn(),
    });

    calendarState.openCalendar();
    calendarState.closeCalendar();

    expect(clearTimeoutSpy).toHaveBeenCalled();

    vi.doUnmock('react');
  });
});
