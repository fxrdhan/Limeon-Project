import React from "react";
import { ItemInventoryUnit, PackageConversion } from "./database";

// Hook-related types
export interface UsePackageConversionReturn {
  conversions: PackageConversion[];
  baseUnit: string;
  baseInventoryUnitId: string;
  baseUnitKind: "packaging" | "retail_unit" | "custom";
  setBaseUnit: React.Dispatch<React.SetStateAction<string>>;
  setBaseInventoryUnitId: React.Dispatch<React.SetStateAction<string>>;
  setBaseUnitKind: React.Dispatch<React.SetStateAction<"packaging" | "retail_unit" | "custom">>;
  basePrice: number;
  setBasePrice: React.Dispatch<React.SetStateAction<number>>;
  sellPrice: number;
  setSellPrice: React.Dispatch<React.SetStateAction<number>>;
  addPackageConversion: (
    packageConversion: Omit<PackageConversion, "id" | "base_price" | "sell_price"> & {
      inventory_unit_id?: string;
      parent_inventory_unit_id?: string | null;
      contains_quantity?: number;
      factor_to_base?: number;
      base_price?: number;
      sell_price?: number;
    },
  ) => void;
  removePackageConversion: (id: string) => void;
  packageConversionFormData: {
    inventory_unit_id: string;
    parent_inventory_unit_id: string;
    contains_quantity: number;
  };
  setPackageConversionFormData: React.Dispatch<
    React.SetStateAction<{
      inventory_unit_id: string;
      parent_inventory_unit_id: string;
      contains_quantity: number;
    }>
  >;
  recalculateBasePrices: () => void;
  skipNextRecalculation: () => void;
  availableUnits: ItemInventoryUnit[];
  setAvailableUnits: React.Dispatch<React.SetStateAction<ItemInventoryUnit[]>>;
  refreshAvailableUnits: () => Promise<void>;
  resetConversions: () => void;
  setConversions: React.Dispatch<React.SetStateAction<PackageConversion[]>>;
}

export interface UseAddItemFormProps {
  itemId?: string;
  initialSearchQuery?: string;
  onClose: () => void;
  refetchItems?: () => void;
}

export interface UseFieldFocusOptions {
  searchInputRef?: React.RefObject<HTMLInputElement>;
  isModalOpen?: boolean;
  isLoading?: boolean;
  isFetching?: boolean;
  debouncedSearch?: string;
  currentPage?: number;
  itemsPerPage?: number;
  locationKey?: string;
}

export interface UseMasterDataManagementOptions {
  enabled?: boolean;
  searchInputRef?: React.RefObject<HTMLInputElement>;
  isCustomModalOpen?: boolean;
  locationKey?: string;
  handleSearchChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export interface UseItemSelectionOptions {
  enabled?: boolean;
}

export interface AddItemPageHandlersProps {
  itemId?: string;
  initialSearchQuery?: string;
  onClose: () => void;
  expiryCheckboxRef?: React.RefObject<HTMLLabelElement | null>;
  refetchItems?: () => void;
}
