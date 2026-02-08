import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useContainerWidth } from './useContainerWidth';

let offsetWidthValue = 0;

class ResizeObserverMock {
  public observe = vi.fn();
  public disconnect = vi.fn();
  public unobserve = vi.fn();
  private readonly callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    resizeObserverInstances.push(this);
  }

  trigger() {
    this.callback([], this as unknown as ResizeObserver);
  }
}

const resizeObserverInstances: ResizeObserverMock[] = [];

const WidthHarness = () => {
  const { width, containerRef } = useContainerWidth();

  return (
    <div>
      <div data-testid="width">{width}</div>
      <div ref={containerRef} data-testid="container" />
    </div>
  );
};

describe('useContainerWidth', () => {
  beforeEach(() => {
    resizeObserverInstances.length = 0;
    Object.defineProperty(window, 'innerWidth', {
      value: 1200,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      configurable: true,
      get() {
        return offsetWidthValue;
      },
    });
    global.ResizeObserver =
      ResizeObserverMock as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses container width when available and observes container size', async () => {
    offsetWidthValue = 760;

    render(<WidthHarness />);

    await waitFor(() => {
      expect(screen.getByTestId('width')).toHaveTextContent('760');
    });

    expect(resizeObserverInstances).toHaveLength(1);
    expect(resizeObserverInstances[0].observe).toHaveBeenCalledWith(
      screen.getByTestId('container')
    );

    act(() => {
      offsetWidthValue = 810;
      resizeObserverInstances[0].trigger();
    });

    expect(screen.getByTestId('width')).toHaveTextContent('810');
  });

  it('falls back to viewport width when container width is zero', async () => {
    offsetWidthValue = 0;

    render(<WidthHarness />);

    await waitFor(() => {
      expect(screen.getByTestId('width')).toHaveTextContent('1160');
    });

    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        value: 1000,
        configurable: true,
        writable: true,
      });
      window.dispatchEvent(new Event('resize'));
    });

    expect(screen.getByTestId('width')).toHaveTextContent('960');
  });

  it('disconnects observer on unmount', () => {
    offsetWidthValue = 500;
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = render(<WidthHarness />);
    const observer = resizeObserverInstances[0];

    unmount();

    expect(observer.disconnect).toHaveBeenCalledTimes(1);
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'resize',
      expect.any(Function)
    );
  });
});
