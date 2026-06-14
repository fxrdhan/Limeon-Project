import type {
  CustomerLevelDiscount,
  ItemInventoryUnit,
  ItemUnitHierarchyEntry,
} from '@/types/database';

type InventoryUnitRelation =
  | ItemInventoryUnit
  | ItemInventoryUnit[]
  | null
  | undefined;

export interface RawItemUnitHierarchyEntry {
  id: string;
  item_id?: string | null;
  inventory_unit_id: string;
  parent_inventory_unit_id?: string | null;
  contains_quantity: number;
  factor_to_base: number;
  base_price_override?: number | null;
  sell_price_override?: number | null;
  inventory_unit: InventoryUnitRelation;
  parent_unit?: InventoryUnitRelation;
}

export interface ReplaceItemUnitHierarchyEntry {
  inventory_unit_id: string;
  parent_inventory_unit_id?: string | null;
  contains_quantity: number;
  factor_to_base: number;
  base_price_override?: number | null;
  sell_price_override?: number | null;
}

const normalizeInventoryUnitRelation = (
  relation: InventoryUnitRelation
): ItemInventoryUnit | null => {
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }
  return relation ?? null;
};

export const toItemUnitHierarchyEntry = (
  entry: RawItemUnitHierarchyEntry
): ItemUnitHierarchyEntry => ({
  id: entry.id,
  item_id: entry.item_id ?? undefined,
  inventory_unit_id: entry.inventory_unit_id,
  parent_inventory_unit_id: entry.parent_inventory_unit_id,
  contains_quantity: entry.contains_quantity,
  factor_to_base: entry.factor_to_base,
  base_price_override: entry.base_price_override,
  sell_price_override: entry.sell_price_override,
  unit:
    normalizeInventoryUnitRelation(entry.inventory_unit) ??
    ({
      id: entry.inventory_unit_id,
      name: '',
      kind: 'custom',
    } satisfies ItemInventoryUnit),
  parent_unit: normalizeInventoryUnitRelation(entry.parent_unit),
  base_price: entry.base_price_override ?? 0,
  sell_price: entry.sell_price_override ?? 0,
});

export const buildCustomerLevelDiscountInsertPayload = (
  itemId: string,
  discounts: CustomerLevelDiscount[]
) =>
  discounts.map(discount => ({
    item_id: itemId,
    customer_level_id: discount.customer_level_id,
    discount_percentage: discount.discount_percentage,
  }));

export const buildItemUnitHierarchyInsertPayload = (
  itemId: string,
  entries: ReplaceItemUnitHierarchyEntry[]
) =>
  entries.map(entry => ({
    item_id: itemId,
    inventory_unit_id: entry.inventory_unit_id,
    parent_inventory_unit_id: entry.parent_inventory_unit_id ?? null,
    contains_quantity: entry.contains_quantity,
    factor_to_base: entry.factor_to_base,
    base_price_override: entry.base_price_override ?? null,
    sell_price_override: entry.sell_price_override ?? null,
  }));
