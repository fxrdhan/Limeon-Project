import { useState, useCallback } from 'react';

// Column display mode type
export type ColumnDisplayMode = 'name' | 'code';

const DISPLAY_MODE_STORAGE_KEY = 'pharmasys_column_display_modes';

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

// Load display modes from localStorage
const loadDisplayModes = (): Record<string, ColumnDisplayMode> => {
  try {
    const saved = localStorage.getItem(DISPLAY_MODE_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge with defaults in case new columns were added
      return { ...getDefaultDisplayModes(), ...parsed };
    }
  } catch {
    // Silently fail
  }
  return getDefaultDisplayModes();
};

// Save display modes to localStorage
const saveDisplayModes = (modes: Record<string, ColumnDisplayMode>) => {
  try {
    localStorage.setItem(DISPLAY_MODE_STORAGE_KEY, JSON.stringify(modes));
  } catch {
    // Silently fail
  }
};

export const useColumnDisplayMode = () => {
  // Client-side state management with localStorage persistence
  // Use lazy initializer to load from localStorage once
  const [displayModeState, setDisplayModeState] = useState<
    Record<string, ColumnDisplayMode>
  >(() => loadDisplayModes());

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

      // Update state and persist to localStorage
      setDisplayModeState(prevState => {
        const newMode: ColumnDisplayMode =
          prevState[columnKey] === 'name' ? 'code' : 'name';
        const newState: Record<string, ColumnDisplayMode> = {
          ...prevState,
          [columnKey]: newMode,
        };

        // Save to localStorage
        saveDisplayModes(newState);

        return newState;
      });
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
