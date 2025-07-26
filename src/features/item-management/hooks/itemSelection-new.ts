import { useState, useMemo } from "react";
import { useItems } from "@/hooks/queries";
import { fuzzyMatch } from "@/utils/search";
import type { Item, UseItemSelectionOptions, DBItem } from "@/types";

export const useItemSelection = (options: UseItemSelectionOptions = {}) => {
  const { enabled = true } = options;
  const [searchItem, setSearchItem] = useState("");
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
      .filter((item: DBItem) => {
        // Check if item matches search term in any field
        const nameMatch = fuzzyMatch(item.name || '', searchTerm);
        const codeMatch = item.code ? fuzzyMatch(item.code, searchTerm) : false;
        const manufacturerMatch = item.manufacturer ? fuzzyMatch(item.manufacturer, searchTerm) : false;
        const barcodeMatch = item.barcode ? fuzzyMatch(item.barcode, searchTerm) : false;
        
        return nameMatch || codeMatch || manufacturerMatch || barcodeMatch;
      })
      .slice(0, 20) // Limit results
      .map((item: DBItem) => {
        // Transform DBItem to Item format for compatibility
        const transformedItem: Item = {
          ...item,
          category: item.item_categories?.[0] || { name: '' },
          type: item.item_types?.[0] || { name: '' },
          unit: item.item_units?.[0] || { name: '' },
          base_unit: item.item_units?.[0]?.name || '',
          unit_conversions: typeof item.unit_conversions === 'string' 
            ? JSON.parse(item.unit_conversions || '[]')
            : item.unit_conversions || []
        };
        
        return transformedItem;
      });

    return matches;
  }, [allItems, searchItem]);

  const handleItemSearchChange = (value: string) => {
    setSearchItem(value);
    setShowItemDropdown(value.length > 0);
  };

  const handleSelectItem = (item: Item) => {
    setSelectedItem(item);
    setSearchItem(item.name);
    setShowItemDropdown(false);
  };

  const handleClearItemSelection = () => {
    setSelectedItem(null);
    setSearchItem("");
    setShowItemDropdown(false);
  };

  const handleItemDropdownToggle = (show?: boolean) => {
    setShowItemDropdown(show ?? !showItemDropdown);
  };

  // Get item by ID (useful for pre-selecting items)
  const getItemById = (id: string) => {
    return allItems?.find(item => item.id === id) || null;
  };

  // Check if item has stock
  const hasStock = (item: Item) => {
    return item.stock > 0;
  };

  // Get available units for an item
  const getItemUnits = (item: Item) => {
    const units = [{ id: item.unit_id, name: item.unit.name }];
    
    if (item.unit_conversions && item.unit_conversions.length > 0) {
      item.unit_conversions.forEach(conversion => {
        if (conversion.unit && !units.find(u => u.id === conversion.unit.id)) {
          units.push({
            id: conversion.unit.id,
            name: conversion.unit.name
          });
        }
      });
    }
    
    return units;
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
    
    // Legacy compatibility
    data: filteredItems,
    isError: !!error,
    queryError: error,
  };
};