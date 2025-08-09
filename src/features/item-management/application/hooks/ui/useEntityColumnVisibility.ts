import { useState, useMemo, useEffect, useCallback } from 'react';
import { EntityType, EntityConfig } from '../collections/useEntityManager';

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

export const useEntityColumnVisibility = ({
  entityType,
  currentConfig,
}: UseEntityColumnVisibilityProps) => {
  // Get column configs for current entity type
  const columnConfigs = useMemo(() => {
    if (entityType === 'items') return [];
    return ENTITY_COLUMN_CONFIGS[entityType] || [];
  }, [entityType]);

  // Initialize visibility state from column configs
  const [visibilityState, setVisibilityState] = useState<
    Record<string, boolean>
  >(() => {
    const initialState: Record<string, boolean> = {};
    columnConfigs.forEach(config => {
      initialState[config.key] = config.defaultVisible;
    });
    return initialState;
  });

  // Update visibility state when entity type changes
  useEffect(() => {
    if (columnConfigs.length > 0) {
      const newState: Record<string, boolean> = {};
      columnConfigs.forEach(config => {
        // Use default for new entity type, don't preserve old state
        newState[config.key] = config.defaultVisible;
      });
      setVisibilityState(newState);
    }
  }, [entityType, columnConfigs]);

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

  const handleColumnToggle = (columnKey: string, visible: boolean) => {
    setVisibilityState(prev => ({
      ...prev,
      [columnKey]: visible,
    }));
  };

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
  };
};
