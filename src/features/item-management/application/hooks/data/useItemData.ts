import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { formatRupiah } from '@/lib/formatters';
import type {
  ItemFormData,
  UnitData,
  DBUnitConversion,
  UnitConversion,
} from '../../../shared/types';

interface UseItemDataProps {
  formState: {
    setLoading: (loading: boolean) => void;
    setFormData: (data: ItemFormData) => void;
    setInitialFormData: (data: ItemFormData) => void;
    setInitialUnitConversions: (conversions: UnitConversion[]) => void;
    setDisplayBasePrice: (price: string) => void;
    setDisplaySellPrice: (price: string) => void;
    units: UnitData[];
  };
  unitConversionHook: {
    setBaseUnit: (unit: string) => void;
    setBasePrice: (price: number) => void;
    setSellPrice: (price: number) => void;
    skipNextRecalculation: () => void;
    conversions: UnitConversion[];
    removeUnitConversion: (id: string) => void;
    addUnitConversion: (conversion: UnitConversion) => void;
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
  unitConversionHook,
}: UseItemDataProps) => {
  const fetchItemData = useCallback(
    async (id: string) => {
      try {
        formState.setLoading(true);

        // Fetch item data from database
        const { data: itemData, error: itemError } = await supabase
          .from('items')
          .select(
            `
          *, updated_at,
          unit_conversions,
          manufacturer
        `
          )
          .eq('id', id)
          .single();

        if (itemError) throw itemError;
        if (!itemData) throw new Error('Item tidak ditemukan');

        // Transform database data to form data structure
        const fetchedFormData: ItemFormData = {
          code: itemData.code || '',
          name: itemData.name || '',
          manufacturer: itemData.manufacturer || '',
          type_id: itemData.type_id || '',
          category_id: itemData.category_id || '',
          unit_id: itemData.unit_id || '',
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
          updated_at: itemData.updated_at,
        };

        // Set form data
        formState.setFormData(fetchedFormData);
        formState.setInitialFormData(fetchedFormData);

        // Process unit conversions for initial state
        const parsedConversionsFromDB = parseUnitConversions(
          itemData.unit_conversions
        );
        const mappedConversions = mapUnitConversions(
          parsedConversionsFromDB,
          formState.units
        );
        formState.setInitialUnitConversions(mappedConversions);

        // Set display prices
        formState.setDisplayBasePrice(formatRupiah(itemData.base_price || 0));
        formState.setDisplaySellPrice(formatRupiah(itemData.sell_price || 0));

        // Initialize unit conversion hook
        initializeUnitConversions(
          itemData,
          formState.units,
          unitConversionHook
        );
      } catch (error) {
        console.error('Error fetching item data:', error);
        alert('Gagal memuat data item. Silakan coba lagi.');
      } finally {
        formState.setLoading(false);
      }
    },
    [formState, unitConversionHook]
  );

  return {
    fetchItemData,
  };
};

/**
 * Parse unit conversions from database format
 */
function parseUnitConversions(unitConversions: unknown): DBUnitConversion[] {
  if (!unitConversions) return [];

  try {
    const parsed =
      typeof unitConversions === 'string'
        ? JSON.parse(unitConversions)
        : unitConversions;
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Error parsing unit_conversions from DB:', e);
    return [];
  }
}

/**
 * Map database unit conversions to UI format
 */
function mapUnitConversions(
  conversions: DBUnitConversion[],
  units: UnitData[]
): UnitConversion[] {
  if (!Array.isArray(conversions)) return [];

  return conversions.map((conv: DBUnitConversion) => {
    const unitDetail =
      units.find(u => u.id === conv.to_unit_id) ||
      units.find(u => u.name === conv.unit_name);

    return {
      id:
        conv.id ||
        `${Date.now().toString()}-${Math.random().toString(36).slice(2, 9)}`,
      unit_name: conv.unit_name,
      to_unit_id: unitDetail ? unitDetail.id : conv.to_unit_id || '',
      unit: unitDetail
        ? { id: unitDetail.id, name: unitDetail.name }
        : { id: conv.to_unit_id || '', name: conv.unit_name || 'Unknown Unit' },
      conversion: conv.conversion_rate || 0,
      basePrice: conv.base_price || 0,
      sellPrice: conv.sell_price || 0,
      conversion_rate: conv.conversion_rate || 0,
    };
  });
}

/**
 * Initialize unit conversion hook with database data
 */
function initializeUnitConversions(
  itemData: Record<string, unknown>,
  units: UnitData[],
  unitConversionHook: UseItemDataProps['unitConversionHook']
): void {
  // Set base unit and prices
  unitConversionHook.setBaseUnit((itemData.base_unit as string) || '');
  unitConversionHook.setBasePrice((itemData.base_price as number) || 0);
  unitConversionHook.setSellPrice((itemData.sell_price as number) || 0);
  unitConversionHook.skipNextRecalculation();

  // Clear existing conversions
  const currentConversions = [...unitConversionHook.conversions];
  for (const conv of currentConversions) {
    unitConversionHook.removeUnitConversion(conv.id);
  }

  // Parse and add new conversions
  const conversions = parseUnitConversions(itemData.unit_conversions);
  if (!Array.isArray(conversions)) return;

  for (const conv of conversions) {
    const unitDetail = units.find(u => u.name === conv.unit_name);

    if (unitDetail && typeof conv.conversion_rate === 'number') {
      // Add conversion with valid unit
      unitConversionHook.addUnitConversion({
        id:
          conv.id ||
          `${Date.now().toString()}-${Math.random().toString(36).slice(2, 9)}`,
        to_unit_id: unitDetail.id,
        unit_name: unitDetail.name,
        unit: { id: unitDetail.id, name: unitDetail.name },
        conversion: conv.conversion_rate || 0,
        basePrice: conv.base_price || 0,
        sellPrice: conv.sell_price || 0,
        conversion_rate: conv.conversion_rate || 0,
      });
    } else if (typeof conv.conversion_rate === 'number') {
      // Add conversion with placeholder unit
      console.warn(
        `Unit dengan nama "${conv.unit_name}" tidak ditemukan di daftar unit utama. Menggunakan placeholder.`
      );

      const placeholderUnit: UnitData = {
        id:
          conv.to_unit_id ||
          `temp_id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: conv.unit_name || 'Unknown Unit',
      };

      unitConversionHook.addUnitConversion({
        id:
          conv.id ||
          `${Date.now().toString()}-${Math.random().toString(36).slice(2, 9)}`,
        to_unit_id: placeholderUnit.id,
        unit_name: placeholderUnit.name,
        unit: placeholderUnit,
        conversion: conv.conversion_rate || 0,
        basePrice: conv.base_price || 0,
        sellPrice: conv.sell_price || 0,
        conversion_rate: conv.conversion_rate || 0,
      });
    }
  }
}
