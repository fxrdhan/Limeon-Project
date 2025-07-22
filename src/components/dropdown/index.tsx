import {
  useEffect,
  useRef,
  useCallback,
} from "react";
import type { DropdownProps } from "@/types";
import ValidationOverlay from "@/components/validation-overlay";
import DropdownButton from "./components/DropdownButton";
import DropdownMenu from "./components/DropdownMenu";
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
import { DROPDOWN_CONSTANTS } from "./constants";
import { shouldTruncateText } from "@/utils/text";


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
  const { isOpen, isClosing, applyOpenStyles, setApplyOpenStyles, openThisDropdown, actualCloseDropdown, toggleDropdown } = useDropdownState();
  
  const { searchTerm, debouncedSearchTerm, searchState, handleSearchChange, resetSearch, updateSearchState } = useSearch();
  
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
  
  const { dropDirection, portalStyle, calculateDropdownPosition, resetPosition } = useDropdownPosition(
    isOpen,
    buttonRef,
    dropdownMenuRef,
  );
  
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
  } = useDropdownHover(hoverToOpen, isOpen, isClosing, openThisDropdown, actualCloseDropdown);
  
  const { scrollState, checkScroll } = useScrollState(optionsContainerRef);
  
  const { highlightedIndex, isKeyboardNavigation, setHighlightedIndex, setIsKeyboardNavigation, handleNavigate, scrollToHighlightedOption, handleEscape, handleEnter } = useNavigationState({
    isOpen,
    currentFilteredOptions: filteredOptions,
    setExpandedId,
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



  // Set initial highlighted index when dropdown opens
  useEffect(() => {
    if (isOpen && filteredOptions.length > 0) {
      const selectedIndex = value
        ? filteredOptions.findIndex((option) => option.id === value)
        : -1;
      const initialIndex = selectedIndex >= 0 ? selectedIndex : 0;
      setHighlightedIndex(initialIndex);

      const highlightedOption = filteredOptions[initialIndex];
      if (highlightedOption && buttonRef.current) {
        const buttonWidth = buttonRef.current.getBoundingClientRect().width;
        const maxTextWidth = buttonWidth - DROPDOWN_CONSTANTS.BUTTON_PADDING;
        if (shouldTruncateText(highlightedOption.name, maxTextWidth)) {
          setExpandedId(highlightedOption.id);
        }
      }
    } else {
      setHighlightedIndex(-1);
    }
  }, [filteredOptions, isOpen, value, setExpandedId, setHighlightedIndex]);





  const manageFocusOnOpen = useCallback(() => {
    if (isOpen) {
      setTimeout(
        () => {
          (searchList ? searchInputRef : optionsContainerRef).current?.focus();
        },
        searchList ? DROPDOWN_CONSTANTS.SEARCH_FOCUS_DELAY : DROPDOWN_CONSTANTS.FOCUS_DELAY,
      );
    }
  }, [isOpen, searchList]);


  const handleFocusOut = useCallback(() => {
    setTimeout(() => {
      const activeElement = document.activeElement;
      const isFocusInDropdown =
        dropdownRef.current?.contains(activeElement) ||
        dropdownMenuRef.current?.contains(activeElement);

      if (!isFocusInDropdown) {
        if (isOpen) {
          actualCloseDropdown();
        }
        if (!touched) {
          setTouched(true);
        }
      }
    }, 0);
  }, [isOpen, actualCloseDropdown, touched, setTouched]);



  // Manage open/close states and event listeners
  useEffect(() => {
    let openStyleTimerId: NodeJS.Timeout | undefined;

    if (isOpen) {
      // Clear any pending hover timeout when dropdown opens
      clearTimeouts();

      document.body.style.overflow = "hidden";
      openStyleTimerId = setTimeout(() => {
        setApplyOpenStyles(true);
        requestAnimationFrame(() => {
          if (dropdownMenuRef.current) {
            calculateDropdownPosition();
            manageFocusOnOpen();
          }
        });
      }, 20);

      const events = [
        ["scroll", calculateDropdownPosition, true],
        ["resize", calculateDropdownPosition, false],
        ["focusout", handleFocusOut, false],
      ] as const;

      events.forEach(([event, handler, capture]) =>
        window.addEventListener(event, handler as EventListener, capture),
      );

      return () => {
        document.body.style.overflow = "";
        if (openStyleTimerId) clearTimeout(openStyleTimerId);
        events.forEach(([event, handler, capture]) =>
          window.removeEventListener(event, handler as EventListener, capture),
        );
      };
    } else {
      document.body.style.overflow = "";
      setApplyOpenStyles(false);
      resetPosition();
      resetSearch();
      
      // Clear hover timeout when dropdown is closed
      clearTimeouts();
    }
  }, [isOpen, calculateDropdownPosition, manageFocusOnOpen, handleFocusOut, clearTimeouts, resetPosition, resetSearch, setApplyOpenStyles]);

  // Position recalculation
  useEffect(() => {
    if (isOpen && applyOpenStyles) {
      const timer = setTimeout(calculateDropdownPosition, 10);
      return () => clearTimeout(timer);
    }
  }, [
    filteredOptions,
    isOpen,
    applyOpenStyles,
    calculateDropdownPosition,
  ]);

  // Scroll state management
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(checkScroll, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, filteredOptions, checkScroll]);

  useEffect(() => {
    const optionsContainer = optionsContainerRef.current;
    if (optionsContainer && isOpen) {
      optionsContainer.addEventListener("scroll", checkScroll);
      return () => optionsContainer.removeEventListener("scroll", checkScroll);
    }
  }, [isOpen, checkScroll]);

  // Scroll to highlighted option
  useEffect(() => {
    scrollToHighlightedOption();
  }, [highlightedIndex, isOpen, filteredOptions, scrollToHighlightedOption]);

  // Reset scroll position when dropdown opens
  useEffect(() => {
    if (
      isOpen &&
      applyOpenStyles &&
      optionsContainerRef.current &&
      filteredOptions.length > 0
    ) {
      scrollToHighlightedOption();
    }
  }, [
    isOpen,
    applyOpenStyles,
    filteredOptions.length,
    highlightedIndex,
    scrollToHighlightedOption,
  ]);


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


  return (
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
            isOpen={isOpen}
            isClosing={isClosing}
            applyOpenStyles={applyOpenStyles}
            dropDirection={dropDirection}
            portalStyle={portalStyle}
            searchList={searchList}
            withRadio={withRadio}
            searchTerm={searchTerm}
            searchState={searchState}
            currentFilteredOptions={filteredOptions}
            highlightedIndex={highlightedIndex}
            isKeyboardNavigation={isKeyboardNavigation}
            expandedId={expandedId}
            value={value}
            onAddNew={onAddNew}
            onSearchChange={handleSearchChange}
            onSearchKeyDown={handleSearchBarKeyDown}
            onDropdownKeyDown={handleKeyDown}
            onSelect={handleSelect}
            onSetHighlightedIndex={setHighlightedIndex}
            onSetIsKeyboardNavigation={setIsKeyboardNavigation}
            onExpansion={handleExpansion}
            onMenuEnter={handleMenuEnter}
            onMenuLeave={handleMouseLeaveWithCloseIntent}
            onScroll={checkScroll}
            buttonRef={buttonRef}
            searchInputRef={searchInputRef}
            optionsContainerRef={optionsContainerRef}
            leaveTimeoutRef={leaveTimeoutRef}
            scrollState={scrollState}
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
  );
};

export default Dropdown;
