import { useState, useCallback } from 'react';

// Column display mode type
export type ColumnDisplayMode = 'name' | 'code';

// Default display modes for reference columns
const getDefaultDisplayModes = (): Record<string, ColumnDisplayMode> => {
  return {
    'manufacturer.name': 'name',
    'category.name': 'name',
    'type.name': 'name',
    'package.name': 'name',
    'dosage.name': 'name',
  };
};

export const useColumnDisplayMode = () => {
  // Simple client-side state management (no database sync)
  const [displayModeState, setDisplayModeState] = useState<
    Record<string, ColumnDisplayMode>
  >(getDefaultDisplayModes());

  // Helper to check if a column is a reference column
  const isReferenceColumn = useCallback((colId: string) => {
    return [
      'manufacturer.name',
      'category.name',
      'type.name',
      'package.name',
      'dosage.name',
    ].includes(colId);
  }, []);

  // Toggle display mode for a single column
  const toggleColumnDisplayMode = useCallback(
    (columnKey: string) => {
      if (!isReferenceColumn(columnKey)) {
        return;
      }

      // Update state immediately (client-side only)
      setDisplayModeState(prevState => ({
        ...prevState,
        [columnKey]: prevState[columnKey] === 'name' ? 'code' : 'name',
      }));
    },
    [isReferenceColumn]
  );

  // Get display mode for a specific column
  const getColumnDisplayMode = useCallback(
    (columnKey: string): ColumnDisplayMode => {
      return displayModeState[columnKey] || 'name';
    },
    [displayModeState]
  );

  return {
    displayModeState,
    isReferenceColumn,
    toggleColumnDisplayMode,
    getColumnDisplayMode,
    isLoading: false, // No loading since no database calls
    error: null, // No errors since no database calls
  };
};
