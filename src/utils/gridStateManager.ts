import type { GridApi, GridState } from 'ag-grid-community';
import toast from 'react-hot-toast';

// Manual grid state management utilities
const GRID_STATE_PREFIX = 'grid_state_';

const getSessionStorage = (): Storage => {
  return sessionStorage;
};

export type TableType =
  | 'items'
  | 'categories'
  | 'types'
  | 'packages'
  | 'dosages'
  | 'manufacturers'
  | 'units'
  | 'suppliers'
  | 'customers'
  | 'patients'
  | 'doctors';

// Get storage key for specific table
const getStorageKey = (tableType: TableType): string => {
  return `${GRID_STATE_PREFIX}${tableType}`;
};

const readGridStateRaw = (tableType: TableType): string | null => {
  const storageKey = getStorageKey(tableType);

  try {
    const sessionValue = getSessionStorage().getItem(storageKey);
    if (sessionValue !== null) return sessionValue;
  } catch {
    // ignore
  }
  return null;
};

// Save current grid state to sessionStorage (including pagination state)
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
    getSessionStorage().setItem(storageKey, JSON.stringify(currentState));

    // toast.success(
    //   `Layout grid ${tableType} berhasil disimpan (dengan pagination)`
    // );

    return true;
    /* c8 ignore next */
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
    getSessionStorage().setItem(storageKey, JSON.stringify(currentState));

    return true;
    /* c8 ignore next */
  } catch (error) {
    console.error('Failed to auto-save grid state:', error);
    return false;
  }
};

// Restore grid state from sessionStorage (including pagination state)
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
    const savedState = readGridStateRaw(tableType);

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
      try {
        getSessionStorage().removeItem(storageKey);
      } catch {
        // ignore
      }
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
      try {
        getSessionStorage().removeItem(storageKey);
      } catch {
        // ignore
      }
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
    try {
      getSessionStorage().removeItem(storageKey);
    } catch {
      // ignore
    }

    // toast.success(`State grid ${tableType} berhasil dihapus`);
    return true;
    /* c8 ignore start */
  } catch (error) {
    console.error('Failed to clear grid state:', error);
    toast.error('Gagal menghapus state grid');
    return false;
  }
  /* c8 ignore stop */
};

// Check if saved state exists for table
export const hasSavedState = (tableType: TableType): boolean => {
  try {
    return readGridStateRaw(tableType) !== null;
  } catch {
    /* c8 ignore next */
    return false;
  }
};

// Load saved state for auto-restore on grid initialization
export const loadSavedStateForInit = (
  tableType: TableType
): GridState | undefined => {
  try {
    const storageKey = getStorageKey(tableType);
    const savedState = readGridStateRaw(tableType);

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
      try {
        getSessionStorage().removeItem(storageKey);
      } catch {
        // ignore
      }
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
      try {
        getSessionStorage().removeItem(storageKey);
      } catch {
        // ignore
      }
      return undefined;
    }

    // Include pagination state for complete auto-restore
    return parsedState;
    /* c8 ignore start */
  } catch (error) {
    console.error(
      `Failed to load saved state for auto-restore (${tableType}):`,
      error
    );
    return undefined;
  }
  /* c8 ignore stop */
};

// Get saved state info for debugging
export const getSavedStateInfo = (tableType: TableType): GridState | null => {
  try {
    const storageKey = getStorageKey(tableType);
    const savedState = readGridStateRaw(tableType);

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
      try {
        getSessionStorage().removeItem(storageKey);
      } catch {
        // ignore
      }
      return null;
    }
  } catch {
    /* c8 ignore next */
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
      try {
        getSessionStorage().removeItem(storageKey);
      } catch {
        // ignore
      }
    });

    // toast.success('Semua state grid berhasil dihapus');
    return true;
    /* c8 ignore start */
  } catch (error) {
    console.error('Failed to clear all grid states:', error);
    toast.error('Gagal menghapus semua state grid');
    return false;
  }
  /* c8 ignore stop */
};
