import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { GridApi } from 'ag-grid-community';
import { EntityType, EntityConfig } from '../collections/useEntityManager';
import {
  useEntityColumnVisibilityPreference,
  useEntityColumnPinningPreference,
  useEntityColumnOrderingPreference,
  type UserPreferenceEntityType,
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

// Define columns for each entity type
const ENTITY_COLUMN_CONFIGS: Record<EntityType, ColumnVisibilityConfig[]> = {
  categories: [
    { key: 'code', label: 'Kode', defaultVisible: true },
    { key: 'name', label: 'Nama Kategori', defaultVisible: true },
    { key: 'description', label: 'Deskripsi', defaultVisible: true },
  ],
  types: [
    { key: 'code', label: 'Kode', defaultVisible: true },
    { key: 'name', label: 'Nama Jenis', defaultVisible: true },
    { key: 'description', label: 'Deskripsi', defaultVisible: true },
  ],
  packages: [
    { key: 'code', label: 'Kode', defaultVisible: true },
    { key: 'name', label: 'Nama Kemasan', defaultVisible: true },
    { key: 'nci_code', label: 'Kode NCI', defaultVisible: true },
    { key: 'description', label: 'Deskripsi', defaultVisible: true },
  ],
  dosages: [
    { key: 'code', label: 'Kode', defaultVisible: true },
    { key: 'name', label: 'Nama Sediaan', defaultVisible: true },
    { key: 'nci_code', label: 'Kode NCI', defaultVisible: true },
    { key: 'description', label: 'Deskripsi', defaultVisible: true },
  ],
  manufacturers: [
    { key: 'code', label: 'Kode', defaultVisible: true },
    { key: 'name', label: 'Nama Produsen', defaultVisible: true },
    { key: 'address', label: 'Alamat', defaultVisible: true },
  ],
  units: [
    { key: 'code', label: 'Kode', defaultVisible: true },
    { key: 'name', label: 'Nama Satuan', defaultVisible: true },
    { key: 'description', label: 'Deskripsi', defaultVisible: true },
  ],
  items: [], // Not used for items tab
};

interface UseEntityColumnVisibilityProps {
  entityType: EntityType;
  currentConfig?: EntityConfig | null;
  gridApi?: GridApi | null;
}

const getDefaultVisibility = (
  columnConfigs: ColumnVisibilityConfig[]
): Record<string, boolean> => {
  const defaultState: Record<string, boolean> = {};
  columnConfigs.forEach(config => {
    defaultState[config.key] = config.defaultVisible;
  });
  return defaultState;
};

export const useEntityColumnVisibility = ({
  entityType,
  currentConfig,
  gridApi,
}: UseEntityColumnVisibilityProps) => {
  // Get column configs for current entity type
  const columnConfigs = useMemo(() => {
    if (entityType === 'items') return [];
    return ENTITY_COLUMN_CONFIGS[entityType] || [];
  }, [entityType]);

  // Use database-backed preferences (skip for items as it has its own hook)
  const {
    columnVisibility: dbColumnVisibility,
    setColumnVisibility: setDbColumnVisibility,
    isLoading: isDbLoading,
    error: dbError,
  } = useEntityColumnVisibilityPreference(
    entityType as UserPreferenceEntityType
  );

  // Column pinning preferences
  const {
    columnPinning: dbColumnPinning,
    setColumnPinning: setDbColumnPinning,
    isLoading: isPinningLoading,
    error: pinningError,
  } = useEntityColumnPinningPreference(entityType as UserPreferenceEntityType);

  // Column ordering preferences
  const {
    columnOrder: dbColumnOrder,
    setColumnOrder: setDbColumnOrder,
    isLoading: isOrderingLoading,
    error: orderingError,
  } = useEntityColumnOrderingPreference(entityType as UserPreferenceEntityType);

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

  // Clear optimistic states when entity type changes
  useEffect(() => {
    setOptimisticState(null);
    setOptimisticPinningState(null);
    setOptimisticOrderingState(null);
  }, [entityType]);

  // Use optimistic state during saves, otherwise use DB state or defaults
  const visibilityState = useMemo(() => {
    if (optimisticState) {
      return optimisticState;
    }

    if (dbColumnVisibility) {
      // Merge DB state with defaults (for new columns)
      const mergedState: Record<string, boolean> = {};
      columnConfigs.forEach(config => {
        mergedState[config.key] =
          dbColumnVisibility[config.key] ?? config.defaultVisible;
      });
      return mergedState;
    }

    return getDefaultVisibility(columnConfigs);
  }, [dbColumnVisibility, optimisticState, columnConfigs]);

  // Column pinning state
  const pinningState = useMemo(() => {
    if (optimisticPinningState) {
      return optimisticPinningState;
    }
    return dbColumnPinning || {};
  }, [dbColumnPinning, optimisticPinningState]);

  // Column ordering state - pure database-driven, no hardcoded defaults
  const orderingState = useMemo(() => {
    if (optimisticOrderingState) {
      return optimisticOrderingState;
    }
    // Return database order as-is, no fallback to hardcoded defaults
    // If no order saved, return empty array (let component handle)
    return dbColumnOrder || [];
  }, [dbColumnOrder, optimisticOrderingState]);

  // Track if initial sync has been done to prevent loops
  const initialSyncDone = useRef(false);

  // Restore column state to AG Grid when grid API is available and state is loaded
  useEffect(() => {
    if (
      gridApi &&
      !gridApi.isDestroyed() &&
      !isDbLoading &&
      !initialSyncDone.current
    ) {
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
        console.error('Failed to restore entity column state to AG Grid:', error);
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
    columnConfigs.forEach(config => {
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
        // Use dynamic labels from currentConfig if available
        let label = config.label;
        if (config.key === 'name' && currentConfig?.nameColumnHeader) {
          label = currentConfig.nameColumnHeader;
        }

        orderedOptions.push({
          key: config.key,
          label,
          visible: visibilityState[config.key] ?? config.defaultVisible,
        });
      }
    });

    // Add any columns that aren't in the ordering (fallback)
    columnConfigs.forEach(config => {
      if (!orderedKeys.includes(config.key)) {
        let label = config.label;
        if (config.key === 'name' && currentConfig?.nameColumnHeader) {
          label = currentConfig.nameColumnHeader;
        }

        orderedOptions.push({
          key: config.key,
          label,
          visible: visibilityState[config.key] ?? config.defaultVisible,
        });
      }
    });

    return orderedOptions;
  }, [columnConfigs, visibilityState, currentConfig, orderingState]);

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
          console.error(
            'Failed to sync entity column visibility with AG Grid:',
            error
          );
        }
      }

      try {
        // Save to database
        await setDbColumnVisibility(newVisibilityState);

        // Clear optimistic state after successful save
        setOptimisticState(null);
      } catch (error) {
        console.error(
          'Failed to save entity column visibility to database:',
          error
        );

        // Revert optimistic state on error
        setOptimisticState(null);

        // Revert AG Grid state too
        if (gridApi && !gridApi.isDestroyed()) {
          try {
            gridApi.setColumnsVisible([columnKey], !visible);
          } catch (revertError) {
            console.error(
              'Failed to revert AG Grid entity column visibility:',
              revertError
            );
          }
        }
      }
    },
    [visibilityState, setDbColumnVisibility, gridApi]
  );

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
        console.error(
          'Failed to save entity column pinning to database:',
          error
        );

        // Revert optimistic state on error
        setOptimisticPinningState(null);
      }
    },
    [pinningState, setDbColumnPinning]
  );

  const visibleColumns = useMemo(() => {
    return Object.entries(visibilityState)
      .filter(([, visible]) => visible)
      .map(([key]) => key);
  }, [visibilityState]);

  const isColumnVisible = useCallback(
    (columnKey: string): boolean => {
      return visibilityState[columnKey] ?? true;
    },
    [visibilityState]
  );

  const getColumnPinning = useCallback(
    (columnKey: string): 'left' | 'right' | null => {
      return pinningState[columnKey] ?? null;
    },
    [pinningState]
  );

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
        console.error('Failed to save entity column order to database:', error);

        // Revert optimistic state on error
        setOptimisticOrderingState(null);
      }
    },
    [setDbColumnOrder]
  );

  // Handle column visibility changes from AG Grid (reverse sync)
  const handleColumnVisibilityChangedFromGrid = useCallback(async () => {
    if (!gridApi || gridApi.isDestroyed()) return;

    try {
      // Get current visibility state from AG Grid
      const allColumns = gridApi.getAllGridColumns();
      const newVisibilityState: Record<string, boolean> = {
        ...visibilityState,
      };
      let hasChanges = false;

      allColumns.forEach(column => {
        const colId = column.getColId();
        const isVisible = column.isVisible();

        // Only update if this is a column we track and visibility changed
        if (
          Object.prototype.hasOwnProperty.call(newVisibilityState, colId) &&
          newVisibilityState[colId] !== isVisible
        ) {
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
          console.error(
            'Failed to save entity column visibility from grid changes:',
            error
          );

          // Revert optimistic state on error
          setOptimisticState(null);
        }
      }
    } catch (error) {
      console.error('Failed to sync entity column visibility from AG Grid:', error);
    }
  }, [gridApi, visibilityState, setDbColumnVisibility]);

  // Get auto-size columns (only visible ones)
  const autoSizeColumns = useMemo(() => {
    const baseColumns = ['code', 'name'];
    const conditionalColumns = [];

    if (currentConfig?.hasNciCode && isColumnVisible('nci_code')) {
      conditionalColumns.push('nci_code');
    }

    return baseColumns
      .concat(conditionalColumns)
      .filter(col => isColumnVisible(col));
  }, [currentConfig, isColumnVisible]);

  return {
    columnOptions,
    visibleColumns,
    isColumnVisible,
    handleColumnToggle,
    autoSizeColumns,
    pinningState,
    getColumnPinning,
    handleColumnPinning,
    orderingState,
    handleColumnOrdering,
    handleColumnVisibilityChangedFromGrid, // New reverse sync function
    isLoading: isDbLoading || isPinningLoading || isOrderingLoading,
    error: dbError || pinningError || orderingError,
  };
};
