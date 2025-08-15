import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { GridApi } from 'ag-grid-community';
import {
  useColumnVisibilityPreference,
  useColumnPinningPreference,
  useColumnOrderingPreference,
} from '@/hooks/queries/useUserPreferences';

interface ColumnVisibilityConfig {
  key: string;
  label: string;
  defaultVisible: boolean;
}

interface ColumnOption {
  key: string;
  label: string;
  visible: boolean;
}

const COLUMN_CONFIGS: ColumnVisibilityConfig[] = [
  { key: 'name', label: 'Nama Item', defaultVisible: true },
  { key: 'manufacturer', label: 'Produsen', defaultVisible: true },
  { key: 'code', label: 'Kode', defaultVisible: true },
  { key: 'barcode', label: 'Barcode', defaultVisible: true },
  { key: 'category.name', label: 'Kategori', defaultVisible: true },
  { key: 'type.name', label: 'Jenis', defaultVisible: true },
  { key: 'unit.name', label: 'Kemasan', defaultVisible: true },
  { key: 'dosage.name', label: 'Sediaan', defaultVisible: true },
  {
    key: 'package_conversions',
    label: 'Kemasan Turunan',
    defaultVisible: true,
  },
  { key: 'base_price', label: 'Harga Pokok', defaultVisible: true },
  { key: 'sell_price', label: 'Harga Jual', defaultVisible: true },
  { key: 'stock', label: 'Stok', defaultVisible: true },
];

const getDefaultVisibility = (): Record<string, boolean> => {
  const defaultState: Record<string, boolean> = {};
  COLUMN_CONFIGS.forEach(config => {
    defaultState[config.key] = config.defaultVisible;
  });
  return defaultState;
};

interface UseColumnVisibilityProps {
  gridApi?: GridApi | null;
}

export const useColumnVisibility = (props: UseColumnVisibilityProps = {}) => {
  const { gridApi } = props;
  // Use database-backed user preferences
  const {
    columnVisibility: dbColumnVisibility,
    setColumnVisibility: setDbColumnVisibility,
    isLoading: isDbLoading,
    error: dbError,
  } = useColumnVisibilityPreference();

  // Column pinning preferences
  const {
    columnPinning: dbColumnPinning,
    setColumnPinning: setDbColumnPinning,
    isLoading: isPinningLoading,
    error: pinningError,
  } = useColumnPinningPreference();

  // Column ordering preferences
  const {
    columnOrder: dbColumnOrder,
    setColumnOrder: setDbColumnOrder,
    isLoading: isOrderingLoading,
    error: orderingError,
  } = useColumnOrderingPreference();

  // Local state for optimistic updates
  const [optimisticState, setOptimisticState] = useState<Record<
    string,
    boolean
  > | null>(null);
  const [optimisticPinningState, setOptimisticPinningState] = useState<Record<
    string,
    'left' | 'right' | null
  > | null>(null);
  const [optimisticOrderingState, setOptimisticOrderingState] = useState<
    string[] | null
  >(null);

  // Use optimistic state during saves, otherwise use DB state or defaults
  const visibilityState = useMemo(() => {
    if (optimisticState) {
      return optimisticState;
    }

    if (dbColumnVisibility) {
      // Merge DB state with defaults (for new columns)
      const mergedState: Record<string, boolean> = {};
      COLUMN_CONFIGS.forEach(config => {
        mergedState[config.key] =
          dbColumnVisibility[config.key] ?? config.defaultVisible;
      });
      return mergedState;
    }

    return getDefaultVisibility();
  }, [dbColumnVisibility, optimisticState]);

  // Column pinning state
  const pinningState = useMemo(() => {
    if (optimisticPinningState) {
      return optimisticPinningState;
    }
    return dbColumnPinning || {};
  }, [dbColumnPinning, optimisticPinningState]);

  // Column ordering state - get default order from COLUMN_CONFIGS
  const getDefaultOrder = (): string[] => {
    return COLUMN_CONFIGS.map(config => config.key);
  };

  const orderingState = useMemo(() => {
    if (optimisticOrderingState) {
      return optimisticOrderingState;
    }
    return dbColumnOrder || getDefaultOrder();
  }, [dbColumnOrder, optimisticOrderingState]);

  // Track if initial sync has been done to prevent loops
  const initialSyncDone = useRef(false);

  // Restore column state to AG Grid when grid API is available and state is loaded
  useEffect(() => {
    if (gridApi && !gridApi.isDestroyed() && !isDbLoading && !initialSyncDone.current) {
      // Apply visibility state to AG Grid
      const columnsToHide: string[] = [];
      const columnsToShow: string[] = [];

      Object.entries(visibilityState).forEach(([columnKey, visible]) => {
        if (visible) {
          columnsToShow.push(columnKey);
        } else {
          columnsToHide.push(columnKey);
        }
      });

      try {
        // Apply visibility state
        if (columnsToHide.length > 0) {
          gridApi.setColumnsVisible(columnsToHide, false);
        }
        if (columnsToShow.length > 0) {
          gridApi.setColumnsVisible(columnsToShow, true);
        }

        initialSyncDone.current = true;
      } catch (error) {
        console.error('Failed to restore column state to AG Grid:', error);
      }
    }
  }, [gridApi, visibilityState, isDbLoading]);

  // Reset sync flag when grid API changes
  useEffect(() => {
    initialSyncDone.current = false;
  }, [gridApi]);

  const columnOptions: ColumnOption[] = useMemo(() => {
    // Create a map of all column configs for quick lookup
    const configMap: Record<string, ColumnVisibilityConfig> = {};
    COLUMN_CONFIGS.forEach(config => {
      configMap[config.key] = config;
    });

    // Use ordering state to determine column order
    const orderedKeys = orderingState;

    // Create ordered column options
    const orderedOptions: ColumnOption[] = [];

    // Add columns in the specified order
    orderedKeys.forEach(key => {
      const config = configMap[key];
      if (config) {
        orderedOptions.push({
          key: config.key,
          label: config.label,
          visible: visibilityState[config.key] ?? config.defaultVisible,
        });
      }
    });

    // Add any columns that aren't in the ordering (fallback)
    COLUMN_CONFIGS.forEach(config => {
      if (!orderedKeys.includes(config.key)) {
        orderedOptions.push({
          key: config.key,
          label: config.label,
          visible: visibilityState[config.key] ?? config.defaultVisible,
        });
      }
    });

    return orderedOptions;
  }, [visibilityState, orderingState]);

  const handleColumnToggle = useCallback(
    async (columnKey: string, visible: boolean) => {
      // Create new visibility state
      const newVisibilityState = {
        ...visibilityState,
        [columnKey]: visible,
      };

      // Set optimistic state for immediate UI update
      setOptimisticState(newVisibilityState);

      // Sync with AG Grid Column API immediately
      if (gridApi && !gridApi.isDestroyed()) {
        try {
          gridApi.setColumnsVisible([columnKey], visible);
        } catch (error) {
          console.error('Failed to sync column visibility with AG Grid:', error);
        }
      }

      try {
        // Save to database
        await setDbColumnVisibility(newVisibilityState);

        // Clear optimistic state after successful save
        setOptimisticState(null);
      } catch (error) {
        console.error('Failed to save column visibility to database:', error);

        // Revert optimistic state on error
        setOptimisticState(null);
        
        // Revert AG Grid state too
        if (gridApi && !gridApi.isDestroyed()) {
          try {
            gridApi.setColumnsVisible([columnKey], !visible);
          } catch (revertError) {
            console.error('Failed to revert AG Grid column visibility:', revertError);
          }
        }
      }
    },
    [visibilityState, setDbColumnVisibility, gridApi]
  );

  const visibleColumns = useMemo(() => {
    return Object.entries(visibilityState)
      .filter(([, visible]) => visible)
      .map(([key]) => key);
  }, [visibilityState]);

  const handleColumnPinning = useCallback(
    async (columnKey: string, pinned: 'left' | 'right' | null) => {
      // Create new pinning state
      const newPinningState = {
        ...pinningState,
        [columnKey]: pinned,
      };

      // Set optimistic state for immediate UI update
      setOptimisticPinningState(newPinningState);

      try {
        // Save to database
        await setDbColumnPinning(newPinningState);

        // Clear optimistic state after successful save
        setOptimisticPinningState(null);
      } catch (error) {
        console.error('Failed to save column pinning to database:', error);

        // Revert optimistic state on error
        setOptimisticPinningState(null);
      }
    },
    [pinningState, setDbColumnPinning]
  );

  const isColumnVisible = (columnKey: string): boolean => {
    return visibilityState[columnKey] ?? true;
  };

  const getColumnPinning = (columnKey: string): 'left' | 'right' | null => {
    return pinningState[columnKey] ?? null;
  };

  const handleColumnOrdering = useCallback(
    async (newOrder: string[]) => {
      // Set optimistic state for immediate UI update
      setOptimisticOrderingState(newOrder);

      try {
        // Save to database
        await setDbColumnOrder(newOrder);

        // Clear optimistic state after successful save
        setOptimisticOrderingState(null);
      } catch (error) {
        console.error('Failed to save column order to database:', error);

        // Revert optimistic state on error
        setOptimisticOrderingState(null);
      }
    },
    [setDbColumnOrder]
  );

  // Utility function to apply complete column state to AG Grid
  const applyColumnStateToGrid = useCallback(() => {
    if (!gridApi || gridApi.isDestroyed()) return;

    try {
      // Apply visibility state
      const columnsToHide: string[] = [];
      const columnsToShow: string[] = [];

      Object.entries(visibilityState).forEach(([columnKey, visible]) => {
        if (visible) {
          columnsToShow.push(columnKey);
        } else {
          columnsToHide.push(columnKey);
        }
      });

      // Apply visibility in batches for better performance
      if (columnsToHide.length > 0) {
        gridApi.setColumnsVisible(columnsToHide, false);
      }
      if (columnsToShow.length > 0) {
        gridApi.setColumnsVisible(columnsToShow, true);
      }

      // Trigger autosize for visible columns
      gridApi.autoSizeAllColumns();
    } catch (error) {
      console.error('Failed to apply column state to AG Grid:', error);
    }
  }, [gridApi, visibilityState]);

  // Handle column visibility changes from AG Grid (reverse sync)
  const handleColumnVisibilityChangedFromGrid = useCallback(async () => {
    if (!gridApi || gridApi.isDestroyed()) return;

    try {
      // Get current visibility state from AG Grid
      const allColumns = gridApi.getAllGridColumns();
      const newVisibilityState: Record<string, boolean> = { ...visibilityState };
      let hasChanges = false;

      allColumns.forEach(column => {
        const colId = column.getColId();
        const isVisible = column.isVisible();
        
        // Only update if this is a column we track and visibility changed
        if (Object.prototype.hasOwnProperty.call(newVisibilityState, colId) && newVisibilityState[colId] !== isVisible) {
          newVisibilityState[colId] = isVisible;
          hasChanges = true;
        }
      });

      // Only update if there are actual changes
      if (hasChanges) {
        // Set optimistic state for immediate UI update
        setOptimisticState(newVisibilityState);

        try {
          // Save to database
          await setDbColumnVisibility(newVisibilityState);
          
          // Clear optimistic state after successful save
          setOptimisticState(null);
        } catch (error) {
          console.error('Failed to save column visibility from grid changes:', error);
          
          // Revert optimistic state on error
          setOptimisticState(null);
        }
      }
    } catch (error) {
      console.error('Failed to sync column visibility from AG Grid:', error);
    }
  }, [gridApi, visibilityState, setDbColumnVisibility]);

  return {
    columnOptions,
    visibleColumns,
    isColumnVisible,
    handleColumnToggle,
    pinningState,
    getColumnPinning,
    handleColumnPinning,
    orderingState,
    handleColumnOrdering,
    applyColumnStateToGrid, // New utility function
    handleColumnVisibilityChangedFromGrid, // New reverse sync function
    isLoading: isDbLoading || isPinningLoading || isOrderingLoading,
    error: dbError || pinningError || orderingError,
  };
};
