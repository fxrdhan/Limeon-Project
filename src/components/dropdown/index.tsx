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
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [currentFilteredOptions, setCurrentFilteredOptions] = useState(options);
  const [dropDirection, setDropDirection] = useState<"down" | "up">("down");
  const [initialDropDirection, setInitialDropDirection] = useState<
    "down" | "up" | null
  >(null);
  const [scrollState, setScrollState] = useState({
    isScrollable: false,
    reachedBottom: false,
    scrolledFromTop: false,
  });
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [portalStyle, setPortalStyle] = useState<CSSProperties>({});
  const [applyOpenStyles, setApplyOpenStyles] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
  const optionsContainerRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const selectedOption = options.find((option) => option?.id === value);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 150);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Filter options based on search
  useEffect(() => {
    if (!searchList && debouncedSearchTerm.trim() === "") {
      setCurrentFilteredOptions(options);
      setSearchState("idle");
    } else if (debouncedSearchTerm.trim() !== "") {
      const searchTermLower = debouncedSearchTerm.toLowerCase();
      const filtered = options
        .filter(
          (option) =>
            option.name.toLowerCase().includes(searchTermLower) ||
            fuzzyMatch(option.name, searchTermLower),
        )
        .sort((a, b) => {
          const scoreA = getDropdownOptionScore(a, searchTermLower);
          const scoreB = getDropdownOptionScore(b, searchTermLower);
          return scoreB !== scoreA
            ? scoreB - scoreA
            : a.name.localeCompare(b.name);
        });
      setCurrentFilteredOptions(filtered);
      setSearchState(filtered.length > 0 ? "found" : "not-found");
    } else {
      setCurrentFilteredOptions(options);
      setSearchState("idle");
    }
  }, [options, debouncedSearchTerm, searchList]);

  // Set initial highlighted index when dropdown opens
  useEffect(() => {
    if (isOpen && currentFilteredOptions.length > 0) {
      const selectedIndex = value
        ? currentFilteredOptions.findIndex((option) => option.id === value)
        : -1;
      const initialIndex = selectedIndex >= 0 ? selectedIndex : 0;
      setHighlightedIndex(initialIndex);

      const highlightedOption = currentFilteredOptions[initialIndex];
      if (highlightedOption && buttonRef.current) {
        const buttonWidth = buttonRef.current.getBoundingClientRect().width;
        const maxTextWidth = buttonWidth - 48;
        if (shouldTruncateText(highlightedOption.name, maxTextWidth)) {
          setExpandedId(highlightedOption.id);
        }
      }
    } else {
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

    // Calculate available space with better margin consideration
    const margin = 16;
    const spaceBelow = viewportHeight - buttonRect.bottom - margin;
    const spaceAbove = buttonRect.top - margin;

    // Enhanced logic for determining drop direction
    const shouldDropUp =
      (spaceBelow < dropdownActualHeight &&
        spaceAbove > dropdownActualHeight) ||
      (spaceBelow < dropdownActualHeight && spaceAbove > spaceBelow);

    // Set initial direction only once when dropdown first opens
    if (initialDropDirection === null) {
      const direction = shouldDropUp ? "up" : "down";
      setDropDirection(direction);
      setInitialDropDirection(direction);
    } else {
      // Use the initial direction for subsequent calculations
      setDropDirection(initialDropDirection);
    }

    let leftPosition = buttonRect.left;
    if (leftPosition + buttonRect.width > viewportWidth - 16) {
      leftPosition = viewportWidth - buttonRect.width - 16;
    }
    if (leftPosition < 16) leftPosition = 16;

    const finalDirection =
      initialDropDirection || (shouldDropUp ? "up" : "down");
    const isDropUp = finalDirection === "up";

    // Calculate top position with improved spacing
    let topPosition: number;
    if (isDropUp) {
      topPosition =
        buttonRect.top + window.scrollY - dropdownActualHeight - margin;
    } else {
      topPosition = buttonRect.bottom + window.scrollY + margin;
    }

    // Create contextual shadows based on dropdown direction
    const getContextualBoxShadow = (direction: "up" | "down") => {
      if (direction === "up") {
        // Shadow on all sides except bottom (connected to field below)
        return [
          "0 -8px 16px -4px rgba(0, 0, 0, 0.2)", // top shadow
          "-8px 0 16px -4px rgba(0, 0, 0, 0.15)", // left shadow
          "8px 0 16px -4px rgba(0, 0, 0, 0.15)", // right shadow
          "0 -20px 40px -8px rgba(0, 0, 0, 0.15)", // larger top shadow for depth
          "0 -4px 8px -2px rgba(0, 0, 0, 0.1)", // close top shadow for definition
        ].join(", ");
      } else {
        // Shadow on all sides except top (connected to field above)
        return [
          "0 8px 16px -4px rgba(0, 0, 0, 0.2)", // bottom shadow
          "-8px 0 16px -4px rgba(0, 0, 0, 0.15)", // left shadow
          "8px 0 16px -4px rgba(0, 0, 0, 0.15)", // right shadow
          "0 20px 40px -8px rgba(0, 0, 0, 0.15)", // larger bottom shadow for depth
          "0 4px 8px -2px rgba(0, 0, 0, 0.1)", // close bottom shadow for definition
        ].join(", ");
      }
    };

    setPortalStyle({
      position: "fixed",
      left: `${leftPosition}px`,
      width: `${buttonRect.width}px`,
      zIndex: 1050,
      top: `${topPosition}px`,
      boxShadow: getContextualBoxShadow(finalDirection),
    });
  }, [isOpen, initialDropDirection]);

  const actualCloseDropdown = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      setSearchTerm("");
      setInitialDropDirection(null); // Reset initial direction when closing
      if (activeDropdownId === instanceId) {
        activeDropdownCloseCallback = null;
        activeDropdownId = null;
      }
    }, 100);
    setHighlightedIndex(-1);
    setExpandedId(null);
  }, [instanceId]);

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
  }, [instanceId, actualCloseDropdown]);

  const handleSelect = useCallback(
    (optionId: string) => {
      onChange(optionId);
      actualCloseDropdown();
      setTimeout(() => buttonRef.current?.focus(), 150);
    },
    [onChange, actualCloseDropdown],
  );

  const handleDropdownKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      if (!isOpen) return;

      const items = currentFilteredOptions;
      if (!items.length && !["Escape", "Tab", "Enter"].includes(e.key)) return;

      let newIndex = highlightedIndex;
      const keyActions: Record<string, () => void> = {
        ArrowDown: () => {
          newIndex = items.length ? (highlightedIndex + 1) % items.length : -1;
        },
        ArrowUp: () => {
          newIndex = items.length
            ? (highlightedIndex - 1 + items.length) % items.length
            : -1;
        },
        Tab: () => {
          if (items.length) {
            newIndex = e.shiftKey
              ? highlightedIndex <= 0
                ? items.length - 1
                : highlightedIndex - 1
              : highlightedIndex >= items.length - 1
                ? 0
                : highlightedIndex + 1;
          }
        },
        PageDown: () => {
          if (items.length) {
            newIndex = Math.min(
              highlightedIndex === -1 ? 4 : highlightedIndex + 5,
              items.length - 1,
            );
          }
        },
        PageUp: () => {
          if (items.length) {
            newIndex =
              highlightedIndex === -1 ? 0 : Math.max(highlightedIndex - 5, 0);
          }
        },
        Enter: () => {
          if (highlightedIndex >= 0 && highlightedIndex < items.length) {
            handleSelect(items[highlightedIndex].id);
          } else if (
            (searchState === "not-found" ||
              (searchState === "typing" &&
                currentFilteredOptions.length === 0)) &&
            onAddNew &&
            searchTerm.trim() !== ""
          ) {
            onAddNew(searchTerm);
            actualCloseDropdown();
          }
          return;
        },
        Escape: () => {
          actualCloseDropdown();
          setExpandedId(null);
          return;
        },
      };

      if (keyActions[e.key]) {
        e.preventDefault();
        if (!["Enter", "Escape"].includes(e.key)) {
          setIsKeyboardNavigation(true);
          setExpandedId(null);
        }
        keyActions[e.key]();
        if (!["Enter", "Escape"].includes(e.key)) {
          setHighlightedIndex(newIndex);
          if (newIndex >= 0 && items[newIndex]) {
            setExpandedId(items[newIndex].id);
          }
        }
      }
    },
    [
      isOpen,
      currentFilteredOptions,
      highlightedIndex,
      handleSelect,
      actualCloseDropdown,
      onAddNew,
      searchState,
      searchTerm,
    ],
  );

  const manageFocusOnOpen = useCallback(() => {
    if (isOpen) {
      setTimeout(
        () => {
          (searchList ? searchInputRef : optionsContainerRef).current?.focus();
        },
        searchList ? 5 : 50,
      );
    }
  }, [isOpen, searchList]);

  const handleTriggerAreaEnter = useCallback(() => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    hoverTimeoutRef.current = setTimeout(() => {
      openThisDropdown();
      setIsClosing(false);
    }, 100);
  }, [openThisDropdown]);

  const handleMenuEnter = useCallback(() => {
    [leaveTimeoutRef, hoverTimeoutRef].forEach((ref) => {
      if (ref.current) {
        clearTimeout(ref.current);
        ref.current = null;
      }
    });
  }, []);

  const handleMouseLeaveWithCloseIntent = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    leaveTimeoutRef.current = setTimeout(actualCloseDropdown, 200);
  }, [actualCloseDropdown]);

  const handleFocusOut = useCallback(() => {
    setTimeout(() => {
      const activeElement = document.activeElement;
      const isFocusInDropdown =
        dropdownRef.current?.contains(activeElement) ||
        dropdownMenuRef.current?.contains(activeElement);

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
    setScrollState({
      isScrollable: container.scrollHeight > container.clientHeight,
      reachedBottom:
        Math.abs(
          container.scrollHeight - container.scrollTop - container.clientHeight,
        ) < 2,
      scrolledFromTop: container.scrollTop > 2,
    });
  }, []);

  // Manage open/close states and event listeners
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
    }
  }, [isOpen, calculateDropdownPosition, manageFocusOnOpen, handleFocusOut]);

  // Position recalculation
  useEffect(() => {
    if (isOpen && applyOpenStyles) {
      const timer = setTimeout(calculateDropdownPosition, 10);
      return () => clearTimeout(timer);
    }
  }, [
    currentFilteredOptions,
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
  }, [isOpen, currentFilteredOptions, checkScroll]);

  useEffect(() => {
    const optionsContainer = optionsContainerRef.current;
    if (optionsContainer && isOpen) {
      optionsContainer.addEventListener("scroll", checkScroll);
      return () => optionsContainer.removeEventListener("scroll", checkScroll);
    }
  }, [isOpen, checkScroll]);

  // Scroll to highlighted option
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && optionsContainerRef.current) {
      const optionElements =
        optionsContainerRef.current.querySelectorAll('[role="option"]');
      if (optionElements[highlightedIndex]) {
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

  // Reset scroll position when dropdown opens
  useEffect(() => {
    if (
      isOpen &&
      applyOpenStyles &&
      optionsContainerRef.current &&
      currentFilteredOptions.length > 0
    ) {
      if (highlightedIndex === 0) {
        optionsContainerRef.current.scrollTop = 0;
      } else if (highlightedIndex > 0) {
        const optionElements =
          optionsContainerRef.current.querySelectorAll('[role="option"]');
        if (optionElements[highlightedIndex]) {
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
      setSearchState(
        newValue.trim() === ""
          ? "idle"
          : searchState === "idle"
            ? "typing"
            : searchState,
      );
    },
    [searchState],
  );

  const getSearchIconColor = () => {
    const colors = {
      idle: "text-gray-400",
      typing: "text-gray-800",
      found: "text-primary",
      "not-found": "text-primary",
    };
    return colors[searchState] || "text-gray-400";
  };

  const handleExpansion = useCallback(
    (optionId: string, optionName: string, shouldExpand: boolean) => {
      if (!buttonRef.current) return;
      const buttonWidth = buttonRef.current.getBoundingClientRect().width;
      const maxTextWidth = buttonWidth - 48;
      if (shouldTruncateText(optionName, maxTextWidth) && shouldExpand) {
        setExpandedId(optionId);
      } else if (!shouldExpand) {
        setExpandedId(null);
      }
    },
    [],
  );

  const handleButtonExpansion = useCallback(
    (shouldExpand: boolean) => {
      if (selectedOption && buttonRef.current) {
        const buttonWidth = buttonRef.current.getBoundingClientRect().width;
        const maxTextWidth = buttonWidth - 48;
        if (shouldTruncateText(selectedOption.name, maxTextWidth)) {
          setIsButtonTextExpanded(shouldExpand);
        }
      }
    },
    [selectedOption],
  );

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
        handleDropdownKeyDown(e as never);
      }
    },
    [handleDropdownKeyDown],
  );

  const renderOption = (
    option: { id: string; name: string },
    index: number,
  ) => {
    const buttonWidth = buttonRef.current?.getBoundingClientRect().width || 200;
    const maxTextWidth = buttonWidth - (withRadio ? 72 : 48);
    const shouldTruncate = shouldTruncateText(option.name, maxTextWidth);
    const isExpanded = expandedId === option.id;
    const shouldExpand = isExpanded && shouldTruncate;
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
        className={`flex ${shouldExpand ? "items-start" : "items-center"} w-full py-2 px-3 rounded-lg text-sm text-gray-800 ${
          !isKeyboardNavigation ? "hover:bg-slate-300/50" : ""
        } focus:outline-hidden focus:bg-gray-100 ${
          highlightedIndex === index ? "bg-slate-300/30" : ""
        } transition-colors duration-150`}
        onClick={() => handleSelect(option.id)}
        onMouseEnter={() => {
          setIsKeyboardNavigation(false);
          setHighlightedIndex(index);
          handleExpansion(option.id, option.name, true);
        }}
        onMouseLeave={() => handleExpansion(option.id, option.name, false)}
        onFocus={() => {
          setHighlightedIndex(index);
          handleExpansion(option.id, option.name, true);
        }}
        onBlur={() => {
          handleExpansion(option.id, option.name, false);
          setTimeout(() => {
            if (!dropdownMenuRef.current?.contains(document.activeElement)) {
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
              className={`w-4 h-4 rounded-full border ${option.id === value ? "border-primary" : "border-gray-300"} flex items-center justify-center`}
            >
              {option.id === value && (
                <div className="w-2 h-2 rounded-full bg-primary" />
              )}
            </div>
          </div>
        )}
        <span
          className={`${shouldExpand ? "whitespace-normal break-words leading-relaxed" : "truncate"} transition-all duration-200 text-left ${
            option.id === value 
              ? "text-primary font-semibold" 
              : highlightedIndex === index 
                ? "text-gray-800 font-semibold" 
                : ""
          }`}
          title={shouldTruncate && !shouldExpand ? option.name : undefined}
        >
          {shouldExpand ? option.name : truncatedText}
        </span>
      </button>
    );
  };

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
            onMouseEnter={() => handleButtonExpansion(true)}
            onMouseLeave={() => handleButtonExpansion(false)}
            onFocus={() => handleButtonExpansion(true)}
            onBlur={() => handleButtonExpansion(false)}
            aria-controls={isOpen ? "dropdown-options-list" : undefined}
          >
            <span
              className={`${
                isButtonTextExpanded
                  ? "whitespace-normal break-words leading-relaxed"
                  : "truncate"
              } transition-all duration-200 text-left flex-1 min-w-0`}
              title={
                selectedOption && !isButtonTextExpanded && buttonRef.current
                  ? (() => {
                      const buttonWidth =
                        buttonRef.current.getBoundingClientRect().width;
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
                    if (isButtonTextExpanded) return selectedOption.name;
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
                  bg-white/50 backdrop-blur-sm rounded-xl border border-gray-200
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
                      <div className="p-2 border-b border-gray-200 sticky top-0 z-10">
                        <div className="relative flex items-center gap-2 min-w-0">
                          <div className="relative flex-1 min-w-0">
                            <input
                              ref={searchInputRef}
                              type="text"
                              className={`w-full py-2 text-sm border rounded-lg focus:outline-hidden transition-all duration-300 ease-in-out min-w-0 pl-2 ${
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
                            {!searchTerm && (
                              <FaMagnifyingGlass
                                className={`absolute top-2.5 right-2 ${getSearchIconColor()} transition-all duration-300 ease-in-out opacity-100 transform translate-x-0`}
                                size={16}
                              />
                            )}
                          </div>
                          {searchTerm && (
                            <div className="flex items-center">
                              {(searchState === "not-found" ||
                                (searchState === "typing" &&
                                  currentFilteredOptions.length === 0)) &&
                              onAddNew ? (
                                <FaPlus
                                  className={`${getSearchIconColor()} transition-all duration-300 ease-in-out cursor-pointer mr-1 ml-1 scale-150`}
                                  style={{ width: "16px", minWidth: "16px" }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAddNew?.(searchTerm);
                                    actualCloseDropdown();
                                  }}
                                />
                              ) : (
                                <FaMagnifyingGlass
                                  className={`${getSearchIconColor()} transition-all duration-300 ease-in-out scale-125 ml-1 mr-1`}
                                  style={{ width: "16px", minWidth: "16px" }}
                                />
                              )}
                            </div>
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
                          currentFilteredOptions.map(renderOption)
                        ) : (
                          <div className="py-2 px-3 text-sm text-gray-500">
                            Tidak ada pilihan yang sesuai
                          </div>
                        )}
                      </div>
                      {scrollState.isScrollable &&
                        scrollState.scrolledFromTop && (
                          <div className="absolute top-0 left-0 w-full h-8 pointer-events-none" />
                        )}
                      {scrollState.isScrollable &&
                        !scrollState.reachedBottom && (
                          <div className="absolute bottom-0 left-0 w-full h-8 pointer-events-none" />
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
