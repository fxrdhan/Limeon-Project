import { createInventoryUnitFromDosage } from '@/lib/item-units';
import type { ItemInventoryUnit } from '@/types/database';
import type { ItemDosageEntity, ItemFormData } from '../../../shared/types';

type CachedItemFormData = Omit<
  ItemFormData,
  'base_inventory_unit_id' | 'quantity' | 'unit_id'
> & {
  base_inventory_unit_id?: string | null | undefined;
  quantity?: number | null | undefined;
  unit_id?: string | null | undefined;
};

export const normalizeCachedItemFormData = (
  formData: CachedItemFormData
): ItemFormData => ({
  ...formData,
  base_inventory_unit_id: formData.base_inventory_unit_id || '',
  quantity: formData.quantity ?? 0,
  unit_id: formData.unit_id ?? '',
});

export const getItemSubmitSelectableUnits = ({
  availableUnits,
  dosageId,
  dosages,
}: {
  availableUnits: ItemInventoryUnit[];
  dosageId: string;
  dosages: ItemDosageEntity[];
}) => {
  const dosageBackedUnit = createInventoryUnitFromDosage(
    dosages.find(dosage => dosage.id === dosageId) || null
  );

  return [...availableUnits, ...(dosageBackedUnit ? [dosageBackedUnit] : [])];
};
