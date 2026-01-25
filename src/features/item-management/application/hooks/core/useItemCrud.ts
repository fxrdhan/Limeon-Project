import { useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';

import { usePackageConversion } from '../utils/usePackageConversion';
import { formatDateTime } from '@/lib/formatters';
import { useAddItemFormState } from '../form/useItemFormState';
import { useAddItemMutations } from './useItemMutations';
import { useItemData } from '../data/useItemData';
import {
  useItemModalOrchestrator,
  useItemCacheManager,
  useItemFormHandlers,
  useItemUserInteractions,
  useItemFormReset,
} from '../form';
import { useItemPricingLogic } from '../utils';
import type {
  ItemFormData,
  UseItemManagementProps,
} from '../../../shared/types';

/**
 * Core Item CRUD Hook
 *
 * Provides comprehensive item management functionality including:
 * - Form state management
 * - Data validation
 * - CRUD operations
 * - Unit conversion handling
 *
 * REFACTORED: Now orchestrates multiple specialized hooks while maintaining exact same API
 */

export const useAddItemForm = ({
  itemId,
  initialItemData,
  initialSearchQuery,
  onClose,
  refetchItems,
}: UseItemManagementProps) => {
  // Initialize modular hooks
  const formState = useAddItemFormState({ initialSearchQuery });
  const packageConversionHook = usePackageConversion();

  // Initialize mutations
  const mutations = useAddItemMutations({ onClose, refetchItems });

  // Initialize cache management
  const cache = useItemCacheManager({
    formState: {
      isEditMode: formState.isEditMode,
      saving: formState.saving,
      isDirty: conversions => formState.isDirty(conversions),
      formData: formState.formData,
    },
    conversions: packageConversionHook.conversions,
  });

  // Initialize data management
  const itemData = useItemData({
    formState,
    packageConversionHook,
  });

  // Initialize pricing logic
  const pricingLogic = useItemPricingLogic({
    formData: formState.formData,
  });

  // Initialize form handlers
  const formHandlers = useItemFormHandlers({
    formState,
    packageConversionHook,
  });

  // Initialize user interactions
  const userInteractions = useItemUserInteractions({
    formState: {
      formData: formState.formData,
      isDirty: conversions => formState.isDirty(conversions),
    },
    packageConversionHook,
    mutations,
    cache,
    onClose,
    itemId,
  });

  // Initialize form reset logic
  const formReset = useItemFormReset({
    formState: {
      resetForm: formState.resetForm,
      isEditMode: formState.isEditMode,
      initialFormData: formState.initialFormData,
      initialPackageConversions: formState.initialPackageConversions,
      units: formState.packages,
    },
    packageConversionHook,
    cache,
  });

  // Initialize modal orchestrator
  const modalOrchestrator = useItemModalOrchestrator({
    formState: {
      setCurrentSearchTermForModal: formState.setCurrentSearchTermForModal,
      setIsAddEditModalOpen: formState.setIsAddEditModalOpen,
      setIsAddTypeModalOpen: formState.setIsAddTypeModalOpen,
      setIsAddUnitModalOpen: formState.setIsAddUnitModalOpen,
      setIsAddDosageModalOpen: formState.setIsAddDosageModalOpen,
      setIsAddManufacturerModalOpen: formState.setIsAddManufacturerModalOpen,
      setCategories: formState.setCategories,
      setTypes: formState.setTypes,
      setPackages: formState.setPackages,
      setUnits: formState.setUnits,
      setDosages: formState.setDosages,
      setManufacturers: formState.setManufacturers,
      updateFormData: formState.updateFormData,
    },
    mutations: {
      saveCategory: mutations.saveCategory,
      saveType: mutations.saveType,
      saveUnit: mutations.saveUnit,
      saveDosage: mutations.saveDosage,
      saveManufacturer: mutations.saveManufacturer,
    },
  });

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
      if (initialItemData && initialItemData.id === itemId) {
        itemData.hydrateItemData(initialItemData);
      }
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
          setInitialDataForForm({
            ...updatedCacheData.formData,
            quantity: updatedCacheData.formData.quantity ?? 0,
            unit_id: updatedCacheData.formData.unit_id ?? '',
          });
          packageConversionHook.setConversions(
            updatedCacheData.conversions || []
          );
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
        cache.saveToCache(
          formState.formData,
          packageConversionHook.conversions
        );
      }
    };
  }, [cache, formState, packageConversionHook.conversions]);

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

  useEffect(() => {
    if (!formState.isEditMode) return;
    if (packageConversionHook.baseUnit) return;
    if (!formState.formData.package_id) return;

    const selectedPackage = formState.packages.find(
      pkg => pkg.id === formState.formData.package_id
    );
    if (selectedPackage?.name) {
      packageConversionHook.setBaseUnit(selectedPackage.name);
    }
  }, [
    formState.isEditMode,
    formState.formData.package_id,
    formState.packages,
    packageConversionHook,
  ]);

  // Use mutations from the modular hook
  const {
    addCategoryMutation,
    addTypeMutation,
    addUnitMutation,
    addDosageMutation,
    addManufacturerMutation,
    deleteItemMutation,
    saveItemMutation,
  } = mutations;

  // Memoized submit handler
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      formState.setSaving(true);

      try {
        let conversionsForSave = packageConversionHook.conversions;
        const pendingConversion =
          packageConversionHook.packageConversionFormData;

        if (
          pendingConversion.unit?.trim() &&
          pendingConversion.conversion_rate > 0
        ) {
          const selectedUnit = packageConversionHook.availableUnits.find(
            unit => unit.name === pendingConversion.unit
          );

          if (!selectedUnit) {
            toast.error('Kemasan tidak valid!');
            return;
          }

          if (
            packageConversionHook.baseUnit &&
            selectedUnit.name === packageConversionHook.baseUnit
          ) {
            toast.error(
              'Kemasan turunan tidak boleh sama dengan kemasan utama!'
            );
            return;
          }

          const existingUnit = packageConversionHook.conversions.find(
            conversion => conversion.unit.name === selectedUnit.name
          );

          if (existingUnit) {
            toast.error('Kemasan tersebut sudah ada dalam daftar!');
            return;
          }

          const calculatedBasePrice =
            packageConversionHook.basePrice > 0
              ? packageConversionHook.basePrice /
                pendingConversion.conversion_rate
              : 0;
          const calculatedSellPrice =
            packageConversionHook.sellPrice > 0
              ? packageConversionHook.sellPrice /
                pendingConversion.conversion_rate
              : 0;

          conversionsForSave = [
            ...packageConversionHook.conversions,
            {
              id: `${Date.now().toString()}-${Math.random()
                .toString(36)
                .slice(2, 9)}`,
              unit: selectedUnit,
              unit_name: selectedUnit.name,
              to_unit_id: selectedUnit.id,
              conversion_rate: pendingConversion.conversion_rate,
              base_price: calculatedBasePrice,
              sell_price: calculatedSellPrice,
            },
          ];
        }

        await saveItemMutation.mutateAsync({
          formData: formState.formData,
          conversions: conversionsForSave,
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
      packageConversionHook.packageConversionFormData,
      packageConversionHook.availableUnits,
      packageConversionHook.baseUnit,
      packageConversionHook.basePrice,
      packageConversionHook.sellPrice,
      saveItemMutation,
      itemId,
      cache,
    ]
  );

  // Memoized computed values
  const formattedUpdateAt = useMemo(
    () =>
      formState.formData.updated_at
        ? formatDateTime(formState.formData.updated_at)
        : '-',
    [formState.formData.updated_at]
  );

  return {
    // Form data and state (from formState)
    formData: formState.formData,
    displayBasePrice: formState.displayBasePrice,
    displaySellPrice: formState.displaySellPrice,
    categories: formState.categories,
    types: formState.types,
    packages: formState.packages,
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

    // Event handlers (from formHandlers and modalOrchestrator)
    handleChange: formHandlers.handleChange,
    handleSelectChange: formHandlers.handleSelectChange,
    handleSubmit,
    handleSaveCategory: modalOrchestrator.handleSaveCategory,
    handleSaveType: modalOrchestrator.handleSaveType,
    handleSaveUnit: modalOrchestrator.handleSaveUnit,
    handleSaveDosage: modalOrchestrator.handleSaveDosage,
    handleSaveManufacturer: modalOrchestrator.handleSaveManufacturer,
    handleDeleteItem: userInteractions.handleDeleteItem,
    handleAddNewCategory: modalOrchestrator.handleAddNewCategory,
    handleAddNewType: modalOrchestrator.handleAddNewType,
    handleAddNewUnit: modalOrchestrator.handleAddNewUnit,
    handleAddNewDosage: modalOrchestrator.handleAddNewDosage,
    handleAddNewManufacturer: modalOrchestrator.handleAddNewManufacturer,
    handleCancel: userInteractions.handleCancel,

    // Utility functions
    updateFormData: formState.updateFormData,
    setInitialFormData: formState.setInitialFormData,
    setInitialPackageConversions: formState.setInitialPackageConversions,
    isDirty: userInteractions.isDirty,
    calculateProfitPercentage: pricingLogic.calculateProfitPercentage,
    calculateSellPriceFromMargin: pricingLogic.calculateSellPriceFromMargin,
    closeModalAndClearSearch: modalOrchestrator.closeModalAndClearSearch,
    resetForm: formReset.resetForm,

    // Mutations (from mutations)
    addCategoryMutation,
    addUnitMutation,
    addTypeMutation,
    addDosageMutation,
    addManufacturerMutation,
    deleteItemMutation,

    // Setters (from formState)
    setCategories: formState.setCategories,
    setTypes: formState.setTypes,
    setPackages: formState.setPackages,
    setUnits: formState.setUnits,
    setDosages: formState.setDosages,
    setManufacturers: formState.setManufacturers,

    // Unit conversion hook
    packageConversionHook,

    // Other utilities
    confirmDialog: userInteractions.confirmDialog,
    formattedUpdateAt,
  };
};
