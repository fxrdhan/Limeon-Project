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

// Save current grid state to localStorage
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

    localStorage.setItem(storageKey, JSON.stringify(currentState));

    toast.success(`State grid ${tableType} berhasil disimpan`);

    return true;
  } catch (error) {
    console.error('Failed to save grid state:', error);
    toast.error('Gagal menyimpan state grid');
    return false;
  }
};

// Restore grid state from localStorage
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
      toast.error(`Tidak ada state tersimpan untuk ${tableType}`);
      return false;
    }

    const parsedState: GridState = JSON.parse(savedState);
    gridApi.setState(parsedState);

    // Auto-resize after restore
    setTimeout(() => {
      if (!gridApi.isDestroyed()) {
        gridApi.autoSizeAllColumns();
      }
    }, 100);

    toast.success(`State grid ${tableType} berhasil direstore`);

    return true;
  } catch (error) {
    console.error('Failed to restore grid state:', error);
    toast.error('Gagal restore state grid');
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
