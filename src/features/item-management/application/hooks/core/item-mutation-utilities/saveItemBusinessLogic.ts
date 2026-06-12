import { itemsService } from '@/services/api/items.service';
import { logger } from '@/utils/logger';
import type { PackageConversion } from '../../../../shared/types';
import type { Item } from '@/types/database';
import { itemDataService } from '../../../../infrastructure/itemData.service';
import { syncCustomerLevelDiscounts } from './customerLevelDiscounts';
import { generateItemCode } from './itemCode';
import { prepareItemData } from './itemDataPreparation';
import { isTempImageUrl, uploadPendingItemImages } from './imageUploads';
import type { SaveItemParams, SaveItemResult } from './types';

const resolveInventoryUnitId = async (
  conversion: Partial<
    Pick<PackageConversion, 'inventory_unit_id' | 'to_unit_id'>
  > & {
    unit: { id: string; name: string; source_dosage_id?: string | null };
  }
) => {
  const candidateId =
    conversion.inventory_unit_id || conversion.to_unit_id || conversion.unit.id;

  if (candidateId.startsWith('dosage:') || conversion.unit.source_dosage_id) {
    const dosageId =
      conversion.unit.source_dosage_id || candidateId.replace(/^dosage:/, '');
    const ensuredUnit = await itemDataService.ensureInventoryUnitFromDosage(
      dosageId,
      conversion.unit.name
    );

    if (ensuredUnit.error || !ensuredUnit.data) {
      throw (
        ensuredUnit.error || new Error('Gagal memastikan unit dari sediaan.')
      );
    }

    return ensuredUnit.data.id;
  }

  return candidateId;
};

const buildNormalizedHierarchyEntries = async ({
  baseInventoryUnitId,
  baseUnit,
  conversions,
  formData,
}: Pick<
  SaveItemParams,
  'baseInventoryUnitId' | 'baseUnit' | 'conversions' | 'formData'
>) => {
  const resolvedBaseInventoryUnitId = baseInventoryUnitId
    ? await resolveInventoryUnitId({
        unit: {
          id: baseInventoryUnitId,
          name: baseUnit,
          source_dosage_id: formData.dosage_id || null,
        },
        inventory_unit_id: baseInventoryUnitId,
      })
    : '';

  const resolvedUnitIdMap = new Map<string, string>();
  for (const conversion of conversions) {
    const resolvedId = await resolveInventoryUnitId(conversion);
    resolvedUnitIdMap.set(
      conversion.inventory_unit_id ||
        conversion.to_unit_id ||
        conversion.unit.id,
      resolvedId
    );
  }

  return {
    resolvedBaseInventoryUnitId,
    normalizedHierarchyEntries: [
      {
        inventory_unit_id: resolvedBaseInventoryUnitId,
        parent_inventory_unit_id: null,
        contains_quantity: 1,
        factor_to_base: 1,
        base_price_override: formData.base_price,
        sell_price_override: formData.sell_price,
      },
      ...conversions.map(conversion => ({
        inventory_unit_id:
          resolvedUnitIdMap.get(
            conversion.inventory_unit_id ||
              conversion.to_unit_id ||
              conversion.unit.id
          ) ||
          conversion.inventory_unit_id ||
          conversion.to_unit_id,
        parent_inventory_unit_id:
          resolvedUnitIdMap.get(conversion.parent_inventory_unit_id || '') ||
          (conversion.parent_inventory_unit_id === baseInventoryUnitId
            ? resolvedBaseInventoryUnitId
            : conversion.parent_inventory_unit_id) ||
          resolvedBaseInventoryUnitId,
        contains_quantity:
          conversion.contains_quantity ||
          conversion.factor_to_base ||
          conversion.conversion_rate,
        factor_to_base:
          conversion.factor_to_base || conversion.conversion_rate || 1,
        base_price_override: conversion.base_price_override ?? null,
        sell_price_override: conversion.sell_price_override ?? null,
      })),
    ].filter(entry => entry.inventory_unit_id),
  };
};

const buildFallbackSavedItem = ({
  baseInventoryUnitId,
  baseUnit,
  conversions,
  formData,
  id,
  stock = 0,
}: Pick<SaveItemParams, 'baseUnit' | 'conversions' | 'formData'> & {
  baseInventoryUnitId: string;
  id: string;
  stock?: number;
}): Item => ({
  id,
  name: formData.name,
  display_name: formData.name,
  manufacturer: {
    id: formData.manufacturer_id || undefined,
    name: '',
  },
  code: formData.code,
  barcode: formData.barcode || null,
  image_urls: formData.image_urls || [],
  base_price: formData.base_price,
  sell_price: formData.sell_price,
  is_level_pricing_active: formData.is_level_pricing_active,
  stock,
  package_id: formData.package_id,
  base_inventory_unit_id:
    baseInventoryUnitId || formData.base_inventory_unit_id || null,
  base_unit: baseUnit,
  package_conversions: conversions,
  inventory_units: [],
  customer_level_discounts: formData.customer_level_discounts,
  category: { name: '' },
  type: { name: '' },
  package: { name: baseUnit },
  unit: { name: baseUnit },
  dosage: formData.dosage_id ? { name: '' } : undefined,
  measurement_value: formData.quantity > 0 ? formData.quantity : null,
  measurement_denominator_value: formData.measurement_denominator_value ?? null,
});

export const saveItemBusinessLogic = async ({
  formData,
  conversions,
  baseUnit,
  baseInventoryUnitId,
  isEditMode,
  itemId,
}: SaveItemParams): Promise<SaveItemResult> => {
  const finalFormData = { ...formData };
  const pendingImageUrls = Array.isArray(finalFormData.image_urls)
    ? finalFormData.image_urls
    : [];
  const { normalizedHierarchyEntries, resolvedBaseInventoryUnitId } =
    await buildNormalizedHierarchyEntries({
      baseInventoryUnitId,
      baseUnit,
      conversions,
      formData,
    });

  if (!isEditMode) {
    finalFormData.code = await generateItemCode(finalFormData);
  } else if (
    !finalFormData.code?.trim() ||
    finalFormData.code.includes('[XXX]') ||
    finalFormData.code.includes('-...')
  ) {
    finalFormData.code = await generateItemCode(finalFormData);
  }

  if (isEditMode && itemId) {
    logger.info('Sending item update to Supabase', {
      component: 'ItemMutationUtilities',
      itemId,
      table: 'items',
      action: 'update',
    });

    finalFormData.image_urls = pendingImageUrls.filter(
      url => url && !isTempImageUrl(url)
    );
    const itemUpdateData = await prepareItemData(
      finalFormData,
      conversions,
      baseUnit,
      resolvedBaseInventoryUnitId,
      true
    );
    const { error: updateError } = await itemDataService.updateItemFields(
      itemId,
      itemUpdateData as Record<string, unknown>
    );
    if (updateError) throw updateError;

    const { error: hierarchyError } =
      await itemDataService.replaceItemUnitHierarchy(
        itemId,
        normalizedHierarchyEntries
      );

    if (hierarchyError) throw hierarchyError;

    if (pendingImageUrls.some(isTempImageUrl)) {
      await uploadPendingItemImages(itemId, pendingImageUrls);
    }

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
    const { data: updatedItem, error: updatedItemError } =
      await itemsService.getItemWithDetails(itemId);
    if (updatedItemError || !updatedItem) {
      logger.warn('Item update refetch failed after save', {
        component: 'ItemMutationUtilities',
        itemId,
        error: updatedItemError,
      });
    }

    return {
      action: 'update',
      itemId,
      code: finalFormData.code,
      item:
        updatedItem ??
        buildFallbackSavedItem({
          baseInventoryUnitId: resolvedBaseInventoryUnitId,
          baseUnit,
          conversions,
          formData: finalFormData,
          id: itemId,
        }),
    };
  }

  finalFormData.image_urls = pendingImageUrls.filter(
    url => url && !isTempImageUrl(url)
  );
  const mainItemData = await prepareItemData(
    finalFormData,
    conversions,
    baseUnit,
    resolvedBaseInventoryUnitId,
    false
  );
  const { data: insertedItem, error: mainError } =
    await itemDataService.createItem(mainItemData as Record<string, unknown>);
  if (mainError) throw mainError;
  if (!insertedItem) {
    throw new Error('Gagal mendapatkan ID item baru setelah insert.');
  }
  const { error: hierarchyError } =
    await itemDataService.replaceItemUnitHierarchy(
      insertedItem.id,
      normalizedHierarchyEntries
    );
  if (hierarchyError) throw hierarchyError;
  if (pendingImageUrls.some(isTempImageUrl)) {
    await uploadPendingItemImages(insertedItem.id, pendingImageUrls);
  }
  await syncCustomerLevelDiscounts(
    insertedItem.id,
    finalFormData.customer_level_discounts
  );
  const { data: createdItem, error: createdItemError } =
    await itemsService.getItemWithDetails(insertedItem.id);
  if (createdItemError || !createdItem) {
    logger.warn('Item create refetch failed after save', {
      component: 'ItemMutationUtilities',
      itemId: insertedItem.id,
      error: createdItemError,
    });
  }

  return {
    action: 'create',
    itemId: insertedItem.id,
    code: finalFormData.code,
    item:
      createdItem ??
      buildFallbackSavedItem({
        baseInventoryUnitId: resolvedBaseInventoryUnitId,
        baseUnit,
        conversions,
        formData: finalFormData,
        id: insertedItem.id,
        stock: 0,
      }),
  };
};
