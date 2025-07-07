import {
  useEffect,
  useState,
  useRef,
  CSSProperties,
  useCallback,
  useId,
} from "react";
import { createPortal } from "react-dom";
import { FaPlus, FaMagnifyingGlass } from "react-icons/fa6";
import type { DropdownProps } from "@/types";
import { truncateText, shouldTruncateText } from "@/utils/text";
import { fuzzyMatch } from "@/utils/search";

let activeDropdownCloseCallback: (() => void) | null = null;
let activeDropdownId: string | null = null;

const getDropdownOptionScore = (
  option: { name: string; id: string },
  searchTermLower: string,
): number => {
  const nameLower = option.name?.toLowerCase?.() ?? "";

  if (nameLower.includes(searchTermLower)) return 3;
  if (fuzzyMatch(option.name, searchTermLower)) return 1;
  return 0;
};

const Dropdown = ({
  options,
  value,
  onChange,
  placeholder = "-- Pilih --",
  withRadio = false,
  onAddNew,
  searchList = true,
  tabIndex,
}: DropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentFilteredOptions, setCurrentFilteredOptions] = useState(options);
  const [dropDirection, setDropDirection] = useState<"down" | "up">("down");
  const [isScrollable, setIsScrollable] = useState(false);
  const [reachedBottom, setReachedBottom] = useState(false);
  const [scrolledFromTop, setScrolledFromTop] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [portalStyle, setPortalStyle] = useState<CSSProperties>({});
  const [applyOpenStyles, setApplyOpenStyles] = useState(false);
  const [hoveredOptionId, setHoveredOptionId] = useState<string | null>(null);
  const [focusedOptionId, setFocusedOptionId] = useState<string | null>(null);
  const [isKeyboardNavigation, setIsKeyboardNavigation] = useState(false);
  const [isButtonTextExpanded, setIsButtonTextExpanded] = useState(false);
  const [searchState, setSearchState] = useState<
    "idle" | "typing" | "found" | "not-found"
  >("idle");

  const instanceId = useId();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const addNewButtonRef = useRef<HTMLButtonElement>(null);
  const optionsContainerRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const selectedOption = options.find((option) => option?.id === value);

  useEffect(() => {
    if (!searchList && searchTerm.trim() === "") {
      setCurrentFilteredOptions(options);
      setSearchState("idle");
    } else if (searchTerm.trim() !== "") {
      const searchTermLower = searchTerm.toLowerCase();
      const filtered = options
        .filter((option) => {
          return (
            option.name.toLowerCase().includes(searchTermLower) ||
            fuzzyMatch(option.name, searchTermLower)
          );
        })
        .sort((a, b) => {
          const scoreA = getDropdownOptionScore(a, searchTermLower);
          const scoreB = getDropdownOptionScore(b, searchTermLower);

          if (scoreA !== scoreB) {
            return scoreB - scoreA;
          }

          return a.name.localeCompare(b.name);
        });
      setCurrentFilteredOptions(filtered);
      setSearchState(filtered.length > 0 ? "found" : "not-found");
    } else if (searchList && searchTerm.trim() === "") {
      setCurrentFilteredOptions(options);
      setSearchState("idle");
    }
  }, [options, searchTerm, searchList, setCurrentFilteredOptions]);

  useEffect(() => {
    if (isOpen && currentFilteredOptions.length > 0) {
      // Find the index of the currently selected option
      const selectedIndex = value
        ? currentFilteredOptions.findIndex((option) => option.id === value)
        : -1;

      // If selected option is found in filtered options, highlight it; otherwise highlight first option
      const initialIndex = selectedIndex >= 0 ? selectedIndex : 0;
      setHighlightedIndex(initialIndex);

      // Auto-expand the highlighted item if it needs truncation
      const highlightedOption = currentFilteredOptions[initialIndex];
      if (highlightedOption && buttonRef.current) {
        const buttonWidth = buttonRef.current.getBoundingClientRect().width;
        const maxTextWidth = buttonWidth - 48; // Account for padding and chevron
        if (shouldTruncateText(highlightedOption.name, maxTextWidth)) {
          setFocusedOptionId(highlightedOption.id);
        }
      }
    } else if (!isOpen || currentFilteredOptions.length === 0) {
      setHighlightedIndex(-1);
    }
  }, [currentFilteredOptions, isOpen, value]);

  const calculateDropdownPosition = useCallback(() => {
    if (!isOpen || !dropdownMenuRef.current || !buttonRef.current) {
      if (isOpen && !dropdownMenuRef.current) {
        requestAnimationFrame(calculateDropdownPosition);
      }
      return;
    }

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const dropdownActualHeight = dropdownMenuRef.current.scrollHeight;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const spaceBelow = viewportHeight - buttonRect.bottom;
    const shouldDropUp =
      spaceBelow < dropdownActualHeight + 10 &&
      buttonRect.top > dropdownActualHeight + 10;

    setDropDirection(shouldDropUp ? "up" : "down");

    const dropdownWidth = buttonRect.width;

    let leftPosition = buttonRect.left;
    if (leftPosition + dropdownWidth > viewportWidth - 16) {
      leftPosition = viewportWidth - dropdownWidth - 16;
    }
    if (leftPosition < 16) {
      leftPosition = 16;
    }

    const newMenuStyle: CSSProperties = {
      position: "fixed",
      left: `${leftPosition}px`,
      width: `${dropdownWidth}px`,
      zIndex: 1050,
    };

    const margin = 8;
    if (shouldDropUp) {
      newMenuStyle.top = `${buttonRect.top + window.scrollY - dropdownActualHeight - margin}px`;
    } else {
      newMenuStyle.top = `${buttonRect.bottom + window.scrollY + margin}px`;
    }

    setPortalStyle(newMenuStyle);
  }, [isOpen]);

  const actualCloseDropdown = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      setSearchTerm("");
      if (activeDropdownId === instanceId) {
        activeDropdownCloseCallback = null;
        activeDropdownId = null;
      }
    }, 100);
    setHighlightedIndex(-1);
    setFocusedOptionId(null);
  }, [instanceId, setIsClosing, setIsOpen, setSearchTerm]);

  const openThisDropdown = useCallback(() => {
    if (
      activeDropdownId !== null &&
      activeDropdownId !== instanceId &&
      activeDropdownCloseCallback
    ) {
      activeDropdownCloseCallback();
    }

    setIsOpen(true);

    activeDropdownCloseCallback = actualCloseDropdown;
    activeDropdownId = instanceId;
  }, [instanceId, actualCloseDropdown, setIsOpen]);

  const handleSelect = useCallback(
    (optionId: string) => {
      onChange(optionId);
      actualCloseDropdown();
      setTimeout(() => {
        buttonRef.current?.focus();
      }, 150);
    },
    [onChange, actualCloseDropdown, buttonRef],
  );

  const handleDropdownKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      if (!isOpen) return;

      const items = currentFilteredOptions;
      if (!items.length && !["Escape", "Tab"].includes(e.key)) return;

      let newIndex = highlightedIndex;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setIsKeyboardNavigation(true);
          setHoveredOptionId(null); // Clear hover state when using keyboard
          newIndex = items.length ? (highlightedIndex + 1) % items.length : -1;
          setHighlightedIndex(newIndex);
          if (newIndex >= 0 && items[newIndex]) {
            setFocusedOptionId(items[newIndex].id);
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          setIsKeyboardNavigation(true);
          setHoveredOptionId(null); // Clear hover state when using keyboard
          newIndex = items.length
            ? (highlightedIndex - 1 + items.length) % items.length
            : -1;
          setHighlightedIndex(newIndex);
          if (newIndex >= 0 && items[newIndex]) {
            setFocusedOptionId(items[newIndex].id);
          }
          break;
        case "Tab":
          e.preventDefault();
          setIsKeyboardNavigation(true);
          setHoveredOptionId(null); // Clear hover state when using keyboard
          if (items.length) {
            if (e.shiftKey) {
              newIndex =
                highlightedIndex <= 0 ? items.length - 1 : highlightedIndex - 1;
            } else {
              newIndex =
                highlightedIndex >= items.length - 1 ? 0 : highlightedIndex + 1;
            }
            setHighlightedIndex(newIndex);
            if (newIndex >= 0 && items[newIndex]) {
              setFocusedOptionId(items[newIndex].id);
            }
          }
          break;
        case "PageDown":
          e.preventDefault();
          setIsKeyboardNavigation(true);
          setHoveredOptionId(null); // Clear hover state when using keyboard
          if (items.length) {
            newIndex = Math.min(highlightedIndex + 5, items.length - 1);
            if (highlightedIndex === -1)
              newIndex = Math.min(4, items.length - 1);
            setHighlightedIndex(newIndex);
            if (newIndex >= 0 && items[newIndex]) {
              setFocusedOptionId(items[newIndex].id);
            }
          }
          break;
        case "PageUp":
          e.preventDefault();
          setIsKeyboardNavigation(true);
          setHoveredOptionId(null); // Clear hover state when using keyboard
          if (items.length) {
            newIndex = Math.max(highlightedIndex - 5, 0);
            if (highlightedIndex === -1) newIndex = 0;
            setHighlightedIndex(newIndex);
            if (newIndex >= 0 && items[newIndex]) {
              setFocusedOptionId(items[newIndex].id);
            }
          }
          break;
        case "Enter":
          e.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < items.length) {
            handleSelect(items[highlightedIndex].id);
          }
          break;
        case "Escape":
          e.preventDefault();
          actualCloseDropdown();
          setFocusedOptionId(null);
          break;
        default:
          return;
      }
    },
    [
      isOpen,
      currentFilteredOptions,
      highlightedIndex,
      handleSelect,
      actualCloseDropdown,
    ],
  );

  const manageFocusOnOpen = useCallback(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 5);
    } else if (isOpen && !searchList && optionsContainerRef.current) {
      setTimeout(() => {
        optionsContainerRef.current?.focus();
      }, 50);
    }
  }, [isOpen, searchList, searchInputRef, optionsContainerRef]);

  const handleTriggerAreaEnter = useCallback(() => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    hoverTimeoutRef.current = setTimeout(() => {
      openThisDropdown();
      setIsClosing(false);
    }, 100);
  }, [hoverTimeoutRef, leaveTimeoutRef, openThisDropdown, setIsClosing]);

  const handleMenuEnter = useCallback(() => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, [leaveTimeoutRef, hoverTimeoutRef]);

  const handleMouseLeaveWithCloseIntent = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    leaveTimeoutRef.current = setTimeout(() => {
      actualCloseDropdown();
    }, 200);
  }, [hoverTimeoutRef, leaveTimeoutRef, actualCloseDropdown]);

  const handleFocusOut = useCallback(() => {
    setTimeout(() => {
      const activeElement = document.activeElement;
      const dropdownContainer = dropdownRef.current;
      const dropdownMenu = dropdownMenuRef.current;

      const isFocusInDropdown =
        dropdownContainer?.contains(activeElement) ||
        dropdownMenu?.contains(activeElement);

      if (!isFocusInDropdown && isOpen) {
        actualCloseDropdown();
      }
    }, 0);
  }, [isOpen, actualCloseDropdown]);

  const toggleDropdown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (isOpen) {
        actualCloseDropdown();
      } else {
        openThisDropdown();
      }
    },
    [isOpen, actualCloseDropdown, openThisDropdown],
  );

  const checkScroll = useCallback(() => {
    if (!optionsContainerRef.current) return;
    const container = optionsContainerRef.current;
    setIsScrollable(container.scrollHeight > container.clientHeight);
    setReachedBottom(
      Math.abs(
        container.scrollHeight - container.scrollTop - container.clientHeight,
      ) < 2,
    );
    setScrolledFromTop(container.scrollTop > 2);
  }, [
    optionsContainerRef,
    setIsScrollable,
    setReachedBottom,
    setScrolledFromTop,
  ]);

  useEffect(() => {
    let openStyleTimerId: NodeJS.Timeout | undefined;

    if (isOpen) {
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

      window.addEventListener("scroll", calculateDropdownPosition, true);
      window.addEventListener("resize", calculateDropdownPosition);
      document.addEventListener("focusout", handleFocusOut);
    } else {
      document.body.style.overflow = "";
      setApplyOpenStyles(false);
    }

    return () => {
      document.body.style.overflow = "";
      if (openStyleTimerId) clearTimeout(openStyleTimerId);
      if (isOpen) {
        window.removeEventListener("scroll", calculateDropdownPosition, true);
        window.removeEventListener("resize", calculateDropdownPosition);
        document.removeEventListener("focusout", handleFocusOut);
      }
    };
  }, [isOpen, calculateDropdownPosition, manageFocusOnOpen, handleFocusOut]);

  useEffect(() => {
    if (isOpen && applyOpenStyles) {
      const timer = setTimeout(() => {
        calculateDropdownPosition();
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [
    currentFilteredOptions,
    isOpen,
    applyOpenStyles,
    calculateDropdownPosition,
  ]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(checkScroll, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, currentFilteredOptions, checkScroll]);

  useEffect(() => {
    const optionsContainer = optionsContainerRef.current;
    if (optionsContainer && isOpen) {
      optionsContainer.addEventListener("scroll", checkScroll);
      return () => {
        optionsContainer.removeEventListener("scroll", checkScroll);
      };
    }
  }, [isOpen, checkScroll, optionsContainerRef]);

  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && optionsContainerRef.current) {
      const optionElements =
        optionsContainerRef.current.querySelectorAll('[role="option"]');
      if (optionElements && optionElements[highlightedIndex]) {
        if (highlightedIndex === 0) {
          optionsContainerRef.current.scrollTop = 0;
        } else if (highlightedIndex === currentFilteredOptions.length - 1) {
          optionsContainerRef.current.scrollTop =
            optionsContainerRef.current.scrollHeight;
        } else {
          (optionElements[highlightedIndex] as HTMLElement).scrollIntoView({
            block: "nearest",
            behavior: "auto",
          });
        }
      }
    }
  }, [highlightedIndex, isOpen, currentFilteredOptions]);

  useEffect(() => {
    if (
      isOpen &&
      applyOpenStyles &&
      optionsContainerRef.current &&
      currentFilteredOptions.length > 0
    ) {
      // Only reset scroll to top if no option is selected (highlightedIndex is 0)
      // This prevents overriding the scroll position when a selected option should be visible
      if (highlightedIndex === 0) {
        optionsContainerRef.current.scrollTop = 0;
      } else if (highlightedIndex > 0) {
        // Scroll to the highlighted option when dropdown opens
        const optionElements =
          optionsContainerRef.current.querySelectorAll('[role="option"]');
        if (optionElements && optionElements[highlightedIndex]) {
          (optionElements[highlightedIndex] as HTMLElement).scrollIntoView({
            block: "nearest",
            behavior: "auto",
          });
        }
      }
    }
  }, [
    isOpen,
    applyOpenStyles,
    currentFilteredOptions.length,
    highlightedIndex,
  ]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setSearchTerm(newValue);
      setSearchState(newValue.trim() !== "" ? "typing" : "idle");
    },
    [],
  );

  const getSearchIconColor = () => {
    switch (searchState) {
      case "idle":
        return "text-gray-400";
      case "typing":
        return "text-gray-800";
      case "found":
        return "text-primary";
      case "not-found":
        return "text-primary";
      default:
        return "text-gray-400";
    }
  };

  const handleOptionHover = useCallback(
    (optionId: string, optionName: string) => {
      if (!buttonRef.current) return;

      const buttonWidth = buttonRef.current.getBoundingClientRect().width;
      const maxTextWidth = buttonWidth - 48; // Account for padding and chevron

      if (shouldTruncateText(optionName, maxTextWidth)) {
        setHoveredOptionId(optionId);
      }
    },
    [],
  );

  const handleOptionLeave = useCallback(() => {
    setHoveredOptionId(null);
  }, []);

  const handleOptionFocus = useCallback(
    (optionId: string, optionName: string) => {
      if (!buttonRef.current) return;

      const buttonWidth = buttonRef.current.getBoundingClientRect().width;
      const maxTextWidth = buttonWidth - 48; // Account for padding and chevron

      if (shouldTruncateText(optionName, maxTextWidth)) {
        setFocusedOptionId(optionId);
      }
    },
    [],
  );

  const handleOptionBlur = useCallback(() => {
    setFocusedOptionId(null);
  }, []);

  const handleButtonMouseEnter = useCallback(() => {
    if (selectedOption && buttonRef.current) {
      const buttonWidth = buttonRef.current.getBoundingClientRect().width;
      const maxTextWidth = buttonWidth - 48; // Account for padding and chevron
      if (shouldTruncateText(selectedOption.name, maxTextWidth)) {
        setIsButtonTextExpanded(true);
      }
    }
  }, [selectedOption]);

  const handleButtonMouseLeave = useCallback(() => {
    setIsButtonTextExpanded(false);
  }, []);

  const handleButtonFocus = useCallback(() => {
    if (selectedOption && buttonRef.current) {
      const buttonWidth = buttonRef.current.getBoundingClientRect().width;
      const maxTextWidth = buttonWidth - 48; // Account for padding and chevron
      if (shouldTruncateText(selectedOption.name, maxTextWidth)) {
        setIsButtonTextExpanded(true);
      }
    }
  }, [selectedOption]);

  const handleButtonBlur = useCallback(() => {
    setIsButtonTextExpanded(false);
  }, []);

  const handleSearchBarKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (
        onAddNew &&
        addNewButtonRef.current &&
        (e.key === "ArrowRight" || e.key === "ArrowLeft")
      ) {
        e.preventDefault();
        addNewButtonRef.current.focus();
        return;
      }
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
        handleDropdownKeyDown(e as never);
      }
    },
    [onAddNew, addNewButtonRef, handleDropdownKeyDown],
  );

  return (
    <div
      className="relative inline-flex w-full"
      ref={dropdownRef}
      onMouseEnter={handleTriggerAreaEnter}
      onMouseLeave={handleMouseLeaveWithCloseIntent}
    >
      <div className="w-full flex">
        <div className="hs-dropdown relative inline-flex w-full">
          <button
            ref={buttonRef}
            type="button"
            tabIndex={tabIndex}
            className={`py-2.5 px-3 w-full inline-flex justify-between text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-800 shadow-xs hover:bg-gray-50 focus:outline-hidden focus:ring-3 focus:ring-emerald-100 focus:border-primary transition duration-200 ease-in-out ${
              isButtonTextExpanded ? "items-start" : "items-center"
            }`}
            aria-haspopup="menu"
            aria-expanded={isOpen || isClosing}
            onClick={toggleDropdown}
            onKeyDown={!searchList ? handleDropdownKeyDown : undefined}
            onMouseEnter={handleButtonMouseEnter}
            onMouseLeave={handleButtonMouseLeave}
            onFocus={handleButtonFocus}
            onBlur={handleButtonBlur}
            aria-controls={isOpen ? "dropdown-options-list" : undefined}
          >
            <span
              className={`${
                isButtonTextExpanded
                  ? "whitespace-normal break-words leading-relaxed"
                  : "truncate"
              } transition-all duration-200 text-left flex-1 min-w-0`}
              title={
                selectedOption && !isButtonTextExpanded
                  ? (() => {
                      const buttonWidth =
                        buttonRef.current?.getBoundingClientRect().width || 200;
                      const maxTextWidth = buttonWidth - 48;
                      return shouldTruncateText(
                        selectedOption.name,
                        maxTextWidth,
                      )
                        ? selectedOption.name
                        : undefined;
                    })()
                  : undefined
              }
            >
              {selectedOption
                ? (() => {
                    if (isButtonTextExpanded) {
                      return selectedOption.name;
                    }
                    const buttonWidth =
                      buttonRef.current?.getBoundingClientRect().width || 200;
                    const maxTextWidth = buttonWidth - 48;
                    return shouldTruncateText(selectedOption.name, maxTextWidth)
                      ? truncateText(selectedOption.name, maxTextWidth)
                      : selectedOption.name;
                  })()
                : (placeholder ?? "-- Pilih --")}
            </span>
            <svg
              className={`transition-transform duration-200 ${
                isOpen || isClosing ? "rotate-180" : ""
              } w-4 h-4 ml-2 flex-shrink-0 ${isButtonTextExpanded ? "mt-0.5" : ""}`}
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {(isOpen || isClosing) &&
            typeof document !== "undefined" &&
            createPortal(
              <div
                ref={dropdownMenuRef}
                style={portalStyle}
                className={`
                  ${dropDirection === "down" ? "origin-top" : "origin-bottom"}
                  shadow-lg bg-white rounded-xl border border-gray-200
                  transition-all duration-300 ease-out transform
                  ${
                    isClosing
                      ? "opacity-0 scale-y-0 translate-y-0"
                      : isOpen && applyOpenStyles
                        ? "opacity-100 scale-y-100 translate-y-0"
                        : `opacity-0 scale-y-0 ${
                            dropDirection === "down"
                              ? "translate-y-2"
                              : "-translate-y-2"
                          } pointer-events-none`
                  }
              `}
                role="menu"
                onClick={(e) => e.stopPropagation()}
                onMouseEnter={handleMenuEnter}
                onMouseLeave={handleMouseLeaveWithCloseIntent}
              >
                {(isOpen || isClosing) && (
                  <div>
                    {searchList && (
                      <div className="p-2 pr-0! border-b border-gray-200 sticky top-0 z-10">
                        <div className="relative flex items-center gap-2 min-w-0">
                          <div className="relative flex-1 min-w-0">
                            <input
                              ref={searchInputRef}
                              type="text"
                              className={`w-full py-2 text-sm border rounded-lg focus:outline-hidden transition-all duration-300 ease-in-out min-w-0 ${
                                searchTerm && searchTerm.length > 0
                                  ? "pl-2"
                                  : "pr-8"
                              } pl-2 ${
                                searchState === "not-found"
                                  ? "border-accent focus:border-accent focus:ring-3 focus:ring-red-100"
                                  : "border-gray-300 focus:border-primary focus:ring-3 focus:ring-emerald-100"
                              }`}
                              placeholder="Cari..."
                              value={searchTerm}
                              onChange={handleSearchChange}
                              onKeyDown={handleSearchBarKeyDown}
                              onClick={(e) => e.stopPropagation()}
                              onFocus={() => {
                                if (leaveTimeoutRef.current) {
                                  clearTimeout(leaveTimeoutRef.current);
                                  leaveTimeoutRef.current = null;
                                }
                              }}
                              onBlur={() => {}}
                              aria-autocomplete="list"
                              aria-expanded={isOpen}
                              aria-controls="dropdown-options-list"
                              aria-activedescendant={
                                highlightedIndex >= 0 &&
                                currentFilteredOptions[highlightedIndex]
                                  ? `dropdown-option-${currentFilteredOptions[highlightedIndex].id}`
                                  : undefined
                              }
                            />
                            {searchState === "not-found" && onAddNew ? (
                              <FaPlus
                                className={`absolute top-2.5 right-2 ${getSearchIconColor()} transition-all duration-300 ease-in-out cursor-pointer hover:scale-110 ${
                                  searchTerm && searchTerm.length > 0
                                    ? "opacity-0 transform -translate-x-2"
                                    : "opacity-100 transform translate-x-0"
                                }`}
                                style={{
                                  visibility:
                                    searchTerm && searchTerm.length > 0
                                      ? "hidden"
                                      : "visible",
                                }}
                                size={16}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onAddNew) onAddNew(searchTerm);
                                  actualCloseDropdown();
                                }}
                              />
                            ) : (
                              <FaMagnifyingGlass
                                className={`absolute top-2.5 right-2 ${getSearchIconColor()} transition-all duration-300 ease-in-out ${
                                  searchTerm && searchTerm.length > 0
                                    ? "opacity-0 transform translate-x-2"
                                    : "opacity-100 transform translate-x-0"
                                }`}
                                style={{
                                  visibility:
                                    searchTerm && searchTerm.length > 0
                                      ? "hidden"
                                      : "visible",
                                }}
                                size={16}
                              />
                            )}
                          </div>
                          {searchState === "not-found" && onAddNew ? (
                            <FaPlus
                              className={`${getSearchIconColor()} transition-all duration-300 ease-in-out cursor-pointer hover:scale-110 mr-3 ml-1 ${
                                searchTerm && searchTerm.length > 0
                                  ? "opacity-100 transform translate-x-0 scale-150"
                                  : "opacity-0 transform translate-x-2 scale-150"
                              }`}
                              style={{
                                visibility:
                                  searchTerm && searchTerm.length > 0
                                    ? "visible"
                                    : "hidden",
                                width:
                                  searchTerm && searchTerm.length > 0
                                    ? "auto"
                                    : "0",
                                minWidth:
                                  searchTerm && searchTerm.length > 0
                                    ? "16px"
                                    : "0",
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onAddNew) onAddNew(searchTerm);
                                actualCloseDropdown();
                              }}
                            />
                          ) : (
                            <FaMagnifyingGlass
                              className={`${getSearchIconColor()} transition-all duration-300 ease-in-out ${
                                searchTerm && searchTerm.length > 0
                                  ? "opacity-100 transform translate-x-0 scale-125 ml-1 mr-3"
                                  : "opacity-0 transform -translate-x-2 scale-125"
                              }`}
                              style={{
                                visibility:
                                  searchTerm && searchTerm.length > 0
                                    ? "visible"
                                    : "hidden",
                                width:
                                  searchTerm && searchTerm.length > 0
                                    ? "auto"
                                    : "0",
                                minWidth:
                                  searchTerm && searchTerm.length > 0
                                    ? "16px"
                                    : "0",
                              }}
                            />
                          )}
                        </div>
                      </div>
                    )}
                    <div className="relative">
                      <div
                        id="dropdown-options-list"
                        ref={optionsContainerRef}
                        role="listbox"
                        tabIndex={-1}
                        className="p-1 max-h-60 overflow-y-auto focus:outline-hidden"
                        onScroll={checkScroll}
                        onKeyDown={
                          !searchList ? handleDropdownKeyDown : undefined
                        }
                      >
                        {currentFilteredOptions.length > 0 ? (
                          currentFilteredOptions.map((option, index) => {
                            const buttonWidth =
                              buttonRef.current?.getBoundingClientRect()
                                .width || 200;
                            const maxTextWidth =
                              buttonWidth - (withRadio ? 72 : 48); // Account for padding, chevron, and radio
                            const shouldTruncate = shouldTruncateText(
                              option.name,
                              maxTextWidth,
                            );
                            const isHovered = hoveredOptionId === option.id;
                            const isFocused = focusedOptionId === option.id;
                            // Prioritize keyboard focus over mouse hover to prevent dual expansion
                            const shouldExpand =
                              (isFocused && isKeyboardNavigation) ||
                              (isHovered && !isKeyboardNavigation)
                                ? shouldTruncate
                                : false;
                            const truncatedText =
                              shouldTruncate && !shouldExpand
                                ? truncateText(option.name, maxTextWidth)
                                : option.name;

                            return (
                              <button
                                key={option.id}
                                id={`dropdown-option-${option.id}`}
                                role="option"
                                aria-selected={highlightedIndex === index}
                                type="button"
                                className={`flex items-start w-full py-2 px-3 rounded-lg text-sm text-gray-800 ${
                                  !isKeyboardNavigation
                                    ? "hover:bg-gray-100"
                                    : ""
                                } focus:outline-hidden focus:bg-gray-100 ${
                                  highlightedIndex === index
                                    ? "bg-gray-100"
                                    : ""
                                } transition-colors duration-150 ${shouldExpand ? "items-start" : "items-center"}`}
                                onClick={() => handleSelect(option.id)}
                                onMouseEnter={() => {
                                  setIsKeyboardNavigation(false);
                                  setHighlightedIndex(index);
                                  handleOptionHover(option.id, option.name);
                                }}
                                onMouseLeave={handleOptionLeave}
                                onFocus={() => {
                                  setHighlightedIndex(index);
                                  handleOptionFocus(option.id, option.name);
                                }}
                                onBlur={() => {
                                  handleOptionBlur();
                                  setTimeout(() => {
                                    const activeElement =
                                      document.activeElement;
                                    const isStillInDropdown =
                                      dropdownMenuRef.current?.contains(
                                        activeElement,
                                      );
                                    if (!isStillInDropdown) {
                                      setHighlightedIndex(-1);
                                    }
                                  }, 0);
                                }}
                              >
                                {withRadio && (
                                  <div
                                    className={`mr-2 flex ${shouldExpand ? "items-start pt-0.5" : "items-center"} flex-shrink-0`}
                                  >
                                    <div
                                      className={`w-4 h-4 rounded-full border ${
                                        option.id === value
                                          ? "border-primary"
                                          : "border-gray-300"
                                      } flex items-center justify-center`}
                                    >
                                      {option.id === value && (
                                        <div className="w-2 h-2 rounded-full bg-primary"></div>
                                      )}
                                    </div>
                                  </div>
                                )}
                                <span
                                  className={`${
                                    shouldExpand
                                      ? "whitespace-normal break-words leading-relaxed"
                                      : "truncate"
                                  } transition-all duration-200 text-left`}
                                  title={
                                    shouldTruncate && !shouldExpand
                                      ? option.name
                                      : undefined
                                  }
                                >
                                  {shouldExpand ? option.name : truncatedText}
                                </span>
                              </button>
                            );
                          })
                        ) : (
                          <div className="py-2 px-3 text-sm text-gray-500">
                            Tidak ada pilihan yang sesuai
                          </div>
                        )}
                      </div>
                      {isScrollable && scrolledFromTop && (
                        <div className="absolute top-0 left-0 w-full h-8 pointer-events-none"></div>
                      )}
                      {isScrollable && !reachedBottom && (
                        <div className="absolute bottom-0 left-0 w-full h-8 pointer-events-none"></div>
                      )}
                    </div>
                  </div>
                )}
              </div>,
              document.body,
            )}
        </div>
      </div>
    </div>
  );
};

export default Dropdown;
