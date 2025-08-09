import { useState, useMemo } from 'react';

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
  {
    key: 'package_conversions',
    label: 'Kemasan Turunan',
    defaultVisible: true,
  },
  { key: 'base_price', label: 'Harga Pokok', defaultVisible: true },
  { key: 'sell_price', label: 'Harga Jual', defaultVisible: true },
  { key: 'stock', label: 'Stok', defaultVisible: true },
];

export const useColumnVisibility = () => {
  // Initialize visibility state from column configs
  const [visibilityState, setVisibilityState] = useState<
    Record<string, boolean>
  >(() => {
    const initialState: Record<string, boolean> = {};
    COLUMN_CONFIGS.forEach(config => {
      initialState[config.key] = config.defaultVisible;
    });
    return initialState;
  });

  const columnOptions: ColumnOption[] = useMemo(() => {
    return COLUMN_CONFIGS.map(config => ({
      key: config.key,
      label: config.label,
      visible: visibilityState[config.key] ?? config.defaultVisible,
    }));
  }, [visibilityState]);

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

  const isColumnVisible = (columnKey: string): boolean => {
    return visibilityState[columnKey] ?? true;
  };

  return {
    columnOptions,
    visibleColumns,
    isColumnVisible,
    handleColumnToggle,
  };
};
