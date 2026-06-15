import { useEffect } from 'react';
import type { PurchaseItem, Item } from '@/types';
import { buildPurchaseItemFromItem } from '../../domain/purchaseForm';

interface UseItemSelectionEffectProps {
  selectedItem: Item | null;
  addItem: (item: PurchaseItem) => void;
  onSelectItem: (item: Item | null) => void;
  onSearchItemChange: (value: string) => void;
  getItemById: (id: string) => Item | undefined;
}

export const useItemSelectionEffect = ({
  selectedItem,
  addItem,
  onSelectItem,
  onSearchItemChange,
  getItemById,
}: UseItemSelectionEffectProps) => {
  useEffect(() => {
    if (selectedItem) {
      const itemData = getItemById(selectedItem.id);
      if (itemData) {
        const newPurchaseItem: PurchaseItem = buildPurchaseItemFromItem(
          itemData,
          `${Date.now()}-${Math.random().toString(36).slice(2)}`
        );
        addItem(newPurchaseItem);
        onSelectItem(null);
        onSearchItemChange('');
      }
    }
  }, [selectedItem, addItem, onSelectItem, onSearchItemChange, getItemById]);
};
