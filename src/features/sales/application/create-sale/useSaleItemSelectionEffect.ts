import { useEffect } from 'react';
import type { Item, SaleItem } from '@/types';
import { getBaseItemUnit } from '@/lib/item-units';

interface UseSaleItemSelectionEffectProps {
  selectedItem: Item | null;
  addItem: (item: SaleItem) => void;
  onSelectItem: (item: Item | null) => void;
  onSearchItemChange: (value: string) => void;
  getItemById: (id: string) => Item | undefined;
}

export const useSaleItemSelectionEffect = ({
  selectedItem,
  addItem,
  onSelectItem,
  onSearchItemChange,
  getItemById,
}: UseSaleItemSelectionEffectProps) => {
  useEffect(() => {
    if (!selectedItem) return;

    const itemData = getItemById(selectedItem.id);
    if (!itemData) return;

    const baseInventoryUnit = getBaseItemUnit(itemData);
    const unitName =
      baseInventoryUnit?.unit.name ||
      itemData.unit?.name ||
      itemData.base_unit ||
      'Unit';
    const sellPrice = baseInventoryUnit?.sell_price || itemData.sell_price;

    const newSaleItem: SaleItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      item_id: itemData.id,
      item_name: itemData.name,
      quantity: 1,
      price: sellPrice,
      subtotal: sellPrice,
      unit_name: unitName,
      inventory_unit_id:
        baseInventoryUnit?.inventory_unit_id ||
        itemData.base_inventory_unit_id ||
        null,
      unit_id: null,
      unit_conversion_rate: baseInventoryUnit?.factor_to_base || 1,
      item: {
        name: itemData.name,
        code: itemData.code || '',
      },
    };

    addItem(newSaleItem);
    onSelectItem(null);
    onSearchItemChange('');
  }, [selectedItem, addItem, onSelectItem, onSearchItemChange, getItemById]);
};
