import { useEffect } from 'react';
import type { Item, SaleItem } from '@/types';
import { buildSaleItemFromItem } from '../../domain/saleForm';

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

    const newSaleItem: SaleItem = buildSaleItemFromItem(
      itemData,
      `${Date.now()}-${Math.random().toString(36).slice(2)}`
    );

    addItem(newSaleItem);
    onSelectItem(null);
    onSearchItemChange('');
  }, [selectedItem, addItem, onSelectItem, onSearchItemChange, getItemById]);
};
