import { useItemModalRealtime } from '@/hooks/realtime/useItemModalRealtime';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAddItemPageHandlers } from '../../../application/hooks/form/useItemPageHandlers';
import { useItemFormValidation } from '../../../application/hooks/form/useItemValidation';
import { useEntityHistory } from '../../../application/hooks/instances/useEntityHistory';
import { ItemManagementProvider } from '../../../shared/contexts/ItemFormContext';
import {
  useItemActions,
  useItemForm,
  useItemPrice,
  useItemUI,
} from '../../../shared/contexts/useItemFormContext';
import type {
  ItemManagementContextValue,
  ItemModalProps,
} from '../../../shared/types';

// Template and Organisms
import { ItemFormSections } from '../ItemFormSections';
import ItemModalTemplate from '../ItemModalTemplate';
import ItemModalContainer from '../containers/ItemModalContainer';

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
  const nameInputRef = useRef<HTMLInputElement>(null);
  const expiryCheckboxRef = useRef<HTMLLabelElement>(null);

  // Main data hook - this is the orchestrator
  const handlers = useAddItemPageHandlers({
    itemId,
    initialItemData,
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

  // Version viewing state
  const [viewingVersionNumber, setViewingVersionNumber] = useState<
    number | null
  >(null);
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

  // Pre-fetch history data for seamless UX (no loading spinner when opening history)
  const {
    history,
    isLoading: isHistoryLoading,
    error: historyError,
  } = useEntityHistory('items', itemId || '');

  // Memoized callbacks for realtime to prevent unnecessary reconnections
  const handleItemUpdated = useCallback(() => {
    // Smart sync handles the updates intelligently
  }, []);

  const handleItemDeleted = useCallback(() => {
    setIsClosing(true);
  }, [setIsClosing]);

  const handleSmartUpdate = useCallback(
    (updates: Record<string, unknown>) => {
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

  // Get current version number from history
  const currentVersionNumber =
    history && history.length > 0 ? history[0].version_number : undefined;

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

  // Version selection handler
  const handleVersionSelect = useCallback(
    (versionNumber: number, entityData: Record<string, unknown>) => {
      setViewingVersionNumber(versionNumber);

      // Update form data with version data (but don't mark as dirty)
      updateFormData(entityData);
    },
    [updateFormData]
  );

  // Clear version viewing (back to current)
  const handleClearVersionView = useCallback(() => {
    setViewingVersionNumber(null);

    // Trigger modal close and reopen to reload current data
    // This is the simplest approach - user experience is still smooth
    setIsClosing(true);

    // Alternative: We could refetch item data and update form
    // But that would require more complex state management
  }, [setIsClosing]);

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
        // Prefer explicit ref when available.
        if (nameInputRef.current) {
          nameInputRef.current.focus();
          return;
        }

        // Fallback: focus first input inside the modal.
        const dialog = document.querySelector(
          '[role="dialog"][aria-modal="true"]'
        );
        const nameInput = dialog?.querySelector<HTMLInputElement>(
          'input[name="name"]:not([disabled])'
        );
        if (nameInput) {
          nameInput.focus();
          return;
        }

        const firstField = dialog?.querySelector<HTMLElement>(
          'input:not([disabled]), textarea:not([disabled]), select:not([disabled])'
        );
        firstField?.focus();
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
      />
    </ItemManagementProvider>
  );
};

// Clean content component - only uses context
const ItemManagementContent: React.FC<{ itemId?: string }> = ({ itemId }) => {
  const ui = useItemUI();
  const form = useItemForm();
  const price = useItemPrice();
  const actions = useItemActions();

  type AccordionSection = 'additional' | 'settings' | 'pricing' | 'conversion';
  const [openSection, setOpenSection] = useState<AccordionSection | null>(() =>
    ui.isEditMode ? null : 'additional'
  );
  const [hasUserToggled, setHasUserToggled] = useState(false);

  const toggleSection = useCallback((section: AccordionSection) => {
    setHasUserToggled(true);
    setOpenSection(prev => (prev === section ? null : section));
  }, []);
  const autoOpenSection = useMemo<AccordionSection>(() => {
    if (!ui.isEditMode || form.loading) return 'additional';

    const hasAdditionalInfo =
      Boolean(form.formData.barcode?.trim()) ||
      Boolean(form.formData.description?.trim()) ||
      Boolean(form.formData.unit_id) ||
      (form.formData.quantity ?? 0) > 0;
    const hasConversion = price.packageConversionHook.conversions.length > 0;
    const hasSettings =
      form.formData.is_active === false ||
      form.formData.has_expiry_date === true ||
      (form.formData.min_stock ?? 10) !== 10;
    const hasPricing =
      (form.formData.base_price ?? 0) > 0 ||
      (form.formData.sell_price ?? 0) > 0;

    return hasAdditionalInfo
      ? 'additional'
      : hasConversion
        ? 'conversion'
        : hasSettings
          ? 'settings'
          : hasPricing
            ? 'pricing'
            : 'additional';
  }, [
    ui.isEditMode,
    form.loading,
    form.formData.barcode,
    form.formData.description,
    form.formData.unit_id,
    form.formData.quantity,
    form.formData.is_active,
    form.formData.has_expiry_date,
    form.formData.min_stock,
    form.formData.base_price,
    form.formData.sell_price,
    price.packageConversionHook.conversions.length,
  ]);

  const activeSection: AccordionSection | null =
    ui.isEditMode && !hasUserToggled ? autoOpenSection : openSection;

  // Single form mode rendering
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
            itemId={itemId}
          />
        ),
        basicInfoRequired: <ItemFormSections.BasicInfoRequired />,
        basicInfoOptional: (
          <ItemFormSections.BasicInfoOptional
            isExpanded={activeSection === 'additional'}
            onExpand={() => toggleSection('additional')}
            itemId={itemId}
          />
        ),
        settingsForm: (
          <ItemFormSections.Settings
            isExpanded={activeSection === 'settings'}
            onExpand={() => toggleSection('settings')}
          />
        ),
        pricingForm: (
          <ItemFormSections.Pricing
            isExpanded={activeSection === 'pricing'}
            onExpand={() => toggleSection('pricing')}
          />
        ),
        packageConversionManager: (
          <ItemFormSections.PackageConversion
            isExpanded={activeSection === 'conversion'}
            onExpand={() => toggleSection('conversion')}
          />
        ),
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
