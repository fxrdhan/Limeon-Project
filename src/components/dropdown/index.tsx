import React, { useRef, useCallback, RefObject } from 'react';
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

  // Hooks
  const {
    isOpen,
    isClosing,
    applyOpenStyles,
    setApplyOpenStyles,
    openThisDropdown,
    actualCloseDropdown,
    toggleDropdown,
  } = useDropdownState();

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

  const {
    dropDirection,
    portalStyle,
    isPositionReady,
    calculateDropdownPosition,
    resetPosition,
  } = useDropdownPosition(
    isOpen,
    buttonRef,
    dropdownMenuRef,
    portalWidth,
    position,
    align,
    filteredOptions
  );

  const { expandedId, setExpandedId } = useTextExpansion({
    buttonRef,
    selectedOption: selectedOption || undefined,
    isOpen,
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
        actualCloseDropdown();
        resetSearch();
        setTimeout(() => buttonRef.current?.focus(), 150);
      }
    },
    [
      withCheckbox,
      allProps,
      actualCloseDropdown,
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
    isOpen,
    value: typeof value === 'string' ? value : undefined,
    currentFilteredOptions: filteredOptions,
    setExpandedId,
    searchState,
    searchTerm,
    onSelect: handleSelect,
    onAddNew,
    onCloseDropdown: actualCloseDropdown,
    onCloseValidation: handleCloseValidation,
    optionsContainerRef,
    autoHighlightOnOpen: mode !== 'text',
  });

  const { manageFocusOnOpen, handleFocusOut } = useFocusManagement({
    isOpen,
    searchList,
    touched,
    setTouched,
    actualCloseDropdown,
    dropdownRef,
    dropdownMenuRef,
    searchInputRef,
    optionsContainerRef,
    mode,
  });

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
    isOpen,
    applyOpenStyles,
    filteredOptions,
    value: typeof value === 'string' ? value : undefined,
    setApplyOpenStyles,
    setExpandedId,
    calculateDropdownPosition,
    manageFocusOnOpen,
    handleFocusOut,
    resetPosition,
    resetSearch,
    buttonRef,
    dropdownMenuRef,
    hoverToOpen,
    isClosing,
    openThisDropdown,
    actualCloseDropdown,
  });

  // Use scroll management hook
  const { scrollState, checkScroll } = useScrollManagement({
    isOpen,
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
  } = useHoverDetail({
    isEnabled: enableHoverDetail,
    hoverDelay: hoverDetailDelay,
    onFetchData: onFetchHoverDetail,
    isDropdownOpen: isOpen,
  });

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
    isOpen,
    isClosing,
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
    onAddNew,
    onSearchChange: handleSearchChange,
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
                isOpen={isOpen}
                isClosing={isClosing}
                hasError={hasError}
                name={name}
                tabIndex={tabIndex}
                disabled={disabled}
                onClick={toggleDropdown}
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
            isOpen={isOpen}
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
