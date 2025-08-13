import { useState, useMemo, useCallback } from 'react';
import { useColumnDisplayModePreference } from '@/hooks/queries/useUserPreferences';

// Column display mode type
export type ColumnDisplayMode = 'name' | 'code';

// Default display modes for reference columns
const getDefaultDisplayModes = (): Record<string, ColumnDisplayMode> => {
  return {
    manufacturer: 'name',
    'category.name': 'name',
    'type.name': 'name',
    'unit.name': 'name',
    'dosage.name': 'name',
  };
};

export const useColumnDisplayMode = () => {
  // Use database-backed user preferences
  const {
    columnDisplayModes: dbDisplayModes,
    setColumnDisplayModes: setDbDisplayModes,
    isLoading: isDbLoading,
    error: dbError,
  } = useColumnDisplayModePreference();

  // Local state for optimistic updates
  const [optimisticState, setOptimisticState] = useState<Record<
    string,
    ColumnDisplayMode
  > | null>(null);

  // Use optimistic state during saves, otherwise use DB state or defaults
  const displayModeState = useMemo(() => {
    if (optimisticState) {
      return optimisticState;
    }

    if (dbDisplayModes) {
      // Merge DB state with defaults (for new columns)
      const mergedState: Record<string, ColumnDisplayMode> = {};
      const defaultModes = getDefaultDisplayModes();
      
      Object.keys(defaultModes).forEach(key => {
        const dbValue = dbDisplayModes[key];
        // Validate DB value is either 'name' or 'code', fallback to default
        mergedState[key] = (dbValue === 'name' || dbValue === 'code') ? dbValue : defaultModes[key];
      });
      
      return mergedState;
    }

    return getDefaultDisplayModes();
  }, [dbDisplayModes, optimisticState]);

  // Helper to check if a column is a reference column
  const isReferenceColumn = useCallback((colId: string) => {
    return [
      'manufacturer',
      'category.name',
      'type.name',
      'unit.name',
      'dosage.name',
    ].includes(colId);
  }, []);

  // Toggle display mode for a single column
  const toggleColumnDisplayMode = useCallback(
    async (columnKey: string) => {
      if (!isReferenceColumn(columnKey)) {
        return;
      }

      // Create new display mode state
      const newDisplayModes: Record<string, ColumnDisplayMode> = {
        ...displayModeState,
        [columnKey]: displayModeState[columnKey] === 'name' ? 'code' : 'name',
      };

      // Set optimistic state for immediate UI update
      setOptimisticState(newDisplayModes);

      try {
        // Save to database
        await setDbDisplayModes(newDisplayModes);

        // Clear optimistic state after successful save
        setOptimisticState(null);
      } catch (error) {
        console.error('Failed to save column display mode to database:', error);

        // Revert optimistic state on error
        setOptimisticState(null);
      }
    },
    [displayModeState, setDbDisplayModes, isReferenceColumn]
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
    isLoading: isDbLoading,
    error: dbError,
  };
};