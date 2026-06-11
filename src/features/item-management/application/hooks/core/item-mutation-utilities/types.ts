import type { Item } from '@/types/database';
import type { ItemFormData, PackageConversion } from '../../../../shared/types';

export interface SaveItemParams {
  formData: ItemFormData;
  conversions: PackageConversion[];
  baseUnit: string;
  baseInventoryUnitId: string;
  isEditMode: boolean;
  itemId?: string;
}

export interface SaveItemResult {
  action: 'create' | 'update';
  itemId: string;
  code: string;
  item: Item;
}
