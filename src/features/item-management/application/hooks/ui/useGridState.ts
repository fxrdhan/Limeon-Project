import { useCallback, useRef } from 'react';
import type {
  GridState,
  StateUpdatedEvent,
  GridPreDestroyedEvent,
  GridApi,
} from 'ag-grid-community';

interface UseGridStateOptions {
  tableId: string; // Unique identifier for each table (items, categories, etc.)
  enabled?: boolean; // Allow disabling state management
  gridApi?: GridApi | null; // Grid API to apply state immediately on tab change
}

interface GridStateManager {
  onStateUpdated: (event: StateUpdatedEvent) => void;
  onGridPreDestroyed: (event: GridPreDestroyedEvent) => void;
  clearState: () => void;
  getStorageKey: () => string;
  loadAndApplyState: () => void; // Load and apply state when tab changes
}

const GRID_STATE_PREFIX = 'pharmasys_grid_state_';

// Filter out pagination and other problematic state properties
const filterGridState = (state: GridState): Partial<GridState> => {
  const {
    pagination, // Remove pagination state to avoid conflicts
    rowSelection, // Remove row selection state to avoid conflicts
    cellSelection, // Remove cell selection state to avoid conflicts
    ...filteredState
  } = state;

  // Explicitly void the unused variables to satisfy linter
  void pagination;
  void rowSelection;
  void cellSelection;

  return filteredState;
};

// Load state from localStorage
const loadState = (storageKey: string): Partial<GridState> | undefined => {
  try {
    const savedState = localStorage.getItem(storageKey);
    if (savedState) {
      const parsedState = JSON.parse(savedState) as GridState;
      const filteredState = filterGridState(parsedState);
      return filteredState;
    }
    return undefined;
  } catch {
    localStorage.removeItem(storageKey);
    return undefined;
  }
};

export const useGridState = (
  options: UseGridStateOptions
): GridStateManager => {
  const { tableId, enabled = true, gridApi } = options;
  const storageKey = `${GRID_STATE_PREFIX}${tableId}`;
  const lastSavedState = useRef<GridState | undefined>(undefined);

  // Clear potentially corrupted state on first load (one-time cleanup)
  if (typeof window !== 'undefined') {
    const cleanupKey = `${GRID_STATE_PREFIX}cleanup_v4`;
    if (!localStorage.getItem(cleanupKey)) {
      // Clear all existing grid states that might contain selection states
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(GRID_STATE_PREFIX) && !key.includes('cleanup')) {
          localStorage.removeItem(key);
        }
      });
      localStorage.setItem(cleanupKey, 'true');
    }
  }

  // Save state to localStorage
  const saveState = useCallback(
    (state: GridState) => {
      if (!enabled) return;

      try {
        const filteredState = filterGridState(state);
        localStorage.setItem(storageKey, JSON.stringify(filteredState));
        lastSavedState.current = state;
      } catch {
        // Silently fail - localStorage might be full or unavailable
      }
    },
    [storageKey, enabled]
  );

  // Load and apply state when tab changes
  const loadAndApplyState = useCallback(() => {
    if (!enabled || !gridApi || gridApi.isDestroyed()) return;

    const savedState = loadState(storageKey);
    if (savedState) {
      try {
        // Only apply state if it doesn't contain selection states
        if (!savedState.rowSelection && !savedState.cellSelection) {
          gridApi.setState(savedState);
        }
      } catch {
        // Silently fail - state might be corrupted or incompatible
      }
    }
  }, [enabled, gridApi, storageKey]);

  // Handle state updates from AG Grid
  const onStateUpdated = useCallback(
    (event: StateUpdatedEvent) => {
      if (!enabled) return;

      // Debounce state saves to avoid excessive localStorage writes
      setTimeout(() => {
        saveState(event.state);
      }, 300);
    },
    [saveState, enabled]
  );

  // Handle grid destruction - final save
  const onGridPreDestroyed = useCallback(
    (event: GridPreDestroyedEvent) => {
      if (!enabled) return;

      saveState(event.state);
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
    onStateUpdated,
    onGridPreDestroyed,
    clearState,
    getStorageKey,
    loadAndApplyState,
  };
};

// Helper function to generate table IDs
export const getTableId = (
  entityType: string,
  additionalContext?: string
): string => {
  const base = `${entityType}_table`;
  return additionalContext ? `${base}_${additionalContext}` : base;
};

// Predefined table IDs for consistency
export const TABLE_IDS = {
  ITEMS: 'items',
  CATEGORIES: 'categories',
  TYPES: 'types',
  PACKAGES: 'packages',
  DOSAGES: 'dosages',
  MANUFACTURERS: 'manufacturers',
  UNITS: 'units',
} as const;

export type TableId = (typeof TABLE_IDS)[keyof typeof TABLE_IDS];
