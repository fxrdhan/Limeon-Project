import { useCallback, useRef, useMemo } from 'react';
import type {
  GridState,
  StateUpdatedEvent,
  GridPreDestroyedEvent,
  GridApi,
} from 'ag-grid-community';
import { EntityType } from '../collections/useEntityManager';

interface UseEntityColumnVisibilityStateOptions {
  entityType: EntityType;
  enabled?: boolean;
  gridApi?: GridApi | null;
}

interface ColumnVisibilityState {
  hiddenColIds: string[];
}

interface EntityColumnVisibilityManager {
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

export const useEntityColumnVisibilityState = (
  options: UseEntityColumnVisibilityStateOptions
): EntityColumnVisibilityManager => {
  const { entityType, enabled = true } = options;
  const storageKey = `${ENTITY_COLUMN_VISIBILITY_PREFIX}${entityType}`;
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

// Helper function to get entity column visibility state for debugging
export const getEntityColumnVisibilityState = (
  entityType: EntityType
): ColumnVisibilityState | undefined => {
  const storageKey = `${ENTITY_COLUMN_VISIBILITY_PREFIX}${entityType}`;
  return loadColumnVisibilityState(storageKey);
};

// Helper function to clear all entity column visibility states
export const clearAllEntityColumnVisibilityStates = () => {
  const entityTypes: EntityType[] = [
    'categories',
    'types',
    'packages',
    'dosages',
    'manufacturers',
    'units',
  ];

  entityTypes.forEach(entityType => {
    const storageKey = `${ENTITY_COLUMN_VISIBILITY_PREFIX}${entityType}`;
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Silently fail
    }
  });
};
