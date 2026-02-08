import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useHistorySelection } from './useHistoryManagement';

const historyItems = [
  {
    id: 'h-1',
    version_number: 1,
    action_type: 'INSERT' as const,
    changed_at: '2026-01-01T10:00:00.000Z',
  },
  {
    id: 'h-2',
    version_number: 2,
    action_type: 'UPDATE' as const,
    changed_at: '2026-01-02T10:00:00.000Z',
  },
];

describe('useHistorySelection', () => {
  it('selects and deselects versions in single mode', () => {
    const onVersionSelect = vi.fn();
    const onVersionDeselect = vi.fn();

    const { result } = renderHook(() =>
      useHistorySelection({
        history: historyItems,
        compareMode: false,
        onVersionSelect,
        onVersionDeselect,
      })
    );

    act(() => {
      result.current.handleVersionClick(historyItems[0]);
    });

    expect(result.current.selectedVersion).toBe(1);
    expect(onVersionSelect).toHaveBeenCalledWith(historyItems[0]);

    act(() => {
      result.current.handleVersionClick(historyItems[0]);
    });

    expect(result.current.selectedVersion).toBeNull();
    expect(onVersionDeselect).toHaveBeenCalledTimes(1);
  });

  it('ignores direct version click when compare mode is active', () => {
    const onVersionSelect = vi.fn();
    const { result } = renderHook(() =>
      useHistorySelection({
        history: historyItems,
        compareMode: true,
        onVersionSelect,
      })
    );

    act(() => {
      result.current.handleVersionClick(historyItems[0]);
    });

    expect(result.current.selectedVersion).toBeNull();
    expect(onVersionSelect).not.toHaveBeenCalled();
  });

  it('handles compare selection callbacks for 2, 1, and 0 items', () => {
    const onCompareSelect = vi.fn();
    const onSelectionEmpty = vi.fn();

    const { result } = renderHook(() =>
      useHistorySelection({
        history: historyItems,
        compareMode: true,
        onCompareSelect,
        onSelectionEmpty,
      })
    );

    act(() => {
      result.current.handleCompareSelected([historyItems[0], historyItems[1]]);
      result.current.handleCompareSelected([historyItems[0]]);
      result.current.handleCompareSelected([]);
      result.current.handleSelectionEmpty();
    });

    expect(onCompareSelect).toHaveBeenCalledWith([
      historyItems[0],
      historyItems[1],
    ]);
    expect(onSelectionEmpty).toHaveBeenCalledTimes(3);
  });

  it('clears selection and resets when compareMode changes', () => {
    const onSelectionEmpty = vi.fn();

    const { result, rerender } = renderHook(
      ({ compareMode }: { compareMode: boolean }) =>
        useHistorySelection({
          history: historyItems,
          compareMode,
          onSelectionEmpty,
        }),
      { initialProps: { compareMode: false } }
    );

    act(() => {
      result.current.handleVersionClick(historyItems[1]);
    });
    expect(result.current.selectedVersion).toBe(2);

    act(() => {
      result.current.clearSelections();
    });
    expect(result.current.selectedVersion).toBeNull();
    expect(onSelectionEmpty).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.handleVersionClick(historyItems[0]);
    });
    expect(result.current.selectedVersion).toBe(1);

    rerender({ compareMode: true });
    expect(result.current.selectedVersion).toBeNull();
  });

  it('supports keyboard navigation when enabled in single mode', () => {
    const onVersionSelect = vi.fn();
    const { result } = renderHook(() =>
      useHistorySelection({
        history: historyItems,
        compareMode: false,
        onVersionSelect,
        enableKeyboardNav: true,
      })
    );

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    });

    expect(result.current.selectedVersion).toBe(1);
    expect(onVersionSelect).toHaveBeenCalledWith(historyItems[0]);
  });
});
