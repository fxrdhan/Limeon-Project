import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { FormData, UnitConversion } from "@/types";

interface UseAddItemMutationsProps {
  onClose: () => void;
  refetchItems?: () => void;
}

/**
 * Hook for managing all CRUD operations related to items
 */
export const useAddItemMutations = ({ 
  onClose, 
  refetchItems 
}: UseAddItemMutationsProps) => {
  const queryClient = useQueryClient();

  /**
   * Mutation for adding new categories
   */
  const addCategoryMutation = useMutation({
    mutationFn: async (newCategory: { name: string; description: string }) => {
      const { data, error } = await supabase
        .from("item_categories")
        .insert(newCategory)
        .select("id, name, description")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error) => {
      console.error("Error adding category:", error);
    },
  });

  /**
   * Mutation for adding new item types
   */
  const addTypeMutation = useMutation({
    mutationFn: async (newType: { name: string; description: string }) => {
      const { data, error } = await supabase
        .from("item_types")
        .insert(newType)
        .select("id, name, description")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["types"] });
    },
    onError: (error) => {
      console.error("Error adding type:", error);
    },
  });

  /**
   * Mutation for adding new units
   */
  const addUnitMutation = useMutation({
    mutationFn: async (newUnit: { name: string; description: string }) => {
      const { data, error } = await supabase
        .from("item_units")
        .insert(newUnit)
        .select("id, name, description")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units"] });
    },
    onError: (error) => {
      console.error("Error adding unit:", error);
    },
  });

  /**
   * Mutation for deleting items
   */
  const deleteItemMutation = useMutation({
    mutationFn: async (itemIdToDelete: string) => {
      const { error } = await supabase
        .from("items")
        .delete()
        .eq("id", itemIdToDelete);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      onClose();
    },
    onError: (error) => {
      console.error("Error deleting item:", error);
      alert("Gagal menghapus item. Silakan coba lagi.");
    },
  });

  /**
   * Prepares item data for database insertion/update
   */
  const prepareItemData = (
    formData: FormData,
    conversions: UnitConversion[],
    baseUnit: string,
    isUpdate: boolean = false,
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
      rack: formData.rack || null,
      barcode: formData.barcode || null,
      code: formData.code,
      is_medicine: formData.is_medicine,
      base_unit: baseUnit,
      has_expiry_date: formData.has_expiry_date,
      unit_conversions: conversions.map((uc) => ({
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
      formData: FormData;
      conversions: UnitConversion[];
      baseUnit: string;
      isEditMode: boolean;
      itemId?: string;
    }) => {
      if (isEditMode && itemId) {
        // Update existing item
        const itemUpdateData = prepareItemData(formData, conversions, baseUnit, true);
        const { error: updateError } = await supabase
          .from("items")
          .update(itemUpdateData)
          .eq("id", itemId);
        if (updateError) throw updateError;
        return { action: "update", itemId };
      } else {
        // Create new item
        const mainItemData = prepareItemData(formData, conversions, baseUnit, false);
        const { data: insertedItem, error: mainError } = await supabase
          .from("items")
          .insert(mainItemData)
          .select("id")
          .single();
        if (mainError) throw mainError;
        if (!insertedItem) {
          throw new Error("Gagal mendapatkan ID item baru setelah insert.");
        }
        return { action: "create", itemId: insertedItem.id };
      }
    },
    onSuccess: () => {
      // Invalidate and refetch items
      queryClient.invalidateQueries({
        queryKey: ["items"],
        refetchType: "all",
      });

      // Force refetch items with delays to ensure data consistency
      setTimeout(() => {
        queryClient.refetchQueries({
          queryKey: ["items"],
          type: "all",
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
    onError: (error) => {
      console.error("Error saving item:", error);
      alert("Gagal menyimpan data item. Silakan coba lagi.");
    },
  });

  /**
   * Helper functions for saving related entities
   */
  const saveCategory = async (categoryData: { name: string; description: string }) => {
    try {
      const newCategory = await addCategoryMutation.mutateAsync(categoryData);
      const { data: updatedCategories } = await supabase
        .from("item_categories")
        .select("id, name, description, updated_at")
        .order("name");
      
      return { newCategory, updatedCategories: updatedCategories || [] };
    } catch (error) {
      console.error("Error saving category:", error);
      throw new Error("Gagal menyimpan kategori baru.");
    }
  };

  const saveType = async (typeData: { name: string; description: string }) => {
    try {
      const newType = await addTypeMutation.mutateAsync(typeData);
      const { data: updatedTypes } = await supabase
        .from("item_types")
        .select("id, name, description, updated_at")
        .order("name");
      
      return { newType, updatedTypes: updatedTypes || [] };
    } catch (error) {
      console.error("Error saving type:", error);
      throw new Error("Gagal menyimpan jenis item baru.");
    }
  };

  const saveUnit = async (unitData: { name: string; description: string }) => {
    try {
      const newUnit = await addUnitMutation.mutateAsync(unitData);
      const { data: updatedUnits } = await supabase
        .from("item_units")
        .select("id, name, description, updated_at")
        .order("name");
      
      return { newUnit, updatedUnits: updatedUnits || [] };
    } catch (error) {
      console.error("Error saving unit:", error);
      throw new Error("Gagal menyimpan satuan baru.");
    }
  };

  return {
    // Core mutations
    saveItemMutation,
    deleteItemMutation,
    addCategoryMutation,
    addTypeMutation,
    addUnitMutation,
    
    // Helper functions
    saveCategory,
    saveType,
    saveUnit,
    prepareItemData,
    
    // Loading states
    isSaving: saveItemMutation.isPending,
    isDeleting: deleteItemMutation.isPending,
  };
};