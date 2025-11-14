import type { GridApi, GridState } from 'ag-grid-community';
import toast from 'react-hot-toast';

// Manual grid state management utilities
const GRID_STATE_PREFIX = 'grid_state_';

// Extended state type that includes scroll position
export interface ExtendedGridState {
  agGridState: GridState;
  scrollPosition?: {
    firstVisibleRowIndex: number;
  };
}

export type TableType =
  | 'items'
  | 'categories'
  | 'types'
  | 'packages'
  | 'dosages'
  | 'manufacturers'
  | 'units';

// Get storage key for specific table
const getStorageKey = (tableType: TableType): string => {
  return `${GRID_STATE_PREFIX}${tableType}`;
};

// Save current grid state to localStorage (including pagination state and scroll position)
export const saveGridState = (
  gridApi: GridApi,
  tableType: TableType
): boolean => {
  try {
    if (!gridApi || gridApi.isDestroyed()) {
      toast.error('Grid tidak tersedia untuk disimpan');
      return false;
    }

    const agGridState = gridApi.getState();
    const storageKey = getStorageKey(tableType);

    // Capture scroll position (first visible row index)
    const firstVisibleRowIndex = gridApi.getFirstDisplayedRowIndex();

    // Create extended state with scroll position
    const extendedState: ExtendedGridState = {
      agGridState,
      scrollPosition: {
        firstVisibleRowIndex:
          firstVisibleRowIndex >= 0 ? firstVisibleRowIndex : 0,
      },
    };

    localStorage.setItem(storageKey, JSON.stringify(extendedState));

    // toast.success(
    //   `Layout grid ${tableType} berhasil disimpan (dengan pagination)`
    // );

    return true;
  } catch (error) {
    console.error('Failed to save grid state:', error);
    toast.error('Gagal menyimpan state grid');
    return false;
  }
};

// Auto-save grid state silently (no toast notifications for live save)
export const autoSaveGridState = (
  gridApi: GridApi,
  tableType: TableType
): boolean => {
  try {
    if (!gridApi || gridApi.isDestroyed()) {
      return false;
    }

    const agGridState = gridApi.getState();
    const storageKey = getStorageKey(tableType);

    // Capture scroll position (first visible row index)
    const firstVisibleRowIndex = gridApi.getFirstDisplayedRowIndex();

    // Create extended state with scroll position
    const extendedState: ExtendedGridState = {
      agGridState,
      scrollPosition: {
        firstVisibleRowIndex:
          firstVisibleRowIndex >= 0 ? firstVisibleRowIndex : 0,
      },
    };

    localStorage.setItem(storageKey, JSON.stringify(extendedState));

    return true;
  } catch (error) {
    console.error('Failed to auto-save grid state:', error);
    return false;
  }
};

// Restore grid state from localStorage (including pagination state and scroll position)
export const restoreGridState = (
  gridApi: GridApi,
  tableType: TableType
): boolean => {
  try {
    if (!gridApi || gridApi.isDestroyed()) {
      toast.error('Grid tidak tersedia untuk direstore');
      return false;
    }

    const storageKey = getStorageKey(tableType);
    const savedState = localStorage.getItem(storageKey);

    if (!savedState) {
      // toast.error(`Tidak ada layout tersimpan untuk ${tableType}`);
      return false;
    }

    // Validate that savedState is valid JSON before parsing
    if (
      savedState.trim() === '' ||
      savedState === 'undefined' ||
      savedState === 'null'
    ) {
      console.warn(`Invalid saved state for ${tableType}, clearing...`);
      localStorage.removeItem(storageKey);
      return false;
    }

    let parsedState: ExtendedGridState | GridState;
    try {
      parsedState = JSON.parse(savedState);
    } catch (parseError) {
      console.warn(`Failed to parse saved state for ${tableType}:`, parseError);
      console.warn(
        `Corrupted state data:`,
        savedState.substring(0, 100) + '...'
      );
      // Clear corrupted data
      localStorage.removeItem(storageKey);
      toast.error(
        `Layout tersimpan untuk ${tableType} rusak, menggunakan default`
      );
      return false;
    }

    // Support both old format (GridState) and new format (ExtendedGridState)
    const agGridState: GridState =
      'agGridState' in parsedState ? parsedState.agGridState : parsedState;
    const scrollPosition =
      'scrollPosition' in parsedState ? parsedState.scrollPosition : undefined;

    // setState handles full state restoration including column order, sizing, and sort
    // Per AG Grid v34 docs: setState() includes columnOrder, columnSizing, and sort properties
    // No need for additional applyColumnState() call which would overwrite sort state
    gridApi.setState(agGridState);

    // Only autosize if no column widths were restored (prevent flickering)
    const hasColumnWidths =
      (agGridState.columnSizing?.columnSizingModel?.length ?? 0) > 0;
    if (!hasColumnWidths) {
      // Use requestAnimationFrame to ensure grid is ready for autosizing
      requestAnimationFrame(() => {
        if (!gridApi.isDestroyed()) {
          gridApi.autoSizeAllColumns();
        }
      });
    }

    // Restore scroll position after grid state is applied
    if (scrollPosition && scrollPosition.firstVisibleRowIndex >= 0) {
      // Use setTimeout to ensure grid has finished rendering after setState
      setTimeout(() => {
        if (!gridApi.isDestroyed()) {
          gridApi.ensureIndexVisible(
            scrollPosition.firstVisibleRowIndex,
            'top'
          );
        }
      }, 100);
    }

    // toast.success('Grid state telah dipulihkan (dengan pagination)');

    return true;
  } catch (error) {
    console.error('Failed to restore grid state:', error);
    toast.error('Gagal restore layout grid');
    return false;
  }
};

// Clear saved grid state
export const clearGridState = (tableType: TableType): boolean => {
  try {
    const storageKey = getStorageKey(tableType);
    localStorage.removeItem(storageKey);

    // toast.success(`State grid ${tableType} berhasil dihapus`);
    return true;
  } catch (error) {
    console.error('Failed to clear grid state:', error);
    toast.error('Gagal menghapus state grid');
    return false;
  }
};

// Check if saved state exists for table
export const hasSavedState = (tableType: TableType): boolean => {
  try {
    const storageKey = getStorageKey(tableType);
    const savedState = localStorage.getItem(storageKey);
    return savedState !== null;
  } catch {
    return false;
  }
};

// Load saved state for auto-restore on grid initialization
// Returns only AG Grid state (without scroll position, which is restored separately)
export const loadSavedStateForInit = (
  tableType: TableType
): GridState | undefined => {
  try {
    const storageKey = getStorageKey(tableType);
    const savedState = localStorage.getItem(storageKey);

    if (!savedState) {
      return undefined;
    }

    // Validate that savedState is valid JSON before parsing
    if (
      savedState.trim() === '' ||
      savedState === 'undefined' ||
      savedState === 'null'
    ) {
      console.warn(`Invalid saved state for ${tableType}, clearing...`);
      localStorage.removeItem(storageKey);
      return undefined;
    }

    let parsedState: ExtendedGridState | GridState;
    try {
      parsedState = JSON.parse(savedState);
    } catch (parseError) {
      console.warn(
        `Failed to parse saved state for auto-restore (${tableType}):`,
        parseError
      );
      // Clear corrupted data
      localStorage.removeItem(storageKey);
      return undefined;
    }

    // Support both old format (GridState) and new format (ExtendedGridState)
    // Return only AG Grid state for initialState prop
    const agGridState: GridState =
      'agGridState' in parsedState ? parsedState.agGridState : parsedState;

    return agGridState;
  } catch (error) {
    console.error(
      `Failed to load saved state for auto-restore (${tableType}):`,
      error
    );
    return undefined;
  }
};

// Restore only scroll position from saved state
// Call this after grid is fully ready and data is loaded
export const restoreScrollPosition = (
  gridApi: GridApi,
  tableType: TableType
): boolean => {
  try {
    if (!gridApi || gridApi.isDestroyed()) {
      return false;
    }

    const storageKey = getStorageKey(tableType);
    const savedState = localStorage.getItem(storageKey);

    if (!savedState) {
      return false;
    }

    let parsedState: ExtendedGridState | GridState;
    try {
      parsedState = JSON.parse(savedState);
    } catch {
      return false;
    }

    // Check if we have scroll position in extended state format
    if ('scrollPosition' in parsedState && parsedState.scrollPosition) {
      const { firstVisibleRowIndex } = parsedState.scrollPosition;
      if (firstVisibleRowIndex >= 0) {
        gridApi.ensureIndexVisible(firstVisibleRowIndex, 'top');
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Failed to restore scroll position:', error);
    return false;
  }
};

// Get saved state info for debugging
export const getSavedStateInfo = (tableType: TableType): GridState | null => {
  try {
    const storageKey = getStorageKey(tableType);
    const savedState = localStorage.getItem(storageKey);

    if (
      !savedState ||
      savedState.trim() === '' ||
      savedState === 'undefined' ||
      savedState === 'null'
    ) {
      return null;
    }

    try {
      return JSON.parse(savedState);
    } catch (parseError) {
      console.warn(
        `Failed to parse saved state info for ${tableType}:`,
        parseError
      );
      // Clear corrupted data
      localStorage.removeItem(storageKey);
      return null;
    }
  } catch {
    return null;
  }
};

// Clear all saved states (for cleanup)
export const clearAllGridStates = (): boolean => {
  try {
    const allTableTypes: TableType[] = [
      'items',
      'categories',
      'types',
      'packages',
      'dosages',
      'manufacturers',
      'units',
    ];

    allTableTypes.forEach(tableType => {
      const storageKey = getStorageKey(tableType);
      localStorage.removeItem(storageKey);
    });

    // toast.success('Semua state grid berhasil dihapus');
    return true;
  } catch (error) {
    console.error('Failed to clear all grid states:', error);
    toast.error('Gagal menghapus semua state grid');
    return false;
  }
};

// ============================================================================
// MIGRATION & CLEANUP UTILITIES
// ============================================================================

// Legacy prefix used in old system
const LEGACY_PREFIX = 'pharmasys_manual_grid_state_';

/**
 * Get all legacy keys from localStorage
 */
export const getLegacyKeys = (): string[] => {
  const legacyKeys: string[] = [];

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(LEGACY_PREFIX)) {
        legacyKeys.push(key);
      }
    }
  } catch (error) {
    console.error('Failed to get legacy keys:', error);
  }

  return legacyKeys;
};

/**
 * Clean up legacy grid state keys from localStorage
 * Safe to run - only removes old pharmasys_manual_grid_state_* keys
 */
export const cleanupLegacyGridStates = (): {
  success: boolean;
  removedCount: number;
  keys: string[];
} => {
  const legacyKeys = getLegacyKeys();
  let removedCount = 0;

  try {
    legacyKeys.forEach(key => {
      localStorage.removeItem(key);
      removedCount++;
    });

    console.log(`✅ Cleanup completed: Removed ${removedCount} legacy keys`);

    return {
      success: true,
      removedCount,
      keys: legacyKeys,
    };
  } catch (error) {
    console.error('Failed to cleanup legacy grid states:', error);
    return {
      success: false,
      removedCount,
      keys: legacyKeys,
    };
  }
};

/**
 * Check if there are any legacy keys that need cleanup
 */
export const hasLegacyKeys = (): boolean => {
  return getLegacyKeys().length > 0;
};

/**
 * Get storage statistics for debugging
 */
export const getStorageStats = (): {
  currentKeys: string[];
  legacyKeys: string[];
  totalKeys: number;
  storageSize: number;
} => {
  const currentKeys: string[] = [];
  const legacyKeys: string[] = [];
  let storageSize = 0;

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      const value = localStorage.getItem(key) || '';
      storageSize += key.length + value.length;

      if (key.startsWith(GRID_STATE_PREFIX)) {
        currentKeys.push(key);
      } else if (key.startsWith(LEGACY_PREFIX)) {
        legacyKeys.push(key);
      }
    }
  } catch (error) {
    console.error('Failed to get storage stats:', error);
  }

  return {
    currentKeys,
    legacyKeys,
    totalKeys: localStorage.length,
    storageSize,
  };
};
