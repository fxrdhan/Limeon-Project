import { useCallback, useEffect, useRef } from 'react';
import { formatRupiah } from '@/lib/formatters';
import toast from 'react-hot-toast';
import { logger } from '@/utils/logger';
import {
  itemDataService,
  type ItemDataRecord,
  type ItemDataUnitHierarchyEntry,
} from '../../../infrastructure/itemData.service';
import type { ItemFormData, PackageConversion } from '../../../shared/types';
import type { ItemInventoryUnit } from '@/types/database';

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
  const fetchGenerationRef = useRef(0);

  useEffect(() => {
    return () => {
      fetchGenerationRef.current += 1;
    };
  }, []);

  const hydrateItemData = useCallback(
    (itemRecord: ItemDataRecord, options?: { skipImages?: boolean }) => {
      const manufacturerId =
        itemRecord.manufacturer_id || itemRecord.manufacturer?.id || '';

      const rawDiscounts = Array.isArray(itemRecord.customer_level_discounts)
        ? itemRecord.customer_level_discounts
        : [];

      const customerLevelDiscounts = rawDiscounts
        .filter(discount => discount.customer_level_id)
        .map(discount => ({
          customer_level_id: discount.customer_level_id,
          discount_percentage: Number(discount.discount_percentage) || 0,
        }));

      const fetchedFormData: ItemFormData = {
        code: itemRecord.code || '',
        name: itemRecord.name || '',
        manufacturer_id: manufacturerId,
        type_id: itemRecord.type_id || '',
        category_id: itemRecord.category_id || '',
        package_id: itemRecord.package_id || '',
        base_inventory_unit_id: itemRecord.base_inventory_unit_id || '',
        dosage_id: itemRecord.dosage_id || '',
        barcode: itemRecord.barcode || '',
        description: itemRecord.description || '',
        image_urls:
          options?.skipImages === true
            ? []
            : Array.isArray(itemRecord.image_urls)
              ? itemRecord.image_urls
              : [],
        base_price: itemRecord.base_price || 0,
        sell_price: itemRecord.sell_price || 0,
        is_level_pricing_active: readBooleanWithUndefinedDefault(
          itemRecord.is_level_pricing_active,
          true
        ),
        min_stock: itemRecord.min_stock || 10,
        is_active: readBooleanWithUndefinedDefault(itemRecord.is_active, true),
        is_medicine: readBooleanWithUndefinedDefault(
          itemRecord.is_medicine,
          true
        ),
        has_expiry_date: readBooleanWithUndefinedDefault(
          itemRecord.has_expiry_date,
          false
        ),
        quantity:
          Number(itemRecord.measurement_value ?? itemRecord.quantity) || 0,
        unit_id: itemRecord.measurement_unit_id || itemRecord.unit_id || '',
        measurement_denominator_value:
          itemRecord.measurement_denominator_value ?? null,
        measurement_denominator_unit_id:
          itemRecord.measurement_denominator_unit_id || '',
        updated_at: itemRecord.updated_at,
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

      const baseInventoryUnit = itemRecord.base_inventory_unit ?? undefined;
      const baseUnit =
        baseInventoryUnit?.name ||
        itemRecord.unit?.name ||
        itemRecord.base_unit ||
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
      const fetchGeneration = fetchGenerationRef.current + 1;
      fetchGenerationRef.current = fetchGeneration;
      const isCurrentFetch = () =>
        fetchGenerationRef.current === fetchGeneration;

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

        if (!isCurrentFetch()) return;
        if (itemError) throw itemError;
        if (!itemData) throw new Error('Item tidak ditemukan');

        logger.debug('Item data received from Supabase', {
          component: 'useItemData',
          itemId: id,
          table: 'items',
          hasData: Boolean(itemData),
        });

        hydrateItemData(itemData);
      } catch (error) {
        if (!isCurrentFetch()) return;
        console.error('Error fetching item data:', error);
        logger.error('Failed to fetch item data from Supabase', error, {
          component: 'useItemData',
          itemId: id,
          table: 'items',
        });
        toast.error('Gagal memuat data item. Silakan coba lagi.');
      } finally {
        if (isCurrentFetch()) {
          formState.setLoading(false);
        }
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
  hierarchyData: ItemDataRecord['item_unit_hierarchy'],
  basePrice: number,
  sellPrice: number
): PackageConversion[] {
  if (!Array.isArray(hierarchyData)) return [];

  return hierarchyData
    .filter(row => Number(row.factor_to_base) > 1)
    .map(row => {
      const unit = normalizeInventoryUnitRelation(row.inventory_unit);
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
        id: row.id || row.inventory_unit_id || '',
        unit_name: unit?.name || '',
        to_unit_id: row.inventory_unit_id || '',
        inventory_unit_id: row.inventory_unit_id || '',
        parent_inventory_unit_id: row.parent_inventory_unit_id || null,
        contains_quantity: Number(row.contains_quantity) || factorToBase,
        factor_to_base: factorToBase,
        conversion_rate: factorToBase,
        base_price_override: basePriceOverride,
        sell_price_override: sellPriceOverride,
        unit: unit || {
          id: row.inventory_unit_id || '',
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

function normalizeInventoryUnitRelation(
  relation: ItemDataUnitHierarchyEntry['inventory_unit']
): ItemInventoryUnit | null {
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation ?? null;
}

function readBooleanWithUndefinedDefault(
  value: boolean | null | undefined,
  defaultValue: boolean
) {
  return value === undefined ? defaultValue : (value as boolean);
}
