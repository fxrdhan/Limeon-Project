import { useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';

import { usePackageConversion } from '../utils/usePackageConversion';
import { formatDateTime } from '@/lib/formatters';
import { logger } from '@/utils/logger';
import { useAddItemFormState } from '../form/useItemFormState';
import { useAddItemMutations } from './useItemMutations';
import { useItemData } from '../data/useItemData';
import { useItemCacheManager } from '../form/useItemCacheManager';
import { useItemFormHandlers } from '../form/useItemFormHandlers';
import { useItemFormReset } from '../form/useItemFormReset';
import { useItemModalOrchestrator } from '../form/useItemModalOrchestrator';
import { useItemUserInteractions } from '../form/useItemUserInteractions';
import { useItemPricingLogic } from '../utils/useItemPricingLogic';
import type {
  ItemFormData,
  UseItemManagementProps,
} from '../../../shared/types';
import {
  getItemSubmitSelectableUnits,
  normalizeCachedItemFormData,
} from './itemCrudData';
import { prepareConversionsForSave } from './pendingPackageConversion';

/**
 * Core Item CRUD Hook
 *
 * Provides comprehensive item management functionality including:
 * - Form state management
 * - Data validation
 * - CRUD operations
 * - Unit conversion handling
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
      units: packageConversionHook.availableUnits,
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

  const {
    hasInitialized,
    setInitialDataForForm: setInitialDataForFormState,
    setInitialPackageConversions,
    setIsEditMode,
  } = formState;
  const { fetchItemData, hydrateItemData } = itemData;
  const { clearCache, loadFromCache, updateCacheWithSearchQuery } = cache;
  const { setBaseInventoryUnitId, setBasePrice, setConversions, setSellPrice } =
    packageConversionHook;

  const setInitialDataForForm = useCallback(
    (data?: ItemFormData) => {
      setInitialDataForFormState(data);

      if (data) {
        setBaseInventoryUnitId(data.base_inventory_unit_id || '');
        setBasePrice(data.base_price || 0);
        setSellPrice(data.sell_price || 0);
      }
    },
    [
      setBaseInventoryUnitId,
      setBasePrice,
      setInitialDataForFormState,
      setSellPrice,
    ]
  );

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    if (itemId) {
      setIsEditMode(true);
      if (initialItemData && initialItemData.id === itemId) {
        hydrateItemData(initialItemData);
      }
      void fetchItemData(itemId);
      clearCache();
    } else {
      const cachedData = loadFromCache();
      if (cachedData) {
        try {
          const updatedCacheData = updateCacheWithSearchQuery(
            cachedData,
            initialSearchQuery
          );
          const cachedFormData = updatedCacheData.formData as ItemFormData;
          setInitialDataForForm(normalizeCachedItemFormData(cachedFormData));
          setConversions(updatedCacheData.conversions || []);
          setInitialPackageConversions(updatedCacheData.conversions || []);
        } catch (e) {
          console.error('Failed to parse item form cache, starting fresh.', e);
          setInitialDataForForm();
        }
      } else {
        setInitialDataForForm();
      }
    }
  }, [
    clearCache,
    fetchItemData,
    hasInitialized,
    hydrateItemData,
    initialItemData,
    initialSearchQuery,
    itemId,
    loadFromCache,
    setConversions,
    setInitialDataForForm,
    setInitialPackageConversions,
    setIsEditMode,
    updateCacheWithSearchQuery,
  ]);

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
    if (
      packageConversionHook.baseUnit &&
      packageConversionHook.baseInventoryUnitId
    )
      return;
    if (!formState.formData.package_id) return;
    if (formState.formData.base_inventory_unit_id) return;

    const selectedPackage = formState.packages.find(
      pkg => pkg.id === formState.formData.package_id
    );
    if (selectedPackage?.name) {
      packageConversionHook.setBaseUnit(selectedPackage.name);
      packageConversionHook.setBaseInventoryUnitId(selectedPackage.id);
      packageConversionHook.setBaseUnitKind('packaging');
      formState.updateFormData({ base_inventory_unit_id: selectedPackage.id });
    }
  }, [
    formState.formData.base_inventory_unit_id,
    formState.formData.package_id,
    formState.packages,
    packageConversionHook,
    formState,
  ]);

  useEffect(() => {
    if (!packageConversionHook.baseInventoryUnitId) return;
    if (packageConversionHook.baseUnit) return;

    const selectedInventoryUnit = packageConversionHook.availableUnits.find(
      unit => unit.id === packageConversionHook.baseInventoryUnitId
    );

    if (selectedInventoryUnit) {
      packageConversionHook.setBaseUnit(selectedInventoryUnit.name);
      packageConversionHook.setBaseUnitKind(selectedInventoryUnit.kind);
    }
  }, [
    packageConversionHook.availableUnits,
    packageConversionHook.baseInventoryUnitId,
    packageConversionHook.baseUnit,
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
        const preparedConversions = prepareConversionsForSave({
          conversions: packageConversionHook.conversions,
          pendingConversion: packageConversionHook.packageConversionFormData,
          selectableUnits: getItemSubmitSelectableUnits({
            availableUnits: packageConversionHook.availableUnits,
            dosageId: formState.formData.dosage_id,
            dosages: formState.dosages,
          }),
          factorLookupUnits: packageConversionHook.availableUnits,
          baseInventoryUnitId: packageConversionHook.baseInventoryUnitId,
        });

        if (preparedConversions.errorMessage) {
          toast.error(preparedConversions.errorMessage);
          return;
        }

        if (formState.isEditMode) {
          logger.info('Submitting item update to Supabase', {
            component: 'useAddItemForm',
            itemId,
            conversionsCount: preparedConversions.conversions.length,
          });
        }

        await saveItemMutation.mutateAsync({
          formData: formState.formData,
          conversions: preparedConversions.conversions,
          baseUnit: packageConversionHook.baseUnit,
          baseInventoryUnitId:
            formState.formData.base_inventory_unit_id ||
            packageConversionHook.baseInventoryUnitId,
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
      packageConversionHook.baseInventoryUnitId,
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
    canUndo: formState.canUndo,
    canRedo: formState.canRedo,

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
    persistedDropdownName: formState.persistedDropdownName,
    setPersistedDropdownName: formState.setPersistedDropdownName,

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
    undoFormChange: formState.undoFormChange,
    redoFormChange: formState.redoFormChange,
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
