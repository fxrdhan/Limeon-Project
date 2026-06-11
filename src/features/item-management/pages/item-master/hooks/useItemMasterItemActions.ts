import { useCallback } from 'react';
import type { Item as ItemDataType } from '@/types/database';

interface UseItemMasterItemActionsProps {
  itemsData: ItemDataType[];
  openAddItemModal: (item?: ItemDataType, searchQuery?: string) => void;
}

export const useItemMasterItemActions = ({
  itemsData,
  openAddItemModal,
}: UseItemMasterItemActionsProps) => {
  const handleItemEdit = useCallback(
    (item: ItemDataType) => {
      openAddItemModal(item);
    },
    [openAddItemModal]
  );

  const handleItemSelect = useCallback(
    (item: { id: string }) => {
      const selectedItem = itemsData.find(dataItem => dataItem.id === item.id);
      openAddItemModal(selectedItem);
    },
    [itemsData, openAddItemModal]
  );

  const handleAddItem = useCallback(
    (_itemId?: string, searchQuery?: string) => {
      openAddItemModal(undefined, searchQuery);
    },
    [openAddItemModal]
  );

  return {
    handleAddItem,
    handleItemEdit,
    handleItemSelect,
  };
};
