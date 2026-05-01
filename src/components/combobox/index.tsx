import React, {
  useRef,
  useCallback,
  RefObject,
  useEffect,
  useState,
  useId,
} from 'react';
import type { ComboboxProps, CheckboxComboboxProps } from '@/types';
import ValidationOverlay from '@/components/validation-overlay';
import ComboboxButton from './components/ComboboxButton';
import ComboboxMenu from './components/ComboboxMenu';
import HoverDetailPortal from './components/HoverDetailPortal';
import { ComboboxProvider } from './providers/ComboboxContext';
import { useComboboxState } from './hooks/useComboboxState';
import { useComboboxSearch } from './hooks/useComboboxSearch';
import { useComboboxValidation } from './hooks/useComboboxValidation';
import { useComboboxPosition } from './hooks/useComboboxPosition';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation';
// useComboboxHover merged into useComboboxEffects
// useScrollState merged into useScrollManagement
import { useTextExpansion } from './hooks/useTextExpansion';
import { useFocusManagement } from './hooks/useFocusManagement';
import { useScrollManagement } from './hooks/useScrollManagement';
import { useComboboxEffects } from './hooks/useComboboxEffects';
import { useHoverDetail } from './hooks/useHoverDetail';

let pinnedComboboxId: string | null = null;
let activeManagedComboboxId: string | null = null;
let activeManagedComboboxCloseCallback: (() => void) | null = null;

const isEditableElement = (element: EventTarget | null) => {
  if (!(element instanceof HTMLElement)) return false;

  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element.isContentEditable
  );
};

const isPrintableSearchKey = (e: React.KeyboardEvent<HTMLElement>) => {
  return e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
};

// Function overloads for different modes
function Combobox(props: ComboboxProps): React.JSX.Element;
function Combobox(props: CheckboxComboboxProps): React.JSX.Element;
function Combobox(allProps: ComboboxProps | CheckboxComboboxProps) {
  const {
    mode = 'input',
    options,
    value,
    placeholder = '-- Pilih --',
    onAddNew,
    persistOpen = false,
    onPersistOpenClear,
    freezePersistedMenu = false,
    searchList = true,
    autoScrollOnOpen = true,
    tabIndex,
    required = false,
    disabled = false,
    validate = false,
    showValidationOnBlur = true,
    validationAutoHide = true,
    validationAutoHideDelay,
    name, // Used for form field identification and validation
    hoverToOpen = false,
    // Portal width control
    portalWidth = 'auto',
    // Position control
    position = 'auto',
    // Alignment control
    align = 'right',
    // Hover detail props
    enableHoverDetail = false,
    hoverDetailDelay = 800,
    onFetchHoverDetail,
  } = allProps;

  const withCheckbox = 'withCheckbox' in allProps && allProps.withCheckbox;
  const withRadio = 'withRadio' in allProps ? allProps.withRadio : false;
  const instanceId = useId();

  // Type guard for checkbox mode - memoized to prevent useCallback dependency changes
  const isCheckboxMode = useCallback(
    (
      props: ComboboxProps | CheckboxComboboxProps
    ): props is CheckboxComboboxProps => {
      return 'withCheckbox' in props && props.withCheckbox === true;
    },
    []
  );

  // For single selection (radio) mode
  const selectedOption = !withCheckbox
    ? options.find(option => option?.id === value)
    : null;

  // Refs
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const optionsContainerRef = useRef<HTMLDivElement>(null);
  const pinnedOpenRef = useRef(false);
  const suppressFocusOnNextOpenRef = useRef(false);
  const previousMenuFrozenRef = useRef(false);
  const frozenValueRef = useRef<string | null>(null);
  const [isLocallyFrozen, setIsLocallyFrozen] = useState(false);

  // Hooks
  const shouldKeepComboboxOpen = useCallback(
    () =>
      persistOpen || pinnedOpenRef.current || pinnedComboboxId === instanceId,
    [instanceId, persistOpen]
  );
  const shouldSkipOpenFocus = useCallback(() => {
    const shouldSkip = suppressFocusOnNextOpenRef.current;
    suppressFocusOnNextOpenRef.current = false;
    return shouldSkip;
  }, []);

  const {
    isOpen,
    isClosing,
    applyOpenStyles,
    setApplyOpenStyles,
    openThisCombobox,
    actualCloseCombobox,
    toggleCombobox,
  } = useComboboxState({
    shouldKeepOpen: shouldKeepComboboxOpen,
  });
  const isMenuFrozen = freezePersistedMenu || isLocallyFrozen;
  const effectiveIsOpen = isOpen || shouldKeepComboboxOpen();
  const effectiveIsClosing = isClosing && !shouldKeepComboboxOpen();
  const isPortalFrozen = isMenuFrozen && effectiveIsOpen;

  const pinComboboxOpen = useCallback(() => {
    pinnedOpenRef.current = true;
    pinnedComboboxId = instanceId;
  }, [instanceId]);

  const releasePinnedOpen = useCallback(() => {
    pinnedOpenRef.current = false;
    if (pinnedComboboxId === instanceId) {
      pinnedComboboxId = null;
    }
  }, [instanceId]);

  const closeComboboxAndReleasePin = useCallback(() => {
    onPersistOpenClear?.();
    releasePinnedOpen();
    actualCloseCombobox(true);
  }, [actualCloseCombobox, onPersistOpenClear, releasePinnedOpen]);

  const closeOtherActiveCombobox = useCallback(() => {
    if (
      activeManagedComboboxId !== null &&
      activeManagedComboboxId !== instanceId
    ) {
      activeManagedComboboxCloseCallback?.();
    }
  }, [instanceId]);

  const openComboboxExclusively = useCallback(() => {
    closeOtherActiveCombobox();
    openThisCombobox();
  }, [closeOtherActiveCombobox, openThisCombobox]);

  const handleToggleCombobox = useCallback(
    (e: React.MouseEvent) => {
      if (effectiveIsOpen) {
        onPersistOpenClear?.();
        releasePinnedOpen();
      } else {
        closeOtherActiveCombobox();
      }
      toggleCombobox(e);
    },
    [
      closeOtherActiveCombobox,
      effectiveIsOpen,
      onPersistOpenClear,
      releasePinnedOpen,
      toggleCombobox,
    ]
  );

  const {
    searchTerm,
    debouncedSearchTerm,
    searchState,
    filteredOptions,
    handleSearchChange,
    updateSearchTerm,
    resetSearch,
  } = useComboboxSearch(options, searchList);

  const {
    hasError,
    errorMessage,
    touched,
    setTouched,
    showValidationOverlay,
    setShowValidationOverlay,
    hasAutoHidden,
    validateCombobox,
    handleCloseValidation,
    handleValidationAutoHide,
  } = useComboboxValidation({
    validate,
    required,
    value:
      typeof value === 'string'
        ? value
        : Array.isArray(value) && value.length > 0
          ? value[0]
          : '',
    showValidationOnBlur,
    validationAutoHide,
    validationAutoHideDelay,
  });

  const { clearPendingFocus, manageFocusOnOpen, handleFocusOut } =
    useFocusManagement({
      isOpen: effectiveIsOpen,
      searchList,
      touched,
      setTouched,
      actualCloseCombobox: closeComboboxAndReleasePin,
      shouldKeepOpen: shouldKeepComboboxOpen,
      shouldSkipOpenFocus,
      dropdownRef,
      dropdownMenuRef,
      searchInputRef,
      optionsContainerRef,
      mode,
    });

  const {
    dropDirection,
    portalStyle,
    isPositionReady,
    calculateComboboxPosition,
    resetPosition,
  } = useComboboxPosition(
    effectiveIsOpen,
    buttonRef,
    dropdownMenuRef,
    portalWidth,
    position,
    align,
    filteredOptions
  );

  const handleAddNewPreservingCombobox = useCallback(
    (term: string) => {
      if (!onAddNew) return;
      clearPendingFocus();
      setIsLocallyFrozen(true);
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      pinComboboxOpen();
      onAddNew(term);
    },
    [clearPendingFocus, onAddNew, pinComboboxOpen]
  );

  useEffect(() => {
    if (freezePersistedMenu && isLocallyFrozen) {
      setIsLocallyFrozen(false);
    }
  }, [freezePersistedMenu, isLocallyFrozen]);

  useEffect(() => {
    return () => {
      pinnedOpenRef.current = false;
      if (pinnedComboboxId === instanceId) {
        pinnedComboboxId = null;
      }
    };
  }, [instanceId]);

  useEffect(() => {
    const wasFrozen = previousMenuFrozenRef.current;
    previousMenuFrozenRef.current = isMenuFrozen;

    if (!shouldKeepComboboxOpen()) {
      frozenValueRef.current = null;
      return;
    }

    if (!wasFrozen && isMenuFrozen) {
      frozenValueRef.current = typeof value === 'string' ? value : null;
      return;
    }

    if (wasFrozen && !isMenuFrozen && frozenValueRef.current === value) {
      frozenValueRef.current = null;
    }
  }, [isMenuFrozen, shouldKeepComboboxOpen, value]);

  const { expandedId, setExpandedId } = useTextExpansion({
    buttonRef,
    selectedOption: selectedOption || undefined,
    isOpen: effectiveIsOpen,
  });

  // Hover functionality now handled by useComboboxEffects

  // scrollState and checkScroll now handled by useScrollManagement

  const handleSelect = useCallback(
    (optionId: string) => {
      if (withCheckbox && isCheckboxMode(allProps)) {
        // Multiple selection for checkbox mode
        const currentValues = allProps.value;
        const newValues = currentValues.includes(optionId)
          ? currentValues.filter(id => id !== optionId)
          : [...currentValues, optionId];
        allProps.onChange(newValues);
        if (newValues.length > 0) {
          handleCloseValidation();
        }
        // Don't close dropdown in checkbox mode to allow multiple selections
      } else {
        // Single selection for radio/default mode
        const singleProps = allProps as ComboboxProps;
        singleProps.onChange(optionId);
        if (optionId && optionId.trim() !== '') {
          handleCloseValidation();
        }
        closeComboboxAndReleasePin();
        resetSearch();
        setTimeout(() => buttonRef.current?.focus(), 150);
      }
    },
    [
      withCheckbox,
      allProps,
      closeComboboxAndReleasePin,
      handleCloseValidation,
      resetSearch,
      isCheckboxMode,
    ]
  );

  const {
    highlightedIndex,
    isKeyboardNavigation,
    pendingHighlightedIndex,
    pendingHighlightSourceIndex,
    setHighlightedIndex,
    setIsKeyboardNavigation,
    handleComboboxKeyDown,
  } = useKeyboardNavigation({
    isOpen: effectiveIsOpen,
    value: typeof value === 'string' ? value : undefined,
    currentFilteredOptions: filteredOptions,
    setExpandedId,
    searchState,
    searchTerm,
    debouncedSearchTerm,
    onSelect: handleSelect,
    onAddNew: handleAddNewPreservingCombobox,
    onCloseCombobox: closeComboboxAndReleasePin,
    onCloseValidation: handleCloseValidation,
    autoHighlightOnOpen: true,
    optionsContainerRef: optionsContainerRef as RefObject<HTMLDivElement>,
  });

  useEffect(() => {
    if (!effectiveIsOpen) {
      if (activeManagedComboboxId === instanceId) {
        activeManagedComboboxId = null;
        activeManagedComboboxCloseCallback = null;
      }
      return;
    }

    activeManagedComboboxId = instanceId;
    activeManagedComboboxCloseCallback = closeComboboxAndReleasePin;

    return () => {
      if (activeManagedComboboxId === instanceId) {
        activeManagedComboboxId = null;
        activeManagedComboboxCloseCallback = null;
      }
    };
  }, [closeComboboxAndReleasePin, effectiveIsOpen, instanceId]);

  useEffect(() => {
    if (!shouldKeepComboboxOpen() || isOpen || isClosing) return;
    if (isMenuFrozen) return;

    suppressFocusOnNextOpenRef.current = true;
    openComboboxExclusively();
  }, [
    isMenuFrozen,
    isClosing,
    isOpen,
    openComboboxExclusively,
    shouldKeepComboboxOpen,
  ]);

  useEffect(() => {
    if (!effectiveIsOpen) return;

    const handlePointerDownOutside = (event: PointerEvent) => {
      if (!shouldKeepComboboxOpen()) return;
      if (isMenuFrozen) return;

      const target = event.target;
      if (!(target instanceof Node)) return;

      const isInsideCombobox =
        dropdownRef.current?.contains(target) ||
        dropdownMenuRef.current?.contains(target);
      const isInsideModal =
        target instanceof Element &&
        Boolean(target.closest('[role="dialog"][aria-modal="true"]'));

      if (!isInsideCombobox && !isInsideModal) {
        closeComboboxAndReleasePin();
      }
    };

    document.addEventListener('pointerdown', handlePointerDownOutside, true);

    return () => {
      document.removeEventListener(
        'pointerdown',
        handlePointerDownOutside,
        true
      );
    };
  }, [
    closeComboboxAndReleasePin,
    effectiveIsOpen,
    isMenuFrozen,
    shouldKeepComboboxOpen,
  ]);

  useEffect(() => {
    if (!effectiveIsOpen || !shouldKeepComboboxOpen()) return;
    if (!selectedOption || searchTerm.trim() === '') return;

    const isSelectedOptionVisible = filteredOptions.some(
      option => option.id === selectedOption.id
    );
    const persistedValue = frozenValueRef.current;
    const hasSelectionChangedWhilePersisted =
      persistedValue !== null && persistedValue !== value;

    if (!isSelectedOptionVisible && hasSelectionChangedWhilePersisted) {
      frozenValueRef.current = null;
      resetSearch();
      return;
    }

    if (!isMenuFrozen && hasSelectionChangedWhilePersisted) {
      frozenValueRef.current = null;
    }
  }, [
    filteredOptions,
    effectiveIsOpen,
    isMenuFrozen,
    resetSearch,
    searchTerm,
    selectedOption,
    shouldKeepComboboxOpen,
    value,
  ]);

  const resetSearchSafely = useCallback(() => {
    if (isMenuFrozen) return;
    resetSearch();
  }, [isMenuFrozen, resetSearch]);

  // handleKeyDown functionality now provided by useKeyboardNavigation as handleComboboxKeyDown

  // Use dropdown effects hook with hover functionality
  const {
    isHovered,
    setIsHovered,
    leaveTimeoutRef,
    handleTriggerAreaEnter,
    handleMenuEnter,
    handleMouseLeaveWithCloseIntent,
  } = useComboboxEffects({
    isOpen: effectiveIsOpen,
    applyOpenStyles,
    filteredOptions,
    value: typeof value === 'string' ? value : undefined,
    setApplyOpenStyles,
    setExpandedId,
    calculateComboboxPosition,
    manageFocusOnOpen,
    handleFocusOut,
    resetPosition,
    resetSearch: resetSearchSafely,
    buttonRef,
    dropdownMenuRef,
    hoverToOpen,
    isClosing: effectiveIsClosing,
    openThisCombobox: openComboboxExclusively,
    actualCloseCombobox,
  });

  // Use scroll management hook
  const { scrollState, checkScroll } = useScrollManagement({
    isOpen: effectiveIsOpen,
    filteredOptions,
    searchTerm,
    debouncedSearchTerm,
    selectedValue: typeof value === 'string' ? value : undefined,
    optionsContainerRef,
    autoScrollOnOpen,
  });

  // Use hover detail hook
  const {
    isVisible: isHoverDetailVisible,
    position: hoverDetailPosition,
    data: hoverDetailData,
    handleOptionHover,
    handleOptionLeave,
    suppressPortal: suppressHoverDetail,
    hidePortal: hideHoverDetail,
  } = useHoverDetail({
    isEnabled: enableHoverDetail,
    hoverDelay: hoverDetailDelay,
    onFetchData: onFetchHoverDetail,
    isComboboxOpen: effectiveIsOpen && !isPortalFrozen,
  });

  const handleSearchChangeWithHoverReset = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (enableHoverDetail) {
        hideHoverDetail();
      }
      handleSearchChange(e);
    },
    [enableHoverDetail, handleSearchChange, hideHoverDetail]
  );

  const handleButtonBlur = useCallback(() => {
    setTimeout(() => {
      const activeElement = document.activeElement;
      const isFocusInCombobox =
        dropdownRef.current?.contains(activeElement) ||
        dropdownMenuRef.current?.contains(activeElement);

      if (isFocusInCombobox) {
        return;
      }

      setTouched(true);

      if (validate || required) {
        const isValid = validateCombobox();
        if (!isValid && showValidationOnBlur) {
          setShowValidationOverlay(true);
        } else if (isValid) {
          handleCloseValidation();
        }
      }
    }, 0);
  }, [
    dropdownMenuRef,
    dropdownRef,
    validate,
    required,
    validateCombobox,
    showValidationOnBlur,
    handleCloseValidation,
    setTouched,
    setShowValidationOverlay,
  ]);

  const handleSearchBarKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (
        [
          'ArrowDown',
          'ArrowUp',
          'Tab',
          'PageDown',
          'PageUp',
          'Enter',
          'Escape',
        ].includes(e.key)
      ) {
        handleComboboxKeyDown(e as never);
      }
    },
    [handleComboboxKeyDown]
  );

  const handleButtonKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (
        effectiveIsOpen &&
        searchList &&
        isPrintableSearchKey(e) &&
        !isEditableElement(e.target)
      ) {
        e.preventDefault();
        if (enableHoverDetail) {
          hideHoverDetail();
        }
        updateSearchTerm(`${searchTerm}${e.key}`);
        searchInputRef.current?.focus();
        queueMicrotask(() => {
          const input = searchInputRef.current;
          input?.setSelectionRange(input.value.length, input.value.length);
        });
        return;
      }

      handleComboboxKeyDown(e);
    },
    [
      enableHoverDetail,
      effectiveIsOpen,
      handleComboboxKeyDown,
      hideHoverDetail,
      searchList,
      searchTerm,
      updateSearchTerm,
    ]
  );

  const contextValue = {
    // State
    isOpen: effectiveIsOpen,
    isClosing: effectiveIsClosing,
    applyOpenStyles,
    value: withCheckbox && isCheckboxMode(allProps) ? allProps.value : value,
    mode,
    withRadio,
    withCheckbox,
    searchList,

    // Search state
    searchTerm,
    searchState,
    filteredOptions,

    // Navigation state
    highlightedIndex,
    isKeyboardNavigation,
    pendingHighlightedIndex,
    pendingHighlightSourceIndex,
    expandedId,

    // Validation state
    hasError,

    // Scroll state
    scrollState,

    // Position state
    dropDirection,
    portalStyle,
    isPositionReady,

    // Refs
    buttonRef: buttonRef as RefObject<HTMLButtonElement>,
    dropdownMenuRef: dropdownMenuRef as RefObject<HTMLDivElement>,
    searchInputRef: searchInputRef as RefObject<HTMLInputElement>,
    optionsContainerRef: optionsContainerRef as RefObject<HTMLDivElement>,

    // Handlers
    onSelect: handleSelect,
    onAddNew: handleAddNewPreservingCombobox,
    onSearchChange: handleSearchChangeWithHoverReset,
    onKeyDown: handleComboboxKeyDown,
    onSetHighlightedIndex: setHighlightedIndex,
    onSetIsKeyboardNavigation: setIsKeyboardNavigation,
    onMenuEnter: handleMenuEnter,
    onMenuLeave: handleMouseLeaveWithCloseIntent,
    onScroll: checkScroll,
    // Hover detail handlers
    onHoverDetailShow: enableHoverDetail ? handleOptionHover : undefined,
    onHoverDetailHide: enableHoverDetail ? handleOptionLeave : undefined,
    onHoverDetailSuppress: enableHoverDetail ? suppressHoverDetail : undefined,
  };

  return (
    <ComboboxProvider value={contextValue}>
      <div
        className={`relative inline-flex w-full ${isKeyboardNavigation ? 'cursor-none' : ''}`}
        ref={dropdownRef}
        onMouseEnter={() => {
          handleTriggerAreaEnter();
          setIsHovered(true);
        }}
        onMouseLeave={() => {
          handleMouseLeaveWithCloseIntent();
          setIsHovered(false);
        }}
      >
        <div className="w-full flex">
          <div className="hs-dropdown relative inline-flex w-full">
            <div className="relative w-full">
              <ComboboxButton
                ref={buttonRef}
                mode={mode}
                selectedOption={selectedOption || undefined}
                placeholder={placeholder}
                isOpen={effectiveIsOpen}
                isClosing={effectiveIsClosing}
                hasError={hasError}
                name={name}
                tabIndex={tabIndex}
                disabled={disabled}
                onClick={handleToggleCombobox}
                onKeyDown={handleButtonKeyDown}
                onBlur={handleButtonBlur}
              />
            </div>

            <ComboboxMenu
              ref={dropdownMenuRef}
              isFrozen={isPortalFrozen}
              leaveTimeoutRef={leaveTimeoutRef}
              onSearchKeyDown={handleSearchBarKeyDown}
            />
          </div>
        </div>
        {validate && (
          <ValidationOverlay
            error={errorMessage}
            showError={showValidationOverlay && hasError}
            targetRef={buttonRef}
            autoHide={validationAutoHide}
            autoHideDelay={validationAutoHideDelay}
            onAutoHide={handleValidationAutoHide}
            isHovered={isHovered}
            hasAutoHidden={hasAutoHidden}
            isOpen={effectiveIsOpen}
          />
        )}
        {enableHoverDetail && (
          <HoverDetailPortal
            isVisible={isHoverDetailVisible}
            position={hoverDetailPosition}
            data={hoverDetailData}
          />
        )}
      </div>
    </ComboboxProvider>
  );
}

export default Combobox;
