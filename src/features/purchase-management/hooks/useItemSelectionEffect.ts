import { useEffect } from 'react';
import type { PurchaseItem, Item } from '@/types';

interface UseItemSelectionEffectProps {
  selectedItem: Item | null;
  addItem: (item: PurchaseItem) => void;
  setSelectedItem: (item: Item | null) => void;
  setSearchItem: (value: string) => void;
  getItemByID: (id: string) => Item | undefined;
}

export const useItemSelectionEffect = ({
  selectedItem,
  addItem,
  setSelectedItem,
  setSearchItem,
  getItemByID,
}: UseItemSelectionEffectProps) => {
  useEffect(() => {
    if (selectedItem) {
      const itemData = getItemByID(selectedItem.id);
      if (itemData) {
        const newPurchaseItem: PurchaseItem = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          item_id: itemData.id,
          item_name: itemData.name,
          quantity: 1,
          price: itemData.base_price,
          discount: 0,
          subtotal: itemData.base_price,
          unit: itemData.unit?.name || itemData.base_unit || 'Unit',
          vat_percentage: 0,
          batch_no: null,
          expiry_date: null,
          unit_conversion_rate: 1,
          item: {
            name: itemData.name,
            code: itemData.code || '',
          },
        };
        addItem(newPurchaseItem);
        setSelectedItem(null);
        setSearchItem('');
      }
    }
  }, [selectedItem, addItem, setSelectedItem, setSearchItem, getItemByID]);
};
