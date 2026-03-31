import React, {
  useRef,
  useCallback,
  RefObject,
  useEffect,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import type { DropdownProps, CheckboxDropdownProps } from '@/types';
import ValidationOverlay from '@/components/validation-overlay';
import DropdownButton from './components/DropdownButton';
import DropdownMenu from './components/DropdownMenu';
import HoverDetailPortal from './components/HoverDetailPortal';
import { DropdownProvider } from './providers/DropdownContext';
import { useDropdownState } from './hooks/useDropdownState';
import { useDropdownSearch } from './hooks/useDropdownSearch';
import { useDropdownValidation } from './hooks/useDropdownValidation';
import { useDropdownPosition } from './hooks/useDropdownPosition';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation';
// useDropdownHover merged into useDropdownEffects
// useScrollState merged into useScrollManagement
import { useTextExpansion } from './hooks/useTextExpansion';
import { useFocusManagement } from './hooks/useFocusManagement';
import { useScrollManagement } from './hooks/useScrollManagement';
import { useDropdownEffects } from './hooks/useDropdownEffects';
import { useHoverDetail } from './hooks/useHoverDetail';
import { PORTAL_SURFACE_CLASS } from '@/styles/uiPrimitives';

interface FrozenDropdownSnapshot {
  dropDirection: 'up' | 'down';
  filteredOptions: Array<{ id: string; name: string; metaLabel?: string }>;
  portalStyle: React.CSSProperties;
  searchTerm: string;
  value: string;
}

// Function overloads for different modes
function Dropdown(props: DropdownProps): React.JSX.Element;
function Dropdown(props: CheckboxDropdownProps): React.JSX.Element;
function Dropdown(allProps: DropdownProps | CheckboxDropdownProps) {
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

  // Type guard for checkbox mode - memoized to prevent useCallback dependency changes
  const isCheckboxMode = useCallback(
    (
      props: DropdownProps | CheckboxDropdownProps
    ): props is CheckboxDropdownProps => {
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
  const suppressFocusOnNextOpenRef = useRef(false);
  const [isLocallyFrozen, setIsLocallyFrozen] = useState(false);
  const [frozenSnapshot, setFrozenSnapshot] =
    useState<FrozenDropdownSnapshot | null>(null);

  // Hooks
  const shouldKeepDropdownOpen = useCallback(() => persistOpen, [persistOpen]);
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
  const effectiveIsOpen = !isMenuFrozen && (isOpen || shouldKeepDropdownOpen());
  const effectiveIsClosing = isClosing && !persistOpen;

  const closeDropdownAndClearPersist = useCallback(() => {
    onPersistOpenClear?.();
    actualCloseDropdown(true);
  }, [actualCloseDropdown, onPersistOpenClear]);

  const handleToggleDropdown = useCallback(
    (e: React.MouseEvent) => {
      if (effectiveIsOpen) {
        onPersistOpenClear?.();
      }
      toggleDropdown(e);
    },
    [effectiveIsOpen, onPersistOpenClear, toggleDropdown]
  );

  const {
    searchTerm,
    searchState,
    filteredOptions,
    handleSearchChange,
    resetSearch,
  } = useDropdownSearch(options, searchList);

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
      actualCloseDropdown: closeDropdownAndClearPersist,
      shouldKeepOpen: shouldKeepDropdownOpen,
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
    calculateDropdownPosition,
    resetPosition,
  } = useDropdownPosition(
    effectiveIsOpen,
    buttonRef,
    dropdownMenuRef,
    portalWidth,
    position,
    align,
    filteredOptions
  );

  const handleAddNewPreservingDropdown = useCallback(
    (term: string) => {
      if (!onAddNew) return;
      clearPendingFocus();
      setIsLocallyFrozen(true);
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      actualCloseDropdown(true);
      onAddNew(term);
    },
    [actualCloseDropdown, clearPendingFocus, onAddNew]
  );

  useEffect(() => {
    if (persistOpen && freezePersistedMenu && isLocallyFrozen) {
      setIsLocallyFrozen(false);
    }
  }, [freezePersistedMenu, isLocallyFrozen, persistOpen]);

  useEffect(() => {
    if (!persistOpen && !isLocallyFrozen) {
      setFrozenSnapshot(null);
      return;
    }

    if (!isMenuFrozen) return;

    setFrozenSnapshot({
      dropDirection,
      filteredOptions: filteredOptions.map(option => {
        const matchedOption = options.find(
          originalOption => originalOption.id === option.id
        );
        return {
          id: option.id,
          name: option.name,
          metaLabel: matchedOption?.metaLabel,
        };
      }),
      portalStyle,
      searchTerm,
      value: typeof value === 'string' ? value : '',
    });
  }, [
    dropDirection,
    filteredOptions,
    isMenuFrozen,
    isLocallyFrozen,
    options,
    persistOpen,
    portalStyle,
    searchTerm,
    value,
  ]);

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
          ? currentValues.filter(id => id !== optionId)
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
        if (optionId && optionId.trim() !== '') {
          handleCloseValidation();
        }
        closeDropdownAndClearPersist();
        resetSearch();
        setTimeout(() => buttonRef.current?.focus(), 150);
      }
    },
    [
      withCheckbox,
      allProps,
      closeDropdownAndClearPersist,
      handleCloseValidation,
      resetSearch,
      isCheckboxMode,
    ]
  );

  const {
    highlightedIndex,
    isKeyboardNavigation,
    setHighlightedIndex,
    setIsKeyboardNavigation,
    handleDropdownKeyDown,
  } = useKeyboardNavigation({
    isOpen: effectiveIsOpen,
    value: typeof value === 'string' ? value : undefined,
    currentFilteredOptions: filteredOptions,
    setExpandedId,
    searchState,
    searchTerm,
    onSelect: handleSelect,
    onAddNew: handleAddNewPreservingDropdown,
    onCloseDropdown: closeDropdownAndClearPersist,
    onCloseValidation: handleCloseValidation,
    optionsContainerRef,
    autoHighlightOnOpen: mode !== 'text',
  });

  useEffect(() => {
    if (!shouldKeepDropdownOpen() || isOpen || isClosing) return;
    if (isMenuFrozen) return;

    suppressFocusOnNextOpenRef.current = true;
    openThisDropdown();
  }, [
    isMenuFrozen,
    isClosing,
    isOpen,
    openThisDropdown,
    shouldKeepDropdownOpen,
  ]);

  useEffect(() => {
    if (!effectiveIsOpen) return;

    const handlePointerDownOutside = (event: PointerEvent) => {
      if (!shouldKeepDropdownOpen()) return;

      const target = event.target;
      if (!(target instanceof Node)) return;

      const isInsideDropdown =
        dropdownRef.current?.contains(target) ||
        dropdownMenuRef.current?.contains(target);
      const isInsideModal =
        target instanceof Element &&
        Boolean(target.closest('[role="dialog"][aria-modal="true"]'));

      if (!isInsideDropdown && !isInsideModal) {
        closeDropdownAndClearPersist();
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
  }, [closeDropdownAndClearPersist, effectiveIsOpen, shouldKeepDropdownOpen]);

  useEffect(() => {
    if (!effectiveIsOpen || !shouldKeepDropdownOpen()) return;
    if (!selectedOption || searchTerm.trim() === '') return;

    const isSelectedOptionVisible = filteredOptions.some(
      option => option.id === selectedOption.id
    );

    if (!isSelectedOptionVisible) {
      resetSearch();
    }
  }, [
    filteredOptions,
    effectiveIsOpen,
    resetSearch,
    searchTerm,
    selectedOption,
    shouldKeepDropdownOpen,
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
    value: typeof value === 'string' ? value : undefined,
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
    openThisDropdown,
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
    isDropdownOpen: effectiveIsOpen,
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
        handleDropdownKeyDown(e as never);
      }
    },
    [handleDropdownKeyDown]
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
        className={`relative inline-flex w-full ${
          isKeyboardNavigation ? 'cursor-none' : ''
        }`}
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
        {isMenuFrozen && frozenSnapshot
          ? createPortal(
              <div
                style={frozenSnapshot.portalStyle}
                className={`${frozenSnapshot.dropDirection === 'down' ? 'origin-top' : 'origin-bottom'} ${PORTAL_SURFACE_CLASS} shadow-xl opacity-100 scale-100 pointer-events-none select-none`}
              >
                {searchList && (
                  <div className="p-2 border-b border-slate-200 sticky top-0 z-10 bg-white">
                    <input
                      type="text"
                      value={frozenSnapshot.searchTerm}
                      readOnly
                      className="w-full py-2 text-sm border rounded-xl min-w-0 pl-2 border-slate-300 bg-white text-slate-800"
                    />
                  </div>
                )}
                <div className="p-1 max-h-60 overflow-y-auto">
                  {frozenSnapshot.filteredOptions.length > 0 ? (
                    frozenSnapshot.filteredOptions.map(option => (
                      <div
                        key={option.id}
                        className={`flex items-center w-full py-2 px-3 rounded-xl text-sm ${
                          option.id === frozenSnapshot.value
                            ? 'bg-slate-100 text-primary font-semibold'
                            : 'text-slate-800'
                        }`}
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {option.name}
                        </span>
                        {option.metaLabel ? (
                          <span className="shrink-0 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                            {option.metaLabel}
                          </span>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-sm text-slate-500">
                      Tidak ada pilihan yang sesuai
                    </div>
                  )}
                </div>
              </div>,
              document.body
            )
          : null}
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
