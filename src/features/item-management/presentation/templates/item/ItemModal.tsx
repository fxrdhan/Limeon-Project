import React, { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ItemModalProps,
  ItemManagementContextValue,
} from '../../../shared/types';
import { useAddItemPageHandlers } from '../../../application/hooks/form/useItemPageHandlers';
import { useItemFormValidation } from '../../../application/hooks/form/useItemValidation';
import { ItemManagementProvider } from '../../../shared/contexts/ItemFormContext';
import {
  useItemActions,
  useItemForm,
  useItemUI,
} from '../../../shared/contexts/useItemFormContext';
import { useItemModalRealtime } from '@/hooks/realtime/useItemModalRealtime';
import { useEntityHistory } from '../../../application/hooks/instances/useEntityHistory';

// Template and Organisms
import ItemModalTemplate from '../ItemModalTemplate';
import { ItemFormSections } from '../ItemFormSections';
import ItemModalContainer from '../containers/ItemModalContainer';
import ItemHistoryContent from '../../organisms/ItemHistoryContent';

const ItemModal: React.FC<ItemModalProps> = ({
  isOpen,
  onClose,
  itemId,
  initialSearchQuery,
  isClosing,
  setIsClosing,
  refetchItems,
}) => {
  const nameInputRef = useRef<HTMLInputElement>(null);
  const expiryCheckboxRef = useRef<HTMLLabelElement>(null);

  // Main data hook - this is the orchestrator
  const handlers = useAddItemPageHandlers({
    itemId,
    initialSearchQuery,
    onClose,
    expiryCheckboxRef,
    refetchItems,
  });

  // Extract minimal required data (not 38+ values!)
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
    resetForm,
    isDirty,

    // Modal state
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
    currentSearchTermForModal,
    handleAddNewCategory,
    handleAddNewType,
    handleAddNewUnit,
    handleAddNewDosage,
    handleAddNewManufacturer,
    closeModalAndClearSearch,

    // Actions
    handleCancel,
    handleDeleteItem,
    handleSaveCategory,
    handleSaveType,
    handleSaveUnit,
    handleSaveDosage,
    handleSaveManufacturer,

    // Mutations
    addCategoryMutation,
    addTypeMutation,
    addUnitMutation,
    addDosageMutation,
    addManufacturerMutation,
    deleteItemMutation,

    // Price & conversion
    packageConversionHook,
    formattedUpdateAt,
  } = handlers;

  // UI mode state (after isEditMode is available)
  const [mode, setMode] = useState<'add' | 'edit' | 'history'>(
    isEditMode ? 'edit' : 'add'
  );
  const [resetKey, setResetKey] = useState(0);

  // Selected history version for viewing in form layout
  const [selectedHistoryVersion, setSelectedHistoryVersion] = useState<{
    id: string;
    version_number: number;
    action_type: 'INSERT' | 'UPDATE' | 'DELETE';
    changed_at: string;
    entity_data: Record<string, unknown>;
  } | null>(null);

  // Form validation
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

  // Pre-fetch history data for seamless UX (no loading spinner when opening history)
  const {
    history,
    isLoading: isHistoryLoading,
    error: historyError,
  } = useEntityHistory('items', itemId || '');

  // Memoized callbacks for realtime to prevent unnecessary reconnections
  const handleItemUpdated = useCallback((payload: unknown) => {
    console.log('🔄 Item updated in modal:', payload);
    // Smart sync handles the updates intelligently
  }, []);

  const handleItemDeleted = useCallback(() => {
    console.log('🗑️ Item deleted, closing modal');
    setIsClosing(true);
  }, [setIsClosing]);

  const handleSmartUpdate = useCallback(
    (updates: Record<string, unknown>) => {
      console.log('🧠 Applying smart updates:', updates);
      // Apply updates that don't conflict with user input
      updateFormData(updates);
    },
    [updateFormData]
  );

  // Realtime for current item data with smart form sync
  const { smartFormSync } = useItemModalRealtime({
    itemId: itemId,
    enabled: isOpen && isEditMode, // Only enable in edit mode
    onItemUpdated: handleItemUpdated,
    onItemDeleted: handleItemDeleted,
    onSmartUpdate: handleSmartUpdate,
  });

  // UI event handlers
  const handleReset = useCallback(() => {
    resetForm();
    setResetKey(prev => prev + 1); // Force re-mount of form sections to clear validation
    nameInputRef.current?.focus();
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

  // Mode handlers
  const handleHistoryClick = () => {
    // If viewing a version, go back to timeline; otherwise enter history mode
    if (selectedHistoryVersion) {
      setSelectedHistoryVersion(null);
    } else {
      setMode('history');
      setSelectedHistoryVersion(null);
    }
  };

  const handleGoBackToForm = () => {
    setMode(isEditMode ? 'edit' : 'add');
    setSelectedHistoryVersion(null); // Clear selection when going back to form
  };

  // History version selection handler
  const handleVersionSelect = (version: {
    id: string;
    version_number: number;
    action_type: 'INSERT' | 'UPDATE' | 'DELETE';
    changed_at: string;
    entity_data: Record<string, unknown>;
  }) => {
    // Update form data with version data for viewing
    updateFormData(version.entity_data);
    setSelectedHistoryVersion(version);
  };

  const handleBackToTimeline = () => {
    setSelectedHistoryVersion(null);
    // Optionally refetch current data when going back
    // For now, just keep the data as is
  };

  // Keyboard shortcut for Reset All (Ctrl+Shift+R)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only trigger when modal is open and not in edit mode (reset button only shows in add mode)
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

  // Auto focus management
  useEffect(() => {
    if (isClosing) {
      onClose();
    }
  }, [isClosing, onClose]);

  useEffect(() => {
    if (isOpen && !loading) {
      const timer = setTimeout(() => {
        nameInputRef.current?.focus();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, loading]);

  // Create consolidated context value
  const contextValue: ItemManagementContextValue = {
    // State
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
    },
    realtime: {
      smartFormSync,
    },
    ui: {
      isOpen,
      isClosing,
      isEditMode,
      formattedUpdateAt,
      mode,
      resetKey,
    },
    modal: {
      isAddEditModalOpen,
      isAddTypeModalOpen,
      isAddUnitModalOpen,
      isAddDosageModalOpen,
      isAddManufacturerModalOpen,
      currentSearchTermForModal: currentSearchTermForModal || '',
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

    // Actions
    formActions: {
      updateFormData,
      handleChange,
      handleSubmit,
      resetForm,
    },
    uiActions: {
      handleBackdropClick,
      handleClose,
      handleReset: !isEditMode ? handleReset : undefined,
      setIsClosing,
      handleHistoryClick: isEditMode && itemId ? handleHistoryClick : undefined,
      setMode,
      goBackToForm: handleGoBackToForm,
      handleBackToTimeline:
        mode === 'history' && selectedHistoryVersion
          ? handleBackToTimeline
          : undefined,
    },
    modalActions: {
      setIsAddEditModalOpen,
      setIsAddTypeModalOpen,
      setIsAddUnitModalOpen,
      setIsAddDosageModalOpen,
      setIsAddManufacturerModalOpen,
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
        itemId={itemId}
        selectedHistoryVersion={selectedHistoryVersion}
        onVersionSelect={handleVersionSelect}
      />
    </ItemManagementProvider>
  );
};

// Clean content component - only uses context
const ItemManagementContent: React.FC<{
  itemId?: string;
  selectedHistoryVersion: {
    id: string;
    version_number: number;
    action_type: 'INSERT' | 'UPDATE' | 'DELETE';
    changed_at: string;
    entity_data: Record<string, unknown>;
  } | null;
  onVersionSelect: (version: {
    id: string;
    version_number: number;
    action_type: 'INSERT' | 'UPDATE' | 'DELETE';
    changed_at: string;
    entity_data: Record<string, unknown>;
  }) => void;
}> = ({ itemId, selectedHistoryVersion, onVersionSelect }) => {
  const ui = useItemUI();
  const form = useItemForm();
  const actions = useItemActions();

  // Mode-based content rendering
  if (ui.mode === 'history') {
    if (!itemId) {
      // Handle no itemId case - go back to form immediately
      ui.goBackToForm();
      return null;
    }

    // If a version is selected, show form with version data (read-only)
    if (selectedHistoryVersion) {
      return (
        <ItemModalTemplate
          isOpen={ui.isOpen}
          isClosing={ui.isClosing}
          onBackdropClick={ui.handleBackdropClick}
          onSubmit={(e: React.FormEvent) => e.preventDefault()}
          children={{
            header: (
              <ItemFormSections.Header
                onReset={undefined}
                onClose={ui.handleClose}
              />
            ),
            basicInfo: <ItemFormSections.BasicInfo />,
            settingsForm: <ItemFormSections.Settings />,
            pricingForm: <ItemFormSections.Pricing />,
            packageConversionManager: <ItemFormSections.PackageConversion />,
            modals: null,
          }}
          formAction={{
            onCancel: () => ui.handleBackToTimeline?.(),
            onDelete: undefined,
            isSaving: false,
            isDeleting: false,
            isEditMode: false,
            isDisabled: true, // Disable all form actions
          }}
        />
      );
    }

    // Show timeline list
    return (
      <ItemModalTemplate
        isOpen={ui.isOpen}
        isClosing={ui.isClosing}
        onBackdropClick={ui.handleBackdropClick}
        onSubmit={(e: React.FormEvent) => e.preventDefault()}
        children={{
          header: (
            <ItemFormSections.Header
              onReset={undefined}
              onClose={ui.handleClose}
            />
          ),
          basicInfo: (
            <ItemHistoryContent
              itemId={itemId}
              itemName={form.formData.name || 'Item'}
              onVersionSelect={onVersionSelect}
            />
          ),
          settingsForm: null,
          pricingForm: null,
          packageConversionManager: null,
          modals: null,
        }}
        formAction={{
          onCancel: () => ui.goBackToForm(),
          onDelete: undefined,
          isSaving: false,
          isDeleting: false,
          isEditMode: false,
          isDisabled: false,
        }}
      />
    );
  }

  // Default form mode (add/edit)
  return (
    <ItemModalTemplate
      isOpen={ui.isOpen}
      isClosing={ui.isClosing}
      onBackdropClick={ui.handleBackdropClick}
      onSubmit={form.handleSubmit}
      children={{
        header: (
          <ItemFormSections.Header
            onReset={ui.handleReset}
            onClose={ui.handleClose}
          />
        ),
        basicInfo: <ItemFormSections.BasicInfo />,
        settingsForm: <ItemFormSections.Settings />,
        pricingForm: <ItemFormSections.Pricing />,
        packageConversionManager: <ItemFormSections.PackageConversion />,
        modals: <ItemModalContainer />,
      }}
      formAction={{
        onCancel: () => actions.handleCancel(ui.setIsClosing),
        onDelete: ui.isEditMode ? actions.handleDeleteItem : undefined,
        isSaving: actions.saving,
        isDeleting: actions.deleteItemMutation?.isPending || false,
        isEditMode: ui.isEditMode,
        isDisabled: actions.finalDisabledState,
      }}
    />
  );
};

export default ItemModal;

// Backward compatibility alias
export { ItemModal as ItemManagementModal };
