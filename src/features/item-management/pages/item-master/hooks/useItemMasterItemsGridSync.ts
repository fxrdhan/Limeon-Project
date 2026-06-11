import { useEffect } from 'react';
import type { GridApi } from 'ag-grid-community';
import type { Item as ItemDataType } from '@/types/database';

interface UseItemMasterItemsGridSyncProps {
  gridApi: GridApi | null;
  isAddItemModalOpen: boolean;
  isItemModalClosing: boolean;
  isItemTab: boolean;
  isLoading: boolean;
  itemsData: ItemDataType[];
}

export const useItemMasterItemsGridSync = ({
  gridApi,
  isAddItemModalOpen,
  isItemModalClosing,
  isItemTab,
  isLoading,
  itemsData,
}: UseItemMasterItemsGridSyncProps) => {
  useEffect(() => {
    if (!isItemTab || !gridApi || gridApi.isDestroyed()) {
      return;
    }

    const syncItemsGrid = () => {
      if (gridApi.isDestroyed()) {
        return;
      }

      const shouldShowItemsLoading = isLoading && itemsData.length === 0;

      gridApi.setGridOption('loading', shouldShowItemsLoading);
      gridApi.setGridOption('rowData', itemsData);
    };

    syncItemsGrid();
    const rafId = requestAnimationFrame(syncItemsGrid);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [
    gridApi,
    isAddItemModalOpen,
    isItemModalClosing,
    isItemTab,
    isLoading,
    itemsData,
  ]);
};
