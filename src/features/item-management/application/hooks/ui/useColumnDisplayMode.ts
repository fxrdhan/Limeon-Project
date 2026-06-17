import { useState, useCallback } from 'react';

// Column display mode type
export type ColumnDisplayMode = 'name' | 'code';

const DISPLAY_MODE_STORAGE_KEY = 'pharmasys_column_display_modes';
const REFERENCE_COLUMN_IDS = [
  'manufacturer.name',
  'category.name',
  'type.name',
  'package.name',
  'dosage.name',
] as const;

// Default display modes for reference columns
const getDefaultDisplayModes = (): Record<string, ColumnDisplayMode> => {
  const displayModes: Record<string, ColumnDisplayMode> = {};
  for (const columnId of REFERENCE_COLUMN_IDS) {
    displayModes[columnId] = 'name';
  }
  return displayModes;
};

const isColumnDisplayMode = (value: unknown): value is ColumnDisplayMode =>
  value === 'name' || value === 'code';

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const normalizeColumnDisplayModes = (
  value: unknown
): Record<string, ColumnDisplayMode> => {
  const displayModes = getDefaultDisplayModes();
  if (!isObjectRecord(value)) {
    return displayModes;
  }

  for (const columnId of REFERENCE_COLUMN_IDS) {
    const mode = value[columnId];
    if (isColumnDisplayMode(mode)) {
      displayModes[columnId] = mode;
    }
  }

  return displayModes;
};

// Load display modes from localStorage
const loadDisplayModes = (): Record<string, ColumnDisplayMode> => {
  try {
    const saved = localStorage.getItem(DISPLAY_MODE_STORAGE_KEY);
    if (saved) {
      return normalizeColumnDisplayModes(JSON.parse(saved));
    }
  } catch {
    // Silently fail
  }
  return getDefaultDisplayModes();
};

// Save display modes to localStorage
const saveDisplayModes = (modes: Record<string, ColumnDisplayMode>) => {
  try {
    localStorage.setItem(
      DISPLAY_MODE_STORAGE_KEY,
      JSON.stringify(normalizeColumnDisplayModes(modes))
    );
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
    return REFERENCE_COLUMN_IDS.some(columnId => columnId === colId);
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
