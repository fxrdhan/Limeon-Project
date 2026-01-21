import React from 'react';
import { ItemPackage, PackageConversion } from './database';

// Hook-related types
export interface UsePackageConversionReturn {
  conversions: PackageConversion[];
  baseUnit: string;
  setBaseUnit: React.Dispatch<React.SetStateAction<string>>;
  basePrice: number;
  setBasePrice: React.Dispatch<React.SetStateAction<number>>;
  sellPrice: number;
  setSellPrice: React.Dispatch<React.SetStateAction<number>>;
  addPackageConversion: (
    packageConversion: Omit<PackageConversion, 'id'> & {
      base_price?: number;
      sell_price?: number;
    }
  ) => void;
  removePackageConversion: (id: string) => void;
  packageConversionFormData: {
    unit: string;
    conversion_rate: number;
  };
  setPackageConversionFormData: React.Dispatch<
    React.SetStateAction<{
      unit: string;
      conversion_rate: number;
    }>
  >;
  recalculateBasePrices: () => void;
  skipNextRecalculation: () => void;
  availableUnits: ItemPackage[];
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
