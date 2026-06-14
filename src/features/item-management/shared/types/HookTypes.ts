import type { Dispatch, SetStateAction } from 'react';
import type { Item, ItemInventoryUnit } from '@/types/database';
import type { PackageConversion } from './ItemTypes';

// Hook Parameter Interfaces
export interface UseItemManagementProps {
  itemId?: string;
  initialItemData?: Item;
  initialSearchQuery?: string;
  onClose: () => void;
  refetchItems?: () => void;
}

export interface UsePackageConversionReturn {
  conversions: PackageConversion[];
  baseUnit: string;
  baseInventoryUnitId: string;
  baseUnitKind: 'packaging' | 'retail_unit' | 'custom';
  setBaseUnit: Dispatch<SetStateAction<string>>;
  setBaseInventoryUnitId: Dispatch<SetStateAction<string>>;
  setBaseUnitKind: Dispatch<
    SetStateAction<'packaging' | 'retail_unit' | 'custom'>
  >;
  basePrice: number;
  setBasePrice: Dispatch<SetStateAction<number>>;
  sellPrice: number;
  setSellPrice: Dispatch<SetStateAction<number>>;
  addPackageConversion: (
    packageConversion: Omit<
      PackageConversion,
      'id' | 'base_price' | 'sell_price'
    > & {
      inventory_unit_id?: string;
      parent_inventory_unit_id?: string | null;
      contains_quantity?: number;
      factor_to_base?: number;
      base_price?: number;
      sell_price?: number;
    }
  ) => void;
  removePackageConversion: (id: string) => void;
  packageConversionFormData: {
    inventory_unit_id: string;
    parent_inventory_unit_id: string;
    contains_quantity: number;
  };
  setPackageConversionFormData: Dispatch<
    SetStateAction<{
      inventory_unit_id: string;
      parent_inventory_unit_id: string;
      contains_quantity: number;
    }>
  >;
  recalculateBasePrices: () => void;
  skipNextRecalculation: () => void;
  availableUnits: ItemInventoryUnit[];
  setAvailableUnits: Dispatch<SetStateAction<ItemInventoryUnit[]>>;
  refreshAvailableUnits: () => Promise<void>;
  resetConversions: () => void;
  setConversions: Dispatch<SetStateAction<PackageConversion[]>>;
}
