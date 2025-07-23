import { useRef, useCallback, RefObject } from "react";
import type { DropdownProps } from "@/types";
import ValidationOverlay from "@/components/validation-overlay";
import DropdownButton from "./components/DropdownButton";
import DropdownMenu from "./components/DropdownMenu";
import { DropdownProvider } from "./providers/DropdownContext";
import { useDropdownState } from "./hooks/useDropdownState";
import { useSearch } from "./hooks/search/useSearch";
import { useOptionsFilter } from "./hooks/search/useOptionsFilter";
import { useDropdownValidation } from "./hooks/useDropdownValidation";
import { useDropdownPosition } from "./hooks/useDropdownPosition";
import { useKeyboardEvents } from "./hooks/keyboard/useKeyboardEvents";
import { useNavigationState } from "./hooks/keyboard/useNavigationState";
import { useDropdownHover } from "./hooks/useDropdownHover";
import { useScrollState } from "./hooks/useScrollState";
import { useTextExpansion } from "./hooks/useTextExpansion";
import { useFocusManagement } from "./hooks/useFocusManagement";
import { useScrollManagement } from "./hooks/useScrollManagement";
import { useDropdownEffects } from "./hooks/useDropdownEffects";

const Dropdown = ({
  options,
  value,
  onChange,
  placeholder = "-- Pilih --",
  withRadio = false,
  onAddNew,
  searchList = true,
  tabIndex,
  required = false,
  validate = false,
  showValidationOnBlur = true,
  validationAutoHide = true,
  validationAutoHideDelay,
  name, // Used for form field identification and validation
  hoverToOpen = false,
}: DropdownProps) => {
  const selectedOption = options.find((option) => option?.id === value);

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
    debouncedSearchTerm,
    searchState,
    handleSearchChange,
    resetSearch,
    updateSearchState,
  } = useSearch();

  const { filteredOptions } = useOptionsFilter({
    options,
    debouncedSearchTerm,
    searchList,
    updateSearchState,
  });

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
    value,
    showValidationOnBlur,
    validationAutoHide,
    validationAutoHideDelay,
  });

  const {
    dropDirection,
    portalStyle,
    calculateDropdownPosition,
    resetPosition,
  } = useDropdownPosition(isOpen, buttonRef, dropdownMenuRef);

  const { expandedId, setExpandedId, handleExpansion } = useTextExpansion(
    buttonRef,
    selectedOption,
  );

  const {
    isHovered,
    setIsHovered,
    leaveTimeoutRef,
    handleTriggerAreaEnter,
    handleMenuEnter,
    handleMouseLeaveWithCloseIntent,
    clearTimeouts,
  } = useDropdownHover(
    hoverToOpen,
    isOpen,
    isClosing,
    openThisDropdown,
    actualCloseDropdown,
  );

  const { scrollState, checkScroll } = useScrollState(optionsContainerRef);

  const {
    highlightedIndex,
    isKeyboardNavigation,
    setHighlightedIndex,
    setIsKeyboardNavigation,
    handleNavigate,
    scrollToHighlightedOption,
    handleEscape,
    handleEnter,
  } = useNavigationState({
    isOpen,
    currentFilteredOptions: filteredOptions,
    setExpandedId,
    optionsContainerRef,
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
  });

  const handleSelect = useCallback(
    (optionId: string) => {
      onChange(optionId);
      if (optionId && optionId.trim() !== "") {
        handleCloseValidation();
      }
      actualCloseDropdown();
      resetSearch();
      setTimeout(() => buttonRef.current?.focus(), 150);
    },
    [onChange, actualCloseDropdown, handleCloseValidation, resetSearch],
  );

  const { handleKeyDown } = useKeyboardEvents({
    isOpen,
    currentFilteredOptions: filteredOptions,
    highlightedIndex,
    searchState,
    searchTerm,
    onSelect: handleSelect,
    onAddNew,
    onCloseDropdown: () => {
      actualCloseDropdown();
      setExpandedId(null);
    },
    onCloseValidation: handleCloseValidation,
    onNavigate: handleNavigate,
    onEscape: handleEscape,
    onEnter: handleEnter,
  });

  // Use dropdown effects hook
  useDropdownEffects({
    isOpen,
    applyOpenStyles,
    filteredOptions,
    value,
    setApplyOpenStyles,
    setHighlightedIndex,
    setExpandedId,
    calculateDropdownPosition,
    manageFocusOnOpen,
    handleFocusOut,
    clearTimeouts,
    resetPosition,
    resetSearch,
    checkScroll,
    scrollToHighlightedOption,
    buttonRef,
    dropdownMenuRef,
    optionsContainerRef,
    highlightedIndex,
  });

  // Use scroll management hook
  useScrollManagement({
    isOpen,
    applyOpenStyles,
    filteredOptions,
    highlightedIndex,
    checkScroll,
    scrollToHighlightedOption,
    optionsContainerRef,
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
          "ArrowDown",
          "ArrowUp",
          "Tab",
          "PageDown",
          "PageUp",
          "Enter",
          "Escape",
        ].includes(e.key)
      ) {
        handleKeyDown(e as never);
      }
    },
    [handleKeyDown],
  );

  const contextValue = {
    // State
    isOpen,
    isClosing,
    applyOpenStyles,
    value,
    withRadio,
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

    // Refs
    buttonRef: buttonRef as RefObject<HTMLButtonElement>,
    dropdownMenuRef: dropdownMenuRef as RefObject<HTMLDivElement>,
    searchInputRef: searchInputRef as RefObject<HTMLInputElement>,
    optionsContainerRef: optionsContainerRef as RefObject<HTMLDivElement>,

    // Handlers
    onSelect: handleSelect,
    onAddNew,
    onSearchChange: handleSearchChange,
    onKeyDown: handleKeyDown,
    onSetHighlightedIndex: setHighlightedIndex,
    onSetIsKeyboardNavigation: setIsKeyboardNavigation,
    onExpansion: handleExpansion,
    onMenuEnter: handleMenuEnter,
    onMenuLeave: handleMouseLeaveWithCloseIntent,
    onScroll: checkScroll,
  };

  return (
    <DropdownProvider value={contextValue}>
      <div
        className="relative inline-flex w-full"
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
                selectedOption={selectedOption}
                placeholder={placeholder}
                isOpen={isOpen}
                isClosing={isClosing}
                hasError={hasError}
                name={name}
                tabIndex={tabIndex}
                onClick={toggleDropdown}
                onKeyDown={!searchList ? handleKeyDown : undefined}
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
      </div>
    </DropdownProvider>
  );
};

export default Dropdown;
