import type { GridApi } from 'ag-grid-community';
import { useCallback, useEffect, useState } from 'react';

export const useVisibleGridColumns = () => {
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);

  const handleGridApiReady = useCallback((api: GridApi | null) => {
    setGridApi(api);
  }, []);

  const resetVisibleColumns = useCallback(() => {
    setVisibleColumns([]);
  }, []);

  useEffect(() => {
    if (!gridApi || gridApi.isDestroyed()) {
      return;
    }

    const updateVisibleColumns = () => {
      try {
        const displayedColumns = gridApi.getAllDisplayedColumns();
        if (displayedColumns) {
          setVisibleColumns(
            displayedColumns.map(column => column.getColId()).filter(Boolean)
          );
        }
      } catch (error) {
        console.error('Failed to update visible columns:', error);
      }
    };

    updateVisibleColumns();

    gridApi.addEventListener('columnVisible', updateVisibleColumns);
    gridApi.addEventListener('columnMoved', updateVisibleColumns);
    gridApi.addEventListener('firstDataRendered', updateVisibleColumns);
    gridApi.addEventListener('gridColumnsChanged', updateVisibleColumns);

    return () => {
      if (gridApi.isDestroyed()) {
        return;
      }

      gridApi.removeEventListener('columnVisible', updateVisibleColumns);
      gridApi.removeEventListener('columnMoved', updateVisibleColumns);
      gridApi.removeEventListener('firstDataRendered', updateVisibleColumns);
      gridApi.removeEventListener('gridColumnsChanged', updateVisibleColumns);
    };
  }, [gridApi]);

  return {
    gridApi,
    visibleColumns,
    handleGridApiReady,
    resetVisibleColumns,
  };
};
