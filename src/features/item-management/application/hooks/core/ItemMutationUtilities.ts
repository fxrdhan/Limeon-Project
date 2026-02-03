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

import { logger } from '@/utils/logger';
import type { ItemFormData, PackageConversion } from '../../../shared/types';
import type { CustomerLevelDiscount } from '@/types/database';
import { generateItemCodeWithSequence } from '../utils/useItemCodeGenerator';
import {
  categoryService,
  itemDosageService,
  itemManufacturerService,
  itemPackageService,
  medicineTypeService,
} from '@/services/api/masterData.service';
import { itemDataService } from '../../../infrastructure/itemData.service';
import { StorageService } from '@/services/api/storage.service';

const ITEM_IMAGE_BUCKET = 'item_images';

const isTempImageUrl = (url: string) =>
  url.startsWith('blob:') || url.startsWith('data:');

const getFileExtension = (file: File) => {
  const parts = file.name.split('.');
  const nameExtension = parts.length > 1 ? parts[parts.length - 1] : '';
  if (nameExtension) return nameExtension.toLowerCase();
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  return 'jpg';
};

const buildHistoryImagePath = (
  itemId: string,
  slotIndex: number,
  file: File
) => {
  const extension = getFileExtension(file);
  const uniqueSuffix = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  return `items/${itemId}/history/slot-${slotIndex}-${uniqueSuffix}.${extension}`;
};

const fileFromDataUrl = (dataUrl: string, filename: string) => {
  const [metadata, data] = dataUrl.split(',');
  const mimeMatch = metadata?.match(/data:(.*?);/);
  const mimeType = mimeMatch?.[1] || 'image/jpeg';
  const binary = atob(data || '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], filename, { type: mimeType });
};

const fileFromUrl = async (url: string, filename: string) => {
  if (url.startsWith('data:')) {
    return fileFromDataUrl(url, filename);
  }

  const response = await fetch(url);
  const blob = await response.blob();
  return new File([blob], filename, {
    type: blob.type || 'image/jpeg',
  });
};

const uploadPendingItemImages = async (itemId: string, imageUrls: string[]) => {
  const uploads = await Promise.all(
    imageUrls.map(async (url, index) => {
      if (!url) return '';
      if (!isTempImageUrl(url)) return url;

      try {
        const file = await fileFromUrl(url, `slot-${index + 1}.jpg`);
        const path = buildHistoryImagePath(itemId, index, file);
        const { publicUrl } = await StorageService.uploadFile(
          ITEM_IMAGE_BUCKET,
          file,
          path
        );
        return publicUrl;
      } catch (error) {
        console.error('Failed to upload item image', error);
        return '';
      }
    })
  );

  if (uploads.some(Boolean)) {
    await itemDataService.updateItemImages(itemId, uploads);
  }
};

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
    is_level_pricing_active:
      formData.is_level_pricing_active !== undefined
        ? formData.is_level_pricing_active
        : true,
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
    }));

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

  const { error } = await itemDataService.replaceCustomerLevelDiscounts(
    itemId,
    normalizedDiscounts
  );
  if (error) throw error;
};

/**
 * Helper function to check existing codes in database
 */
export const checkExistingCodes = async (
  pattern: string
): Promise<string[]> => {
  const { data, error } = await itemDataService.getItemCodesLike(pattern);

  if (error) throw error;
  return (
    data
      ?.map(item => item.code)
      .filter((code): code is string => Boolean(code)) || []
  );
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
      categoryService.getById(formData.category_id, 'code'),
      medicineTypeService.getById(formData.type_id, 'code'),
      itemPackageService.getById(formData.package_id, 'code'),
      itemDosageService.getById(formData.dosage_id, 'code'),
      itemManufacturerService.getById(formData.manufacturer_id, 'code'),
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
  const pendingImageUrls = Array.isArray(finalFormData.image_urls)
    ? finalFormData.image_urls
    : [];

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
    logger.info('Sending item update to Supabase', {
      component: 'ItemMutationUtilities',
      itemId,
      table: 'items',
      action: 'update',
    });

    const itemUpdateData = await prepareItemData(
      finalFormData,
      conversions,
      baseUnit,
      true
    );
    const { error: updateError } = await itemDataService.updateItemFields(
      itemId,
      itemUpdateData as Record<string, unknown>
    );
    if (updateError) throw updateError;

    logger.debug('Item update acknowledged by Supabase', {
      component: 'ItemMutationUtilities',
      itemId,
      table: 'items',
      action: 'update',
    });

    const discountsCount = Array.isArray(finalFormData.customer_level_discounts)
      ? finalFormData.customer_level_discounts.length
      : 0;
    logger.info('Syncing customer level discounts to Supabase', {
      component: 'ItemMutationUtilities',
      itemId,
      table: 'customer_level_discounts',
      action: 'delete+insert',
      count: discountsCount,
    });

    await syncCustomerLevelDiscounts(
      itemId,
      finalFormData.customer_level_discounts
    );

    logger.info('Item update completed', {
      component: 'ItemMutationUtilities',
      itemId,
      action: 'update',
    });
    return { action: 'update', itemId, code: finalFormData.code };
  } else {
    // Create new item
    finalFormData.image_urls = pendingImageUrls.filter(
      url => url && !isTempImageUrl(url)
    );
    const mainItemData = await prepareItemData(
      finalFormData,
      conversions,
      baseUnit,
      false
    );
    const { data: insertedItem, error: mainError } =
      await itemDataService.createItem(mainItemData as Record<string, unknown>);
    if (mainError) throw mainError;
    if (!insertedItem) {
      throw new Error('Gagal mendapatkan ID item baru setelah insert.');
    }
    if (pendingImageUrls.some(isTempImageUrl)) {
      await uploadPendingItemImages(insertedItem.id, pendingImageUrls);
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
    const { data: newCategory, error } =
      await categoryService.create(categoryData);

    if (error) throw new Error('Gagal menyimpan kategori baru.');

    const { data: updatedCategories } = await categoryService.getAll({
      select: 'id, code, name, description, created_at, updated_at',
      orderBy: { column: 'name', ascending: true },
    });

    return {
      newCategory: newCategory ?? undefined,
      updatedCategories: updatedCategories || [],
    };
  },

  async saveType(typeData: {
    code?: string;
    name: string;
    description?: string;
    address?: string;
  }) {
    const { data: newType, error } = await medicineTypeService.create(typeData);

    if (error) throw new Error('Gagal menyimpan jenis item baru.');

    const { data: updatedTypes } = await medicineTypeService.getAll({
      select: 'id, code, name, description, created_at, updated_at',
      orderBy: { column: 'name', ascending: true },
    });

    return { newType: newType ?? undefined, updatedTypes: updatedTypes || [] };
  },

  async saveUnit(unitData: {
    code?: string;
    name: string;
    description?: string;
  }) {
    const { data: newUnit, error } = await itemPackageService.create(unitData);

    if (error) throw new Error('Gagal menyimpan satuan baru.');

    const { data: updatedPackages } = await itemPackageService.getAll({
      select: 'id, code, name, description, created_at, updated_at',
      orderBy: { column: 'name', ascending: true },
    });

    return {
      newUnit: newUnit ?? undefined,
      updatedPackages: updatedPackages || [],
    };
  },

  async saveDosage(dosageData: {
    code?: string;
    name: string;
    description?: string;
    address?: string;
  }) {
    const { data: newDosage, error } =
      await itemDosageService.create(dosageData);

    if (error) throw new Error('Gagal menyimpan sediaan baru.');

    const { data: updatedDosages } = await itemDosageService.getAll({
      select: 'id, code, name, description, created_at, updated_at',
      orderBy: { column: 'name', ascending: true },
    });

    return {
      newDosage: newDosage ?? undefined,
      updatedDosages: updatedDosages || [],
    };
  },

  async saveManufacturer(manufacturerData: {
    code?: string;
    name: string;
    address?: string;
  }) {
    const { data: newManufacturer, error } =
      await itemManufacturerService.create(manufacturerData);

    if (error) throw new Error('Gagal menyimpan produsen baru.');

    const { data: updatedManufacturers } = await itemManufacturerService.getAll(
      {
        select: 'id, code, name, address, created_at, updated_at',
        orderBy: { column: 'name', ascending: true },
      }
    );

    return {
      newManufacturer: newManufacturer ?? undefined,
      updatedManufacturers: updatedManufacturers || [],
    };
  },
};
