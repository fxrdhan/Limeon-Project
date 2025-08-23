import React, { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ItemManagementModalProps,
  ItemManagementContextValue,
} from '../../../shared/types';
import { useAddItemPageHandlers } from '../../../application/hooks/form/useItemPageHandlers';
import { useItemFormValidation } from '../../../application/hooks/form/useItemValidation';
import { ItemManagementProvider } from '../../../shared/contexts/ItemFormContext';
import { useItemManagement } from '../../../shared/contexts/useItemFormContext';
import { useItemModalRealtime } from '@/hooks/realtime/useItemModalRealtime';

// Template and Organisms
import ItemModalTemplate from '../ItemModalTemplate';
import { ItemFormSections } from '../ItemFormSections';
import ItemModalContainer from '../containers/ItemModalContainer';
import ItemHistoryContent from '../../organisms/ItemHistoryContent';

const ItemManagementModal: React.FC<ItemManagementModalProps> = ({
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

  // Realtime for current item data with smart form sync
  const { smartFormSync } = useItemModalRealtime({
    itemId: itemId,
    enabled: isOpen && isEditMode, // Only enable in edit mode
    onItemUpdated: payload => {
      console.log('🔄 Item updated in modal:', payload);
      // Smart sync handles the updates intelligently
    },
    onItemDeleted: () => {
      console.log('🗑️ Item deleted, closing modal');
      setIsClosing(true);
    },
    onSmartUpdate: updates => {
      console.log('🧠 Applying smart updates:', updates);
      // Apply updates that don't conflict with user input
      updateFormData(updates);
    },
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
    setMode('history');
  };

  const handleGoBackToForm = () => {
    setMode(isEditMode ? 'edit' : 'add');
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
      <ItemManagementContent itemId={itemId} />
    </ItemManagementProvider>
  );
};

// Clean content component - only uses context
const ItemManagementContent: React.FC<{ itemId?: string }> = ({ itemId }) => {
  const { ui, action, businessActions, uiActions, formActions, form } =
    useItemManagement();

  // Mode-based content rendering
  if (ui.mode === 'history') {
    if (!itemId) {
      // Handle no itemId case - go back to form immediately
      uiActions.goBackToForm();
      return null;
    }

    return (
      <ItemModalTemplate
        isOpen={ui.isOpen}
        isClosing={ui.isClosing}
        onBackdropClick={uiActions.handleBackdropClick}
        onSubmit={(e: React.FormEvent) => e.preventDefault()} // Disable form submission in history mode
        children={{
          header: (
            <ItemFormSections.Header
              onReset={undefined}
              onClose={uiActions.handleClose}
            />
          ),
          basicInfo: (
            <ItemHistoryContent
              itemId={itemId}
              itemName={form.formData.name || 'Item'}
            />
          ),
          settingsForm: null,
          pricingForm: null,
          packageConversionManager: null,
          modals: null,
        }}
        formAction={{
          onCancel: () => uiActions.goBackToForm(),
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
      onBackdropClick={uiActions.handleBackdropClick}
      onSubmit={formActions.handleSubmit}
      children={{
        header: (
          <ItemFormSections.Header
            onReset={uiActions.handleReset}
            onClose={uiActions.handleClose}
          />
        ),
        basicInfo: <ItemFormSections.BasicInfo />,
        settingsForm: <ItemFormSections.Settings />,
        pricingForm: <ItemFormSections.Pricing />,
        packageConversionManager: <ItemFormSections.PackageConversion />,
        modals: <ItemModalContainer />,
      }}
      formAction={{
        onCancel: () => businessActions.handleCancel(uiActions.setIsClosing),
        onDelete: ui.isEditMode ? businessActions.handleDeleteItem : undefined,
        isSaving: action.saving,
        isDeleting: action.deleteItemMutation?.isPending || false,
        isEditMode: ui.isEditMode,
        isDisabled: action.finalDisabledState,
      }}
    />
  );
};

export default ItemManagementModal;
