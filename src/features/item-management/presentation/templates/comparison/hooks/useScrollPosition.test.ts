import { act, renderHook } from '@testing-library/react';
import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useScrollPosition } from './useScrollPosition';

type ResizeObserverCallbackType = ConstructorParameters<
  typeof ResizeObserver
>[0];

class ResizeObserverMock {
  static instances: ResizeObserverMock[] = [];
  readonly callback: ResizeObserverCallbackType;
  observe = vi.fn();
  disconnect = vi.fn();

  constructor(callback: ResizeObserverCallbackType) {
    this.callback = callback;
    ResizeObserverMock.instances.push(this);
  }
}

describe('useScrollPosition', () => {
  const originalResizeObserver = globalThis.ResizeObserver;
  const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
  const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;

  beforeEach(() => {
    vi.useFakeTimers();
    ResizeObserverMock.instances = [];

    globalThis.ResizeObserver =
      ResizeObserverMock as unknown as typeof ResizeObserver;
    globalThis.requestAnimationFrame = vi.fn(cb => {
      cb(0);
      return 1;
    });
    globalThis.cancelAnimationFrame = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    globalThis.ResizeObserver = originalResizeObserver;
    globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
  });

  it('tracks top and bottom states from initial check and scroll events', () => {
    const element = document.createElement('div');
    Object.defineProperty(element, 'scrollTop', {
      configurable: true,
      writable: true,
      value: 0,
    });
    Object.defineProperty(element, 'scrollHeight', {
      configurable: true,
      value: 300,
    });
    Object.defineProperty(element, 'clientHeight', {
      configurable: true,
      value: 100,
    });

    const elementRef = {
      current: element,
    } as React.RefObject<HTMLElement | null>;

    const { result } = renderHook(() =>
      useScrollPosition({
        elementRef,
        isOpen: true,
      })
    );

    act(() => {
      vi.advanceTimersByTime(60);
    });

    expect(result.current).toEqual({ isAtTop: true, isAtBottom: false });

    act(() => {
      element.scrollTop = 120;
      element.dispatchEvent(new Event('scroll'));
    });
    expect(result.current).toEqual({ isAtTop: false, isAtBottom: false });

    act(() => {
      element.scrollTop = 198;
      element.dispatchEvent(new Event('scroll'));
    });
    expect(result.current).toEqual({ isAtTop: false, isAtBottom: true });
  });

  it('resets state and detaches listeners when modal closes', () => {
    const element = document.createElement('div');
    Object.defineProperty(element, 'scrollTop', {
      configurable: true,
      writable: true,
      value: 50,
    });
    Object.defineProperty(element, 'scrollHeight', {
      configurable: true,
      value: 200,
    });
    Object.defineProperty(element, 'clientHeight', {
      configurable: true,
      value: 100,
    });

    const addEventListenerSpy = vi.spyOn(element, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(element, 'removeEventListener');
    const elementRef = {
      current: element,
    } as React.RefObject<HTMLElement | null>;

    const { rerender, result } = renderHook(
      ({ isOpen }: { isOpen: boolean }) =>
        useScrollPosition({
          elementRef,
          isOpen,
        }),
      { initialProps: { isOpen: true } }
    );

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'scroll',
      expect.any(Function),
      { passive: true }
    );
    expect(ResizeObserverMock.instances[0]?.observe).toHaveBeenCalledWith(
      element
    );

    rerender({ isOpen: false });

    expect(result.current).toEqual({ isAtTop: true, isAtBottom: true });
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'scroll',
      expect.any(Function)
    );
    expect(ResizeObserverMock.instances[0]?.disconnect).toHaveBeenCalledTimes(
      1
    );
  });
});
