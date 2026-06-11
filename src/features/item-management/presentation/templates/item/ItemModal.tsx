import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useItemModalRealtime } from '@/hooks/realtime/useItemModalRealtime';
import type { DBPackageConversion, ItemInventoryUnit } from '@/types/database';
import { logger } from '@/utils/logger';
import { useAddItemPageHandlers } from '../../../application/hooks/form/useItemPageHandlers';
import { useItemFormValidation } from '../../../application/hooks/form/useItemValidation';
import { useEntityHistory } from '../../../application/hooks/instances/useEntityHistory';
import { ItemManagementProvider } from '../../../shared/contexts/ItemFormContext';
import type {
  ItemManagementContextValue,
  ItemModalProps,
} from '../../../shared/types';
import ItemManagementContent from './ItemManagementContent';

const ItemModal: React.FC<ItemModalProps> = ({
  isOpen,
  onClose,
  itemId,
  initialItemData,
  initialSearchQuery,
  isClosing,
  setIsClosing,
  refetchItems,
}) => {
  const expiryCheckboxRef = useRef<HTMLLabelElement>(null);

  const handlers = useAddItemPageHandlers({
    itemId,
    initialItemData,
    initialSearchQuery,
    onClose,
    expiryCheckboxRef,
    refetchItems,
  });

  const {
    formData,
    displayBasePrice,
    displaySellPrice,
    categories,
    types,
    packages,
    units,
    dosages,
    manufacturers,
    saving,
    loading,
    isEditMode,
    handleChange,
    handleSubmit,
    updateFormData,
    undoFormChange,
    redoFormChange,
    canUndo,
    canRedo,
    setInitialFormData,
    setInitialPackageConversions,
    resetForm,
    isDirty,
    isAddEditModalOpen,
    setIsAddEditModalOpen,
    isAddTypeModalOpen,
    setIsAddTypeModalOpen,
    isAddUnitModalOpen,
    setIsAddUnitModalOpen,
    isAddDosageModalOpen,
    setIsAddDosageModalOpen,
    isAddManufacturerModalOpen,
    setIsAddManufacturerModalOpen,
    persistedDropdownName,
    setPersistedDropdownName,
    currentSearchTermForModal,
    handleAddNewCategory,
    handleAddNewType,
    handleAddNewUnit,
    handleAddNewDosage,
    handleAddNewManufacturer,
    closeModalAndClearSearch,
    handleCancel,
    handleDeleteItem,
    handleSaveCategory,
    handleSaveType,
    handleSaveUnit,
    handleSaveDosage,
    handleSaveManufacturer,
    addCategoryMutation,
    addTypeMutation,
    addUnitMutation,
    addDosageMutation,
    addManufacturerMutation,
    deleteItemMutation,
    packageConversionHook,
    formattedUpdateAt,
  } = handlers;

  const [viewingVersionNumber, setViewingVersionNumber] = useState<
    number | null
  >(null);
  const [resetKey, setResetKey] = useState(0);

  const { finalDisabledState } = useItemFormValidation({
    formData,
    isDirtyFn: isDirty,
    isEditMode,
    operationsPending:
      addTypeMutation.isPending ||
      addUnitMutation.isPending ||
      addCategoryMutation.isPending ||
      addManufacturerMutation.isPending ||
      deleteItemMutation.isPending,
  });

  const {
    history,
    isLoading: isHistoryLoading,
    error: historyError,
  } = useEntityHistory('items', itemId || '');

  const handleItemUpdated = useCallback(() => {
    // Smart sync handles the updates intelligently.
  }, []);

  const handleItemDeleted = useCallback(() => {
    setIsClosing(true);
  }, [setIsClosing]);

  const handleSmartUpdate = useCallback(
    (updates: Record<string, unknown>) => {
      logger.debug('Applying realtime updates in ItemModal', {
        component: 'ItemModal',
        itemId,
        fields: Object.keys(updates),
      });
      const { package_conversions, ...restUpdates } = updates;

      if (package_conversions !== undefined) {
        let parsedConversions: DBPackageConversion[] = [];
        try {
          if (typeof package_conversions === 'string') {
            const parsedValue = JSON.parse(package_conversions);
            parsedConversions = Array.isArray(parsedValue) ? parsedValue : [];
          } else if (Array.isArray(package_conversions)) {
            parsedConversions = package_conversions as DBPackageConversion[];
          }
        } catch (error) {
          console.error('Failed to parse realtime package conversions', error);
        }

        const mappedConversions = parsedConversions.map(conversion => {
          const unitDetail =
            packageConversionHook.availableUnits.find(
              unit => unit.id === conversion.to_unit_id
            ) ||
            packageConversionHook.availableUnits.find(
              unit => unit.name === conversion.unit_name
            );

          const fallbackUnit: ItemInventoryUnit = unitDetail
            ? unitDetail
            : {
                id: conversion.to_unit_id || '',
                name: conversion.unit_name || 'Unknown Unit',
                kind: 'custom',
              };

          const fallbackId =
            conversion.to_unit_id || fallbackUnit.id || conversion.unit_name;
          const rate = Number(conversion.conversion_rate) || 0;
          const baseFromDb = Number(conversion.base_price) || 0;
          const sellFromDb = Number(conversion.sell_price) || 0;

          const computedBase =
            packageConversionHook.basePrice > 0 && rate > 0
              ? packageConversionHook.basePrice * rate
              : baseFromDb;
          const computedSell =
            packageConversionHook.sellPrice > 0 && rate > 0
              ? packageConversionHook.sellPrice * rate
              : sellFromDb;

          return {
            id:
              conversion.id ||
              fallbackId ||
              `${Date.now().toString()}-${Math.random().toString(36).slice(2, 9)}`,
            unit_name: conversion.unit_name || fallbackUnit.name,
            to_unit_id: fallbackUnit.id,
            inventory_unit_id: fallbackUnit.id,
            parent_inventory_unit_id: null,
            contains_quantity: rate,
            factor_to_base: rate,
            unit: fallbackUnit,
            conversion_rate: rate,
            base_price_override: null,
            sell_price_override: null,
            base_price:
              baseFromDb === 0 && packageConversionHook.basePrice > 0
                ? computedBase
                : baseFromDb,
            sell_price:
              sellFromDb === 0 && packageConversionHook.sellPrice > 0
                ? computedSell
                : sellFromDb,
          };
        });

        packageConversionHook.skipNextRecalculation();
        packageConversionHook.setConversions(mappedConversions);
        setInitialPackageConversions(mappedConversions);
      }

      if (Object.keys(restUpdates).length > 0) {
        updateFormData(restUpdates, { recordHistory: false });
        setInitialFormData(prev =>
          prev ? ({ ...prev, ...restUpdates } as typeof prev) : prev
        );
      }
    },
    [
      itemId,
      packageConversionHook,
      setInitialFormData,
      setInitialPackageConversions,
      updateFormData,
    ]
  );

  const { smartFormSync, isConnected: isRealtimeConnected } =
    useItemModalRealtime({
      itemId: itemId,
      enabled: isOpen && isEditMode,
      onItemUpdated: handleItemUpdated,
      onItemDeleted: handleItemDeleted,
      onSmartUpdate: handleSmartUpdate,
    });

  useEffect(() => {
    if (!isOpen || !isEditMode || !itemId) return;
    logger.info('Item edit modal opened', {
      component: 'ItemModal',
      itemId,
    });
  }, [isOpen, isEditMode, itemId]);

  const currentVersionNumber =
    history && history.length > 0 ? history[0].version_number : undefined;

  const handleReset = useCallback(() => {
    resetForm();
    setResetKey(prev => prev + 1);
  }, [resetForm]);

  const handleBackdropClick = () => {
    if (!isClosing) {
      setIsClosing(true);
    }
  };

  const handleClose = () => {
    if (!isClosing) {
      setIsClosing(true);
    }
  };

  const handleVersionSelect = useCallback(
    (versionNumber: number, entityData: Record<string, unknown>) => {
      setViewingVersionNumber(versionNumber);
      updateFormData(entityData);
    },
    [updateFormData]
  );

  const handleClearVersionView = useCallback(() => {
    setViewingVersionNumber(null);
    resetForm();
    setResetKey(prev => prev + 1);
  }, [resetForm]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        isOpen &&
        !isEditMode &&
        !isClosing &&
        event.ctrlKey &&
        event.shiftKey &&
        event.key === 'R'
      ) {
        event.preventDefault();
        handleReset();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, isEditMode, isClosing, handleReset]);

  useEffect(() => {
    if (isClosing) {
      onClose();
    }
  }, [isClosing, onClose]);

  const contextValue: ItemManagementContextValue = {
    form: {
      formData,
      categories,
      types,
      packages,
      units,
      dosages,
      manufacturers,
      loading,
      isDirty,
      canUndo,
      canRedo,
    },
    realtime: {
      smartFormSync,
      isConnected: isRealtimeConnected,
    },
    ui: {
      isOpen,
      isClosing,
      isEditMode,
      formattedUpdateAt,
      resetKey,
      viewingVersionNumber,
      isViewingOldVersion:
        viewingVersionNumber !== null &&
        viewingVersionNumber !== currentVersionNumber,
    },
    modal: {
      isAddEditModalOpen,
      isAddTypeModalOpen,
      isAddUnitModalOpen,
      isAddDosageModalOpen,
      isAddManufacturerModalOpen,
      currentSearchTermForModal: currentSearchTermForModal || '',
      persistedDropdownName,
    },
    price: {
      packageConversionHook,
      displayBasePrice,
      displaySellPrice,
    },
    action: {
      saving,
      finalDisabledState,
      deleteItemMutation,
      addCategoryMutation,
      addTypeMutation,
      addUnitMutation,
      addDosageMutation,
      addManufacturerMutation,
    },
    history: {
      data: history,
      isLoading: isHistoryLoading,
      error: historyError,
    },
    formActions: {
      updateFormData,
      undoFormChange,
      redoFormChange,
      handleChange,
      handleSubmit,
      resetForm,
      setInitialPackageConversions,
    },
    uiActions: {
      handleBackdropClick,
      handleClose,
      handleReset: !isEditMode ? handleReset : undefined,
      setIsClosing,
      handleVersionSelect:
        isEditMode && itemId ? handleVersionSelect : undefined,
      handleClearVersionView,
    },
    modalActions: {
      setIsAddEditModalOpen,
      setIsAddTypeModalOpen,
      setIsAddUnitModalOpen,
      setIsAddDosageModalOpen,
      setIsAddManufacturerModalOpen,
      setPersistedDropdownName,
      closeModalAndClearSearch: (
        setter:
          | ((open: boolean) => void)
          | React.Dispatch<React.SetStateAction<boolean>>
      ) => {
        if (typeof setter === 'function') {
          closeModalAndClearSearch(
            setter as React.Dispatch<React.SetStateAction<boolean>>
          );
        }
      },
      handleAddNewCategory,
      handleAddNewType,
      handleAddNewUnit,
      handleAddNewDosage,
      handleAddNewManufacturer,
    },
    businessActions: {
      handleCancel,
      handleDeleteItem,
      handleSaveCategory,
      handleSaveType,
      handleSaveUnit,
      handleSaveDosage,
      handleSaveManufacturer,
    },
  };

  return (
    <ItemManagementProvider value={contextValue}>
      <ItemManagementContent
        key={isOpen ? `open-${itemId ?? 'new'}` : 'closed'}
        itemId={itemId}
        initialItemData={initialItemData}
      />
    </ItemManagementProvider>
  );
};

export default ItemModal;
