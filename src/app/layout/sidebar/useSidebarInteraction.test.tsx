import { act, renderHook } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { useSidebarInteraction } from './useSidebarInteraction';

describe('useSidebarInteraction', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('cancels pending hover expand when the sidebar becomes locked', () => {
    const expandSidebar = vi.fn();
    const collapseSidebar = vi.fn();
    const { result, rerender } = renderHook(
      ({ isLocked }) =>
        useSidebarInteraction({
          collapsed: true,
          collapseSidebar,
          expandSidebar,
          isLocked,
          pathname: '/dashboard',
        }),
      {
        initialProps: { isLocked: false },
      }
    );

    act(() => {
      result.current.handleMouseEnterSidebar();
    });

    rerender({ isLocked: true });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(expandSidebar).not.toHaveBeenCalled();
  });
});
