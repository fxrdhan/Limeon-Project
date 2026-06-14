import { useEffect } from 'react';
import type { PurchaseItem, Item } from '@/types';
import { getBaseItemUnit } from '@/lib/item-units';

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
        const baseInventoryUnit = getBaseItemUnit(itemData);
        const newPurchaseItem: PurchaseItem = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          item_id: itemData.id,
          item_name: itemData.name,
          quantity: 1,
          price: itemData.base_price,
          discount: 0,
          subtotal: itemData.base_price,
          unit:
            baseInventoryUnit?.unit.name ||
            itemData.unit?.name ||
            itemData.base_unit ||
            'Unit',
          inventory_unit_id:
            baseInventoryUnit?.inventory_unit_id ||
            itemData.base_inventory_unit_id ||
            null,
          unit_id: null,
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
        onSelectItem(null);
        onSearchItemChange('');
      }
    }
  }, [selectedItem, addItem, onSelectItem, onSearchItemChange, getItemById]);
};
