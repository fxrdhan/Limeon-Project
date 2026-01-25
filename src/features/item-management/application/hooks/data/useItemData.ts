import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { formatRupiah } from '@/lib/formatters';
import toast from 'react-hot-toast';
import type {
  ItemFormData,
  DBPackageConversion,
  PackageConversion,
} from '../../../shared/types';
import type {
  CustomerLevelDiscount,
  Item,
  ItemPackage,
} from '@/types/database';

interface UseItemDataProps {
  formState: {
    setLoading: (loading: boolean) => void;
    setFormData: (data: ItemFormData) => void;
    setInitialFormData: (data: ItemFormData) => void;
    setInitialPackageConversions: (conversions: PackageConversion[]) => void;
    setDisplayBasePrice: (price: string) => void;
    setDisplaySellPrice: (price: string) => void;
    packages: ItemPackage[];
  };
  packageConversionHook: {
    setBaseUnit: (unit: string) => void;
    setBasePrice: (price: number) => void;
    setSellPrice: (price: number) => void;
    skipNextRecalculation: () => void;
    conversions: PackageConversion[];
    removePackageConversion: (id: string) => void;
    addPackageConversion: (conversion: PackageConversion) => void;
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
    (itemData: Record<string, unknown> | Item) => {
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
        dosage_id: (itemRecord.dosage_id as string) || '',
        barcode: (itemRecord.barcode as string) || '',
        description: (itemRecord.description as string) || '',
        image_urls: Array.isArray(itemRecord.image_urls)
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
        quantity: (itemRecord.quantity as number) || 0,
        unit_id: (itemRecord.unit_id as string) || '',
        updated_at: itemRecord.updated_at as string | null | undefined,
        customer_level_discounts: customerLevelDiscounts,
      };

      formState.setFormData(fetchedFormData);
      formState.setInitialFormData(fetchedFormData);

      const parsedConversionsFromData = parsePackageConversions(
        itemRecord.package_conversions
      );
      const hasUnitDetail = parsedConversionsFromData.every(conversion => {
        return (
          typeof conversion === 'object' &&
          conversion !== null &&
          'unit' in conversion &&
          Boolean((conversion as PackageConversion).unit)
        );
      });

      const mappedConversions = hasUnitDetail
        ? (parsedConversionsFromData as PackageConversion[])
        : mapPackageConversions(parsedConversionsFromData, formState.packages);

      formState.setInitialPackageConversions(mappedConversions);
      formState.setDisplayBasePrice(
        formatRupiah(fetchedFormData.base_price || 0)
      );
      formState.setDisplaySellPrice(
        formatRupiah(fetchedFormData.sell_price || 0)
      );

      const baseUnit = (itemRecord.base_unit as string) || '';
      packageConversionHook.setBaseUnit(baseUnit);
      packageConversionHook.setBasePrice(fetchedFormData.base_price || 0);
      packageConversionHook.setSellPrice(fetchedFormData.sell_price || 0);
      packageConversionHook.skipNextRecalculation();
      packageConversionHook.setConversions(mappedConversions);
    },
    [formState, packageConversionHook]
  );

  const fetchItemData = useCallback(
    async (id: string) => {
      try {
        formState.setLoading(true);

        // Fetch item data from database with manufacturer FK
        const { data: itemData, error: itemError } = await supabase
          .from('items')
          .select(
            `
          *, updated_at,
          package_conversions,
          manufacturer_id,
          package_id,
          customer_level_discounts (customer_level_id, discount_percentage)
        `
          )
          .eq('id', id)
          .single();

        if (itemError) throw itemError;
        if (!itemData) throw new Error('Item tidak ditemukan');

        hydrateItemData(itemData as Record<string, unknown>);
      } catch (error) {
        console.error('Error fetching item data:', error);
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

/**
 * Parse package conversions from database format
 */
function parsePackageConversions(
  packageConversions: unknown
): DBPackageConversion[] {
  if (!packageConversions) return [];

  try {
    const parsed =
      typeof packageConversions === 'string'
        ? JSON.parse(packageConversions)
        : packageConversions;
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Error parsing package_conversions from DB:', e);
    return [];
  }
}

/**
 * Map database package conversions to UI format
 */
function mapPackageConversions(
  conversions: DBPackageConversion[],
  packages: ItemPackage[]
): PackageConversion[] {
  if (!Array.isArray(conversions)) return [];

  return conversions.map((conv: DBPackageConversion) => {
    const unitDetail =
      packages.find(pkg => pkg.id === conv.to_unit_id) ||
      packages.find(pkg => pkg.name === conv.unit_name);

    return {
      id:
        conv.id ||
        `${Date.now().toString()}-${Math.random().toString(36).slice(2, 9)}`,
      unit_name: conv.unit_name,
      to_unit_id: unitDetail ? unitDetail.id : conv.to_unit_id || '',
      unit: unitDetail
        ? { id: unitDetail.id, name: unitDetail.name }
        : { id: conv.to_unit_id || '', name: conv.unit_name || 'Unknown Unit' },
      conversion_rate: conv.conversion_rate || 0,
      base_price: conv.base_price || 0,
      sell_price: conv.sell_price || 0,
    };
  });
}

/**
 * Initialize package conversion hook with database data
 */
