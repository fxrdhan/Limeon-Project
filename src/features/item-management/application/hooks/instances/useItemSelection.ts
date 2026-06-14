import { useMemo, useState } from 'react';
import { useItems } from '@/features/item-management/public/useItemData';
import { getItemUnitOptions } from '@/lib/item-units';
import type { Item } from '@/types/database';
import { fuzzyMatch } from '@/utils/search';

export interface UseItemSelectionOptions {
  enabled?: boolean;
}

export const useItemSelection = (options: UseItemSelectionOptions = {}) => {
  const { enabled = true } = options;
  const [searchItem, setSearchItem] = useState('');
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const { data: allItems, isLoading, error, refetch } = useItems({ enabled });

  const filteredItems = useMemo(() => {
    if (!allItems || !Array.isArray(allItems)) {
      return [];
    }

    if (!searchItem.trim()) {
      return allItems.slice(0, 50);
    }

    const searchTerm = searchItem.toLowerCase();
    return allItems
      .filter((item: Item) => {
        const nameMatch = fuzzyMatch(
          item.display_name || item.name || '',
          searchTerm
        );
        const codeMatch = item.code ? fuzzyMatch(item.code, searchTerm) : false;
        const manufacturerMatch = item.manufacturer?.name
          ? fuzzyMatch(item.manufacturer.name, searchTerm)
          : false;
        const barcodeMatch = item.barcode
          ? fuzzyMatch(item.barcode, searchTerm)
          : false;

        return nameMatch || codeMatch || manufacturerMatch || barcodeMatch;
      })
      .slice(0, 20);
  }, [allItems, searchItem]);

  const handleItemSearchChange = (value: string) => {
    setSearchItem(value);
    setShowItemDropdown(value.length > 0);
  };

  const handleSelectItem = (item: Item | null) => {
    setSelectedItem(item);
    if (item) {
      setSearchItem(item.display_name || item.name);
      setShowItemDropdown(false);
    }
  };

  const handleClearItemSelection = () => {
    setSelectedItem(null);
    setSearchItem('');
    setShowItemDropdown(false);
  };

  const handleItemDropdownToggle = (show?: boolean) => {
    setShowItemDropdown(show ?? !showItemDropdown);
  };

  const getItemById = (id: string) =>
    allItems?.find(item => item.id === id) || undefined;

  const hasStock = (item: Item) => item.stock > 0;

  const getItemUnits = (item: Item) =>
    getItemUnitOptions(item).map(unit => ({
      id: unit.id,
      name: unit.name,
    }));

  return {
    items: filteredItems,
    selectedItem,
    isLoading,
    error,
    searchItem,
    showItemDropdown,
    handleItemSearchChange,
    handleSelectItem,
    handleClearItemSelection,
    handleItemDropdownToggle,
    refetchItems: refetch,
    getItemById,
    hasStock,
    getItemUnits,
  };
};
