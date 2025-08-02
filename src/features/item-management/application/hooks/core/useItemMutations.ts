import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ItemFormData, UnitConversion } from '../../../shared/types';

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
      kode?: string;
      name: string;
      description?: string;
      address?: string;
    }) => {
      const { data, error } = await supabase
        .from('item_categories')
        .insert(newCategory)
        .select('id, name, description')
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
      kode?: string;
      name: string;
      description?: string;
      address?: string;
    }) => {
      const { data, error } = await supabase
        .from('item_types')
        .insert(newType)
        .select('id, name, description')
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
      kode?: string;
      name: string;
      description?: string;
      address?: string;
    }) => {
      const { data, error } = await supabase
        .from('item_units')
        .insert(newUnit)
        .select('id, name, description')
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
      kode?: string;
      name: string;
      description?: string;
      address?: string;
    }) => {
      const { data, error } = await supabase
        .from('item_dosages')
        .insert(newDosage)
        .select('id, kode, name, description')
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
  const prepareItemData = (
    formData: ItemFormData,
    conversions: UnitConversion[],
    baseUnit: string,
    isUpdate: boolean = false
  ) => {
    const baseData = {
      name: formData.name,
      manufacturer: formData.manufacturer || null,
      category_id: formData.category_id,
      type_id: formData.type_id,
      unit_id: formData.unit_id,
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
      unit_conversions: conversions.map(uc => ({
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
      conversions: UnitConversion[];
      baseUnit: string;
      isEditMode: boolean;
      itemId?: string;
    }) => {
      // Generate item code if missing (for new items) or explicitly requested
      const finalFormData = { ...formData };

      if (!isEditMode || !finalFormData.code) {
        // Generate code for new items or when code is empty
        if (
          finalFormData.type_id &&
          finalFormData.unit_id &&
          finalFormData.category_id
        ) {
          try {
            const { data, error } = await supabase.functions.invoke(
              'generate-item-code',
              {
                body: {
                  type_id: finalFormData.type_id,
                  unit_id: finalFormData.unit_id,
                  category_id: finalFormData.category_id,
                  exclude_item_id: isEditMode && itemId ? itemId : undefined,
                },
              }
            );

            if (error) {
              throw new Error(`Code generation failed: ${error.message}`);
            }

            const response = data as {
              success: boolean;
              data?: { code: string };
              error?: string;
            };

            if (!response.success) {
              throw new Error(response.error || 'Failed to generate item code');
            }

            finalFormData.code = response.data!.code;
          } catch (error) {
            console.error('Error generating item code during save:', error);
            throw new Error('Gagal generate kode item. Silakan coba lagi.');
          }
        } else {
          throw new Error(
            'Silakan lengkapi jenis, satuan, dan kategori item terlebih dahulu.'
          );
        }
      }

      if (isEditMode && itemId) {
        // Update existing item
        const itemUpdateData = prepareItemData(
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
        return { action: 'update', itemId, generatedCode: finalFormData.code };
      } else {
        // Create new item
        const mainItemData = prepareItemData(
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
          generatedCode: finalFormData.code,
        };
      }
    },
    onSuccess: result => {
      // Show success message with generated code
      if (result.generatedCode) {
        const actionText = result.action === 'create' ? 'dibuat' : 'diperbarui';
        alert(
          `Item berhasil ${actionText} dengan kode: ${result.generatedCode}`
        );
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
    kode?: string;
    name: string;
    description?: string;
    address?: string;
  }) => {
    try {
      const newCategory = await addCategoryMutation.mutateAsync(categoryData);
      const { data: updatedCategories } = await supabase
        .from('item_categories')
        .select('id, name, description, updated_at')
        .order('name');

      return { newCategory, updatedCategories: updatedCategories || [] };
    } catch (error) {
      console.error('Error saving category:', error);
      throw new Error('Gagal menyimpan kategori baru.');
    }
  };

  const saveType = async (typeData: {
    kode?: string;
    name: string;
    description?: string;
    address?: string;
  }) => {
    try {
      const newType = await addTypeMutation.mutateAsync(typeData);
      const { data: updatedTypes } = await supabase
        .from('item_types')
        .select('id, name, description, updated_at')
        .order('name');

      return { newType, updatedTypes: updatedTypes || [] };
    } catch (error) {
      console.error('Error saving type:', error);
      throw new Error('Gagal menyimpan jenis item baru.');
    }
  };

  const saveUnit = async (unitData: {
    kode?: string;
    name: string;
    description?: string;
    address?: string;
  }) => {
    try {
      const newUnit = await addUnitMutation.mutateAsync(unitData);
      const { data: updatedUnits } = await supabase
        .from('item_units')
        .select('id, name, description, updated_at')
        .order('name');

      return { newUnit, updatedUnits: updatedUnits || [] };
    } catch (error) {
      console.error('Error saving unit:', error);
      throw new Error('Gagal menyimpan satuan baru.');
    }
  };

  const saveDosage = async (dosageData: {
    kode?: string;
    name: string;
    description?: string;
    address?: string;
  }) => {
    try {
      const newDosage = await addDosageMutation.mutateAsync(dosageData);
      const { data: updatedDosages } = await supabase
        .from('item_dosages')
        .select('id, kode, name, description, created_at, updated_at')
        .order('name');

      return { newDosage, updatedDosages: updatedDosages || [] };
    } catch (error) {
      console.error('Error saving dosage:', error);
      throw new Error('Gagal menyimpan sediaan baru.');
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

    // Helper functions
    saveCategory,
    saveType,
    saveUnit,
    saveDosage,
    prepareItemData,

    // Loading states
    isSaving: saveItemMutation.isPending,
    isDeleting: deleteItemMutation.isPending,
  };
};
