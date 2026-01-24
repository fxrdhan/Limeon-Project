/**
 * Item Mutation Utilities
 *
 * Extracted business logic utilities for item-specific operations that are
 * too complex/domain-specific for the generic factory system.
 *
 * This module handles:
 * - Item code generation
 * - Item data preparation
 * - Manufacturer name resolution
 * - Package conversion handling
 * - Complex item save/update logic
 */

import { supabase } from '@/lib/supabase';
import type { ItemFormData, PackageConversion } from '../../../shared/types';
import type { CustomerLevelDiscount } from '@/types/database';
import { generateItemCodeWithSequence } from '../utils/useItemCodeGenerator';

// ============================================================================
// ITEM DATA PREPARATION UTILITIES
// ============================================================================

/**
 * Prepares item data for database insertion/update
 *
 * Handles complex transformations using manufacturer_id FK,
 * package conversions, and field mapping for the items table.
 */
export const prepareItemData = async (
  formData: ItemFormData,
  conversions: PackageConversion[],
  baseUnit: string,
  isUpdate: boolean = false
) => {
  // Use manufacturer_id FK directly - no name lookup needed!
  const baseData = {
    name: formData.name,
    manufacturer_id: formData.manufacturer_id || null,
    category_id: formData.category_id,
    type_id: formData.type_id,
    package_id: formData.package_id,
    base_price: formData.base_price,
    sell_price: formData.sell_price,
    min_stock: formData.min_stock,
    description: formData.description || null,
    is_active: formData.is_active,
    dosage_id: formData.dosage_id || null,
    barcode: formData.barcode || null,
    code: formData.code,
    is_medicine: formData.is_medicine,
    base_unit: baseUnit,
    has_expiry_date: formData.has_expiry_date,
    image_urls: formData.image_urls || [],
    package_conversions: conversions.map(uc => ({
      unit_name: uc.unit.name,
      to_unit_id: uc.to_unit_id,
      conversion_rate: uc.conversion_rate,
      base_price: uc.base_price,
      sell_price: uc.sell_price,
    })),
  };

  // Add stock field only for new items
  if (!isUpdate) {
    return { ...baseData, stock: 0 };
  }

  return baseData;
};

const normalizeCustomerLevelDiscounts = (
  discounts?: CustomerLevelDiscount[]
) => {
  if (!Array.isArray(discounts)) return [];

  const normalized = discounts
    .filter(discount => discount.customer_level_id)
    .map(discount => ({
      customer_level_id: discount.customer_level_id,
      discount_percentage: Math.max(
        0,
        Number(discount.discount_percentage) || 0
      ),
    }))
    .filter(discount => discount.discount_percentage > 0);

  const uniqueByLevel = new Map<string, CustomerLevelDiscount>();
  normalized.forEach(discount => {
    uniqueByLevel.set(discount.customer_level_id, discount);
  });

  return Array.from(uniqueByLevel.values());
};

const syncCustomerLevelDiscounts = async (
  itemId: string,
  discounts?: CustomerLevelDiscount[]
) => {
  if (!Array.isArray(discounts)) return;

  const normalizedDiscounts = normalizeCustomerLevelDiscounts(discounts);

  const { error: deleteError } = await supabase
    .from('customer_level_discounts')
    .delete()
    .eq('item_id', itemId);

  if (deleteError) throw deleteError;

  if (!normalizedDiscounts.length) return;

  const insertPayload = normalizedDiscounts.map(discount => ({
    item_id: itemId,
    customer_level_id: discount.customer_level_id,
    discount_percentage: discount.discount_percentage,
  }));

  const { error: insertError } = await supabase
    .from('customer_level_discounts')
    .insert(insertPayload);

  if (insertError) throw insertError;
};

/**
 * Helper function to check existing codes in database
 */
export const checkExistingCodes = async (
  pattern: string
): Promise<string[]> => {
  const { data, error } = await supabase
    .from('items')
    .select('code')
    .like('code', pattern);

  if (error) throw error;
  return data?.map(item => item.code).filter(Boolean) || [];
};

/**
 * Generate item code based on form data
 */
export const generateItemCode = async (
  formData: ItemFormData
): Promise<string> => {
  // Fetch codes for all related entities
  const [categoryData, typeData, packageData, dosageData, manufacturerData] =
    await Promise.all([
      supabase
        .from('item_categories')
        .select('code')
        .eq('id', formData.category_id)
        .single(),
      supabase
        .from('item_types')
        .select('code')
        .eq('id', formData.type_id)
        .single(),
      supabase
        .from('item_packages')
        .select('code')
        .eq('id', formData.package_id)
        .single(),
      supabase
        .from('item_dosages')
        .select('code')
        .eq('id', formData.dosage_id)
        .single(),
      supabase
        .from('item_manufacturers')
        .select('code')
        .eq('id', formData.manufacturer_id)
        .single(),
    ]);

  // Build base code from components
  const parts = [
    categoryData.data?.code,
    typeData.data?.code,
    packageData.data?.code,
    dosageData.data?.code,
    manufacturerData.data?.code,
  ].filter(Boolean);

  if (parts.length !== 5) {
    throw new Error(
      'Semua field kategori, jenis, kemasan, sediaan, dan produsen harus dipilih untuk generate code.'
    );
  }

  const baseCode = parts.join('-');

  // Generate final code with sequence number
  return await generateItemCodeWithSequence(baseCode, checkExistingCodes);
};

// ============================================================================
// ITEM SAVE/UPDATE BUSINESS LOGIC
// ============================================================================

/**
 * Save item mutation parameters
 */
export interface SaveItemParams {
  formData: ItemFormData;
  conversions: PackageConversion[];
  baseUnit: string;
  isEditMode: boolean;
  itemId?: string;
}

/**
 * Save item result
 */
export interface SaveItemResult {
  action: 'create' | 'update';
  itemId: string;
  code: string;
}

/**
 * Core item save business logic
 *
 * Handles both create and update operations with all the complex
 * business rules like code generation, data preparation, etc.
 */
export const saveItemBusinessLogic = async ({
  formData,
  conversions,
  baseUnit,
  isEditMode,
  itemId,
}: SaveItemParams): Promise<SaveItemResult> => {
  const finalFormData = { ...formData };

  // For new items, auto-generate the code
  if (!isEditMode) {
    finalFormData.code = await generateItemCode(finalFormData);
  } else if (
    !finalFormData.code?.trim() ||
    finalFormData.code.includes('[XXX]') ||
    finalFormData.code.includes('-...')
  ) {
    // For edit mode, generate code if it's empty or contains placeholder
    finalFormData.code = await generateItemCode(finalFormData);
  }

  if (isEditMode && itemId) {
    // Update existing item
    const itemUpdateData = await prepareItemData(
      finalFormData,
      conversions,
      baseUnit,
      true
    );
    const { error: updateError } = await supabase
      .from('items')
      .update(itemUpdateData)
      .eq('id', itemId);
    if (updateError) throw updateError;
    await syncCustomerLevelDiscounts(
      itemId,
      finalFormData.customer_level_discounts
    );
    return { action: 'update', itemId, code: finalFormData.code };
  } else {
    // Create new item
    const mainItemData = await prepareItemData(
      finalFormData,
      conversions,
      baseUnit,
      false
    );
    const { data: insertedItem, error: mainError } = await supabase
      .from('items')
      .insert(mainItemData)
      .select('id')
      .single();
    if (mainError) throw mainError;
    if (!insertedItem) {
      throw new Error('Gagal mendapatkan ID item baru setelah insert.');
    }
    await syncCustomerLevelDiscounts(
      insertedItem.id,
      finalFormData.customer_level_discounts
    );
    return {
      action: 'create',
      itemId: insertedItem.id,
      code: finalFormData.code,
    };
  }
};

// ============================================================================
// ENTITY SAVE HELPER UTILITIES
// ============================================================================

/**
 * Helper functions for saving related entities (used by modal orchestrator)
 *
 * These will be replaced by the generic factory system but kept here for
 * backward compatibility during transition.
 */

export const saveEntityHelpers = {
  async saveCategory(categoryData: {
    code?: string;
    name: string;
    description?: string;
    address?: string;
  }) {
    const { data: newCategory, error } = await supabase
      .from('item_categories')
      .insert(categoryData)
      .select('id, code, name, description, created_at, updated_at')
      .single();

    if (error) throw new Error('Gagal menyimpan kategori baru.');

    const { data: updatedCategories } = await supabase
      .from('item_categories')
      .select('id, code, name, description, created_at, updated_at')
      .order('name');

    return { newCategory, updatedCategories: updatedCategories || [] };
  },

  async saveType(typeData: {
    code?: string;
    name: string;
    description?: string;
    address?: string;
  }) {
    const { data: newType, error } = await supabase
      .from('item_types')
      .insert(typeData)
      .select('id, code, name, description, created_at, updated_at')
      .single();

    if (error) throw new Error('Gagal menyimpan jenis item baru.');

    const { data: updatedTypes } = await supabase
      .from('item_types')
      .select('id, code, name, description, created_at, updated_at')
      .order('name');

    return { newType, updatedTypes: updatedTypes || [] };
  },

  async saveUnit(unitData: {
    code?: string;
    name: string;
    description?: string;
  }) {
    const { data: newUnit, error } = await supabase
      .from('item_units')
      .insert(unitData)
      .select('id, code, name, description, created_at, updated_at')
      .single();

    if (error) throw new Error('Gagal menyimpan satuan baru.');

    const { data: updatedUnits } = await supabase
      .from('item_units')
      .select('id, code, name, description, created_at, updated_at')
      .order('name');

    return { newUnit, updatedUnits: updatedUnits || [] };
  },

  async saveDosage(dosageData: {
    code?: string;
    name: string;
    description?: string;
    address?: string;
  }) {
    const { data: newDosage, error } = await supabase
      .from('item_dosages')
      .insert(dosageData)
      .select('id, code, name, description, created_at, updated_at')
      .single();

    if (error) throw new Error('Gagal menyimpan sediaan baru.');

    const { data: updatedDosages } = await supabase
      .from('item_dosages')
      .select('id, code, name, description, created_at, updated_at')
      .order('name');

    return { newDosage, updatedDosages: updatedDosages || [] };
  },

  async saveManufacturer(manufacturerData: {
    code?: string;
    name: string;
    address?: string;
  }) {
    const { data: newManufacturer, error } = await supabase
      .from('item_manufacturers')
      .insert(manufacturerData)
      .select('id, code, name, address, created_at, updated_at')
      .single();

    if (error) throw new Error('Gagal menyimpan produsen baru.');

    const { data: updatedManufacturers } = await supabase
      .from('item_manufacturers')
      .select('id, code, name, address, created_at, updated_at')
      .order('name');

    return {
      newManufacturer,
      updatedManufacturers: updatedManufacturers || [],
    };
  },
};
