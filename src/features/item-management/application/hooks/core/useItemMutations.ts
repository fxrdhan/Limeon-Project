import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ItemFormData, PackageConversion } from '../../../shared/types';
import { generateItemCodeWithSequence } from '../utils/useItemCodeGenerator';

interface UseAddItemMutationsProps {
  onClose: () => void;
  refetchItems?: () => void;
}

/**
 * Hook for managing all CRUD operations related to items
 */
export const useAddItemMutations = ({
  onClose,
  refetchItems,
}: UseAddItemMutationsProps) => {
  const queryClient = useQueryClient();

  /**
   * Mutation for adding new categories
   */
  const addCategoryMutation = useMutation({
    mutationFn: async (newCategory: {
      code?: string;
      name: string;
      description?: string;
      address?: string;
    }) => {
      const { data, error } = await supabase
        .from('item_categories')
        .insert(newCategory)
        .select('id, code, name, description, created_at, updated_at')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: error => {
      console.error('Error adding category:', error);
    },
  });

  /**
   * Mutation for adding new item types
   */
  const addTypeMutation = useMutation({
    mutationFn: async (newType: {
      code?: string;
      name: string;
      description?: string;
      address?: string;
    }) => {
      const { data, error } = await supabase
        .from('item_types')
        .insert(newType)
        .select('id, code, name, description, created_at, updated_at')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['types'] });
    },
    onError: error => {
      console.error('Error adding type:', error);
    },
  });

  /**
   * Mutation for adding new units
   */
  const addUnitMutation = useMutation({
    mutationFn: async (newUnit: {
      code?: string;
      name: string;
      description?: string;
    }) => {
      const { data, error } = await supabase
        .from('item_units')
        .insert(newUnit)
        .select('id, code, name, description, created_at, updated_at')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
    },
    onError: error => {
      console.error('Error adding unit:', error);
    },
  });

  /**
   * Mutation for adding new dosages (sediaan)
   */
  const addDosageMutation = useMutation({
    mutationFn: async (newDosage: {
      code?: string;
      name: string;
      description?: string;
      address?: string;
    }) => {
      const { data, error } = await supabase
        .from('item_dosages')
        .insert(newDosage)
        .select('id, code, name, description, created_at, updated_at')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dosages'] });
    },
    onError: error => {
      console.error('Error adding dosage:', error);
    },
  });

  /**
   * Mutation for adding new manufacturers
   */
  const addManufacturerMutation = useMutation({
    mutationFn: async (newManufacturer: {
      code?: string;
      name: string;
      address?: string;
    }) => {
      const { data, error } = await supabase
        .from('item_manufacturers')
        .insert(newManufacturer)
        .select('id, code, name, address, created_at, updated_at')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manufacturers'] });
    },
    onError: error => {
      console.error('Error adding manufacturer:', error);
    },
  });

  /**
   * Mutation for deleting items
   */
  const deleteItemMutation = useMutation({
    mutationFn: async (itemIdToDelete: string) => {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', itemIdToDelete);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      onClose();
    },
    onError: error => {
      console.error('Error deleting item:', error);
      alert('Gagal menghapus item. Silakan coba lagi.');
    },
  });

  /**
   * Prepares item data for database insertion/update
   */
  const prepareItemData = async (
    formData: ItemFormData,
    conversions: PackageConversion[],
    baseUnit: string,
    isUpdate: boolean = false
  ) => {
    // Get manufacturer name from ID
    let manufacturerName = null;
    if (formData.manufacturer_id) {
      const { data: manufacturerData } = await supabase
        .from('item_manufacturers')
        .select('name')
        .eq('id', formData.manufacturer_id)
        .single();
      manufacturerName = manufacturerData?.name || null;
    }

    const baseData = {
      name: formData.name,
      manufacturer: manufacturerName,
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
      package_conversions: conversions.map(uc => ({
        unit_name: uc.unit.name,
        to_unit_id: uc.to_unit_id,
        conversion_rate: uc.conversion_rate,
        base_price: uc.basePrice,
        sell_price: uc.sellPrice,
      })),
    };

    // Add stock field only for new items
    if (!isUpdate) {
      return { ...baseData, stock: 0 };
    }

    return baseData;
  };

  /**
   * Helper function to check existing codes in database
   */
  const checkExistingCodes = async (pattern: string): Promise<string[]> => {
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
  const generateItemCode = async (formData: ItemFormData): Promise<string> => {
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
        'Semua field kategori, jenis, kemasan, sediaan, dan produsen harus dipilih untuk generate kode.'
      );
    }

    const baseCode = parts.join('-');

    // Generate final code with sequence number
    return await generateItemCodeWithSequence(baseCode, checkExistingCodes);
  };

  /**
   * Main mutation for saving items (create or update)
   */
  const saveItemMutation = useMutation({
    mutationFn: async ({
      formData,
      conversions,
      baseUnit,
      isEditMode,
      itemId,
    }: {
      formData: ItemFormData;
      conversions: PackageConversion[];
      baseUnit: string;
      isEditMode: boolean;
      itemId?: string;
    }) => {
      const finalFormData = { ...formData };

      // For new items, auto-generate the code
      if (!isEditMode) {
        finalFormData.code = await generateItemCode(finalFormData);
      } else if (!finalFormData.code?.trim()) {
        // For edit mode, generate code only if it's empty
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
        return {
          action: 'create',
          itemId: insertedItem.id,
          code: finalFormData.code,
        };
      }
    },
    onSuccess: result => {
      // Show success message with item code
      if (result.code) {
        const actionText = result.action === 'create' ? 'dibuat' : 'diperbarui';
        alert(`Item berhasil ${actionText} dengan kode: ${result.code}`);
      }

      // Invalidate and refetch items
      queryClient.invalidateQueries({
        queryKey: ['items'],
        refetchType: 'all',
      });

      // Force refetch items with delays to ensure data consistency
      setTimeout(() => {
        queryClient.refetchQueries({
          queryKey: ['items'],
          type: 'all',
        });
      }, 100);

      // Call refetchItems callback if provided
      if (refetchItems) {
        setTimeout(() => {
          refetchItems();
        }, 150);
      }

      onClose();
    },
    onError: error => {
      console.error('Error saving item:', error);
      alert('Gagal menyimpan data item. Silakan coba lagi.');
    },
  });

  /**
   * Helper functions for saving related entities
   */
  const saveCategory = async (categoryData: {
    code?: string;
    name: string;
    description?: string;
    address?: string;
  }) => {
    try {
      const newCategory = await addCategoryMutation.mutateAsync(categoryData);
      const { data: updatedCategories } = await supabase
        .from('item_categories')
        .select('id, code, name, description, created_at, updated_at')
        .order('name');

      return { newCategory, updatedCategories: updatedCategories || [] };
    } catch (error) {
      console.error('Error saving category:', error);
      throw new Error('Gagal menyimpan kategori baru.');
    }
  };

  const saveType = async (typeData: {
    code?: string;
    name: string;
    description?: string;
    address?: string;
  }) => {
    try {
      const newType = await addTypeMutation.mutateAsync(typeData);
      const { data: updatedTypes } = await supabase
        .from('item_types')
        .select('id, code, name, description, created_at, updated_at')
        .order('name');

      return { newType, updatedTypes: updatedTypes || [] };
    } catch (error) {
      console.error('Error saving type:', error);
      throw new Error('Gagal menyimpan jenis item baru.');
    }
  };

  const saveUnit = async (unitData: {
    code?: string;
    name: string;
    description?: string;
  }) => {
    try {
      const newUnit = await addUnitMutation.mutateAsync(unitData);
      const { data: updatedUnits } = await supabase
        .from('item_units')
        .select('id, code, name, description, created_at, updated_at')
        .order('name');

      return { newUnit, updatedUnits: updatedUnits || [] };
    } catch (error) {
      console.error('Error saving unit:', error);
      throw new Error('Gagal menyimpan satuan baru.');
    }
  };

  const saveDosage = async (dosageData: {
    code?: string;
    name: string;
    description?: string;
    address?: string;
  }) => {
    try {
      const newDosage = await addDosageMutation.mutateAsync(dosageData);
      const { data: updatedDosages } = await supabase
        .from('item_dosages')
        .select('id, code, name, description, created_at, updated_at')
        .order('name');

      return { newDosage, updatedDosages: updatedDosages || [] };
    } catch (error) {
      console.error('Error saving dosage:', error);
      throw new Error('Gagal menyimpan sediaan baru.');
    }
  };

  const saveManufacturer = async (manufacturerData: {
    code?: string;
    name: string;
    address?: string;
  }) => {
    try {
      const newManufacturer =
        await addManufacturerMutation.mutateAsync(manufacturerData);
      const { data: updatedManufacturers } = await supabase
        .from('item_manufacturers')
        .select('id, code, name, address, created_at, updated_at')
        .order('name');

      return {
        newManufacturer,
        updatedManufacturers: updatedManufacturers || [],
      };
    } catch (error) {
      console.error('Error saving manufacturer:', error);
      throw new Error('Gagal menyimpan produsen baru.');
    }
  };

  return {
    // Core mutations
    saveItemMutation,
    deleteItemMutation,
    addCategoryMutation,
    addTypeMutation,
    addUnitMutation,
    addDosageMutation,
    addManufacturerMutation,

    // Helper functions
    saveCategory,
    saveType,
    saveUnit,
    saveDosage,
    saveManufacturer,
    prepareItemData,
    generateItemCode,
    checkExistingCodes,

    // Loading states
    isSaving: saveItemMutation.isPending,
    isDeleting: deleteItemMutation.isPending,
  };
};
