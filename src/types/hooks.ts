import React from "react";
import { UnitConversion, UnitData } from "./database";

// Hook-related types
export interface UseUnitConversionReturn {
  conversions: UnitConversion[];
  baseUnit: string;
  setBaseUnit: React.Dispatch<React.SetStateAction<string>>;
  basePrice: number;
  setBasePrice: React.Dispatch<React.SetStateAction<number>>;
  sellPrice: number;
  setSellPrice: React.Dispatch<React.SetStateAction<number>>;
  addUnitConversion: (
    unitConversion: Omit<UnitConversion, "id"> & {
      basePrice?: number;
      sellPrice?: number;
    },
  ) => void;
  removeUnitConversion: (id: string) => void;
  unitConversionFormData: {
    unit: string;
    conversion: number;
  };
  setUnitConversionFormData: React.Dispatch<
    React.SetStateAction<{
      unit: string;
      conversion: number;
    }>
  >;
  recalculateBasePrices: () => void;
  skipNextRecalculation: () => void;
  availableUnits: UnitData[];
  resetConversions: () => void;
  setConversions: React.Dispatch<React.SetStateAction<UnitConversion[]>>;
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
  realtime?: boolean;
  searchInputRef?: React.RefObject<HTMLInputElement>;
  isCustomModalOpen?: boolean;
  locationKey?: string;
}

export interface UseItemSelectionOptions {
  disableRealtime?: boolean;
  enabled?: boolean;
}

export interface AddItemPageHandlersProps {
  itemId?: string;
  initialSearchQuery?: string;
  onClose: () => void;
  expiryCheckboxRef?: React.RefObject<HTMLLabelElement | null>;
  refetchItems?: () => void;
}