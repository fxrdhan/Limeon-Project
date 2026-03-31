import { useCallback } from 'react';
import { formatRupiah } from '@/lib/formatters';
import toast from 'react-hot-toast';
import { logger } from '@/utils/logger';
import { itemDataService } from '../../../infrastructure/itemData.service';
import type { ItemFormData, PackageConversion } from '../../../shared/types';
import type {
  CustomerLevelDiscount,
  Item,
  ItemInventoryUnit,
} from '@/types/database';

interface UseItemDataProps {
  formState: {
    setLoading: (loading: boolean) => void;
    setFormData: (data: ItemFormData) => void;
    setInitialFormData: (data: ItemFormData) => void;
    setInitialPackageConversions: (conversions: PackageConversion[]) => void;
    setDisplayBasePrice: (price: string) => void;
    setDisplaySellPrice: (price: string) => void;
  };
  packageConversionHook: {
    setBaseUnit: (unit: string) => void;
    setBaseInventoryUnitId: (id: string) => void;
    setBaseUnitKind: (kind: 'packaging' | 'retail_unit' | 'custom') => void;
    setBasePrice: (price: number) => void;
    setSellPrice: (price: number) => void;
    skipNextRecalculation: () => void;
    setConversions: (conversions: PackageConversion[]) => void;
  };
}

/**
 * Hook for fetching and processing item data
 *
 * Handles complex data fetching, parsing, and state hydration
 * for edit mode operations.
 */
export const useItemData = ({
  formState,
  packageConversionHook,
}: UseItemDataProps) => {
  const hydrateItemData = useCallback(
    (
      itemData: Record<string, unknown> | Item,
      options?: { skipImages?: boolean }
    ) => {
      const itemRecord = itemData as Record<string, unknown>;
      const manufacturerId =
        (itemRecord.manufacturer_id as string) ||
        ((itemRecord.manufacturer as { id?: string } | undefined)?.id ?? '');

      const rawDiscounts = Array.isArray(itemRecord.customer_level_discounts)
        ? (itemRecord.customer_level_discounts as CustomerLevelDiscount[])
        : [];

      const customerLevelDiscounts = rawDiscounts
        .filter(discount => discount.customer_level_id)
        .map(discount => ({
          customer_level_id: discount.customer_level_id,
          discount_percentage: Number(discount.discount_percentage) || 0,
        }));

      const fetchedFormData: ItemFormData = {
        code: (itemRecord.code as string) || '',
        name: (itemRecord.name as string) || '',
        manufacturer_id: manufacturerId,
        type_id: (itemRecord.type_id as string) || '',
        category_id: (itemRecord.category_id as string) || '',
        package_id: (itemRecord.package_id as string) || '',
        base_inventory_unit_id:
          (itemRecord.base_inventory_unit_id as string) || '',
        dosage_id: (itemRecord.dosage_id as string) || '',
        barcode: (itemRecord.barcode as string) || '',
        description: (itemRecord.description as string) || '',
        image_urls:
          options?.skipImages === true
            ? []
            : Array.isArray(itemRecord.image_urls)
              ? (itemRecord.image_urls as string[])
              : [],
        base_price: (itemRecord.base_price as number) || 0,
        sell_price: (itemRecord.sell_price as number) || 0,
        is_level_pricing_active:
          itemRecord.is_level_pricing_active !== undefined
            ? (itemRecord.is_level_pricing_active as boolean)
            : true,
        min_stock: (itemRecord.min_stock as number) || 10,
        is_active:
          itemRecord.is_active !== undefined
            ? (itemRecord.is_active as boolean)
            : true,
        is_medicine:
          itemRecord.is_medicine !== undefined
            ? (itemRecord.is_medicine as boolean)
            : true,
        has_expiry_date:
          itemRecord.has_expiry_date !== undefined
            ? (itemRecord.has_expiry_date as boolean)
            : false,
        quantity:
          Number(itemRecord.measurement_value ?? itemRecord.quantity) || 0,
        unit_id:
          (itemRecord.measurement_unit_id as string) ||
          (itemRecord.unit_id as string) ||
          '',
        measurement_denominator_value:
          (itemRecord.measurement_denominator_value as number | null) ?? null,
        measurement_denominator_unit_id:
          (itemRecord.measurement_denominator_unit_id as string) || '',
        updated_at: itemRecord.updated_at as string | null | undefined,
        customer_level_discounts: customerLevelDiscounts,
      };

      formState.setFormData(fetchedFormData);
      formState.setInitialFormData(fetchedFormData);

      const normalizedConversions = mapItemUnitHierarchy(
        itemRecord.item_unit_hierarchy ?? itemRecord.inventory_units,
        fetchedFormData.base_price || 0,
        fetchedFormData.sell_price || 0
      );

      formState.setInitialPackageConversions(normalizedConversions);
      formState.setDisplayBasePrice(
        formatRupiah(fetchedFormData.base_price || 0)
      );
      formState.setDisplaySellPrice(
        formatRupiah(fetchedFormData.sell_price || 0)
      );

      const baseInventoryUnit = itemRecord.base_inventory_unit as
        | ItemInventoryUnit
        | undefined;
      const baseUnit =
        baseInventoryUnit?.name ||
        ((itemRecord.unit as { name?: string } | undefined)?.name ?? '') ||
        (itemRecord.base_unit as string) ||
        '';
      packageConversionHook.setBaseUnit(baseUnit);
      packageConversionHook.setBaseInventoryUnitId(
        fetchedFormData.base_inventory_unit_id
      );
      packageConversionHook.setBaseUnitKind(
        baseInventoryUnit?.kind || 'packaging'
      );
      packageConversionHook.setBasePrice(fetchedFormData.base_price || 0);
      packageConversionHook.setSellPrice(fetchedFormData.sell_price || 0);
      packageConversionHook.skipNextRecalculation();
      packageConversionHook.setConversions(normalizedConversions);
    },
    [formState, packageConversionHook]
  );

  const fetchItemData = useCallback(
    async (id: string) => {
      try {
        formState.setLoading(true);
        logger.debug('Fetching item data from Supabase', {
          component: 'useItemData',
          itemId: id,
          table: 'items',
        });

        // Fetch item data from database with manufacturer FK
        const { data: itemData, error: itemError } =
          await itemDataService.fetchItemDataById(id);

        if (itemError) throw itemError;
        if (!itemData) throw new Error('Item tidak ditemukan');

        logger.debug('Item data received from Supabase', {
          component: 'useItemData',
          itemId: id,
          table: 'items',
          hasData: Boolean(itemData),
        });

        hydrateItemData(itemData as Record<string, unknown>);
      } catch (error) {
        console.error('Error fetching item data:', error);
        logger.error('Failed to fetch item data from Supabase', error, {
          component: 'useItemData',
          itemId: id,
          table: 'items',
        });
        toast.error('Gagal memuat data item. Silakan coba lagi.');
      } finally {
        formState.setLoading(false);
      }
    },
    [formState, hydrateItemData]
  );

  return {
    fetchItemData,
    hydrateItemData,
  };
};

function mapItemUnitHierarchy(
  hierarchyData: unknown,
  basePrice: number,
  sellPrice: number
): PackageConversion[] {
  if (!Array.isArray(hierarchyData)) return [];

  return hierarchyData
    .map(row => row as Record<string, unknown>)
    .filter(row => Number(row.factor_to_base) > 1)
    .map(row => {
      const unit = row.inventory_unit as ItemInventoryUnit | undefined;
      const factorToBase = Number(row.factor_to_base) || 1;
      const basePriceOverride =
        row.base_price_override != null
          ? Number(row.base_price_override) || 0
          : null;
      const sellPriceOverride =
        row.sell_price_override != null
          ? Number(row.sell_price_override) || 0
          : null;

      return {
        id: (row.id as string) || (row.inventory_unit_id as string),
        unit_name: unit?.name || '',
        to_unit_id: (row.inventory_unit_id as string) || '',
        inventory_unit_id: (row.inventory_unit_id as string) || '',
        parent_inventory_unit_id:
          (row.parent_inventory_unit_id as string | null) || null,
        contains_quantity: Number(row.contains_quantity) || factorToBase,
        factor_to_base: factorToBase,
        conversion_rate: factorToBase,
        base_price_override: basePriceOverride,
        sell_price_override: sellPriceOverride,
        unit: unit || {
          id: (row.inventory_unit_id as string) || '',
          name: '',
          kind: 'custom',
        },
        base_price:
          basePriceOverride != null
            ? basePriceOverride
            : basePrice * factorToBase,
        sell_price:
          sellPriceOverride != null
            ? sellPriceOverride
            : sellPrice * factorToBase,
      };
    });
}
