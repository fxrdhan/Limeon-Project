import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCalendarPosition } from './useCalendarPosition';

const makeTrigger = (rect: Partial<DOMRect> = {}) => {
  const trigger = document.createElement('button');
  Object.defineProperty(trigger, 'getBoundingClientRect', {
    value: () => ({
      top: 100,
      left: 120,
      right: 300,
      bottom: 140,
      width: 180,
      height: 40,
      x: 120,
      y: 100,
      toJSON: () => ({}),
      ...rect,
    }),
  });
  return trigger;
};

describe('useCalendarPosition', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      callback(0);
      return 1;
    });
    vi.spyOn(window, 'addEventListener');
    vi.spyOn(window, 'removeEventListener');
  });

  it('calculates down direction position with numeric portal width and binds listeners when open', () => {
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 900,
    });

    const triggerRef = {
      current: makeTrigger(),
    } as React.RefObject<HTMLButtonElement>;

    const { result, rerender } = renderHook(
      ({ isOpen }) =>
        useCalendarPosition({
          triggerRef,
          isOpen,
          portalWidth: 280,
        }),
      { initialProps: { isOpen: false } }
    );

    expect(result.current.isPositionReady).toBe(false);
    expect(result.current.dropDirection).toBe('down');

    rerender({ isOpen: true });

    expect(result.current.isPositionReady).toBe(true);
    expect(result.current.dropDirection).toBe('down');
    expect(result.current.portalStyle.left).toBe('120px');
    expect(result.current.portalStyle.top).toBe('145px');
    expect(result.current.portalStyle.width).toBe('280px');

    expect(window.addEventListener).toHaveBeenCalledWith(
      'scroll',
      expect.any(Function),
      true
    );
    expect(window.addEventListener).toHaveBeenCalledWith(
      'resize',
      expect.any(Function)
    );

    rerender({ isOpen: false });
    expect(window.removeEventListener).toHaveBeenCalledWith(
      'scroll',
      expect.any(Function),
      true
    );
    expect(window.removeEventListener).toHaveBeenCalledWith(
      'resize',
      expect.any(Function)
    );
  });

  it('calculates up direction and supports string/auto width fallback', () => {
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 800,
    });

    const triggerRef = {
      current: makeTrigger({ top: 700, bottom: 740, left: 90 }),
    } as React.RefObject<HTMLButtonElement>;

    const { result, rerender } = renderHook(
      ({ portalWidth }) =>
        useCalendarPosition({
          triggerRef,
          isOpen: true,
          portalWidth,
          calendarWidth: 360,
          calendarHeight: 320,
        }),
      { initialProps: { portalWidth: '50%' as string | number } }
    );

    expect(result.current.dropDirection).toBe('up');
    expect(result.current.portalStyle.width).toBe('50%');
    expect(result.current.portalStyle.top).toBe('372px');

    rerender({ portalWidth: undefined });

    act(() => {
      result.current.calculatePosition();
    });

    expect(result.current.portalStyle.width).toBe('360px');
  });

  it('returns safely when trigger ref is missing', () => {
    const triggerRef = {
      current: null,
    } as React.RefObject<HTMLButtonElement>;

    const { result } = renderHook(() =>
      useCalendarPosition({
        triggerRef,
        isOpen: true,
      })
    );

    act(() => {
      result.current.calculatePosition();
    });

    expect(result.current.portalStyle).toEqual({});
    expect(result.current.isPositionReady).toBe(false);
  });
});
