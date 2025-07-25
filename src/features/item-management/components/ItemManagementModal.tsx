import React, { useEffect, useRef } from "react";
import type { ItemManagementModalProps, ItemManagementContextValue } from "../types";
import { useAddItemPageHandlers } from "../hooks/useAddItemPageHandlers";
import { useItemFormValidation } from "../hooks/useItemFormValidation";
import { ItemManagementProvider } from "../contexts/ItemManagementContext";
import { useItemManagement } from "../contexts/useItemManagementContext";

// Template and Organisms
import ItemModalTemplate from "./ItemModalTemplate";
import { ItemFormSections } from "./ItemFormOrganisms";
import ItemModalContainer from "./modals/ItemModalContainer";

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
    currentSearchTermForModal,
    handleAddNewCategory,
    handleAddNewType,
    handleAddNewUnit,
    closeModalAndClearSearch,
    
    // Actions
    handleCancel,
    handleDeleteItem,
    handleSaveCategory,
    handleSaveType,
    handleSaveUnit,
    
    // Mutations
    addCategoryMutation,
    addTypeMutation,
    addUnitMutation,
    deleteItemMutation,
    
    // Price & conversion
    unitConversionHook,
    formattedUpdateAt,
  } = handlers;

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
      loading,
      isDirty,
    },
    ui: {
      isOpen,
      isClosing,
      isEditMode,
      formattedUpdateAt,
    },
    modal: {
      isAddEditModalOpen,
      isAddTypeModalOpen,
      isAddUnitModalOpen,
      currentSearchTermForModal: currentSearchTermForModal || "",
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
    },
    modalActions: {
      setIsAddEditModalOpen,
      setIsAddTypeModalOpen,
      setIsAddUnitModalOpen,
      closeModalAndClearSearch: (setter: ((open: boolean) => void) | React.Dispatch<React.SetStateAction<boolean>>) => {
        if (typeof setter === 'function') {
          closeModalAndClearSearch(setter as React.Dispatch<React.SetStateAction<boolean>>);
        }
      },
      handleAddNewCategory,
      handleAddNewType,
      handleAddNewUnit,
    },
    businessActions: {
      handleCancel,
      handleDeleteItem,
      handleSaveCategory,
      handleSaveType,
      handleSaveUnit,
    },
  };

  return (
    <ItemManagementProvider value={contextValue}>
      <ItemManagementContent />
    </ItemManagementProvider>
  );
};

// Clean content component - only uses context
const ItemManagementContent: React.FC = () => {
  const { ui, action, businessActions, uiActions, formActions } = useItemManagement();

  return (
    <ItemModalTemplate
      isOpen={ui.isOpen}
      isClosing={ui.isClosing}
      onBackdropClick={uiActions.handleBackdropClick}
      onSubmit={formActions.handleSubmit}
      children={{
        header: <ItemFormSections.Header onReset={uiActions.handleReset} onClose={uiActions.handleClose} />,
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