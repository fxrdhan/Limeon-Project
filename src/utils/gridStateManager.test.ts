import type { GridState } from 'ag-grid-community';
import { beforeEach, describe, expect, it } from 'vite-plus/test';
import {
  autoSaveGridState,
  clearAllGridStates,
  clearGridState,
  hasSavedState,
  loadSavedPaginationEnabledState,
  loadSavedStateForInit,
  savePaginationEnabledState,
  type GridStatePersistenceApi,
} from './gridStateManager';

const gridState = (overrides: Partial<GridState> = {}): GridState =>
  ({
    columnOrder: {
      orderedColIds: ['name', 'stock'],
    },
    columnSizing: {
      columnSizingModel: [
        {
          colId: 'name',
          width: 180,
        },
      ],
    },
    pagination: {
      page: 2,
      pageSize: 50,
    },
    ...overrides,
  }) as GridState;

const gridApi = ({
  pagination = true,
  state = gridState(),
}: {
  pagination?: boolean;
  state?: GridState;
} = {}): GridStatePersistenceApi => ({
  getGridOption: (key: string) =>
    key === 'pagination' ? pagination : undefined,
  getState: () => state,
  isDestroyed: () => false,
});

describe('grid state manager', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('persists grid state and pagination settings for initialization', () => {
    expect(autoSaveGridState(gridApi(), 'items')).toBe(true);

    expect(hasSavedState('items')).toBe(true);
    expect(loadSavedPaginationEnabledState('items')).toBe(true);
    expect(loadSavedStateForInit('items')).toMatchObject({
      columnOrder: {
        orderedColIds: ['name', 'stock'],
      },
      columnSizing: {
        columnSizingModel: [
          {
            colId: 'name',
            width: 180,
          },
        ],
      },
      pagination: {
        page: 2,
        pageSize: 50,
      },
    });
  });

  it('strips transient focus and selection state before restoring from storage', () => {
    const transientState = gridState({
      cellSelection: {
        cellRanges: [],
      },
      focusedCell: {
        colId: 'name',
        rowIndex: 1,
        rowPinned: null,
      },
      rangeSelection: {
        cellRanges: [],
      },
    });

    expect(
      autoSaveGridState(
        gridApi({
          state: transientState,
        }),
        'items'
      )
    ).toBe(true);

    const restoredState = loadSavedStateForInit('items');

    expect(restoredState?.focusedCell).toBeUndefined();
    expect(restoredState?.cellSelection).toBeUndefined();
    expect(restoredState?.rangeSelection).toBeUndefined();
  });

  it('loads saved pagination flags only when the stored value is boolean', () => {
    expect(
      savePaginationEnabledState(gridApi({ pagination: false }), 'items')
    ).toBe(true);
    expect(loadSavedPaginationEnabledState('items')).toBe(false);

    sessionStorage.setItem('grid_pagination_enabled_items', '"false"');

    expect(loadSavedPaginationEnabledState('items')).toBeUndefined();
  });

  it('clears individual and all saved grid state entries', () => {
    expect(autoSaveGridState(gridApi(), 'items')).toBe(true);
    expect(autoSaveGridState(gridApi(), 'suppliers')).toBe(true);

    expect(clearGridState('items')).toBe(true);
    expect(hasSavedState('items')).toBe(false);
    expect(hasSavedState('suppliers')).toBe(true);

    expect(clearAllGridStates()).toBe(true);
    expect(hasSavedState('suppliers')).toBe(false);
  });
});
