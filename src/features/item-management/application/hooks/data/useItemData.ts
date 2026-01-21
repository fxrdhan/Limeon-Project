import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { formatRupiah } from '@/lib/formatters';
import toast from 'react-hot-toast';
import type {
  ItemFormData,
  DBPackageConversion,
  PackageConversion,
} from '../../../shared/types';
import type { ItemPackage } from '@/types/database';

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
          package_id
        `
          )
          .eq('id', id)
          .single();

        if (itemError) throw itemError;
        if (!itemData) throw new Error('Item tidak ditemukan');

        // Use manufacturer_id directly - no reverse lookup needed!
        const manufacturerId = itemData.manufacturer_id || '';

        // Transform database data to form data structure
        const fetchedFormData: ItemFormData = {
          code: itemData.code || '',
          name: itemData.name || '',
          manufacturer_id: manufacturerId,
          type_id: itemData.type_id || '',
          category_id: itemData.category_id || '',
          package_id: itemData.package_id || '',
          dosage_id: itemData.dosage_id || '',
          barcode: itemData.barcode || '',
          description: itemData.description || '',
          base_price: itemData.base_price || 0,
          sell_price: itemData.sell_price || 0,
          min_stock: itemData.min_stock || 10,
          is_active:
            itemData.is_active !== undefined ? itemData.is_active : true,
          is_medicine:
            itemData.is_medicine !== undefined ? itemData.is_medicine : true,
          has_expiry_date:
            itemData.has_expiry_date !== undefined
              ? itemData.has_expiry_date
              : false,
          quantity: itemData.quantity || 0,
          unit_id: itemData.unit_id || '',
          updated_at: itemData.updated_at,
        };

        // Set form data
        formState.setFormData(fetchedFormData);
        formState.setInitialFormData(fetchedFormData);

        // Process package conversions for initial state
        const parsedConversionsFromDB = parsePackageConversions(
          itemData.package_conversions
        );
        const mappedConversions = mapPackageConversions(
          parsedConversionsFromDB,
          formState.packages
        );
        formState.setInitialPackageConversions(mappedConversions);

        // Set display prices
        formState.setDisplayBasePrice(formatRupiah(itemData.base_price || 0));
        formState.setDisplaySellPrice(formatRupiah(itemData.sell_price || 0));

        // Initialize package conversion hook
        initializePackageConversions(
          itemData,
          formState.packages,
          packageConversionHook
        );
      } catch (error) {
        console.error('Error fetching item data:', error);
        toast.error('Gagal memuat data item. Silakan coba lagi.');
      } finally {
        formState.setLoading(false);
      }
    },
    [formState, packageConversionHook]
  );

  return {
    fetchItemData,
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
function initializePackageConversions(
  itemData: Record<string, unknown>,
  packages: ItemPackage[],
  packageConversionHook: UseItemDataProps['packageConversionHook']
): void {
  // Set base unit and prices
  packageConversionHook.setBaseUnit((itemData.base_unit as string) || '');
  packageConversionHook.setBasePrice((itemData.base_price as number) || 0);
  packageConversionHook.setSellPrice((itemData.sell_price as number) || 0);
  packageConversionHook.skipNextRecalculation();

  // Clear existing conversions
  const currentConversions = [...packageConversionHook.conversions];
  for (const conv of currentConversions) {
    packageConversionHook.removePackageConversion(conv.id);
  }

  // Parse and add new conversions
  const conversions = parsePackageConversions(itemData.package_conversions);
  if (!Array.isArray(conversions)) return;

  for (const conv of conversions) {
    const unitDetail =
      packages.find(pkg => pkg.id === conv.to_unit_id) ||
      packages.find(pkg => pkg.name === conv.unit_name);

    if (unitDetail && typeof conv.conversion_rate === 'number') {
      // Add conversion with valid unit
      packageConversionHook.addPackageConversion({
        id:
          conv.id ||
          `${Date.now().toString()}-${Math.random().toString(36).slice(2, 9)}`,
        to_unit_id: unitDetail.id,
        unit_name: unitDetail.name,
        unit: { id: unitDetail.id, name: unitDetail.name },
        conversion_rate: conv.conversion_rate || 0,
        base_price: conv.base_price || 0,
        sell_price: conv.sell_price || 0,
      });
    } else if (typeof conv.conversion_rate === 'number') {
      // Add conversion with placeholder unit
      if (packages.length > 0) {
        console.warn(
          `Kemasan dengan nama "${conv.unit_name}" tidak ditemukan di daftar kemasan. Menggunakan placeholder.`
        );
      }

      const placeholderUnit: ItemPackage = {
        id:
          conv.to_unit_id ||
          `temp_id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: conv.unit_name || 'Unknown Unit',
      };

      packageConversionHook.addPackageConversion({
        id:
          conv.id ||
          `${Date.now().toString()}-${Math.random().toString(36).slice(2, 9)}`,
        to_unit_id: placeholderUnit.id,
        unit_name: placeholderUnit.name,
        unit: placeholderUnit,
        conversion_rate: conv.conversion_rate || 0,
        base_price: conv.base_price || 0,
        sell_price: conv.sell_price || 0,
      });
    }
  }
}
