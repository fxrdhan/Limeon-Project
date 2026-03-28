import { useState, useMemo } from 'react';
import { useItems } from '@/hooks/queries';
import { fuzzyMatch } from '@/utils/search';
import type { Item, UseItemSelectionOptions } from '@/types';
import { getItemUnitOptions } from '@/lib/item-units';

export const useItemSelection = (options: UseItemSelectionOptions = {}) => {
  const { enabled = true } = options;
  const [searchItem, setSearchItem] = useState('');
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  // Use our new items hook
  const { data: allItems, isLoading, error, refetch } = useItems({ enabled });

  // Filter and search items based on search term
  const filteredItems = useMemo(() => {
    if (!allItems || !Array.isArray(allItems)) {
      return [];
    }

    if (!searchItem.trim()) {
      return allItems.slice(0, 50); // Limit to 50 items when no search
    }

    const searchTerm = searchItem.toLowerCase();
    const matches = allItems
      .filter((item: Item) => {
        // Check if item matches search term in any field
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
      .slice(0, 20); // Limit results - no need to transform, already Item[]

    return matches;
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

  // Get item by ID (useful for pre-selecting items)
  const getItemById = (id: string) => {
    return allItems?.find(item => item.id === id) || undefined;
  };

  // Check if item has stock
  const hasStock = (item: Item) => {
    return item.stock > 0;
  };

  // Get available units for an item
  const getItemUnits = (item: Item) => {
    return getItemUnitOptions(item).map(unit => ({
      id: unit.id,
      name: unit.name,
    }));
  };

  return {
    // Data
    items: filteredItems,
    selectedItem,
    isLoading,
    error,

    // Search state
    searchItem,
    showItemDropdown,

    // Actions
    handleItemSearchChange,
    handleSelectItem,
    handleClearItemSelection,
    handleItemDropdownToggle,
    refetchItems: refetch,

    // Utilities
    getItemById,
    hasStock,
    getItemUnits,
  };
};
