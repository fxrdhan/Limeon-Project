import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useUnitConversion } from "../utils/useUnitConversion";
import { formatDateTime, extractNumericValue, formatRupiah } from "@/lib/formatters";
import { useConfirmDialog } from "@/components/dialog-box";
import { calculateProfitPercentage, calculateSellPriceFromMargin } from "../../../shared/utils/PriceCalculator";
import { useAddItemFormState } from "../form/useItemFormState";
import { useItemCodeGeneration } from "../utils/useItemCodeGenerator";
import { useAddItemMutations } from "./useItemMutations";
import { useFormCache } from "@/hooks/useFormCache";
import type {
  ItemFormData,
  UnitData,
  UseItemManagementProps,
  DBUnitConversion,
} from "../../../shared/types";

import { CACHE_KEY } from "../../../constants";

// Legacy code generation functions removed - now handled by edge function
// All item code generation logic moved to: /supabase/edge-functions/generate-item-code/

export const getUnitById = async (unitName: string) => {
  try {
    const { data } = await supabase
      .from("item_units")
      .select("id, name")
      .eq("name", unitName)
      .single();
    return data;
  } catch (error) {
    console.error("Error fetching unit:", error);
    return null;
  }
};

export const useAddItemForm = ({
  itemId,
  initialSearchQuery,
  onClose,
  refetchItems,
}: UseItemManagementProps) => {
  // Initialize modular hooks
  const formState = useAddItemFormState({ initialSearchQuery });
  const unitConversionHook = useUnitConversion();
  const confirmDialog = useConfirmDialog();
  
  // Initialize mutations
  const mutations = useAddItemMutations({ onClose, refetchItems });
  
  // Initialize cache management
  const cache = useFormCache({
    cacheKey: CACHE_KEY,
    isEditMode: formState.isEditMode,
    isDirty: () => formState.isDirty(unitConversionHook.conversions),
    isSaving: formState.saving,
  });
  
  // Initialize code generation
  const codeGeneration = useItemCodeGeneration({
    isEditMode: formState.isEditMode,
    itemId,
    formData: formState.formData,
    updateFormData: formState.updateFormData,
  });

  // Wrapper functions for backward compatibility
  const calculateProfitPercentageWrapper = (
    base_price?: number,
    sell_price?: number,
  ) => {
    const currentBasePrice = base_price ?? formState.formData.base_price;
    const currentSellPrice = sell_price ?? formState.formData.sell_price;
    return calculateProfitPercentage(currentBasePrice, currentSellPrice);
  };

  const isDirtyWrapper = () => {
    return formState.isDirty(unitConversionHook.conversions);
  };

  const setInitialDataForForm = (data?: ItemFormData) => {
    formState.setInitialDataForForm(data);
    
    if (data) {
      const baseUnitName =
        formState.units.find((u) => u.id === data.unit_id)?.name || "";
      unitConversionHook.setBaseUnit(baseUnitName);
      unitConversionHook.setBasePrice(data.base_price || 0);
      unitConversionHook.setSellPrice(data.sell_price || 0);
    }
  };

  // Use the initialization ref from formState
  const hasInitialized = formState.hasInitialized;

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    if (itemId) {
      formState.setIsEditMode(true);
      fetchItemData(itemId);
      cache.clearCache();
    } else {
      const cachedData = cache.loadFromCache();
      if (cachedData) {
        try {
          const updatedCacheData = cache.updateCacheWithSearchQuery(
            cachedData,
            initialSearchQuery,
          );
          setInitialDataForForm(updatedCacheData.formData);
          unitConversionHook.setConversions(updatedCacheData.conversions || []);
          formState.setInitialUnitConversions(updatedCacheData.conversions || []);
        } catch (e) {
          console.error("Failed to parse item form cache, starting fresh.", e);
          setInitialDataForForm();
        }
      } else {
        setInitialDataForForm();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId, initialSearchQuery, formState.units]);

  // Cache management on component unmount
  useEffect(() => {
    return () => {
      if (
        !formState.isEditMode &&
        formState.isDirty(unitConversionHook.conversions) &&
        !formState.saving
      ) {
        cache.saveToCache(formState.formData, unitConversionHook.conversions);
      }
    };
  }, [cache, formState, unitConversionHook.conversions]);

  // Auto code generation is now handled by useItemCodeGeneration hook

  useEffect(() => {
    if (
      unitConversionHook.basePrice > 0 &&
      unitConversionHook.conversions.length > 0
    ) {
      unitConversionHook.recalculateBasePrices();
    }
  }, [
    unitConversionHook.basePrice,
    unitConversionHook.recalculateBasePrices,
    unitConversionHook.conversions.length,
    unitConversionHook,
  ]);

  useEffect(() => {
    unitConversionHook.setSellPrice(formState.formData.sell_price || 0);
  }, [formState.formData.sell_price, unitConversionHook]);

  const fetchItemData = async (id: string) => {
    try {
      formState.setLoading(true);
      const { data: itemData, error: itemError } = await supabase
        .from("items")
        .select(
          `
                    *, updated_at,
                    unit_conversions,
                    manufacturer
                `,
        )
        .eq("id", id)
        .single();
      if (itemError) throw itemError;
      if (!itemData) throw new Error("Item tidak ditemukan");
      const fetchedFormData = {
        code: itemData.code || "",
        name: itemData.name || "",
        manufacturer: itemData.manufacturer || "",
        type_id: itemData.type_id || "",
        category_id: itemData.category_id || "",
        unit_id: itemData.unit_id || "",
        rack: itemData.rack || "",
        barcode: itemData.barcode || "",
        description: itemData.description || "",
        base_price: itemData.base_price || 0,
        sell_price: itemData.sell_price || 0,
        min_stock: itemData.min_stock || 10,
        is_active: itemData.is_active !== undefined ? itemData.is_active : true,
        is_medicine:
          itemData.is_medicine !== undefined ? itemData.is_medicine : true,
        has_expiry_date:
          itemData.has_expiry_date !== undefined
            ? itemData.has_expiry_date
            : false,
        updated_at: itemData.updated_at,
      };
      formState.setFormData(fetchedFormData);
      formState.setInitialFormData(fetchedFormData);

      let parsedConversionsFromDB = [];
      if (itemData.unit_conversions) {
        try {
          parsedConversionsFromDB =
            typeof itemData.unit_conversions === "string"
              ? JSON.parse(itemData.unit_conversions)
              : itemData.unit_conversions;
        } catch (e) {
          console.error("Error parsing unit_conversions from DB:", e);
          parsedConversionsFromDB = [];
        }
      }

      if (Array.isArray(parsedConversionsFromDB)) {
        const mappedConversions = parsedConversionsFromDB.map(
          (conv: DBUnitConversion) => {
            const unitDetail =
              formState.units.find((u) => u.id === conv.to_unit_id) ||
              formState.units.find((u) => u.name === conv.unit_name);
            return {
              id:
                conv.id ||
                `${Date.now().toString()}-${Math.random().toString(36).slice(2, 9)}`,
              unit_name: conv.unit_name,
              to_unit_id: unitDetail ? unitDetail.id : conv.to_unit_id || "",
              unit: unitDetail
                ? { id: unitDetail.id, name: unitDetail.name }
                : {
                    id: conv.to_unit_id || "",
                    name: conv.unit_name || "Unknown Unit",
                  },
              conversion: conv.conversion_rate || 0,
              basePrice: conv.base_price || 0,
              sellPrice: conv.sell_price || 0,
              conversion_rate: conv.conversion_rate || 0,
            };
          },
        );
        formState.setInitialUnitConversions(mappedConversions);
      } else {
        formState.setInitialUnitConversions([]);
      }
      formState.setDisplayBasePrice(formatRupiah(itemData.base_price || 0));
      formState.setDisplaySellPrice(formatRupiah(itemData.sell_price || 0));
      unitConversionHook.setBaseUnit(itemData.base_unit || "");
      unitConversionHook.setBasePrice(itemData.base_price || 0);
      unitConversionHook.setSellPrice(itemData.sell_price || 0);
      unitConversionHook.skipNextRecalculation();
      const currentConversions = [...unitConversionHook.conversions];
      for (const conv of currentConversions) {
        unitConversionHook.removeUnitConversion(conv.id);
      }
      let conversions = [];
      if (itemData.unit_conversions) {
        try {
          conversions =
            typeof itemData.unit_conversions === "string"
              ? JSON.parse(itemData.unit_conversions)
              : itemData.unit_conversions;
        } catch (e) {
          console.error("Error parsing unit_conversions:", e);
          conversions = [];
        }
      }
      if (Array.isArray(conversions)) {
        for (const conv of conversions) {
          const unitDetail = formState.units.find((u) => u.name === conv.unit_name);
          if (unitDetail && typeof conv.conversion_rate === "number") {
            unitConversionHook.addUnitConversion({
              to_unit_id: unitDetail.id,
              unit_name: unitDetail.name,
              unit: { id: unitDetail.id, name: unitDetail.name },
              conversion: conv.conversion_rate || 0,
              basePrice: conv.base_price || 0,
              sellPrice: conv.sell_price || 0,
              conversion_rate: conv.conversion_rate || 0,
            });
          } else if (typeof conv.conversion_rate === "number") {
            console.warn(
              `Unit dengan nama "${conv.unit_name}" tidak ditemukan di daftar unit utama. Menggunakan placeholder.`,
            );
            const placeholderUnit: UnitData = {
              id:
                conv.to_unit_id ||
                `temp_id_${Date.now()}_${Math.random()
                  .toString(36)
                  .substr(2, 9)}`,
              name: conv.unit_name || "Unknown Unit",
            };
            unitConversionHook.addUnitConversion({
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
    } catch (error) {
      console.error("Error fetching item data:", error);
      alert("Gagal memuat data item. Silakan coba lagi.");
    } finally {
      formState.setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    formState.handleChange(e);
    
    // Handle unit conversion sync for price changes
    const { name, value } = e.target as HTMLInputElement;
    if (name === "base_price") {
      const numericInt = extractNumericValue(value);
      unitConversionHook.setBasePrice(numericInt);
    } else if (name === "sell_price") {
      const numericInt = extractNumericValue(value);
      unitConversionHook.setSellPrice(numericInt);
    }
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    formState.handleSelectChange(e);
  };

  const handleAddNewCategory = (searchTerm?: string) => {
    formState.setCurrentSearchTermForModal(searchTerm);
    formState.setIsAddEditModalOpen(true);
  };

  const handleAddNewType = (searchTerm?: string) => {
    formState.setCurrentSearchTermForModal(searchTerm);
    formState.setIsAddTypeModalOpen(true);
  };

  const handleAddNewUnit = (searchTerm?: string) => {
    formState.setCurrentSearchTermForModal(searchTerm);
    formState.setIsAddUnitModalOpen(true);
  };

  // Use mutations from the modular hook
  const {
    addCategoryMutation,
    addTypeMutation,
    addUnitMutation,
    deleteItemMutation,
    saveItemMutation,
    saveCategory,
    saveType,
    saveUnit,
  } = mutations;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    formState.setSaving(true);
    
    try {
      await saveItemMutation.mutateAsync({
        formData: formState.formData,
        conversions: unitConversionHook.conversions,
        baseUnit: unitConversionHook.baseUnit,
        isEditMode: formState.isEditMode,
        itemId,
      });
      
      // Clear cache on successful save
      cache.clearCache();
    } catch {
      // Error handling is done in the mutation
    } finally {
      formState.setSaving(false);
    }
  };

  const handleSaveCategory = async (categoryData: {
    name: string;
    description: string;
  }) => {
    try {
      const { newCategory, updatedCategories } = await saveCategory(categoryData);
      if (updatedCategories) formState.setCategories(updatedCategories);
      if (newCategory?.id) formState.updateFormData({ category_id: newCategory.id });
      formState.setIsAddEditModalOpen(false);
      clearSearchTerm();
    } catch {
      alert("Gagal menyimpan kategori baru.");
    }
  };

  const handleSaveType = async (typeData: {
    name: string;
    description: string;
  }) => {
    try {
      const { newType, updatedTypes } = await saveType(typeData);
      if (updatedTypes) formState.setTypes(updatedTypes);
      if (newType?.id) formState.updateFormData({ type_id: newType.id });
      formState.setIsAddTypeModalOpen(false);
      clearSearchTerm();
    } catch {
      alert("Gagal menyimpan jenis item baru.");
    }
  };

  const handleSaveUnit = async (unitData: {
    name: string;
    description: string;
  }) => {
    try {
      const { newUnit, updatedUnits } = await saveUnit(unitData);
      if (updatedUnits) formState.setUnits(updatedUnits);
      if (newUnit?.id) formState.updateFormData({ unit_id: newUnit.id });
      formState.setIsAddUnitModalOpen(false);
      clearSearchTerm();
    } catch {
      alert("Gagal menyimpan satuan baru.");
    }
  };

  const handleDeleteItem = () => {
    if (!itemId) return;
    confirmDialog.openConfirmDialog({
      title: "Konfirmasi Hapus",
      message: `Apakah Anda yakin ingin menghapus item "${formState.formData.name}"? Stok terkait akan terpengaruh.`,
      variant: "danger",
      confirmText: "Hapus",
      onConfirm: () => {
        deleteItemMutation.mutate(itemId);
        cache.clearCache();
      },
    });
  };

  const calculateSellPriceFromMarginWrapper = (margin: number) => {
    return calculateSellPriceFromMargin(formState.formData.base_price, margin);
  };

  const handleCancel = (
    setIsClosing?: ((value: boolean) => void) | React.Dispatch<React.SetStateAction<boolean>>,
  ) => {
    if (isDirtyWrapper()) {
      confirmDialog.openConfirmDialog({
        title: "Konfirmasi Keluar",
        message:
          "Apakah Anda yakin ingin meninggalkan halaman ini? Perubahan yang belum disimpan akan hilang.",
        confirmText: "Tinggalkan",
        cancelText: "Batal",
        onConfirm: () => {
          if (setIsClosing) {
            setIsClosing(true);
          } else {
            onClose();
          }
        },
        variant: "danger",
      });
    } else {
      if (setIsClosing) {
        setIsClosing(true);
      } else {
        onClose();
      }
    }
  };

  const resetFormWrapper = () => {
    formState.resetForm();
    
    if (formState.isEditMode && formState.initialFormData && formState.initialUnitConversions) {
      // Reset unit conversions
      unitConversionHook.resetConversions();
      const baseUnitName =
        formState.units.find((u) => u.id === formState.initialFormData!.unit_id)?.name || "";
      unitConversionHook.setBaseUnit(baseUnitName);
      unitConversionHook.setBasePrice(formState.initialFormData.base_price || 0);
      unitConversionHook.setSellPrice(formState.initialFormData.sell_price || 0);
      unitConversionHook.skipNextRecalculation();

      formState.initialUnitConversions.forEach((convDataFromDB) => {
        const unitDetails = formState.units.find(
          (u) => u.name === convDataFromDB.unit_name,
        );
        if (unitDetails && typeof convDataFromDB.conversion_rate === "number") {
          unitConversionHook.addUnitConversion({
            to_unit_id: unitDetails.id,
            unit_name: unitDetails.name,
            unit: unitDetails,
            conversion: convDataFromDB.conversion,
            basePrice: convDataFromDB.basePrice || 0,
            sellPrice: convDataFromDB.sellPrice || 0,
            conversion_rate: convDataFromDB.conversion_rate,
          });
        }
      });
    } else {
      cache.clearCache();
    }
  };

  const formattedUpdateAt = formState.formData.updated_at
    ? formatDateTime(formState.formData.updated_at)
    : "-";

  const clearSearchTerm = () => {
    formState.setCurrentSearchTermForModal(undefined);
  };

  const closeModalAndClearSearch = (
    modalSetter: React.Dispatch<React.SetStateAction<boolean>>,
  ) => {
    modalSetter(false);
    clearSearchTerm();
  };

  // Use regenerateItemCode from the modular code generation hook
  const regenerateItemCode = codeGeneration.regenerateItemCode;


  return {
    // Form data and state (from formState)
    formData: formState.formData,
    displayBasePrice: formState.displayBasePrice,
    displaySellPrice: formState.displaySellPrice,
    categories: formState.categories,
    types: formState.types,
    units: formState.units,
    loading: formState.loading,
    saving: formState.saving,
    isEditMode: formState.isEditMode,
    
    // Modal states (from formState)
    isAddEditModalOpen: formState.isAddEditModalOpen,
    setIsAddEditModalOpen: formState.setIsAddEditModalOpen,
    isAddTypeModalOpen: formState.isAddTypeModalOpen,
    setIsAddTypeModalOpen: formState.setIsAddTypeModalOpen,
    isAddUnitModalOpen: formState.isAddUnitModalOpen,
    setIsAddUnitModalOpen: formState.setIsAddUnitModalOpen,
    
    // Editing states (from formState)
    editingMargin: formState.editingMargin,
    setEditingMargin: formState.setEditingMargin,
    marginPercentage: formState.marginPercentage,
    setMarginPercentage: formState.setMarginPercentage,
    editingMinStock: formState.editingMinStock,
    setEditingMinStock: formState.setEditingMinStock,
    minStockValue: formState.minStockValue,
    setMinStockValue: formState.setMinStockValue,
    currentSearchTermForModal: formState.currentSearchTermForModal,
    
    // Event handlers
    handleChange,
    handleSelectChange,
    handleSubmit,
    handleSaveCategory,
    handleSaveType,
    handleSaveUnit,
    handleDeleteItem,
    handleAddNewCategory,
    handleAddNewType,
    handleAddNewUnit,
    handleCancel,
    
    // Utility functions
    updateFormData: formState.updateFormData,
    isDirty: isDirtyWrapper,
    calculateProfitPercentage: calculateProfitPercentageWrapper,
    calculateSellPriceFromMargin: calculateSellPriceFromMarginWrapper,
    closeModalAndClearSearch,
    resetForm: resetFormWrapper,
    regenerateItemCode,
    
    // Mutations (from mutations)
    addCategoryMutation,
    addUnitMutation,
    addTypeMutation,
    deleteItemMutation,
    
    // Setters (from formState)
    setCategories: formState.setCategories,
    setUnits: formState.setUnits,
    setTypes: formState.setTypes,
    
    // Unit conversion hook
    unitConversionHook,
    
    // Other utilities
    confirmDialog,
    formattedUpdateAt,
  };
};
