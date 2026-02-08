import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useScrollManagement } from './useScrollManagement';

const createContainer = () => {
  const container = document.createElement('div');

  Object.defineProperty(container, 'clientHeight', {
    value: 100,
    configurable: true,
  });
  Object.defineProperty(container, 'scrollHeight', {
    value: 300,
    configurable: true,
  });

  let scrollTopValue = 0;
  Object.defineProperty(container, 'scrollTop', {
    configurable: true,
    get: () => scrollTopValue,
    set: (value: number) => {
      scrollTopValue = value;
    },
  });

  const optionA = document.createElement('div');
  optionA.setAttribute('role', 'option');
  optionA.setAttribute('aria-selected', 'true');
  Object.defineProperty(optionA, 'offsetTop', {
    value: 180,
    configurable: true,
  });

  const optionB = document.createElement('div');
  optionB.setAttribute('role', 'option');

  container.append(optionA, optionB);
  return container;
};

describe('useScrollManagement', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      callback(0);
      return 1;
    });
  });

  it('computes scroll state and subscribes to scroll events while open', () => {
    const container = createContainer();
    const addEventListenerSpy = vi.spyOn(container, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(container, 'removeEventListener');

    const { result, rerender } = renderHook(
      ({ isOpen }: { isOpen: boolean }) =>
        useScrollManagement({
          isOpen,
          filteredOptions: [{ id: '1', name: 'A' }],
          optionsContainerRef: { current: container },
          autoScrollOnOpen: false,
        }),
      {
        initialProps: { isOpen: true },
      }
    );

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(result.current.scrollState.isScrollable).toBe(true);
    expect(result.current.scrollState.scrolledFromTop).toBe(false);

    act(() => {
      container.scrollTop = 199;
      container.dispatchEvent(new Event('scroll'));
    });

    expect(result.current.scrollState.reachedBottom).toBe(true);
    expect(result.current.scrollState.scrolledFromTop).toBe(true);

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'scroll',
      expect.any(Function)
    );

    rerender({ isOpen: false });

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'scroll',
      expect.any(Function)
    );
  });

  it('auto-scrolls highlighted option once when dropdown opens and resets on reopen', () => {
    const container = createContainer();

    const { rerender } = renderHook(
      ({ isOpen }: { isOpen: boolean }) =>
        useScrollManagement({
          isOpen,
          filteredOptions: [{ id: '1', name: 'A' }],
          optionsContainerRef: { current: container },
          autoScrollOnOpen: true,
        }),
      {
        initialProps: { isOpen: true },
      }
    );

    expect(container.scrollTop).toBe(168);

    container.scrollTop = 0;
    rerender({ isOpen: true });
    expect(container.scrollTop).toBe(0);

    rerender({ isOpen: false });
    rerender({ isOpen: true });

    expect(container.scrollTop).toBe(168);
  });

  it('does not auto-scroll when there are no options or auto-scroll is disabled', () => {
    const container = createContainer();
    container.scrollTop = 42;

    renderHook(() =>
      useScrollManagement({
        isOpen: true,
        filteredOptions: [],
        optionsContainerRef: { current: container },
        autoScrollOnOpen: true,
      })
    );

    expect(container.scrollTop).toBe(42);

    renderHook(() =>
      useScrollManagement({
        isOpen: true,
        filteredOptions: [{ id: '1', name: 'A' }],
        optionsContainerRef: { current: container },
        autoScrollOnOpen: false,
      })
    );

    expect(container.scrollTop).toBe(42);
  });
});
