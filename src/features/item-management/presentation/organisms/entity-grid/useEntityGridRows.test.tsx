import { act, renderHook } from '@testing-library/react';
import type { GridApi } from 'ag-grid-community';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { useEntityGridRows } from './useEntityGridRows';

const { toggleDisplayModeMock } = vi.hoisted(() => ({
  toggleDisplayModeMock: vi.fn(),
}));

vi.mock(
  '@/features/item-management/application/hooks/ui/useColumnDisplayMode',
  () => ({
    useColumnDisplayMode: () => ({
      displayModeState: {},
      isReferenceColumn: () => false,
      toggleColumnDisplayMode: toggleDisplayModeMock,
    }),
  })
);

vi.mock(
  '@/features/item-management/application/hooks/ui/useItemsDisplayTransform',
  () => ({
    useItemsDisplayTransform: (items: unknown[]) => items,
  })
);

const createGridApi = () => {
  const autoSizeColumns = vi.fn();
  const getColumn = vi.fn(() => ({}));
  const isDestroyed = vi.fn(() => false);

  return {
    api: {
      autoSizeColumns,
      getColumn,
      isDestroyed,
    } as unknown as GridApi,
    autoSizeColumns,
  };
};

const renderRowsHook = (gridApi: GridApi | null) =>
  renderHook(() =>
    useEntityGridRows({
      activeTab: 'items',
      gridApi,
      itemsData: [],
      suppliersData: [],
      entityData: [],
      itemColumnDefs: [],
      supplierColumnDefs: [],
      entityColumnDefs: [],
    })
  );

describe('useEntityGridRows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not auto-size a column after unmount', () => {
    vi.useFakeTimers();
    try {
      const gridApi = createGridApi();
      const { result, unmount } = renderRowsHook(gridApi.api);

      act(() => {
        result.current.toggleColumnDisplayMode('base_unit');
      });
      unmount();
      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(gridApi.autoSizeColumns).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('auto-sizes only the latest column after rapid display mode toggles', () => {
    vi.useFakeTimers();
    try {
      const gridApi = createGridApi();
      const { result } = renderRowsHook(gridApi.api);

      act(() => {
        result.current.toggleColumnDisplayMode('base_unit');
        result.current.toggleColumnDisplayMode('supplier');
      });
      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(gridApi.autoSizeColumns).toHaveBeenCalledTimes(1);
      expect(gridApi.autoSizeColumns).toHaveBeenCalledWith(['supplier']);
    } finally {
      vi.useRealTimers();
    }
  });
});
