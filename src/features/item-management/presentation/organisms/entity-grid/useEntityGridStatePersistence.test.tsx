import { act, renderHook } from '@testing-library/react';
import type { GridApi, GridState } from 'ag-grid-community';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import {
  getItemMasterSearchSessionKey,
  type MasterDataType,
} from '../../../shared/types';
import { loadSavedStateForInit } from '../../../../../utils/gridStateManager';
import { useEntityGridOptions } from './useEntityGridOptions';
import { useEntityGridStatePersistence } from './useEntityGridStatePersistence';

const advancedFilterModel = {
  colId: 'name',
  filter: 'parasetamol',
  filterType: 'text',
  type: 'contains',
} satisfies NonNullable<GridState['filter']>['advancedFilterModel'];

const createGridState = (overrides: Partial<GridState> = {}): GridState => ({
  columnOrder: {
    orderedColIds: ['name'],
  },
  ...overrides,
});

const saveGridState = (state: GridState) => {
  sessionStorage.setItem('grid_state_items', JSON.stringify(state));
};

const saveGridStateForTab = (tab: MasterDataType, state: GridState) => {
  sessionStorage.setItem(`grid_state_${tab}`, JSON.stringify(state));
};

const createGridApi = () => {
  const setState = vi.fn();
  const setGridOption = vi.fn();
  const clearFocusedCell = vi.fn();
  const clearCellSelection = vi.fn();
  const autoSizeAllColumns = vi.fn();
  const addEventListener = vi.fn();
  const removeEventListener = vi.fn();

  return {
    api: {
      addEventListener,
      autoSizeAllColumns,
      clearCellSelection,
      clearFocusedCell,
      getGridOption: vi.fn(() => true),
      isDestroyed: vi.fn(() => false),
      paginationGetPageSize: vi.fn(() => 25),
      removeEventListener,
      setGridOption,
      setState,
    } as unknown as GridApi,
    setState,
  };
};

const installQueuedAnimationFrames = () => {
  const queuedFrames = new Map<number, FrameRequestCallback>();
  let nextFrameId = 1;
  const requestAnimationFrameMock = vi.fn((callback: FrameRequestCallback) => {
    const frameId = nextFrameId;
    nextFrameId += 1;
    queuedFrames.set(frameId, callback);
    return frameId;
  }) as typeof requestAnimationFrame;
  const cancelAnimationFrameMock = vi.fn((frameId: number) => {
    queuedFrames.delete(frameId);
  }) as typeof cancelAnimationFrame;

  vi.stubGlobal('requestAnimationFrame', requestAnimationFrameMock);
  vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrameMock);
  window.requestAnimationFrame = requestAnimationFrameMock;
  window.cancelAnimationFrame = cancelAnimationFrameMock;

  return {
    cancelAnimationFrameMock,
    flush: () => {
      const frames = [...queuedFrames.values()];
      queuedFrames.clear();
      frames.forEach(callback => callback(0));
    },
  };
};

const renderStatePersistence = () =>
  renderHook(() =>
    useEntityGridStatePersistence({
      activeTab: 'items',
      gridApi: null,
      itemsPerPage: 25,
    })
  );

describe('useEntityGridStatePersistence', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it('normalizes invalid saved page size and clears stale advanced filter state', () => {
    saveGridState(
      createGridState({
        filter: {
          advancedFilterModel,
        },
        pagination: {
          pageSize: 999,
        },
      })
    );

    const { result } = renderStatePersistence();

    expect(result.current.initialGridState?.pagination?.pageSize).toBe(25);
    expect(
      result.current.initialGridState?.filter?.advancedFilterModel
    ).toBeUndefined();

    expect(loadSavedStateForInit('items')?.pagination?.pageSize).toBe(25);
    expect(
      loadSavedStateForInit('items')?.filter?.advancedFilterModel
    ).toBeUndefined();
  });

  it('keeps advanced filter state when a persisted search pattern exists', () => {
    sessionStorage.setItem(getItemMasterSearchSessionKey('items'), 'para');
    saveGridState(
      createGridState({
        filter: {
          advancedFilterModel,
        },
        pagination: {
          pageSize: 50,
        },
      })
    );

    const { result } = renderStatePersistence();

    expect(result.current.initialGridState?.pagination?.pageSize).toBe(50);
    expect(
      result.current.initialGridState?.filter?.advancedFilterModel
    ).toMatchObject({
      colId: 'name',
      filter: 'parasetamol',
    });
  });

  it('applies only the latest scheduled tab state when tab changes happen before paint', () => {
    const itemState = createGridState({
      columnOrder: {
        orderedColIds: ['item_name'],
      },
    });
    const supplierState = createGridState({
      columnOrder: {
        orderedColIds: ['supplier_name'],
      },
    });
    saveGridStateForTab('items', itemState);
    saveGridStateForTab('suppliers', supplierState);
    const gridApi = createGridApi();
    const animationFrames = installQueuedAnimationFrames();

    try {
      const { rerender } = renderHook(
        ({ activeTab }: { activeTab: MasterDataType }) =>
          useEntityGridStatePersistence({
            activeTab,
            gridApi: gridApi.api,
            itemsPerPage: 25,
          }),
        {
          initialProps: { activeTab: 'items' as MasterDataType },
        }
      );

      rerender({ activeTab: 'suppliers' });
      rerender({ activeTab: 'items' });
      act(() => {
        animationFrames.flush();
      });

      expect(animationFrames.cancelAnimationFrameMock).toHaveBeenCalled();
      expect(gridApi.setState).toHaveBeenCalledTimes(1);
      expect(gridApi.setState).toHaveBeenCalledWith(itemState);
      expect(gridApi.setState).not.toHaveBeenCalledWith(supplierState);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('useEntityGridOptions', () => {
  it('opens the saved sidebar tool panel from current and legacy grid state', () => {
    const currentSideBarState = {
      openToolPanel: 'columns',
      position: 'right',
      toolPanels: {},
      visible: true,
    } satisfies NonNullable<GridState['sideBar']>;
    const legacySideBarState = Object.assign(
      {
        openToolPanel: null,
        position: 'right' as const,
        toolPanels: {},
        visible: true,
      } satisfies NonNullable<GridState['sideBar']>,
      {
        openToolPanelId: 'columns',
      }
    );

    const { result, rerender } = renderHook(
      ({ savedState }: { savedState: GridState }) =>
        useEntityGridOptions({
          activeTab: 'items',
          entityConfig: null,
          hasSavedGridState: () => true,
          isRowGroupingEnabled: false,
          readSavedGridState: () => savedState,
          search: '',
        }),
      {
        initialProps: {
          savedState: createGridState({
            sideBar: currentSideBarState,
          }),
        },
      }
    );

    expect(result.current.sideBarConfig.defaultToolPanel).toBe('columns');

    rerender({
      savedState: createGridState({
        sideBar: legacySideBarState,
      }),
    });

    expect(result.current.sideBarConfig.defaultToolPanel).toBe('columns');
  });
});
