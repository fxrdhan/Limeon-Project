import { act, renderHook } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import type { VersionData } from '../../../../shared/contexts/EntityModalContext';
import { useEntityComparisonState } from './useEntityComparisonState';

const versionA: VersionData = {
  action_type: 'UPDATE',
  changed_at: '2026-06-16T00:00:00.000Z',
  entity_data: { name: 'Versi A' },
  id: 'version-a',
  version_number: 1,
};

const versionB: VersionData = {
  action_type: 'UPDATE',
  changed_at: '2026-06-16T00:01:00.000Z',
  entity_data: { name: 'Versi B' },
  id: 'version-b',
  version_number: 2,
};

describe('useEntityComparisonState', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('does not let a stale close timer reset a reopened comparison', () => {
    const { result } = renderHook(() => useEntityComparisonState(true));

    act(() => {
      result.current.openComparison(versionA);
    });
    act(() => {
      result.current.closeComparison();
    });

    expect(result.current.comparisonData.isClosing).toBe(true);

    act(() => {
      result.current.openComparison(versionB);
    });
    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(result.current.comparisonData.isOpen).toBe(true);
    expect(result.current.comparisonData.isClosing).toBe(false);
    expect(result.current.comparisonData.selectedVersion).toBe(versionB);
  });

  it('clears a pending close timer on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
    const { result, unmount } = renderHook(() =>
      useEntityComparisonState(true)
    );

    act(() => {
      result.current.openComparison(versionA);
    });
    act(() => {
      result.current.closeComparison();
    });

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalledOnce();
  });
});
