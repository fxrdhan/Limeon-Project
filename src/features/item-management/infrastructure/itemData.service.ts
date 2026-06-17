import { supabase } from '@/lib/supabase';
import {
  toServiceError,
  type ServiceResponse,
} from '@/services/api/base.service';
import type {
  CustomerLevelDiscount,
  ItemInventoryUnit,
  ItemUnitHierarchyEntry,
} from '@/types/database';
import {
  buildCustomerLevelDiscountInsertPayload,
  buildItemUnitHierarchyInsertPayload,
  toItemUnitHierarchyEntry,
  type ReplaceItemUnitHierarchyEntry,
} from './itemDataMappers';

export interface ItemDataUnitHierarchyEntry {
  id?: string | null;
  item_id?: string | null;
  inventory_unit_id?: string | null;
  parent_inventory_unit_id?: string | null;
  contains_quantity?: number | null;
  factor_to_base?: number | null;
  base_price_override?: number | null;
  sell_price_override?: number | null;
  inventory_unit?: ItemInventoryUnit | ItemInventoryUnit[] | null;
  parent_unit?: ItemInventoryUnit | ItemInventoryUnit[] | null;
}

export interface ItemDataRecord {
  id?: string;
  code?: string | null;
  name?: string | null;
  manufacturer_id?: string | null;
  manufacturer?: { id?: string | null } | null;
  type_id?: string | null;
  category_id?: string | null;
  package_id?: string | null;
  base_inventory_unit_id?: string | null;
  dosage_id?: string | null;
  barcode?: string | null;
  description?: string | null;
  image_urls?: string[] | null;
  base_price?: number | null;
  sell_price?: number | null;
  is_level_pricing_active?: boolean | null;
  min_stock?: number | null;
  is_active?: boolean | null;
  is_medicine?: boolean | null;
  has_expiry_date?: boolean | null;
  measurement_value?: number | null;
  quantity?: number | null;
  measurement_unit_id?: string | null;
  unit_id?: string | null;
  measurement_denominator_value?: number | null;
  measurement_denominator_unit_id?: string | null;
  updated_at?: string | null;
  base_unit?: string | null;
  unit?: { name?: string | null } | null;
  base_inventory_unit?: ItemInventoryUnit | null;
  item_unit_hierarchy?: ItemDataUnitHierarchyEntry[] | null;
  inventory_units?: ItemDataUnitHierarchyEntry[] | null;
  customer_level_discounts?: CustomerLevelDiscount[] | null;
}

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const normalizeCreatedItemResponse = (
  value: unknown
): { id: string } | null => {
  if (!isObjectRecord(value) || typeof value.id !== 'string') {
    return null;
  }

  const id = value.id.trim();
  return id ? { id } : null;
};

export const normalizeCustomerLevelDiscount = (
  value: unknown
): CustomerLevelDiscount | null => {
  if (!isObjectRecord(value) || typeof value.customer_level_id !== 'string') {
    return null;
  }

  const discountPercentage = Number(value.discount_percentage);
  return {
    customer_level_id: value.customer_level_id,
    discount_percentage: Number.isFinite(discountPercentage)
      ? discountPercentage
      : 0,
  };
};

export const normalizeCustomerLevelDiscounts = (value: unknown) =>
  Array.isArray(value)
    ? value.flatMap(discount => {
        const normalizedDiscount = normalizeCustomerLevelDiscount(discount);
        return normalizedDiscount ? [normalizedDiscount] : [];
      })
    : [];

export const normalizeItemCodeRows = (value: unknown) =>
  Array.isArray(value)
    ? value.flatMap(row => {
        if (!isObjectRecord(row)) {
          return [];
        }

        const { code } = row;
        if (code === null || typeof code === 'string') {
          return [{ code }];
        }

        return [];
      })
    : [];

const normalizeInventoryUnitKind = (
  value: unknown
): ItemInventoryUnit['kind'] | null =>
  value === 'packaging' || value === 'retail_unit' || value === 'custom'
    ? value
    : null;

const normalizeOptionalString = (value: unknown) =>
  typeof value === 'string' || value === null ? value : null;

export const normalizeItemInventoryUnit = (
  value: unknown
): ItemInventoryUnit | null => {
  if (!isObjectRecord(value)) {
    return null;
  }

  const { id, kind, name } = value;
  const normalizedKind = normalizeInventoryUnitKind(kind);
  if (typeof id !== 'string' || typeof name !== 'string' || !normalizedKind) {
    return null;
  }

  return {
    id,
    code: typeof value.code === 'string' ? value.code : undefined,
    name,
    description: normalizeOptionalString(value.description),
    kind: normalizedKind,
    source_package_id: normalizeOptionalString(value.source_package_id),
    source_dosage_id: normalizeOptionalString(value.source_dosage_id),
    created_at:
      typeof value.created_at === 'string' ? value.created_at : undefined,
    updated_at: normalizeOptionalString(value.updated_at),
  };
};

export const normalizeItemInventoryUnits = (value: unknown) =>
  Array.isArray(value)
    ? value.flatMap(unit => {
        const normalizedUnit = normalizeItemInventoryUnit(unit);
        return normalizedUnit ? [normalizedUnit] : [];
      })
    : [];

const requireItemInventoryUnit = (
  value: unknown,
  context: string
): ItemInventoryUnit => {
  const normalizedUnit = normalizeItemInventoryUnit(value);
  if (!normalizedUnit) {
    throw new Error(`${context} inventory unit response is malformed`);
  }

  return normalizedUnit;
};

export const itemDataService = {
  async fetchItemDataById(
    id: string
  ): Promise<ServiceResponse<ItemDataRecord>> {
    try {
      const { data, error } = await supabase
        .from('items')
        .select(
          `
          *, updated_at,
          manufacturer_id,
          package_id,
          base_inventory_unit:item_inventory_units!items_base_inventory_unit_id_fkey(
            id,
            code,
            name,
            kind,
            source_package_id,
            source_dosage_id,
            description
          ),
          item_unit_hierarchy(
            id,
            item_id,
            inventory_unit_id,
            parent_inventory_unit_id,
            contains_quantity,
            factor_to_base,
            base_price_override,
            sell_price_override,
            inventory_unit:item_inventory_units!item_unit_hierarchy_inventory_unit_id_fkey(
              id,
              code,
              name,
              kind,
              source_package_id,
              source_dosage_id,
              description
            ),
            parent_unit:item_inventory_units!item_unit_hierarchy_parent_inventory_unit_id_fkey(
              id,
              code,
              name,
              kind,
              source_package_id,
              source_dosage_id,
              description
            )
          ),
          customer_level_discounts (customer_level_id, discount_percentage)
        `
        )
        .eq('id', id)
        .returns<ItemDataRecord[]>()
        .single();

      if (error || !data) {
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error: toServiceError(error) };
    }
  },

  async updateItemFields<TPayload extends object>(
    itemId: string,
    updates: TPayload
  ): Promise<ServiceResponse<null>> {
    try {
      const { error } = await supabase
        .from('items')
        .update(updates)
        .eq('id', itemId);

      return { data: null, error };
    } catch (error) {
      return { data: null, error: toServiceError(error) };
    }
  },

  async createItem<TPayload extends object>(
    payload: TPayload
  ): Promise<ServiceResponse<{ id: string }>> {
    try {
      const { data, error } = await supabase
        .from('items')
        .insert(payload)
        .select('id')
        .single();

      if (error || !data) {
        return { data: null, error };
      }

      const createdItem = normalizeCreatedItemResponse(data);
      if (!createdItem) {
        throw new Error('Item create response is malformed');
      }

      return { data: createdItem, error: null };
    } catch (error) {
      return { data: null, error: toServiceError(error) };
    }
  },

  async updateItemImages(
    itemId: string,
    urls: string[]
  ): Promise<ServiceResponse<null>> {
    return this.updateItemFields(itemId, { image_urls: urls });
  },

  async getCustomerLevelDiscounts(
    itemId: string
  ): Promise<ServiceResponse<CustomerLevelDiscount[]>> {
    try {
      const { data, error } = await supabase
        .from('customer_level_discounts')
        .select('customer_level_id, discount_percentage')
        .eq('item_id', itemId);

      if (error) {
        return { data: null, error };
      }

      return { data: normalizeCustomerLevelDiscounts(data), error: null };
    } catch (error) {
      return { data: null, error: toServiceError(error) };
    }
  },

  async replaceCustomerLevelDiscounts(
    itemId: string,
    discounts: CustomerLevelDiscount[]
  ): Promise<ServiceResponse<null>> {
    try {
      const { error: deleteError } = await supabase
        .from('customer_level_discounts')
        .delete()
        .eq('item_id', itemId);

      if (deleteError) {
        return { data: null, error: deleteError };
      }

      if (!discounts.length) {
        return { data: null, error: null };
      }

      const insertPayload = buildCustomerLevelDiscountInsertPayload(
        itemId,
        discounts
      );

      const { error: insertError } = await supabase
        .from('customer_level_discounts')
        .insert(insertPayload);

      return { data: null, error: insertError };
    } catch (error) {
      return { data: null, error: toServiceError(error) };
    }
  },

  async getItemCodesLike(
    pattern: string
  ): Promise<ServiceResponse<{ code: string | null }[]>> {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('code')
        .like('code', pattern);

      if (error) {
        return { data: null, error };
      }

      return { data: normalizeItemCodeRows(data), error: null };
    } catch (error) {
      return { data: null, error: toServiceError(error) };
    }
  },

  async listInventoryUnits(): Promise<ServiceResponse<ItemInventoryUnit[]>> {
    try {
      const { data, error } = await supabase
        .from('item_inventory_units')
        .select(
          'id, code, name, kind, source_package_id, source_dosage_id, description, created_at, updated_at'
        )
        .order('name', { ascending: true });

      if (error) {
        return { data: null, error };
      }

      return { data: normalizeItemInventoryUnits(data), error: null };
    } catch (error) {
      return { data: null, error: toServiceError(error) };
    }
  },

  async ensureInventoryUnitFromDosage(
    dosageId: string,
    dosageName: string
  ): Promise<ServiceResponse<ItemInventoryUnit>> {
    try {
      const { data: existingByDosage, error: existingByDosageError } =
        await supabase
          .from('item_inventory_units')
          .select(
            'id, code, name, kind, source_package_id, source_dosage_id, description, created_at, updated_at'
          )
          .eq('source_dosage_id', dosageId)
          .maybeSingle();

      if (existingByDosageError) {
        return { data: null, error: existingByDosageError };
      }

      if (existingByDosage) {
        return {
          data: requireItemInventoryUnit(existingByDosage, 'Existing dosage'),
          error: null,
        };
      }

      const { data: unitsByName, error: unitsByNameError } = await supabase
        .from('item_inventory_units')
        .select(
          'id, code, name, kind, source_package_id, source_dosage_id, description, created_at, updated_at'
        )
        .ilike('name', dosageName);

      if (unitsByNameError) {
        return { data: null, error: unitsByNameError };
      }

      const matchedByName = normalizeItemInventoryUnits(unitsByName).find(
        unit =>
          unit.name.toLowerCase() === dosageName.toLowerCase() &&
          !unit.source_package_id
      );

      if (matchedByName) {
        if (!matchedByName.source_dosage_id) {
          const { data: updatedUnit, error: updateError } = await supabase
            .from('item_inventory_units')
            .update({
              source_dosage_id: dosageId,
              kind:
                matchedByName.kind === 'packaging'
                  ? matchedByName.kind
                  : 'retail_unit',
            })
            .eq('id', matchedByName.id)
            .select(
              'id, code, name, kind, source_package_id, source_dosage_id, description, created_at, updated_at'
            )
            .single();

          if (updateError) {
            return { data: null, error: updateError };
          }

          return {
            data: requireItemInventoryUnit(updatedUnit, 'Updated dosage'),
            error: null,
          };
        }

        if (matchedByName.source_dosage_id === dosageId) {
          return { data: matchedByName, error: null };
        }
      }

      const { data: insertedUnit, error: insertError } = await supabase
        .from('item_inventory_units')
        .insert({
          name: dosageName,
          kind: 'retail_unit',
          source_dosage_id: dosageId,
        })
        .select(
          'id, code, name, kind, source_package_id, source_dosage_id, description, created_at, updated_at'
        )
        .single();

      if (insertError) {
        return { data: null, error: insertError };
      }

      return {
        data: requireItemInventoryUnit(insertedUnit, 'Inserted dosage'),
        error: null,
      };
    } catch (error) {
      return { data: null, error: toServiceError(error) };
    }
  },

  async replaceItemUnitHierarchy(
    itemId: string,
    entries: ReplaceItemUnitHierarchyEntry[]
  ): Promise<ServiceResponse<ItemUnitHierarchyEntry[]>> {
    try {
      const { error: deleteError } = await supabase
        .from('item_unit_hierarchy')
        .delete()
        .eq('item_id', itemId);

      if (deleteError) {
        return { data: null, error: deleteError };
      }

      if (!entries.length) {
        return { data: [], error: null };
      }

      const payload = buildItemUnitHierarchyInsertPayload(itemId, entries);

      const { data, error } = await supabase
        .from('item_unit_hierarchy')
        .insert(payload)
        .select(
          `
          id,
          item_id,
          inventory_unit_id,
          parent_inventory_unit_id,
          contains_quantity,
          factor_to_base,
          base_price_override,
          sell_price_override,
          inventory_unit:item_inventory_units!item_unit_hierarchy_inventory_unit_id_fkey(
            id,
            code,
            name,
            kind,
            source_package_id,
            source_dosage_id,
            description
          ),
          parent_unit:item_inventory_units!item_unit_hierarchy_parent_inventory_unit_id_fkey(
            id,
            code,
            name,
            kind,
            source_package_id,
            source_dosage_id,
            description
          )
        `
        );

      if (error) {
        return { data: null, error };
      }

      return {
        data: (data || []).map(toItemUnitHierarchyEntry),
        error: null,
      };
    } catch (error) {
      return { data: null, error: toServiceError(error) };
    }
  },
};
