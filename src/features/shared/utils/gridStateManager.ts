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

        // Explicitly apply column order for reliability (with maintainColumnOrder=true)
        if (parsedState.columnOrder?.orderedColIds) {
          const columnState = parsedState.columnOrder.orderedColIds.map(
            colId => ({
              colId,
              sort: null,
              sortIndex: null,
            })
          );

          gridApi.applyColumnState({
            state: columnState,
            applyOrder: true, // Ensure column order is applied
          });
        }

        // Only autosize if no column widths were restored (prevent flickering)
        const hasColumnWidths =
          (parsedState.columnSizing?.columnSizingModel?.length ?? 0) > 0;
        if (!hasColumnWidths) {
          gridApi.autoSizeAllColumns();
        }
      }
    }, 100);

    toast.success('Grid state telah dipulihkan');

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

// Download saved grid state as JSON file
export const downloadGridState = (tableType: TableType): boolean => {
  try {
    const storageKey = getStorageKey(tableType);
    const savedState = localStorage.getItem(storageKey);

    if (!savedState) {
      toast.error(`Tidak ada layout tersimpan untuk ${tableType}`);
      return false;
    }

    const parsedState: GridState = JSON.parse(savedState);

    // Create export object with metadata
    const exportData = {
      metadata: {
        tableType,
        exportedAt: new Date().toISOString(),
        version: '1.0',
        description: `Grid layout configuration for ${tableType} table`,
      },
      gridState: parsedState,
    };

    // Create JSON string with pretty formatting
    const jsonString = JSON.stringify(exportData, null, 2);

    // Create blob and download
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Create download link
    const link = document.createElement('a');
    link.href = url;
    link.download = `pharmasys-grid-state-${tableType}-${new Date().toISOString().split('T')[0]}.json`;

    // Trigger download
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Layout grid ${tableType} berhasil didownload`);
    return true;
  } catch (error) {
    console.error('Failed to download grid state:', error);
    toast.error('Gagal download layout grid');
    return false;
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
