import React, { useRef, useCallback, RefObject, useEffect, useState, useId } from "react";
import type { DropdownProps, CheckboxDropdownProps } from "@/types";
import ValidationOverlay from "@/components/validation-overlay";
import DropdownButton from "./components/DropdownButton";
import DropdownMenu from "./components/DropdownMenu";
import HoverDetailPortal from "./components/HoverDetailPortal";
import { DropdownProvider } from "./providers/DropdownContext";
import { useDropdownState } from "./hooks/useDropdownState";
import { useDropdownSearch } from "./hooks/useDropdownSearch";
import { useDropdownValidation } from "./hooks/useDropdownValidation";
import { useDropdownPosition } from "./hooks/useDropdownPosition";
import { useKeyboardNavigation } from "./hooks/useKeyboardNavigation";
// useDropdownHover merged into useDropdownEffects
// useScrollState merged into useScrollManagement
import { useTextExpansion } from "./hooks/useTextExpansion";
import { useFocusManagement } from "./hooks/useFocusManagement";
import { useScrollManagement } from "./hooks/useScrollManagement";
import { useDropdownEffects } from "./hooks/useDropdownEffects";
import { useHoverDetail } from "./hooks/useHoverDetail";

let pinnedDropdownName: string | null = null;
let activeManagedDropdownId: string | null = null;
let activeManagedDropdownCloseCallback: (() => void) | null = null;

// Function overloads for different modes
function Dropdown(props: DropdownProps): React.JSX.Element;
function Dropdown(props: CheckboxDropdownProps): React.JSX.Element;
function Dropdown(allProps: DropdownProps | CheckboxDropdownProps) {
  const {
    mode = "input",
    options,
    value,
    placeholder = "-- Pilih --",
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
    portalWidth = "auto",
    // Position control
    position = "auto",
    // Alignment control
    align = "right",
    // Hover detail props
    enableHoverDetail = false,
    hoverDetailDelay = 800,
    onFetchHoverDetail,
  } = allProps;

  const withCheckbox = "withCheckbox" in allProps && allProps.withCheckbox;
  const withRadio = "withRadio" in allProps ? allProps.withRadio : false;
  const instanceId = useId();

  // Type guard for checkbox mode - memoized to prevent useCallback dependency changes
  const isCheckboxMode = useCallback(
    (props: DropdownProps | CheckboxDropdownProps): props is CheckboxDropdownProps => {
      return "withCheckbox" in props && props.withCheckbox === true;
    },
    [],
  );

  // For single selection (radio) mode
  const selectedOption = !withCheckbox ? options.find((option) => option?.id === value) : null;

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
  const shouldKeepDropdownOpen = useCallback(
    () => persistOpen || pinnedOpenRef.current || pinnedDropdownName === name,
    [name, persistOpen],
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
    openThisDropdown,
    actualCloseDropdown,
    toggleDropdown,
  } = useDropdownState({
    shouldKeepOpen: shouldKeepDropdownOpen,
  });
  const isMenuFrozen = freezePersistedMenu || isLocallyFrozen;
  const effectiveIsOpen = isOpen || shouldKeepDropdownOpen();
  const effectiveIsClosing = isClosing && !shouldKeepDropdownOpen();
  const isPortalFrozen = isMenuFrozen && effectiveIsOpen;

  const pinDropdownOpen = useCallback(() => {
    pinnedOpenRef.current = true;
    pinnedDropdownName = name;
  }, [name]);

  const releasePinnedOpen = useCallback(() => {
    pinnedOpenRef.current = false;
    if (pinnedDropdownName === name) {
      pinnedDropdownName = null;
    }
  }, [name]);

  const closeDropdownAndReleasePin = useCallback(() => {
    onPersistOpenClear?.();
    releasePinnedOpen();
    actualCloseDropdown(true);
  }, [actualCloseDropdown, onPersistOpenClear, releasePinnedOpen]);

  const closeOtherActiveDropdown = useCallback(() => {
    if (activeManagedDropdownId !== null && activeManagedDropdownId !== instanceId) {
      activeManagedDropdownCloseCallback?.();
    }
  }, [instanceId]);

  const openDropdownExclusively = useCallback(() => {
    closeOtherActiveDropdown();
    openThisDropdown();
  }, [closeOtherActiveDropdown, openThisDropdown]);

  const handleToggleDropdown = useCallback(
    (e: React.MouseEvent) => {
      if (effectiveIsOpen) {
        onPersistOpenClear?.();
        releasePinnedOpen();
      } else {
        closeOtherActiveDropdown();
      }
      toggleDropdown(e);
    },
    [
      closeOtherActiveDropdown,
      effectiveIsOpen,
      onPersistOpenClear,
      releasePinnedOpen,
      toggleDropdown,
    ],
  );

  const { searchTerm, searchState, filteredOptions, handleSearchChange, resetSearch } =
    useDropdownSearch(options, searchList);

  const {
    hasError,
    errorMessage,
    touched,
    setTouched,
    showValidationOverlay,
    setShowValidationOverlay,
    hasAutoHidden,
    validateDropdown,
    handleCloseValidation,
    handleValidationAutoHide,
  } = useDropdownValidation({
    validate,
    required,
    value:
      typeof value === "string" ? value : Array.isArray(value) && value.length > 0 ? value[0] : "",
    showValidationOnBlur,
    validationAutoHide,
    validationAutoHideDelay,
  });

  const { clearPendingFocus, manageFocusOnOpen, handleFocusOut } = useFocusManagement({
    isOpen: effectiveIsOpen,
    searchList,
    touched,
    setTouched,
    actualCloseDropdown: closeDropdownAndReleasePin,
    shouldKeepOpen: shouldKeepDropdownOpen,
    shouldSkipOpenFocus,
    dropdownRef,
    dropdownMenuRef,
    searchInputRef,
    optionsContainerRef,
    mode,
  });

  const { dropDirection, portalStyle, isPositionReady, calculateDropdownPosition, resetPosition } =
    useDropdownPosition(
      effectiveIsOpen,
      buttonRef,
      dropdownMenuRef,
      portalWidth,
      position,
      align,
      filteredOptions,
    );

  const handleAddNewPreservingDropdown = useCallback(
    (term: string) => {
      if (!onAddNew) return;
      clearPendingFocus();
      setIsLocallyFrozen(true);
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      pinDropdownOpen();
      onAddNew(term);
    },
    [clearPendingFocus, onAddNew, pinDropdownOpen],
  );

  useEffect(() => {
    if (freezePersistedMenu && isLocallyFrozen) {
      setIsLocallyFrozen(false);
    }
  }, [freezePersistedMenu, isLocallyFrozen]);

  useEffect(() => {
    return () => {
      pinnedOpenRef.current = false;
      if (pinnedDropdownName === name) {
        pinnedDropdownName = null;
      }
    };
  }, [name]);

  useEffect(() => {
    const wasFrozen = previousMenuFrozenRef.current;
    previousMenuFrozenRef.current = isMenuFrozen;

    if (!shouldKeepDropdownOpen()) {
      frozenValueRef.current = null;
      return;
    }

    if (!wasFrozen && isMenuFrozen) {
      frozenValueRef.current = typeof value === "string" ? value : null;
      return;
    }

    if (wasFrozen && !isMenuFrozen && frozenValueRef.current === value) {
      frozenValueRef.current = null;
    }
  }, [isMenuFrozen, shouldKeepDropdownOpen, value]);

  const { expandedId, setExpandedId } = useTextExpansion({
    buttonRef,
    selectedOption: selectedOption || undefined,
    isOpen: effectiveIsOpen,
  });

  // Hover functionality now handled by useDropdownEffects

  // scrollState and checkScroll now handled by useScrollManagement

  const handleSelect = useCallback(
    (optionId: string) => {
      if (withCheckbox && isCheckboxMode(allProps)) {
        // Multiple selection for checkbox mode
        const currentValues = allProps.value;
        const newValues = currentValues.includes(optionId)
          ? currentValues.filter((id) => id !== optionId)
          : [...currentValues, optionId];
        allProps.onChange(newValues);
        if (newValues.length > 0) {
          handleCloseValidation();
        }
        // Don't close dropdown in checkbox mode to allow multiple selections
      } else {
        // Single selection for radio/default mode
        const singleProps = allProps as DropdownProps;
        singleProps.onChange(optionId);
        if (optionId && optionId.trim() !== "") {
          handleCloseValidation();
        }
        closeDropdownAndReleasePin();
        resetSearch();
        setTimeout(() => buttonRef.current?.focus(), 150);
      }
    },
    [
      withCheckbox,
      allProps,
      closeDropdownAndReleasePin,
      handleCloseValidation,
      resetSearch,
      isCheckboxMode,
    ],
  );

  const {
    highlightedIndex,
    isKeyboardNavigation,
    pendingHighlightedIndex,
    setHighlightedIndex,
    setIsKeyboardNavigation,
    handleDropdownKeyDown,
  } = useKeyboardNavigation({
    isOpen: effectiveIsOpen,
    value: typeof value === "string" ? value : undefined,
    currentFilteredOptions: filteredOptions,
    setExpandedId,
    searchState,
    searchTerm,
    onSelect: handleSelect,
    onAddNew: handleAddNewPreservingDropdown,
    onCloseDropdown: closeDropdownAndReleasePin,
    onCloseValidation: handleCloseValidation,
    autoHighlightOnOpen: mode !== "text",
    optionsContainerRef: optionsContainerRef as RefObject<HTMLDivElement>,
  });

  useEffect(() => {
    if (!effectiveIsOpen) {
      if (activeManagedDropdownId === instanceId) {
        activeManagedDropdownId = null;
        activeManagedDropdownCloseCallback = null;
      }
      return;
    }

    activeManagedDropdownId = instanceId;
    activeManagedDropdownCloseCallback = closeDropdownAndReleasePin;

    return () => {
      if (activeManagedDropdownId === instanceId) {
        activeManagedDropdownId = null;
        activeManagedDropdownCloseCallback = null;
      }
    };
  }, [closeDropdownAndReleasePin, effectiveIsOpen, instanceId]);

  useEffect(() => {
    if (!shouldKeepDropdownOpen() || isOpen || isClosing) return;
    if (isMenuFrozen) return;

    suppressFocusOnNextOpenRef.current = true;
    openDropdownExclusively();
  }, [isMenuFrozen, isClosing, isOpen, openDropdownExclusively, shouldKeepDropdownOpen]);

  useEffect(() => {
    if (!effectiveIsOpen) return;

    const handlePointerDownOutside = (event: PointerEvent) => {
      if (!shouldKeepDropdownOpen()) return;
      if (isMenuFrozen) return;

      const target = event.target;
      if (!(target instanceof Node)) return;

      const isInsideDropdown =
        dropdownRef.current?.contains(target) || dropdownMenuRef.current?.contains(target);
      const isInsideModal =
        target instanceof Element && Boolean(target.closest('[role="dialog"][aria-modal="true"]'));

      if (!isInsideDropdown && !isInsideModal) {
        closeDropdownAndReleasePin();
      }
    };

    document.addEventListener("pointerdown", handlePointerDownOutside, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDownOutside, true);
    };
  }, [closeDropdownAndReleasePin, effectiveIsOpen, isMenuFrozen, shouldKeepDropdownOpen]);

  useEffect(() => {
    if (!effectiveIsOpen || !shouldKeepDropdownOpen()) return;
    if (!selectedOption || searchTerm.trim() === "") return;

    const isSelectedOptionVisible = filteredOptions.some(
      (option) => option.id === selectedOption.id,
    );
    const persistedValue = frozenValueRef.current;
    const hasSelectionChangedWhilePersisted = persistedValue !== null && persistedValue !== value;

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
    shouldKeepDropdownOpen,
    value,
  ]);

  const resetSearchSafely = useCallback(() => {
    if (isMenuFrozen) return;
    resetSearch();
  }, [isMenuFrozen, resetSearch]);

  // handleKeyDown functionality now provided by useKeyboardNavigation as handleDropdownKeyDown

  // Use dropdown effects hook with hover functionality
  const {
    isHovered,
    setIsHovered,
    leaveTimeoutRef,
    handleTriggerAreaEnter,
    handleMenuEnter,
    handleMouseLeaveWithCloseIntent,
  } = useDropdownEffects({
    isOpen: effectiveIsOpen,
    applyOpenStyles,
    filteredOptions,
    value: typeof value === "string" ? value : undefined,
    setApplyOpenStyles,
    setExpandedId,
    calculateDropdownPosition,
    manageFocusOnOpen,
    handleFocusOut,
    resetPosition,
    resetSearch: resetSearchSafely,
    buttonRef,
    dropdownMenuRef,
    hoverToOpen,
    isClosing: effectiveIsClosing,
    openThisDropdown: openDropdownExclusively,
    actualCloseDropdown,
  });

  // Use scroll management hook
  const { scrollState, checkScroll } = useScrollManagement({
    isOpen: effectiveIsOpen,
    filteredOptions,
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
    hidePortal: hideHoverDetail,
  } = useHoverDetail({
    isEnabled: enableHoverDetail,
    hoverDelay: hoverDetailDelay,
    onFetchData: onFetchHoverDetail,
    isDropdownOpen: effectiveIsOpen && !isPortalFrozen,
  });

  const handleSearchChangeWithHoverReset = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (enableHoverDetail) {
        hideHoverDetail();
      }
      handleSearchChange(e);
    },
    [enableHoverDetail, handleSearchChange, hideHoverDetail],
  );

  const handleButtonBlur = useCallback(() => {
    // Always set touched to true
    setTouched(true);

    // Always run validation on blur if validation is enabled
    if (validate || required) {
      const isValid = validateDropdown();
      if (!isValid && showValidationOnBlur) {
        setShowValidationOverlay(true);
      } else if (isValid) {
        handleCloseValidation();
      }
    }
  }, [
    validate,
    required,
    validateDropdown,
    showValidationOnBlur,
    handleCloseValidation,
    setTouched,
    setShowValidationOverlay,
  ]);

  const handleSearchBarKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (
        ["ArrowDown", "ArrowUp", "Tab", "PageDown", "PageUp", "Enter", "Escape"].includes(e.key)
      ) {
        handleDropdownKeyDown(e as never);
      }
    },
    [handleDropdownKeyDown],
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
    onAddNew: handleAddNewPreservingDropdown,
    onSearchChange: handleSearchChangeWithHoverReset,
    onKeyDown: handleDropdownKeyDown,
    onSetHighlightedIndex: setHighlightedIndex,
    onSetIsKeyboardNavigation: setIsKeyboardNavigation,
    onMenuEnter: handleMenuEnter,
    onMenuLeave: handleMouseLeaveWithCloseIntent,
    onScroll: checkScroll,
    // Hover detail handlers
    onHoverDetailShow: enableHoverDetail ? handleOptionHover : undefined,
    onHoverDetailHide: enableHoverDetail ? handleOptionLeave : undefined,
  };

  return (
    <DropdownProvider value={contextValue}>
      <div
        className={`relative inline-flex w-full ${isKeyboardNavigation ? "cursor-none" : ""}`}
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
              <DropdownButton
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
                onClick={handleToggleDropdown}
                onKeyDown={!searchList ? handleDropdownKeyDown : undefined}
                onBlur={handleButtonBlur}
              />
            </div>

            <DropdownMenu
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
    </DropdownProvider>
  );
}

export default Dropdown;
