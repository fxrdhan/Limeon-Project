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
        initialItemData={initialItemData}
      />
    </ItemManagementProvider>
  );
};

// Clean content component - only uses context
const ItemManagementContent: React.FC<{
  itemId?: string;
  initialItemData?: ItemModalProps['initialItemData'];
}> = ({ itemId, initialItemData }) => {
  const ui = useItemUI();
  const form = useItemForm();
  const price = useItemPrice();
  const actions = useItemActions();
  const isEditSession = Boolean(itemId);
  const hasFormData =
    Boolean(form.formData.code?.trim()) ||
    Boolean(form.formData.name?.trim()) ||
    Boolean(form.formData.updated_at);
  const hasEditData =
    isEditSession && (hasFormData || Boolean(initialItemData));

  type AccordionSection = 'additional' | 'settings' | 'pricing' | 'conversion';
  const [openSection, setOpenSection] = useState<AccordionSection | null>(() =>
    isEditSession ? null : 'additional'
  );
  const [hasUserToggled, setHasUserToggled] = useState(false);
  const [isStackHovering, setIsStackHovering] = useState(false);
  const [isStackTransitioning, setIsStackTransitioning] = useState(false);
  const [lastOpenSection, setLastOpenSection] =
    useState<AccordionSection | null>(isEditSession ? null : 'additional');
  const hoverTimerRef = useRef<number | null>(null);
  const updateOpenSection = useCallback(
    (nextSection: AccordionSection | null) => {
      setOpenSection(nextSection);
      if (nextSection) {
        setLastOpenSection(nextSection);
      }
    },
    []
  );

  const toggleSection = useCallback(
    (section: AccordionSection) => {
      setHasUserToggled(true);
      if (openSection === section) {
        // User explicitly collapsed the expanded section; don't restore it on
        // stack/unstack transitions.
        setOpenSection(null);
        setLastOpenSection(null);
        return;
      }

      updateOpenSection(section);
    },
    [openSection, updateOpenSection]
  );
  const autoOpenSection = useMemo<AccordionSection | null>(() => {
    if (!hasEditData || form.loading) return null;

    const dataSource = (hasFormData ? form.formData : initialItemData) ?? null;
    const barcode = (dataSource?.barcode || '') as string;
    const description =
      dataSource && 'description' in dataSource
        ? ((dataSource.description as string) ?? '')
        : '';
    const unitId =
      dataSource && 'unit_id' in dataSource
        ? ((dataSource.unit_id as string) ?? '')
        : '';
    const quantity =
      dataSource && 'quantity' in dataSource
        ? ((dataSource.quantity as number) ?? 0)
        : 0;
    const basePrice = dataSource?.base_price ?? 0;
    const sellPrice = dataSource?.sell_price ?? 0;
    const fallbackConversions = Array.isArray(
      (initialItemData as { package_conversions?: unknown[] } | undefined)
        ?.package_conversions
    )
      ? (initialItemData as { package_conversions: unknown[] })
          .package_conversions.length
      : 0;
    const conversionCount =
      price.packageConversionHook.conversions.length || fallbackConversions;

    const hasAdditionalInfo =
      Boolean(barcode?.trim()) ||
      Boolean(description?.trim()) ||
      Boolean(unitId) ||
      (quantity ?? 0) > 0;
    const hasConversion = conversionCount > 0;
    const hasSettings =
      dataSource &&
      'is_active' in dataSource &&
      (dataSource.is_active === false ||
        dataSource.has_expiry_date === true ||
        (dataSource.min_stock ?? 10) !== 10);
    const hasPricing = (basePrice ?? 0) > 0 || (sellPrice ?? 0) > 0;

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
    hasEditData,
    hasFormData,
    form.formData,
    form.loading,
    initialItemData,
    price.packageConversionHook.conversions.length,
  ]);

  useEffect(() => {
    if (
      !isEditSession ||
      hasUserToggled ||
      !ui.isOpen ||
      isStackHovering ||
      isStackTransitioning
    ) {
      return;
    }
    if (openSection || !autoOpenSection) return;
    const frameId = requestAnimationFrame(() => {
      updateOpenSection(autoOpenSection);
    });
    return () => cancelAnimationFrame(frameId);
  }, [
    autoOpenSection,
    hasUserToggled,
    isEditSession,
    isStackHovering,
    isStackTransitioning,
    openSection,
    ui.isOpen,
    updateOpenSection,
  ]);

  const activeSection: AccordionSection | null = openSection;
  const effectiveSection = isStackHovering
    ? null
    : isStackTransitioning
      ? lastOpenSection
      : activeSection;

  const sectionOrder: AccordionSection[] = [
    'additional',
    'settings',
    'pricing',
    'conversion',
  ];
  const activeIndex = effectiveSection
    ? sectionOrder.indexOf(effectiveSection)
    : -1;

  const getStackClasses = (section: AccordionSection) => {
    const index = sectionOrder.indexOf(section);
    if (index === -1) return '';

    if (isStackHovering) {
      // Unstacked mode should look like a normal list, with tighter spacing.
      return index === 0 ? '' : 'mt-3';
    }

    if (index === 0 && activeIndex === -1) return '';

    if (activeIndex === -1) {
      return index === 0 ? '' : 'mt-3';
    }

    if (index === activeIndex) {
      return index === 0 ? 'relative' : 'relative mt-4';
    }

    if (index < activeIndex) {
      return index === 0 ? 'relative' : 'relative -mt-6';
    }

    return index === activeIndex + 1 ? 'relative mt-4' : 'relative -mt-6';
  };

  const getStackWrapperStyle = (section: AccordionSection) => {
    if (isStackHovering) return undefined;
    const index = sectionOrder.indexOf(section);
    if (index === -1 || activeIndex === -1) return undefined;
    if (index === activeIndex) return { zIndex: 30 };

    const depth = Math.abs(activeIndex - index);
    return { zIndex: Math.max(1, 20 - depth) };
  };

  const getStackStyle = (section: AccordionSection) => {
    if (isStackHovering) return undefined;
    const index = sectionOrder.indexOf(section);
    if (index === -1 || activeIndex === -1 || index === activeIndex) {
      return undefined;
    }

    const depth = Math.abs(activeIndex - index);
    const blurAmount = Math.min(depth * 0.35, 1.2);
    const opacityValue = Math.max(0.82, 1 - depth * 0.04);
    const scaleValue = Math.max(0.98, 1 - depth * 0.01);

    return {
      filter: blurAmount ? `blur(${blurAmount}px)` : undefined,
      opacity: opacityValue,
      transform: `scale(${scaleValue})`,
    };
  };

  const getStackEffect = (section: AccordionSection) => ({
    className:
      'origin-top transition-[transform,opacity,filter] duration-300 ease-out',
    style: getStackStyle(section),
  });

  const startStackCollapse = useCallback(() => {
    if (isStackHovering || isStackTransitioning) return;
    if (openSection) {
      setLastOpenSection(openSection);
    }
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
    }
    setIsStackTransitioning(true);
    // Collapse the currently open section first, then switch to unstack mode.
    setOpenSection(null);
    hoverTimerRef.current = window.setTimeout(() => {
      setIsStackTransitioning(false);
      setIsStackHovering(true);
      hoverTimerRef.current = null;
    }, 220);
  }, [isStackHovering, isStackTransitioning, openSection]);

  const restoreStack = useCallback(() => {
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setIsStackHovering(false);
    setIsStackTransitioning(false);
    const restoreSection: AccordionSection | null =
      openSection ??
      lastOpenSection ??
      (hasUserToggled ? null : isEditSession ? autoOpenSection : 'additional');

    if (restoreSection !== null) {
      requestAnimationFrame(() => {
        updateOpenSection(restoreSection);
      });
    }
  }, [
    autoOpenSection,
    hasUserToggled,
    isEditSession,
    lastOpenSection,
    openSection,
    updateOpenSection,
  ]);

  const handleStackMouseMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const isOverIgnore = Boolean(
        target.closest('[data-stack-ignore="true"]')
      );
      const hoveredSectionEl = target.closest<HTMLElement>(
        '[data-stack-section]'
      );
      const hoveredSectionRaw = hoveredSectionEl?.dataset.stackSection;
      const hoveredSection: AccordionSection | null =
        hoveredSectionRaw === 'additional' ||
        hoveredSectionRaw === 'settings' ||
        hoveredSectionRaw === 'pricing' ||
        hoveredSectionRaw === 'conversion'
          ? (hoveredSectionRaw as AccordionSection)
          : null;

      // Ignore regions (e.g. image uploader grid) should not participate in the
      // stack/unstack behavior.
      if (isOverIgnore) {
        if (isStackHovering || isStackTransitioning) {
          restoreStack();
        }
        return;
      }

      // Don't aggressively re-stack when moving between cards (gaps). We'll
      // restore on container mouse leave instead.
      if (!hoveredSection) {
        return;
      }

      // Hover should only affect stacked cards. If the user is hovering the
      // currently expanded card, keep the current state (do not unstack).
      if (hoveredSection === activeSection) {
        return;
      }

      startStackCollapse();
    },
    [
      activeSection,
      isStackHovering,
      isStackTransitioning,
      restoreStack,
      startStackCollapse,
    ]
  );

  const handleStackMouseLeave = useCallback(() => {
    restoreStack();
  }, [restoreStack]);

  useEffect(
    () => () => {
      if (hoverTimerRef.current) {
        window.clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
    },
    []
  );

  // Single form mode rendering
  return (
    <ItemModalTemplate
      isOpen={ui.isOpen}
      isClosing={ui.isClosing}
      onBackdropClick={ui.handleBackdropClick}
      onSubmit={form.handleSubmit}
      rightColumnProps={{
        onMouseMove: handleStackMouseMove,
        onMouseLeave: handleStackMouseLeave,
      }}
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
          <div
            className={`${getStackClasses('additional')} transition-[margin] duration-200 ease-out`}
            style={getStackWrapperStyle('additional')}
            data-stack-section="additional"
          >
            <ItemFormSections.BasicInfoOptional
              isExpanded={activeSection === 'additional'}
              onExpand={() => toggleSection('additional')}
              itemId={itemId}
              stackClassName={getStackEffect('additional').className}
              stackStyle={getStackEffect('additional').style}
            />
          </div>
        ),
        settingsForm: (
          <div
            className={`${getStackClasses('settings')} transition-[margin] duration-200 ease-out`}
            style={getStackWrapperStyle('settings')}
            data-stack-section="settings"
          >
            <ItemFormSections.Settings
              isExpanded={activeSection === 'settings'}
              onExpand={() => toggleSection('settings')}
              stackClassName={getStackEffect('settings').className}
              stackStyle={getStackEffect('settings').style}
            />
          </div>
        ),
        pricingForm: (
          <div
            className={`${getStackClasses('pricing')} transition-[margin] duration-200 ease-out`}
            style={getStackWrapperStyle('pricing')}
            data-stack-section="pricing"
          >
            <ItemFormSections.Pricing
              isExpanded={activeSection === 'pricing'}
              onExpand={() => toggleSection('pricing')}
              stackClassName={getStackEffect('pricing').className}
              stackStyle={getStackEffect('pricing').style}
            />
          </div>
        ),
        packageConversionManager: (
          <div
            className={`${getStackClasses('conversion')} transition-[margin] duration-200 ease-out`}
            style={getStackWrapperStyle('conversion')}
            data-stack-section="conversion"
          >
            <ItemFormSections.PackageConversion
              isExpanded={activeSection === 'conversion'}
              onExpand={() => toggleSection('conversion')}
              stackClassName={getStackEffect('conversion').className}
              stackStyle={getStackEffect('conversion').style}
            />
          </div>
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
