import React, { useEffect, useRef, useState } from 'react';
import type {
  ItemManagementModalProps,
  ItemManagementContextValue,
} from '../../../shared/types';
import { useAddItemPageHandlers } from '../../../application/hooks/form/useItemPageHandlers';
import { useItemFormValidation } from '../../../application/hooks/form/useItemValidation';
import { ItemManagementProvider } from '../../../shared/contexts/ItemFormContext';
import { useItemManagement } from '../../../shared/contexts/useItemFormContext';

// Template and Organisms
import ItemModalTemplate from '../ItemModalTemplate';
import { ItemFormSections } from '../../organisms/ItemFormSections';
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
    units,
    dosages,
    saving,
    loading,
    isEditMode,
    handleChange,
    handleSubmit,
    updateFormData,
    resetForm,
    regenerateItemCode,
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
    currentSearchTermForModal,
    handleAddNewCategory,
    handleAddNewType,
    handleAddNewUnit,
    handleAddNewDosage,
    closeModalAndClearSearch,

    // Actions
    handleCancel,
    handleDeleteItem,
    handleSaveCategory,
    handleSaveType,
    handleSaveUnit,
    handleSaveDosage,

    // Mutations
    addCategoryMutation,
    addTypeMutation,
    addUnitMutation,
    addDosageMutation,
    deleteItemMutation,

    // Price & conversion
    unitConversionHook,
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
      deleteItemMutation.isPending,
  });

  // UI event handlers
  const handleReset = () => {
    resetForm();
    setResetKey(prev => prev + 1); // Force re-mount of form sections to clear validation
    nameInputRef.current?.focus();
  };

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
      units,
      dosages,
      loading,
      isDirty,
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
      currentSearchTermForModal: currentSearchTermForModal || '',
    },
    price: {
      unitConversionHook,
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
    },

    // Actions
    formActions: {
      updateFormData,
      handleChange,
      handleSubmit,
      resetForm,
      regenerateItemCode,
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
    },
    businessActions: {
      handleCancel,
      handleDeleteItem,
      handleSaveCategory,
      handleSaveType,
      handleSaveUnit,
      handleSaveDosage,
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
          unitConversionManager: null,
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
        unitConversionManager: <ItemFormSections.UnitConversion />,
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
