import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useHoverDetail } from './useHoverDetail';

const makeElement = (rect: {
  top: number;
  left: number;
  right: number;
  bottom: number;
}) => {
  const element = document.createElement('div');
  Object.defineProperty(element, 'getBoundingClientRect', {
    value: () => ({
      ...rect,
      width: rect.right - rect.left,
      height: rect.bottom - rect.top,
      x: rect.left,
      y: rect.top,
      toJSON: () => ({}),
    }),
  });
  return element;
};

const flush = async (ms: number) => {
  await act(async () => {
    vi.advanceTimersByTime(ms);
    await Promise.resolve();
  });
};

describe('useHoverDetail', () => {
  beforeEach(() => {
    vi.useFakeTimers();

    Object.defineProperty(window, 'innerWidth', {
      value: 1200,
      configurable: true,
    });
    Object.defineProperty(window, 'pageYOffset', {
      value: 0,
      configurable: true,
    });
    Object.defineProperty(window, 'pageXOffset', {
      value: 0,
      configurable: true,
    });
  });

  it('shows portal after delay, fetches details, updates immediately when already visible, and hides with cleanup', async () => {
    const onFetchData = vi
      .fn()
      .mockResolvedValueOnce({ id: 'o1', name: 'Detail 1', code: 'A' })
      .mockResolvedValueOnce({ id: 'o2', name: 'Detail 2', code: 'B' });

    const element = makeElement({
      top: 100,
      left: 100,
      right: 220,
      bottom: 130,
    });

    const { result } = renderHook(() =>
      useHoverDetail({
        hoverDelay: 50,
        hideDelay: 40,
        onFetchData,
      })
    );

    await act(async () => {
      await result.current.handleOptionHover('o1', element, { name: 'Awal 1' });
    });

    expect(result.current.isVisible).toBe(false);
    expect(result.current.data?.name).toBe('Awal 1');
    expect(result.current.position.direction).toBe('right');

    await flush(50);

    expect(result.current.isVisible).toBe(true);
    expect(onFetchData).toHaveBeenCalledWith('o1');
    expect(result.current.data?.name).toBe('Detail 1');
    expect(result.current.isLoading).toBe(false);

    await act(async () => {
      await result.current.handleOptionHover('o2', element, { name: 'Awal 2' });
    });

    expect(onFetchData).toHaveBeenCalledWith('o2');
    expect(result.current.data?.name).toBe('Detail 2');

    act(() => {
      result.current.handleOptionLeave();
    });

    await flush(40);
    expect(result.current.isVisible).toBe(false);

    await flush(200);
    expect(result.current.data).toBeNull();
  });

  it('keeps portal visible while hovering portal and hides when dropdown closes', async () => {
    const onFetchData = vi
      .fn()
      .mockResolvedValue({ id: 'o3', name: 'Detail 3' });
    const element = makeElement({
      top: 220,
      left: 200,
      right: 320,
      bottom: 250,
    });

    const { result, rerender } = renderHook(
      ({ isDropdownOpen }: { isDropdownOpen: boolean }) =>
        useHoverDetail({
          hoverDelay: 10,
          hideDelay: 30,
          onFetchData,
          isDropdownOpen,
        }),
      {
        initialProps: { isDropdownOpen: true },
      }
    );

    await act(async () => {
      await result.current.handleOptionHover('o3', element, { name: 'Portal' });
    });

    await flush(10);
    expect(result.current.isVisible).toBe(true);

    act(() => {
      result.current.handleOptionLeave();
      result.current.handlePortalHover();
    });

    await flush(30);
    expect(result.current.isVisible).toBe(true);

    rerender({ isDropdownOpen: false });

    await flush(1);
    expect(result.current.isVisible).toBe(false);
  });

  it('supports left positioning, disabled mode, and fetch error fallback', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    Object.defineProperty(window, 'innerWidth', {
      value: 360,
      configurable: true,
    });

    const onFetchData = vi.fn().mockRejectedValue(new Error('fetch failed'));
    const leftElement = makeElement({
      top: 50,
      left: 260,
      right: 330,
      bottom: 80,
    });

    const { result } = renderHook(() =>
      useHoverDetail({
        hoverDelay: 5,
        onFetchData,
      })
    );

    await act(async () => {
      await result.current.handleOptionHover('left-1', leftElement, {
        name: 'Left',
      });
    });

    await flush(5);
    expect(result.current.position.direction).toBe('left');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to fetch hover detail data:',
      expect.any(Error)
    );

    const { result: disabledResult } = renderHook(() =>
      useHoverDetail({
        isEnabled: false,
        hoverDelay: 5,
      })
    );

    await act(async () => {
      await disabledResult.current.handleOptionHover('x', leftElement, {
        name: 'Disabled',
      });
    });

    await flush(10);
    expect(disabledResult.current.isVisible).toBe(false);

    consoleErrorSpy.mockRestore();
  });
});
