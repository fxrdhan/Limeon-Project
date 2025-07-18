import React, { useRef, useEffect, useState, useCallback } from "react";
import { LuSearch, LuHash, LuX } from "react-icons/lu";
import { PiKeyReturnBold } from "react-icons/pi";
import {
  EnhancedSearchBarProps,
  SearchColumn,
  EnhancedSearchState,
} from "@/types/search";
import ColumnSelector from "./ColumnSelector";

const EnhancedSearchBar: React.FC<EnhancedSearchBarProps> = ({
  value,
  onChange,
  onKeyDown,
  onFocus,
  onBlur,
  placeholder = "Cari...",
  className = "",
  inputRef,
  searchState = "idle",
  resultsCount,
  columns,
  onTargetedSearch,
  onGlobalSearch,
  onClearSearch,
}) => {
  const [searchMode, setSearchMode] = useState<EnhancedSearchState>({
    isTargeted: false,
    showColumnSelector: false,
  });
  const [columnSelectorPosition, setColumnSelectorPosition] = useState({
    top: 0,
    left: 0,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const textMeasureRef = useRef<HTMLSpanElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const [textWidth, setTextWidth] = useState(0);
  const [badgeWidth, setBadgeWidth] = useState(0);

  // Parse search value to detect targeted search
  const parseSearchValue = useCallback(
    (searchValue: string) => {
      if (searchValue.startsWith("#")) {
        const match = searchValue.match(/^#([^:]*):?(.*)$/);
        if (match) {
          const [, columnInput, searchTerm] = match;

          // Check if we have a colon, which indicates column is selected
          const hasColon = searchValue.includes(":");

          if (hasColon) {
            // Try to find the column
            const column = columns.find(
              (col) =>
                col.field.toLowerCase() === columnInput.toLowerCase() ||
                col.headerName.toLowerCase() === columnInput.toLowerCase(),
            );

            if (column) {
              return {
                isTargeted: true,
                targetedSearch: {
                  field: column.field,
                  value: searchTerm,
                  column,
                },
                globalSearch: undefined,
                showColumnSelector: false,
              };
            }
          }

          // Show column selector while typing after #
          return {
            isTargeted: false,
            globalSearch: undefined,
            showColumnSelector: true,
          };
        }
      }

      return {
        isTargeted: false,
        globalSearch: searchValue,
        showColumnSelector: false,
      };
    },
    [columns],
  );

  // Track previous value for comparison
  const prevValueRef = useRef<string>("");

  // Update search mode when value changes
  useEffect(() => {
    const newMode = parseSearchValue(value);
    const prevMode = parseSearchValue(prevValueRef.current);
    setSearchMode(newMode);

    // Trigger callbacks
    if (newMode.isTargeted && newMode.targetedSearch) {
      onTargetedSearch?.(newMode.targetedSearch);
      onGlobalSearch?.("");
    } else if (!newMode.isTargeted && newMode.globalSearch !== undefined) {
      onTargetedSearch?.(null);
      onGlobalSearch?.(newMode.globalSearch);
    }

    // Force immediate refresh when targeted search value changes
    if (
      prevMode.isTargeted &&
      prevMode.targetedSearch &&
      newMode.isTargeted &&
      newMode.targetedSearch &&
      prevMode.targetedSearch.value !== newMode.targetedSearch.value
    ) {
      // Double trigger to ensure AG Grid refreshes properly
      setTimeout(() => {
        onTargetedSearch?.(newMode.targetedSearch);
      }, 10);
    }

    // Update previous value reference
    prevValueRef.current = value;
  }, [value, parseSearchValue, onTargetedSearch, onGlobalSearch]);

  // Update column selector position
  useEffect(() => {
    if (searchMode.showColumnSelector && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setColumnSelectorPosition({
        top: rect.bottom,
        left: rect.left,
      });
    }
  }, [searchMode.showColumnSelector]);

  const handleColumnSelect = useCallback(
    (column: SearchColumn) => {
      const newValue = `#${column.field}:`;
      onChange({
        target: { value: newValue },
      } as React.ChangeEvent<HTMLInputElement>);
      setSearchMode((prev) => ({ ...prev, showColumnSelector: false }));

      // Focus back to input
      setTimeout(() => {
        inputRef?.current?.focus();
      }, 0);
    },
    [onChange, inputRef],
  );

  const handleCloseColumnSelector = useCallback(() => {
    // Just close the column selector without clearing the input
    setSearchMode((prev) => ({ ...prev, showColumnSelector: false }));
  }, []);

  const handleClearTargeted = useCallback(() => {
    if (onClearSearch) {
      // Use the comprehensive clear function if provided
      onClearSearch();
    } else {
      // Fall back to the original behavior
      onChange({
        target: { value: "" },
      } as React.ChangeEvent<HTMLInputElement>);
    }
  }, [onClearSearch, onChange]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;

      if (searchMode.isTargeted && searchMode.targetedSearch) {
        // If in targeted mode, update the value part after the colon
        const newValue = `#${searchMode.targetedSearch.field}:${inputValue}`;
        onChange({
          target: { value: newValue },
        } as React.ChangeEvent<HTMLInputElement>);

        // Force refresh when value becomes empty to immediately show all data
        if (inputValue === "" && searchMode.targetedSearch.value !== "") {
          setTimeout(() => {
            const emptyTargetedSearch = {
              field: searchMode.targetedSearch!.field,
              value: "",
              column: searchMode.targetedSearch!.column,
            };
            onTargetedSearch?.(emptyTargetedSearch);
          }, 0);
        }
      } else {
        // For normal search or column selection mode
        onChange(e);

        // If user clears the # character, also close the column selector
        if (searchMode.showColumnSelector && !inputValue.startsWith("#")) {
          setSearchMode((prev) => ({ ...prev, showColumnSelector: false }));
        }
      }
    },
    [searchMode, onChange, onTargetedSearch],
  );

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      try {
        // Handle escape to close column selector or clear search
        if (e.key === "Escape") {
          if (searchMode.showColumnSelector) {
            // Just close the column selector without clearing input
            setSearchMode((prev) => ({ ...prev, showColumnSelector: false }));
            return;
          } else if (value && onClearSearch) {
            // Clear search when Escape is pressed and there's a search value
            onClearSearch();
            return;
          }
        }

        // Handle backspace to clear targeted search
        if (
          e.key === "Backspace" &&
          searchMode.isTargeted &&
          searchMode.targetedSearch?.value === ""
        ) {
          if (onClearSearch) {
            // Use the comprehensive clear function if provided
            onClearSearch();
          } else {
            // Fall back to the original behavior
            onChange({
              target: { value: "" },
            } as React.ChangeEvent<HTMLInputElement>);
          }
          return;
        }

        // Handle Tab key to navigate through column selector
        if (
          searchMode.showColumnSelector &&
          (e.key === "Tab" ||
            e.key === "ArrowDown" ||
            e.key === "ArrowUp" ||
            e.key === "Enter")
        ) {
          // Let the column selector handle these keys
          return;
        }

        onKeyDown?.(e);
      } catch (error) {
        console.error("Error in handleInputKeyDown:", error);
        // Fallback: still call the original onKeyDown if it exists
        onKeyDown?.(e);
      }
    },
    [searchMode, onChange, onKeyDown, onClearSearch, value],
  );

  const getSearchIconColor = () => {
    if (searchMode.isTargeted) return "text-purple-500";

    switch (searchState) {
      case "idle":
        return "text-gray-400";
      case "typing":
        return "text-gray-800";
      case "found":
        return "text-primary";
      case "not-found":
        return "text-red-500";
      default:
        return "text-gray-400";
    }
  };

  const getSearchIcon = () => {
    if (searchMode.isTargeted) {
      return (
        <LuHash
          className={`${getSearchIconColor()} transition-all duration-300`}
        />
      );
    }
    return (
      <LuSearch
        className={`${getSearchIconColor()} transition-all duration-300`}
      />
    );
  };

  const hasValue = value && value.length > 0;
  const showTargetedIndicator =
    searchMode.isTargeted && searchMode.targetedSearch;

  // Get display value (hide #column: syntax from user)
  const getDisplayValue = useCallback(() => {
    if (searchMode.isTargeted && searchMode.targetedSearch) {
      return searchMode.targetedSearch.value;
    }
    if (value.startsWith("#") && !searchMode.isTargeted) {
      // Keep the full hashtag input visible for better UX
      return value;
    }
    return value;
  }, [value, searchMode]);

  const displayValue = getDisplayValue();

  // Calculate text width for return icon positioning
  useEffect(() => {
    if (textMeasureRef.current && displayValue) {
      setTextWidth(textMeasureRef.current.offsetWidth);
    }
  }, [displayValue]);

  // Calculate badge width for dynamic padding
  useEffect(() => {
    if (badgeRef.current && showTargetedIndicator) {
      setBadgeWidth(badgeRef.current.offsetWidth);
    }
  }, [showTargetedIndicator, searchMode.targetedSearch?.column.headerName]);

  // Get column selector search term
  const getColumnSelectorSearchTerm = () => {
    if (value.startsWith("#")) {
      const match = value.match(/^#([^:]*)/);
      return match ? match[1] : "";
    }
    return "";
  };

  // Get dynamic placeholder based on search mode
  const getPlaceholder = () => {
    if (showTargetedIndicator) {
      return "Cari...";
    }
    return placeholder;
  };

  return (
    <>
      <div ref={containerRef} className={`mb-4 relative ${className}`}>
        <div className="flex items-center">
          {/* Dynamic search icon */}
          <div
            className={`transition-all duration-300 ease-in-out ${
              displayValue
                ? "opacity-100 transform translate-x-0 scale-150 pl-2"
                : "opacity-0 transform -translate-x-2 scale-100"
            }`}
            style={{
              visibility: displayValue ? "visible" : "hidden",
              width: displayValue ? "auto" : "0",
              minWidth: displayValue ? "40px" : "0",
            }}
          >
            {getSearchIcon()}
          </div>

          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              placeholder={getPlaceholder()}
              className={`text-sm outline-none tracking-normal w-full p-2.5 border transition-all duration-300 ease-in-out ${
                searchState === "not-found"
                  ? "border-danger focus:border-danger focus:ring-3 focus:ring-red-100"
                  : searchMode.showColumnSelector
                    ? "border-purple-300 focus:border-purple-500 focus:ring-3 focus:ring-purple-100"
                    : searchMode.isTargeted
                      ? "border-purple-300 focus:border-purple-500 focus:ring-3 focus:ring-purple-100"
                      : "border-gray-300 focus:border-primary focus:ring-3 focus:ring-emerald-200"
              } focus:outline-none rounded-lg`}
              style={{
                paddingLeft: showTargetedIndicator
                  ? `${badgeWidth + 24}px` // Dynamic padding based on badge width + 24px margin
                  : displayValue
                    ? "12px"
                    : "40px",
              }}
              value={displayValue}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              onFocus={onFocus}
              onBlur={onBlur}
            />

            {/* Targeted search indicator - inline badge */}
            {showTargetedIndicator && (
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10 flex items-center gap-2">
                <div
                  ref={badgeRef}
                  className="flex items-center gap-1 bg-purple-100 text-purple-700 px-2 py-1 rounded-md text-xs font-medium"
                >
                  <span>{searchMode.targetedSearch?.column.headerName}</span>
                  <button
                    onClick={handleClearTargeted}
                    className="hover:bg-purple-200 rounded-sm p-0.5 transition-colors"
                    type="button"
                  >
                    <LuX className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Static search icon (when no value) */}
            {!showTargetedIndicator && (
              <div
                className={`absolute top-3.5 transition-all duration-300 ease-in-out ${
                  displayValue
                    ? "opacity-0 transform translate-x-2 left-3"
                    : "opacity-100 transform translate-x-0 left-3"
                }`}
                style={{
                  visibility: displayValue ? "hidden" : "visible",
                }}
              >
                {getSearchIcon()}
              </div>
            )}

            {/* Text width measurement */}
            <span
              ref={textMeasureRef}
              className="absolute invisible whitespace-nowrap text-sm"
              style={{
                left: showTargetedIndicator
                  ? `${badgeWidth + 24}px` // Dynamic position based on badge width + margin
                  : hasValue
                    ? "18px"
                    : "10px",
                padding: "10px",
              }}
            >
              {displayValue}
            </span>

            {/* Return key icon */}
            <PiKeyReturnBold
              className={`absolute top-1/2 transform -translate-y-1/2 text-gray-600 pointer-events-none ml-1 transition-all duration-300 ease-in-out ${
                searchState === "not-found" && displayValue
                  ? "opacity-100 scale-150 translate-x-0"
                  : "opacity-0 scale-95 translate-x-2"
              }`}
              style={{
                left: `${textWidth + (showTargetedIndicator ? badgeWidth + 24 : displayValue ? 0 : 10)}px`,
              }}
            />
          </div>
        </div>

        {/* Results count */}
        {resultsCount !== undefined && searchState === "found" && (
          <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
            <LuSearch className="w-3 h-3" />
            <span>{resultsCount} hasil ditemukan</span>
          </div>
        )}
      </div>

      {/* Column Selector Modal */}
      <ColumnSelector
        columns={columns.filter((col) => col.searchable)}
        isOpen={searchMode.showColumnSelector}
        onSelect={handleColumnSelect}
        onClose={handleCloseColumnSelector}
        position={columnSelectorPosition}
        searchTerm={getColumnSelectorSearchTerm()}
      />
    </>
  );
};

export default EnhancedSearchBar;
