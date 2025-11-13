import type { GridApi, GridState } from 'ag-grid-community';
import toast from 'react-hot-toast';

// Manual grid state management utilities
const GRID_STATE_PREFIX = 'grid_state_';

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

// Save current grid state to localStorage (including pagination state)
export const saveGridState = (
  gridApi: GridApi,
  tableType: TableType
): boolean => {
  try {
    if (!gridApi || gridApi.isDestroyed()) {
      toast.error('Grid tidak tersedia untuk disimpan');
      return false;
    }

    const currentState = gridApi.getState();
    const storageKey = getStorageKey(tableType);

    // Include pagination state for complete state persistence
    localStorage.setItem(storageKey, JSON.stringify(currentState));

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

    const currentState = gridApi.getState();
    const storageKey = getStorageKey(tableType);

    // Include pagination state for complete state persistence
    localStorage.setItem(storageKey, JSON.stringify(currentState));

    return true;
  } catch (error) {
    console.error('Failed to auto-save grid state:', error);
    return false;
  }
};

// Restore grid state from localStorage (including pagination state)
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

    let parsedState: GridState;
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

    // setState handles full state restoration including column order, sizing, and sort
    // Per AG Grid v34 docs: setState() includes columnOrder, columnSizing, and sort properties
    // No need for additional applyColumnState() call which would overwrite sort state
    gridApi.setState(parsedState);

    // Only autosize if no column widths were restored (prevent flickering)
    const hasColumnWidths =
      (parsedState.columnSizing?.columnSizingModel?.length ?? 0) > 0;
    if (!hasColumnWidths) {
      // Use requestAnimationFrame to ensure grid is ready for autosizing
      requestAnimationFrame(() => {
        if (!gridApi.isDestroyed()) {
          gridApi.autoSizeAllColumns();
        }
      });
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

    let parsedState: GridState;
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

    // Include pagination state for complete auto-restore
    return parsedState;
  } catch (error) {
    console.error(
      `Failed to load saved state for auto-restore (${tableType}):`,
      error
    );
    return undefined;
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
