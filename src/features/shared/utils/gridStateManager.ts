import type { GridApi, GridState } from 'ag-grid-community';
import toast from 'react-hot-toast';

// Manual grid state management utilities
const GRID_STATE_PREFIX = 'pharmasys_manual_grid_state_';

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

// Save current grid state to localStorage (excluding pagination to avoid conflicts)
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

    // Exclude pagination state to prevent conflicts with custom pagination controls
    const stateToSave = {
      ...currentState,
      pagination: undefined, // Remove pagination state
    };

    localStorage.setItem(storageKey, JSON.stringify(stateToSave));

    toast.success(
      `Layout grid ${tableType} berhasil disimpan (tanpa pagination)`
    );

    return true;
  } catch (error) {
    console.error('Failed to save grid state:', error);
    toast.error('Gagal menyimpan state grid');
    return false;
  }
};

// Restore grid state from localStorage (excluding pagination to avoid conflicts)
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
      toast.error(`Tidak ada layout tersimpan untuk ${tableType}`);
      return false;
    }

    const parsedState: GridState = JSON.parse(savedState);

    // Ensure pagination state is excluded from restore (extra safety)
    const stateToRestore = {
      ...parsedState,
      pagination: undefined, // Remove pagination state
    };

    gridApi.setState(stateToRestore);

    // Reset pagination to page 1 after restore to avoid conflicts
    setTimeout(() => {
      if (!gridApi.isDestroyed()) {
        // Reset to first page
        gridApi.paginationGoToPage(0);

        // Auto-resize after restore
        gridApi.autoSizeAllColumns();
      }
    }, 100);

    toast.success(
      `Layout grid ${tableType} berhasil direstore manual (pagination direset)`
    );

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

    toast.success(`State grid ${tableType} berhasil dihapus`);
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

    const parsedState: GridState = JSON.parse(savedState);

    // Ensure pagination is excluded from auto-restore (same as manual restore)
    const stateForInit = {
      ...parsedState,
      pagination: undefined, // Remove pagination state
    };

    console.log(`Auto-restore: Loading saved layout for ${tableType}`);
    return stateForInit;
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
    return savedState ? JSON.parse(savedState) : null;
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

    toast.success('Semua state grid berhasil dihapus');
    return true;
  } catch (error) {
    console.error('Failed to clear all grid states:', error);
    toast.error('Gagal menghapus semua state grid');
    return false;
  }
};
