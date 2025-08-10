import { useState, useMemo, useCallback } from 'react';
import { EntityType, EntityConfig } from '../collections/useEntityManager';
import { useEntityColumnVisibilityPreference, type UserPreferenceEntityType } from '@/hooks/queries/useUserPreferences';

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
}

const getDefaultVisibility = (columnConfigs: ColumnVisibilityConfig[]): Record<string, boolean> => {
  const defaultState: Record<string, boolean> = {};
  columnConfigs.forEach(config => {
    defaultState[config.key] = config.defaultVisible;
  });
  return defaultState;
};

export const useEntityColumnVisibility = ({
  entityType,
  currentConfig,
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
  } = useEntityColumnVisibilityPreference(entityType as UserPreferenceEntityType);

  // Local state for optimistic updates
  const [optimisticState, setOptimisticState] = useState<Record<string, boolean> | null>(null);

  // Use optimistic state during saves, otherwise use DB state or defaults
  const visibilityState = useMemo(() => {
    if (optimisticState) {
      return optimisticState;
    }

    if (dbColumnVisibility) {
      // Merge DB state with defaults (for new columns)
      const mergedState: Record<string, boolean> = {};
      columnConfigs.forEach(config => {
        mergedState[config.key] = dbColumnVisibility[config.key] ?? config.defaultVisible;
      });
      return mergedState;
    }

    return getDefaultVisibility(columnConfigs);
  }, [dbColumnVisibility, optimisticState, columnConfigs]);

  const columnOptions: ColumnOption[] = useMemo(() => {
    return columnConfigs.map(config => {
      // Use dynamic labels from currentConfig if available
      let label = config.label;
      if (config.key === 'name' && currentConfig?.nameColumnHeader) {
        label = currentConfig.nameColumnHeader;
      }

      return {
        key: config.key,
        label,
        visible: visibilityState[config.key] ?? config.defaultVisible,
      };
    });
  }, [columnConfigs, visibilityState, currentConfig]);

  const handleColumnToggle = useCallback(
    async (columnKey: string, visible: boolean) => {
      // Create new visibility state
      const newVisibilityState = {
        ...visibilityState,
        [columnKey]: visible,
      };
      
      // Set optimistic state for immediate UI update
      setOptimisticState(newVisibilityState);
      
      try {
        // Save to database
        await setDbColumnVisibility(newVisibilityState);
        
        // Clear optimistic state after successful save
        setOptimisticState(null);
      } catch (error) {
        console.error('Failed to save entity column visibility to database:', error);
        
        // Revert optimistic state on error
        setOptimisticState(null);
      }
    },
    [visibilityState, setDbColumnVisibility]
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
    isLoading: isDbLoading,
    error: dbError,
  };
};
