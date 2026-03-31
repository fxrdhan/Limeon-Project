import { supabase } from '@/lib/supabase';
import type { PostgrestError } from '@supabase/supabase-js';
import type { ServiceResponse } from '@/services/api/base.service';
import type {
  CustomerLevelDiscount,
  ItemInventoryUnit,
  ItemUnitHierarchyEntry,
} from '@/types/database';

export const itemDataService = {
  async fetchItemDataById(
    id: string
  ): Promise<ServiceResponse<Record<string, unknown>>> {
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
        .single();

      if (error || !data) {
        return { data: null, error };
      }

      return { data: data as Record<string, unknown>, error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },

  async updateItemFields(
    itemId: string,
    updates: Record<string, unknown>
  ): Promise<ServiceResponse<null>> {
    try {
      const { error } = await supabase
        .from('items')
        .update(updates)
        .eq('id', itemId);

      return { data: null, error };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },

  async createItem(
    payload: Record<string, unknown>
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

      return { data: { id: data.id as string }, error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
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

      return { data: (data || []) as CustomerLevelDiscount[], error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
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

      const insertPayload = discounts.map(discount => ({
        item_id: itemId,
        customer_level_id: discount.customer_level_id,
        discount_percentage: discount.discount_percentage,
      }));

      const { error: insertError } = await supabase
        .from('customer_level_discounts')
        .insert(insertPayload);

      return { data: null, error: insertError };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
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

      return { data: (data || []) as { code: string | null }[], error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
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

      return { data: (data || []) as ItemInventoryUnit[], error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
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
        return { data: existingByDosage as ItemInventoryUnit, error: null };
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

      const matchedByName = (unitsByName || []).find(
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

          return { data: updatedUnit as ItemInventoryUnit, error: null };
        }

        if (matchedByName.source_dosage_id === dosageId) {
          return { data: matchedByName as ItemInventoryUnit, error: null };
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

      return { data: insertedUnit as ItemInventoryUnit, error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },

  async replaceItemUnitHierarchy(
    itemId: string,
    entries: Array<{
      inventory_unit_id: string;
      parent_inventory_unit_id?: string | null;
      contains_quantity: number;
      factor_to_base: number;
      base_price_override?: number | null;
      sell_price_override?: number | null;
    }>
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
        return { data: [] as ItemUnitHierarchyEntry[], error: null };
      }

      const payload = entries.map(entry => ({
        item_id: itemId,
        inventory_unit_id: entry.inventory_unit_id,
        parent_inventory_unit_id: entry.parent_inventory_unit_id ?? null,
        contains_quantity: entry.contains_quantity,
        factor_to_base: entry.factor_to_base,
        base_price_override: entry.base_price_override ?? null,
        sell_price_override: entry.sell_price_override ?? null,
      }));

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
        data: (data || []) as unknown as ItemUnitHierarchyEntry[],
        error: null,
      };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },
};
