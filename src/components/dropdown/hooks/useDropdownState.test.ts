import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DROPDOWN_CONSTANTS } from '../constants';
import { useDropdownState } from './useDropdownState';

const createClickEvent = () =>
  ({
    preventDefault: vi.fn(),
  }) as unknown as React.MouseEvent;

describe('useDropdownState', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers();
    });
  });

  it('opens and closes dropdown through toggle with animation lifecycle', () => {
    const { result } = renderHook(() => useDropdownState());
    const clickEvent = createClickEvent();

    act(() => {
      result.current.toggleDropdown(clickEvent);
    });

    expect(clickEvent.preventDefault).toHaveBeenCalledTimes(1);
    expect(result.current.isOpen).toBe(true);
    expect(result.current.isClosing).toBe(false);

    act(() => {
      result.current.toggleDropdown(createClickEvent());
    });

    expect(result.current.isClosing).toBe(true);

    act(() => {
      vi.advanceTimersByTime(DROPDOWN_CONSTANTS.ANIMATION_DURATION);
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.isClosing).toBe(false);

    act(() => {
      result.current.setApplyOpenStyles(true);
    });
    expect(result.current.applyOpenStyles).toBe(true);
  });

  it('prevents toggle interaction while closing animation is in progress', () => {
    const { result } = renderHook(() => useDropdownState());

    act(() => {
      result.current.openThisDropdown();
      result.current.actualCloseDropdown();
    });

    expect(result.current.isClosing).toBe(true);

    act(() => {
      result.current.toggleDropdown(createClickEvent());
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.isClosing).toBe(true);

    act(() => {
      vi.advanceTimersByTime(DROPDOWN_CONSTANTS.ANIMATION_DURATION);
    });

    expect(result.current.isOpen).toBe(false);
  });

  it('closes previously active dropdown when a new instance is opened', () => {
    const first = renderHook(() => useDropdownState());
    const second = renderHook(() => useDropdownState());

    act(() => {
      first.result.current.openThisDropdown();
    });

    expect(first.result.current.isOpen).toBe(true);

    act(() => {
      second.result.current.openThisDropdown();
    });

    expect(second.result.current.isOpen).toBe(true);
    expect(first.result.current.isClosing).toBe(true);

    act(() => {
      vi.advanceTimersByTime(DROPDOWN_CONSTANTS.ANIMATION_DURATION);
    });

    expect(first.result.current.isOpen).toBe(false);
    expect(second.result.current.isOpen).toBe(true);

    act(() => {
      second.result.current.actualCloseDropdown();
      vi.advanceTimersByTime(DROPDOWN_CONSTANTS.ANIMATION_DURATION);
    });

    expect(second.result.current.isOpen).toBe(false);
  });

  it('cancels pending close timeout when reopened before animation ends', () => {
    const { result } = renderHook(() => useDropdownState());

    act(() => {
      result.current.openThisDropdown();
      result.current.actualCloseDropdown();
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.isClosing).toBe(true);

    act(() => {
      result.current.openThisDropdown();
      vi.advanceTimersByTime(DROPDOWN_CONSTANTS.ANIMATION_DURATION);
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.isClosing).toBe(false);
  });

  it('keeps same instance open when reopened while already active', () => {
    const { result } = renderHook(() => useDropdownState());

    act(() => {
      result.current.openThisDropdown();
      result.current.openThisDropdown();
      vi.advanceTimersByTime(DROPDOWN_CONSTANTS.ANIMATION_DURATION);
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.isClosing).toBe(false);
  });
});
