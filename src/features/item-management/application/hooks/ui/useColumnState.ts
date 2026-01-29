import { useCallback, useRef, useMemo } from 'react';
import type {
  GridState,
  StateUpdatedEvent,
  GridPreDestroyedEvent,
  GridApi,
} from 'ag-grid-community';
import { EntityType } from '../collections/useEntityManager';

// Extended type to include items tab
type GridTableType = EntityType | 'items';

interface ColumnStateOptions {
  tableType: GridTableType;
  enabled?: boolean;
  gridApi?: GridApi | null;
}

interface ColumnVisibilityState {
  hiddenColIds: string[];
}

interface ColumnStateManager {
  initialState: Partial<GridState> | undefined;
  onStateUpdated: (event: StateUpdatedEvent) => void;
  onGridPreDestroyed: (event: GridPreDestroyedEvent) => void;
  clearState: () => void;
  getStorageKey: () => string;
}

const ENTITY_COLUMN_VISIBILITY_PREFIX = 'pharmasys_entity_column_visibility_';

// Load column visibility state from localStorage
const loadColumnVisibilityState = (
  storageKey: string
): ColumnVisibilityState | undefined => {
  try {
    const savedState = localStorage.getItem(storageKey);
    if (savedState) {
      const parsedState = JSON.parse(savedState) as ColumnVisibilityState;
      return parsedState;
    }
    return undefined;
  } catch {
    localStorage.removeItem(storageKey);
    return undefined;
  }
};

// Save column visibility state to localStorage
const saveColumnVisibilityState = (
  storageKey: string,
  state: ColumnVisibilityState
) => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // Silently fail - localStorage might be full or unavailable
  }
};

// Extract only column visibility from full grid state
const extractColumnVisibility = (
  gridState: GridState
): ColumnVisibilityState | undefined => {
  if (gridState.columnVisibility?.hiddenColIds) {
    return {
      hiddenColIds: gridState.columnVisibility.hiddenColIds,
    };
  }
  return undefined;
};

export const useColumnState = (
  options: ColumnStateOptions
): ColumnStateManager => {
  const { tableType, enabled = true } = options;
  const storageKey = `${ENTITY_COLUMN_VISIBILITY_PREFIX}${tableType}`;
  const lastSavedState = useRef<ColumnVisibilityState | undefined>(undefined);

  // 🚀 SYNCHRONOUS state loading - no filtering needed since field names are unique per table
  const initialState = useMemo(() => {
    if (!enabled) {
      return undefined;
    }

    const savedColumnVisibility = loadColumnVisibilityState(storageKey);

    if (savedColumnVisibility) {
      return {
        columnVisibility: savedColumnVisibility,
      };
    }

    return undefined;
  }, [enabled, storageKey]);

  // Save column visibility state
  const saveState = useCallback(
    (columnVisibility: ColumnVisibilityState) => {
      if (!enabled) return;

      saveColumnVisibilityState(storageKey, columnVisibility);
      lastSavedState.current = columnVisibility;
    },
    [storageKey, enabled]
  );

  // Handle state updates from AG Grid
  const onStateUpdated = useCallback(
    (event: StateUpdatedEvent) => {
      if (!enabled) return;

      const columnVisibility = extractColumnVisibility(event.state);

      if (columnVisibility) {
        // Debounce state saves to avoid excessive localStorage writes
        setTimeout(() => {
          saveState(columnVisibility);
        }, 300);
      }
    },
    [saveState, enabled]
  );

  // Handle grid destruction - final save
  const onGridPreDestroyed = useCallback(
    (event: GridPreDestroyedEvent) => {
      if (!enabled) return;

      const columnVisibility = extractColumnVisibility(event.state);

      if (columnVisibility) {
        saveState(columnVisibility);
      }
    },
    [saveState, enabled]
  );

  // Clear saved state
  const clearState = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Silently fail
    }
  }, [storageKey]);

  // Get storage key (for debugging)
  const getStorageKey = useCallback(() => storageKey, [storageKey]);

  return {
    initialState,
    onStateUpdated,
    onGridPreDestroyed,
    clearState,
    getStorageKey,
  };
};

// Helper function to get column visibility state for debugging (supports items + entities)
export const getColumnVisibilityState = (
  tableType: GridTableType
): ColumnVisibilityState | undefined => {
  const storageKey = `${ENTITY_COLUMN_VISIBILITY_PREFIX}${tableType}`;
  return loadColumnVisibilityState(storageKey);
};

// Helper function to clear all column visibility states (items + entities)
export const clearAllColumnVisibilityStates = () => {
  const allTableTypes: GridTableType[] = [
    'items',
    'categories',
    'types',
    'packages',
    'dosages',
    'manufacturers',
    'units',
  ];

  allTableTypes.forEach(tableType => {
    const storageKey = `${ENTITY_COLUMN_VISIBILITY_PREFIX}${tableType}`;
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Silently fail
    }
  });
};
