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
import FloatingHistoryPanel from '../../organisms/FloatingHistoryPanel';
import ItemHistoryDiffViewer from '../../organisms/ItemHistoryDiffViewer';

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
  const [mode, setMode] = useState<'add' | 'edit'>(isEditMode ? 'edit' : 'add');
  const [resetKey, setResetKey] = useState(0);
  // History item type with entity_data (from database)
  type HistoryItemWithData = {
    id: string;
    version_number: number;
    action_type: 'INSERT' | 'UPDATE' | 'DELETE';
    changed_at: string;
    entity_data: Record<string, unknown>;
    changed_fields?: Record<string, { from: unknown; to: unknown }>;
  };

  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);
  const [selectedHistoryVersion, setSelectedHistoryVersion] =
    useState<HistoryItemWithData | null>(null);

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

  // History panel handlers
  const handleHistoryToggle = () => {
    setIsHistoryPanelOpen(prev => !prev);
    // Clear selection when closing
    if (isHistoryPanelOpen) {
      setSelectedHistoryVersion(null);
    }
  };

  const handleVersionSelect = useCallback((item: HistoryItemWithData) => {
    setSelectedHistoryVersion(item);
  }, []);

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
      handleHistoryClick:
        isEditMode && itemId ? handleHistoryToggle : undefined,
      setMode: (newMode: 'add' | 'edit' | 'history') => {
        // Only support 'add' and 'edit' modes for Item modal
        if (newMode === 'add' || newMode === 'edit') {
          setMode(newMode);
        }
      },
      goBackToForm: () => {
        // Item modal doesn't have separate history mode, so this is a no-op
      },
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
        isHistoryPanelOpen={isHistoryPanelOpen}
        onHistoryToggle={handleHistoryToggle}
        selectedHistoryVersion={selectedHistoryVersion}
        onVersionSelect={handleVersionSelect}
      />
    </ItemManagementProvider>
  );
};

// Clean content component - only uses context
const ItemManagementContent: React.FC<{
  itemId?: string;
  isHistoryPanelOpen: boolean;
  onHistoryToggle: () => void;
  selectedHistoryVersion: {
    id: string;
    version_number: number;
    action_type: 'INSERT' | 'UPDATE' | 'DELETE';
    changed_at: string;
    entity_data: Record<string, unknown>;
    changed_fields?: Record<string, { from: unknown; to: unknown }>;
  } | null;
  onVersionSelect: (item: {
    id: string;
    version_number: number;
    action_type: 'INSERT' | 'UPDATE' | 'DELETE';
    changed_at: string;
    entity_data: Record<string, unknown>;
    changed_fields?: Record<string, { from: unknown; to: unknown }>;
  }) => void;
}> = ({
  itemId,
  isHistoryPanelOpen,
  onHistoryToggle,
  selectedHistoryVersion,
  onVersionSelect,
}) => {
  const ui = useItemUI();
  const form = useItemForm();
  const actions = useItemActions();

  return (
    <>
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
              onHistoryClick={onHistoryToggle}
              isHistoryPanelOpen={isHistoryPanelOpen}
            />
          ),
          basicInfo:
            isHistoryPanelOpen && selectedHistoryVersion ? (
              <ItemHistoryDiffViewer selectedVersion={selectedHistoryVersion} />
            ) : (
              <ItemFormSections.BasicInfo />
            ),
          settingsForm:
            isHistoryPanelOpen && selectedHistoryVersion ? null : (
              <ItemFormSections.Settings />
            ),
          pricingForm:
            isHistoryPanelOpen && selectedHistoryVersion ? null : (
              <ItemFormSections.Pricing />
            ),
          packageConversionManager:
            isHistoryPanelOpen && selectedHistoryVersion ? null : (
              <ItemFormSections.PackageConversion />
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

      {/* Floating History Panel */}
      {ui.isEditMode && itemId && (
        <FloatingHistoryPanel
          isOpen={isHistoryPanelOpen}
          onClose={onHistoryToggle}
          itemId={itemId}
          itemName={form.formData.name || 'Item'}
          onVersionSelect={onVersionSelect}
          selectedVersion={selectedHistoryVersion?.version_number || null}
        />
      )}
    </>
  );
};

export default ItemModal;

// Backward compatibility alias
export { ItemModal as ItemManagementModal };
