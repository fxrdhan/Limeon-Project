import { useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { usePackageConversion } from '../utils/usePackageConversion';
import { formatDateTime, extractNumericValue } from '@/lib/formatters';
import { useConfirmDialog } from '@/components/dialog-box';
import {
  calculateProfitPercentage,
  calculateSellPriceFromMargin,
} from '../../../shared/utils/PriceCalculator';
import { useAddItemFormState } from '../form/useItemFormState';
import { useAddItemMutations } from './useItemMutations';
import { useFormCache } from '@/hooks/useFormCache';
import { useItemData } from '../data/useItemData';
import type {
  ItemFormData,
  UseItemManagementProps,
} from '../../../shared/types';

import { CACHE_KEY } from '../../../constants';

/**
 * Core Item CRUD Hook
 *
 * Provides comprehensive item management functionality including:
 * - Form state management
 * - Data validation
 * - CRUD operations
 * - Unit conversion handling
 * - Code generation via edge function
 */

export const getUnitById = async (unitName: string) => {
  try {
    const { data } = await supabase
      .from('item_packages')
      .select('id, name')
      .eq('name', unitName)
      .single();
    return data;
  } catch (error) {
    console.error('Error fetching unit:', error);
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
  const packageConversionHook = usePackageConversion();
  const confirmDialog = useConfirmDialog();

  // Initialize mutations
  const mutations = useAddItemMutations({ onClose, refetchItems });

  // Initialize cache management
  const cache = useFormCache({
    cacheKey: CACHE_KEY,
    isEditMode: formState.isEditMode,
    isDirty: () => formState.isDirty(packageConversionHook.conversions),
    isSaving: formState.saving,
  });


  // Initialize data management
  const itemData = useItemData({
    formState,
    packageConversionHook,
  });

  // Memoized wrapper functions for performance
  const calculateProfitPercentageWrapper = useCallback(
    (base_price?: number, sell_price?: number) => {
      const currentBasePrice = base_price ?? formState.formData.base_price;
      const currentSellPrice = sell_price ?? formState.formData.sell_price;
      return calculateProfitPercentage(currentBasePrice, currentSellPrice);
    },
    [formState.formData.base_price, formState.formData.sell_price]
  );

  const isDirtyWrapper = useCallback(() => {
    return formState.isDirty(packageConversionHook.conversions);
  }, [formState, packageConversionHook.conversions]);

  const setInitialDataForForm = (data?: ItemFormData) => {
    formState.setInitialDataForForm(data);

    if (data) {
      const baseUnitName =
        formState.units.find(u => u.id === data.unit_id)?.name || '';
      packageConversionHook.setBaseUnit(baseUnitName);
      packageConversionHook.setBasePrice(data.base_price || 0);
      packageConversionHook.setSellPrice(data.sell_price || 0);
    }
  };

  // Use the initialization ref from formState
  const hasInitialized = formState.hasInitialized;

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    if (itemId) {
      formState.setIsEditMode(true);
      itemData.fetchItemData(itemId);
      cache.clearCache();
    } else {
      const cachedData = cache.loadFromCache();
      if (cachedData) {
        try {
          const updatedCacheData = cache.updateCacheWithSearchQuery(
            cachedData,
            initialSearchQuery
          );
          setInitialDataForForm(updatedCacheData.formData);
          packageConversionHook.setConversions(updatedCacheData.conversions || []);
          formState.setInitialPackageConversions(
            updatedCacheData.conversions || []
          );
        } catch (e) {
          console.error('Failed to parse item form cache, starting fresh.', e);
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
        formState.isDirty(packageConversionHook.conversions) &&
        !formState.saving
      ) {
        cache.saveToCache(formState.formData, packageConversionHook.conversions);
      }
    };
  }, [cache, formState, packageConversionHook.conversions]);

  // Auto code generation is now handled by useItemCodeGeneration hook

  useEffect(() => {
    if (
      packageConversionHook.basePrice > 0 &&
      packageConversionHook.conversions.length > 0
    ) {
      packageConversionHook.recalculateBasePrices();
    }
  }, [
    packageConversionHook.basePrice,
    packageConversionHook.recalculateBasePrices,
    packageConversionHook.conversions.length,
    packageConversionHook,
  ]);

  useEffect(() => {
    packageConversionHook.setSellPrice(formState.formData.sell_price || 0);
  }, [formState.formData.sell_price, packageConversionHook]);

  // Memoized event handlers for performance
  const handleChange = useCallback(
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >
    ) => {
      formState.handleChange(e);

      // Handle unit conversion sync for price changes
      const { name, value } = e.target as HTMLInputElement;
      if (name === 'base_price') {
        const numericInt = extractNumericValue(value);
        packageConversionHook.setBasePrice(numericInt);
      } else if (name === 'sell_price') {
        const numericInt = extractNumericValue(value);
        packageConversionHook.setSellPrice(numericInt);
      }
    },
    [formState, packageConversionHook]
  );

  const handleSelectChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      formState.handleSelectChange(e);
    },
    [formState]
  );

  const handleAddNewCategory = useCallback(
    (searchTerm?: string) => {
      formState.setCurrentSearchTermForModal(searchTerm);
      formState.setIsAddEditModalOpen(true);
    },
    [formState]
  );

  const handleAddNewType = useCallback(
    (searchTerm?: string) => {
      formState.setCurrentSearchTermForModal(searchTerm);
      formState.setIsAddTypeModalOpen(true);
    },
    [formState]
  );

  const handleAddNewUnit = useCallback(
    (searchTerm?: string) => {
      formState.setCurrentSearchTermForModal(searchTerm);
      formState.setIsAddUnitModalOpen(true);
    },
    [formState]
  );

  const handleAddNewDosage = useCallback(
    (searchTerm?: string) => {
      formState.setCurrentSearchTermForModal(searchTerm);
      formState.setIsAddDosageModalOpen(true);
    },
    [formState]
  );

  const handleAddNewManufacturer = useCallback(
    (searchTerm?: string) => {
      formState.setCurrentSearchTermForModal(searchTerm);
      formState.setIsAddManufacturerModalOpen(true);
    },
    [formState]
  );

  // Use mutations from the modular hook
  const {
    addCategoryMutation,
    addTypeMutation,
    addUnitMutation,
    addDosageMutation,
    addManufacturerMutation,
    deleteItemMutation,
    saveItemMutation,
    saveCategory,
    saveType,
    saveUnit,
    saveDosage,
    saveManufacturer,
  } = mutations;

  // Memoized submit and save handlers
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      formState.setSaving(true);

      try {
        await saveItemMutation.mutateAsync({
          formData: formState.formData,
          conversions: packageConversionHook.conversions,
          baseUnit: packageConversionHook.baseUnit,
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
    },
    [
      formState,
      packageConversionHook.conversions,
      packageConversionHook.baseUnit,
      saveItemMutation,
      itemId,
      cache,
    ]
  );

  // Memoized utility functions
  const clearSearchTerm = useCallback(() => {
    formState.setCurrentSearchTermForModal(undefined);
  }, [formState]);

  const handleSaveCategory = useCallback(
    async (categoryData: {
      kode?: string;
      name: string;
      description?: string;
      address?: string;
    }) => {
      try {
        const { newCategory, updatedCategories } =
          await saveCategory(categoryData);
        if (updatedCategories) formState.setCategories(updatedCategories);
        if (newCategory?.id)
          formState.updateFormData({ category_id: newCategory.id });
        formState.setIsAddEditModalOpen(false);
        clearSearchTerm();
      } catch {
        alert('Gagal menyimpan kategori baru.');
      }
    },
    [saveCategory, formState, clearSearchTerm]
  );

  const handleSaveType = useCallback(
    async (typeData: {
      kode?: string;
      name: string;
      description?: string;
      address?: string;
    }) => {
      try {
        const { newType, updatedTypes } = await saveType(typeData);
        if (updatedTypes) formState.setTypes(updatedTypes);
        if (newType?.id) formState.updateFormData({ type_id: newType.id });
        formState.setIsAddTypeModalOpen(false);
        clearSearchTerm();
      } catch {
        alert('Gagal menyimpan jenis item baru.');
      }
    },
    [saveType, formState, clearSearchTerm]
  );

  const handleSaveUnit = useCallback(
    async (unitData: {
      kode?: string;
      name: string;
      description?: string;
      address?: string;
    }) => {
      try {
        const { newUnit, updatedUnits } = await saveUnit(unitData);
        if (updatedUnits) formState.setUnits(updatedUnits);
        if (newUnit?.id) formState.updateFormData({ unit_id: newUnit.id });
        formState.setIsAddUnitModalOpen(false);
        clearSearchTerm();
      } catch {
        alert('Gagal menyimpan kemasan baru.');
      }
    },
    [saveUnit, formState, clearSearchTerm]
  );

  const handleSaveDosage = useCallback(
    async (dosageData: {
      kode?: string;
      name: string;
      description?: string;
      address?: string;
    }) => {
      try {
        const { newDosage, updatedDosages } = await saveDosage(dosageData);
        if (updatedDosages) formState.setDosages(updatedDosages);
        if (newDosage?.id)
          formState.updateFormData({ dosage_id: newDosage.id });
        formState.setIsAddDosageModalOpen(false);
        clearSearchTerm();
      } catch {
        alert('Gagal menyimpan sediaan baru.');
      }
    },
    [saveDosage, formState, clearSearchTerm]
  );

  const handleSaveManufacturer = useCallback(
    async (manufacturerData: {
      kode?: string;
      name: string;
      address?: string;
    }) => {
      try {
        const { newManufacturer, updatedManufacturers } = await saveManufacturer(manufacturerData);
        if (updatedManufacturers) formState.setManufacturers(updatedManufacturers);
        if (newManufacturer?.id)
          formState.updateFormData({ manufacturer_id: newManufacturer.id });
        formState.setIsAddManufacturerModalOpen(false);
        clearSearchTerm();
      } catch {
        alert('Gagal menyimpan produsen baru.');
      }
    },
    [saveManufacturer, formState, clearSearchTerm]
  );

  const handleDeleteItem = () => {
    if (!itemId) return;
    confirmDialog.openConfirmDialog({
      title: 'Konfirmasi Hapus',
      message: `Apakah Anda yakin ingin menghapus item "${formState.formData.name}"? Stok terkait akan terpengaruh.`,
      variant: 'danger',
      confirmText: 'Hapus',
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
    setIsClosing?:
      | ((value: boolean) => void)
      | React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    if (isDirtyWrapper()) {
      confirmDialog.openConfirmDialog({
        title: 'Konfirmasi Keluar',
        message:
          'Apakah Anda yakin ingin meninggalkan halaman ini? Perubahan yang belum disimpan akan hilang.',
        confirmText: 'Tinggalkan',
        cancelText: 'Batal',
        onConfirm: () => {
          if (setIsClosing) {
            setIsClosing(true);
          } else {
            onClose();
          }
        },
        variant: 'danger',
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

    if (
      formState.isEditMode &&
      formState.initialFormData &&
      formState.initialPackageConversions
    ) {
      // Reset unit conversions
      packageConversionHook.resetConversions();
      const baseUnitName =
        formState.units.find(u => u.id === formState.initialFormData!.unit_id)
          ?.name || '';
      packageConversionHook.setBaseUnit(baseUnitName);
      packageConversionHook.setBasePrice(
        formState.initialFormData.base_price || 0
      );
      packageConversionHook.setSellPrice(
        formState.initialFormData.sell_price || 0
      );
      packageConversionHook.skipNextRecalculation();

      formState.initialPackageConversions.forEach(convDataFromDB => {
        const unitDetails = formState.units.find(
          u => u.name === convDataFromDB.unit_name
        );
        if (unitDetails && typeof convDataFromDB.conversion_rate === 'number') {
          packageConversionHook.addPackageConversion({
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
      // Reset unit conversions for add mode
      packageConversionHook.resetConversions();
      packageConversionHook.setBaseUnit('');
      packageConversionHook.setBasePrice(0);
      packageConversionHook.setSellPrice(0);
      cache.clearCache();
    }
  };

  // Memoized computed values
  const formattedUpdateAt = useMemo(
    () =>
      formState.formData.updated_at
        ? formatDateTime(formState.formData.updated_at)
        : '-',
    [formState.formData.updated_at]
  );

  const closeModalAndClearSearch = useCallback(
    (modalSetter: React.Dispatch<React.SetStateAction<boolean>>) => {
      modalSetter(false);
      clearSearchTerm();
    },
    [clearSearchTerm]
  );


  return {
    // Form data and state (from formState)
    formData: formState.formData,
    displayBasePrice: formState.displayBasePrice,
    displaySellPrice: formState.displaySellPrice,
    categories: formState.categories,
    types: formState.types,
    units: formState.units,
    dosages: formState.dosages,
    manufacturers: formState.manufacturers,
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
    isAddDosageModalOpen: formState.isAddDosageModalOpen,
    setIsAddDosageModalOpen: formState.setIsAddDosageModalOpen,
    isAddManufacturerModalOpen: formState.isAddManufacturerModalOpen,
    setIsAddManufacturerModalOpen: formState.setIsAddManufacturerModalOpen,

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
    handleSaveDosage,
    handleSaveManufacturer,
    handleDeleteItem,
    handleAddNewCategory,
    handleAddNewType,
    handleAddNewUnit,
    handleAddNewDosage,
    handleAddNewManufacturer,
    handleCancel,

    // Utility functions
    updateFormData: formState.updateFormData,
    isDirty: isDirtyWrapper,
    calculateProfitPercentage: calculateProfitPercentageWrapper,
    calculateSellPriceFromMargin: calculateSellPriceFromMarginWrapper,
    closeModalAndClearSearch,
    resetForm: resetFormWrapper,

    // Mutations (from mutations)
    addCategoryMutation,
    addUnitMutation,
    addTypeMutation,
    addDosageMutation,
    addManufacturerMutation,
    deleteItemMutation,

    // Setters (from formState)
    setCategories: formState.setCategories,
    setUnits: formState.setUnits,
    setTypes: formState.setTypes,
    setDosages: formState.setDosages,
    setManufacturers: formState.setManufacturers,

    // Unit conversion hook
    packageConversionHook,

    // Other utilities
    confirmDialog,
    formattedUpdateAt,
  };
};
