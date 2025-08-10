import { useState, useMemo, useCallback } from 'react';
import { useColumnVisibilityPreference } from '@/hooks/queries/useUserPreferences';

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

export const useColumnVisibility = () => {
  // Use database-backed user preferences
  const {
    columnVisibility: dbColumnVisibility,
    setColumnVisibility: setDbColumnVisibility,
    isLoading: isDbLoading,
    error: dbError,
  } = useColumnVisibilityPreference();

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
      COLUMN_CONFIGS.forEach(config => {
        mergedState[config.key] = dbColumnVisibility[config.key] ?? config.defaultVisible;
      });
      return mergedState;
    }

    return getDefaultVisibility();
  }, [dbColumnVisibility, optimisticState]);

  const columnOptions: ColumnOption[] = useMemo(() => {
    return COLUMN_CONFIGS.map(config => ({
      key: config.key,
      label: config.label,
      visible: visibilityState[config.key] ?? config.defaultVisible,
    }));
  }, [visibilityState]);

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
        console.error('Failed to save column visibility to database:', error);
        
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

  const isColumnVisible = (columnKey: string): boolean => {
    return visibilityState[columnKey] ?? true;
  };

  return {
    columnOptions,
    visibleColumns,
    isColumnVisible,
    handleColumnToggle,
    isLoading: isDbLoading,
    error: dbError,
  };
};
