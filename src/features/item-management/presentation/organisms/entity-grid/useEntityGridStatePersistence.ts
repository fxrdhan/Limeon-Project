import type { GridApi, GridState } from 'ag-grid-community';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  getItemMasterSearchSessionKey,
  isMasterDataTab,
  type MasterDataType,
} from '@/features/item-management/shared/types';
import * as gridStateManager from '@/utils/gridStateManager';
import type { TableType } from '@/utils/gridStateManager';

const ALLOWED_PAGE_SIZES = new Set([25, 50, 100]);

interface UseEntityGridStatePersistenceParams {
  activeTab: MasterDataType;
  gridApi: GridApi | null;
  itemsPerPage: number;
}

export const useEntityGridStatePersistence = ({
  activeTab,
  gridApi,
  itemsPerPage,
}: UseEntityGridStatePersistenceParams) => {
  const tableType: TableType = activeTab;
  const currentPageSizeRef = useRef<number>(itemsPerPage);
  const isApplyingTabStateRef = useRef(false);
  const previousActiveTabRef = useRef<TableType | null>(null);
  const applyGridStateFrameRef = useRef<number | null>(null);

  const hasPersistedSearchPattern = useCallback(
    (targetTableType: TableType) => {
      if (!isMasterDataTab(targetTableType)) {
        return false;
      }

      try {
        const savedPattern = sessionStorage.getItem(
          getItemMasterSearchSessionKey(targetTableType)
        );
        return !!savedPattern?.trim();
      } catch {
        return false;
      }
    },
    []
  );

  const sanitizeSavedGridState = useCallback(
    (targetTableType: TableType, gridState: GridState): GridState => {
      if (hasPersistedSearchPattern(targetTableType)) {
        const savedPageSize = gridState.pagination?.pageSize;
        if (
          savedPageSize === undefined ||
          ALLOWED_PAGE_SIZES.has(savedPageSize)
        ) {
          return gridState;
        }

        const normalizedState: GridState = {
          ...gridState,
          pagination: {
            ...gridState.pagination,
            pageSize: 25,
          },
        };

        try {
          sessionStorage.setItem(
            `grid_state_${targetTableType}`,
            JSON.stringify(normalizedState)
          );
        } catch {
          // ignore
        }

        return normalizedState;
      }

      const advancedFilterModel = gridState.filter?.advancedFilterModel;
      const savedPageSize = gridState.pagination?.pageSize;
      const normalizedPageSize =
        savedPageSize === undefined || ALLOWED_PAGE_SIZES.has(savedPageSize)
          ? savedPageSize
          : 25;

      if (advancedFilterModel == null && normalizedPageSize === savedPageSize) {
        return gridState;
      }

      const sanitizedState: GridState = {
        ...gridState,
        pagination:
          normalizedPageSize === savedPageSize
            ? gridState.pagination
            : {
                ...gridState.pagination,
                pageSize: normalizedPageSize,
              },
        filter: {
          ...gridState.filter,
          advancedFilterModel: undefined,
        },
      };

      try {
        sessionStorage.setItem(
          `grid_state_${targetTableType}`,
          JSON.stringify(sanitizedState)
        );
      } catch {
        // ignore
      }

      return sanitizedState;
    },
    [hasPersistedSearchPattern]
  );

  const readSavedGridState = useCallback(
    (targetTableType: TableType) => {
      const stateFromHelper =
        gridStateManager.loadSavedStateForInit(targetTableType);

      return stateFromHelper
        ? sanitizeSavedGridState(targetTableType, stateFromHelper)
        : undefined;
    },
    [sanitizeSavedGridState]
  );

  const hasSavedGridState = useCallback((targetTableType: TableType) => {
    return gridStateManager.hasSavedState(targetTableType);
  }, []);

  const applySavedPaginationState = useCallback(
    (
      api: GridApi,
      targetTableType: TableType,
      savedState?: GridState,
      fallbackPageSize = 25
    ) => {
      if (!api || api.isDestroyed()) {
        return;
      }

      const savedPaginationEnabled =
        gridStateManager.loadSavedPaginationEnabledState(targetTableType);
      const paginationEnabled = savedPaginationEnabled ?? true;

      api.setGridOption('pagination', paginationEnabled);

      if (paginationEnabled) {
        api.setGridOption(
          'paginationPageSize',
          savedState?.pagination?.pageSize ?? fallbackPageSize
        );
      }
    },
    []
  );

  const syncPaginationUiState = useCallback((api: GridApi) => {
    if (!api || api.isDestroyed()) {
      return;
    }

    const isPaginationEnabled = api.getGridOption('pagination');
    const nextPageSize = isPaginationEnabled ? api.paginationGetPageSize() : -1;

    currentPageSizeRef.current = nextPageSize;
  }, []);

  const initialGridState = useMemo(() => {
    return readSavedGridState(tableType);
  }, [readSavedGridState, tableType]);

  const handleStateUpdated = useCallback(() => {
    if (!gridApi || gridApi.isDestroyed()) {
      return;
    }

    if (isApplyingTabStateRef.current) {
      return;
    }

    gridStateManager.autoSaveGridState(gridApi, tableType);
  }, [gridApi, tableType]);

  const clearScheduledGridStateApply = useCallback(() => {
    if (applyGridStateFrameRef.current !== null) {
      cancelAnimationFrame(applyGridStateFrameRef.current);
      applyGridStateFrameRef.current = null;
    }
    isApplyingTabStateRef.current = false;
  }, []);

  const scheduleGridStateApply = useCallback(
    (apply: () => void) => {
      clearScheduledGridStateApply();
      isApplyingTabStateRef.current = true;
      applyGridStateFrameRef.current = requestAnimationFrame(() => {
        applyGridStateFrameRef.current = null;
        try {
          apply();
        } finally {
          isApplyingTabStateRef.current = false;
        }
      });
    },
    [clearScheduledGridStateApply]
  );

  useEffect(() => {
    if (!gridApi || gridApi.isDestroyed()) {
      return;
    }

    if (previousActiveTabRef.current === null) {
      previousActiveTabRef.current = tableType;
      scheduleGridStateApply(() => {
        if (gridApi && !gridApi.isDestroyed()) {
          applySavedPaginationState(
            gridApi,
            tableType,
            initialGridState,
            itemsPerPage
          );
          syncPaginationUiState(gridApi);
        }
      });
      return clearScheduledGridStateApply;
    }

    if (previousActiveTabRef.current !== tableType) {
      previousActiveTabRef.current = tableType;

      gridApi.clearFocusedCell();
      gridApi.clearCellSelection();

      const savedState = readSavedGridState(tableType);

      if (savedState) {
        scheduleGridStateApply(() => {
          if (gridApi && !gridApi.isDestroyed()) {
            gridApi.setState(savedState);
            applySavedPaginationState(
              gridApi,
              tableType,
              savedState,
              itemsPerPage
            );
            syncPaginationUiState(gridApi);
            gridApi.clearFocusedCell();
            gridApi.clearCellSelection();
          }
        });
      } else {
        scheduleGridStateApply(() => {
          if (gridApi && !gridApi.isDestroyed()) {
            applySavedPaginationState(
              gridApi,
              tableType,
              undefined,
              itemsPerPage
            );
            syncPaginationUiState(gridApi);
            gridApi.autoSizeAllColumns();
            gridApi.clearFocusedCell();
            gridApi.clearCellSelection();
          }
        });
      }
      return clearScheduledGridStateApply;
    }
  }, [
    applySavedPaginationState,
    clearScheduledGridStateApply,
    gridApi,
    initialGridState,
    itemsPerPage,
    readSavedGridState,
    scheduleGridStateApply,
    syncPaginationUiState,
    tableType,
  ]);

  const handlePageSizeChange = useCallback(
    (newPageSize: number) => {
      currentPageSizeRef.current = newPageSize;

      if (!gridApi || gridApi.isDestroyed()) {
        return;
      }

      gridStateManager.savePaginationEnabledState(gridApi, tableType);
    },
    [gridApi, tableType]
  );

  useEffect(() => {
    if (!gridApi || gridApi.isDestroyed()) {
      return;
    }

    const syncCurrentPageSize = () => {
      syncPaginationUiState(gridApi);
    };

    syncCurrentPageSize();
    gridApi.addEventListener('paginationChanged', syncCurrentPageSize);

    return () => {
      if (!gridApi.isDestroyed()) {
        gridApi.removeEventListener('paginationChanged', syncCurrentPageSize);
      }
    };
  }, [gridApi, syncPaginationUiState]);

  return {
    applySavedPaginationState,
    handlePageSizeChange,
    handleStateUpdated,
    hasSavedGridState,
    initialGridState,
    readSavedGridState,
    syncPaginationUiState,
  };
};
