import { act, render } from '@testing-library/react';
import type { HTMLAttributes, ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import HistoryTimelineList from './HistoryTimelineList';

let resizeObserverCallback: ResizeObserverCallback | null = null;

vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({
      animate: _animate,
      children,
      exit: _exit,
      initial: _initial,
      layout: _layout,
      transition: _transition,
      ...props
    }: {
      animate?: unknown;
      children?: ReactNode;
      exit?: unknown;
      initial?: unknown;
      layout?: unknown;
      transition?: unknown;
    } & HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
  useIsPresent: () => true,
}));

const history = [
  {
    id: 'history-1',
    version_number: 1,
    action_type: 'INSERT' as const,
    changed_at: '2026-03-26T10:00:00.000Z',
  },
  {
    id: 'history-2',
    version_number: 2,
    action_type: 'UPDATE' as const,
    changed_at: '2026-03-26T10:05:00.000Z',
  },
];

const renderTimeline = () =>
  render(
    <HistoryTimelineList
      history={history}
      isLoading={false}
      onVersionClick={vi.fn()}
    />
  );

describe('HistoryTimelineList', () => {
  afterEach(() => {
    resizeObserverCallback = null;
    vi.unstubAllGlobals();
  });

  it('clears the delayed resize scroll check on unmount', () => {
    vi.useFakeTimers();
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const requestAnimationFrameMock = vi.fn(
      (callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      }
    ) as typeof requestAnimationFrame;

    vi.stubGlobal('requestAnimationFrame', requestAnimationFrameMock);
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          resizeObserverCallback = callback;
        }

        disconnect() {}

        observe() {}

        unobserve() {}
      }
    );

    try {
      const { unmount } = renderTimeline();

      act(() => {
        resizeObserverCallback?.([], {} as ResizeObserver);
      });
      const resizeSettleTimer = setTimeoutSpy.mock.results.find(
        (_result, index) => setTimeoutSpy.mock.calls[index]?.[1] === 50
      )?.value;

      unmount();

      expect(resizeSettleTimer).toBeDefined();
      expect(clearTimeoutSpy).toHaveBeenCalledWith(resizeSettleTimer);
    } finally {
      setTimeoutSpy.mockRestore();
      clearTimeoutSpy.mockRestore();
      vi.useRealTimers();
    }
  });
});
