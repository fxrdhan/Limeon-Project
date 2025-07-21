import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { createPortal } from "react-dom";
import { FaPlus } from "react-icons/fa";
import Button from "@/components/button";
import { SearchBar } from "@/components/search-bar";
import type { ItemSearchBarProps, Item, ItemSearchBarRef } from "@/types";
import classNames from "classnames";

const ItemSearchBar = forwardRef<ItemSearchBarRef, ItemSearchBarProps>(
  (
    {
      searchItem,
      setSearchItem,
      filteredItems,
      selectedItem,
      setSelectedItem,
      onOpenAddItemPortal,
      isAddItemButtonDisabled = true,
    },
    ref,
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [applyOpenStyles, setApplyOpenStyles] = useState(false);
    const [portalStyle, setPortalStyle] = useState<React.CSSProperties>({});
    const [dropDirection, setDropDirection] = useState<"down" | "up">("down");
    const [highlightedIndex, setHighlightedIndex] = useState(-1);

    const searchBarRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const itemDropdownRef = useRef<HTMLDivElement>(null);
    const openTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const highlightedItemRef = useRef<HTMLDivElement>(null);
    const addItemButtonRef = useRef<HTMLButtonElement>(null);

    const calculateDropdownPosition = useCallback(() => {
      if (!inputRef.current || !itemDropdownRef.current) return;
      const inputRect = inputRef.current.getBoundingClientRect();
      const dropdownActualHeight = itemDropdownRef.current.scrollHeight;
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - inputRect.bottom;
      const shouldDropUp =
        spaceBelow < dropdownActualHeight + 10 &&
        inputRect.top > dropdownActualHeight + 10;
      setDropDirection(shouldDropUp ? "up" : "down");

      const newMenuStyle: React.CSSProperties = {
        position: "fixed",
        left: `${inputRect.left}px`,
        width: `${inputRect.width}px`,
        zIndex: 1050,
      };
      const margin = 5;
      if (shouldDropUp) {
        newMenuStyle.top = `${
          inputRect.top + window.scrollY - dropdownActualHeight - margin
        }px`;
      } else {
        newMenuStyle.top = `${inputRect.bottom + window.scrollY + margin}px`;
      }
      setPortalStyle(newMenuStyle);
    }, [inputRef, itemDropdownRef]);

    const scrollToHighlightedItem = (index: number) => {
      if (!itemDropdownRef.current) return;

      const dropdown = itemDropdownRef.current;
      const itemHeight = 60;
      const itemTop = index * itemHeight;
      const itemBottom = itemTop + itemHeight;
      const dropdownScrollTop = dropdown.scrollTop;
      const dropdownHeight = dropdown.clientHeight;

      if (itemTop < dropdownScrollTop) {
        dropdown.scrollTop = itemTop;
      } else if (itemBottom > dropdownScrollTop + dropdownHeight) {
        dropdown.scrollTop = itemBottom - dropdownHeight;
      }
    };

    const openDropdown = useCallback(() => {
      if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
      setIsOpen(true);
      setIsClosing(false);
      setHighlightedIndex(-1);
    }, []);

    const closeDropdown = useCallback(() => {
      if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
      setIsClosing(true);
      setHighlightedIndex(-1);
      setTimeout(() => {
        setIsOpen(false);
        setIsClosing(false);
        setApplyOpenStyles(false);
      }, 200);
    }, []);

    useEffect(() => {
      let openStyleTimerId: NodeJS.Timeout | undefined;
      if (isOpen) {
        openStyleTimerId = setTimeout(() => {
          setApplyOpenStyles(true);
          requestAnimationFrame(() => {
            if (itemDropdownRef.current) {
              calculateDropdownPosition();
            }
          });
        }, 20);
      } else {
        setApplyOpenStyles(false);
      }
      return () => {
        if (openStyleTimerId) clearTimeout(openStyleTimerId);
      };
    }, [isOpen, calculateDropdownPosition]);

    useEffect(() => {
      if (!isOpen || !inputRef.current) {
        return;
      }

      const inputElement = inputRef.current;
      const observer = new ResizeObserver(() => {
        if (itemDropdownRef.current) {
          calculateDropdownPosition();
        }
      });

      observer.observe(inputElement);

      return () => {
        observer.unobserve(inputElement);
        observer.disconnect();
      };
    }, [isOpen, calculateDropdownPosition]);

    useEffect(() => {
      const currentOpenTimeout = openTimeoutRef.current;

      const handleClickOutside = (event: MouseEvent) => {
        if (
          isOpen &&
          searchBarRef.current &&
          !searchBarRef.current.contains(event.target as Node) &&
          itemDropdownRef.current &&
          !itemDropdownRef.current.contains(event.target as Node)
        ) {
          closeDropdown();
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        if (currentOpenTimeout) clearTimeout(currentOpenTimeout);
      };
    }, [isOpen, closeDropdown, searchBarRef, itemDropdownRef]);

    useEffect(() => {
      if (isOpen && filteredItems.length > 0) {
        setHighlightedIndex(0);
      } else {
        setHighlightedIndex(-1);
      }
    }, [filteredItems, isOpen]);

    const handleItemSelect = (item: Item) => {
      setSelectedItem(item);
    };

    const handleInputFocus = () => {
      if (searchItem && !isOpen && !isClosing) {
        openDropdown();
      }
    };

    const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setTimeout(() => {
        const newFocusedElement = e.relatedTarget as Node | null;
        const isFocusInsideDropdown =
          itemDropdownRef.current &&
          itemDropdownRef.current.contains(newFocusedElement);
        const isFocusStillOnInput = newFocusedElement === inputRef.current;

        if (!isFocusInsideDropdown && !isFocusStillOnInput) {
          if (
            !itemDropdownRef.current ||
            (itemDropdownRef.current &&
              !itemDropdownRef.current.contains(newFocusedElement))
          ) {
            closeDropdown();
          }
        }
      }, 150);
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredItems.length) {
          handleItemSelect(filteredItems[highlightedIndex]);
          closeDropdown();
        } else if (
          filteredItems.length === 0 &&
          searchItem.trim() !== "" &&
          !isAddItemButtonDisabled
        ) {
          // Open add item portal directly when no items found and Enter is pressed
          onOpenAddItemPortal();
        }
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (isOpen && filteredItems.length > 0) {
          const newIndex =
            highlightedIndex < filteredItems.length - 1
              ? highlightedIndex + 1
              : 0;
          setHighlightedIndex(newIndex);
          scrollToHighlightedItem(newIndex);
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (isOpen && filteredItems.length > 0) {
          const newIndex =
            highlightedIndex > 0
              ? highlightedIndex - 1
              : filteredItems.length - 1;
          setHighlightedIndex(newIndex);
          scrollToHighlightedItem(newIndex);
        }
      } else if (e.key === "PageDown") {
        e.preventDefault();
        if (isOpen && filteredItems.length > 0) {
          const pageSize = 5;
          const newIndex = Math.min(
            highlightedIndex + pageSize,
            filteredItems.length - 1,
          );
          setHighlightedIndex(newIndex);
          scrollToHighlightedItem(newIndex);
        }
      } else if (e.key === "PageUp") {
        e.preventDefault();
        if (isOpen && filteredItems.length > 0) {
          const pageSize = 5;
          const newIndex = Math.max(highlightedIndex - pageSize, 0);
          setHighlightedIndex(newIndex);
          scrollToHighlightedItem(newIndex);
        }
      } else if (e.key === "Escape") {
        if (isOpen) {
          closeDropdown();
        }
      }
    };

    const handleAddItemButtonKeyDown = (
      e: React.KeyboardEvent<HTMLButtonElement>,
    ) => {
      if (e.key === "Enter" && !isAddItemButtonDisabled) {
        e.preventDefault();
        onOpenAddItemPortal();
      } else if (e.key === "Escape") {
        // Return focus to input when Escape is pressed
        inputRef.current?.focus();
      }
    };

    useImperativeHandle(
      ref,
      () => ({
        focus: () => {
          inputRef.current?.focus();
        },
      }),
      [],
    );

    return (
      <div className="mb-1!" ref={searchBarRef}>
        <div className="flex space-x-2">
          <div className="relative flex-1">
            <SearchBar
              inputRef={inputRef}
              value={searchItem}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const value = e.target.value;
                setSearchItem(value);
                if (
                  value &&
                  !isOpen &&
                  !isClosing &&
                  document.activeElement === inputRef.current
                ) {
                  openDropdown();
                } else if (!value && isOpen && !isClosing) {
                  closeDropdown();
                }
                if (selectedItem && value !== selectedItem.name) {
                  setSelectedItem(null);
                }
              }}
              placeholder="Cari nama atau kode item..."
              className="mb-0"
              searchState={
                filteredItems.length === 0 && searchItem
                  ? "not-found"
                  : filteredItems.length > 0
                    ? "found"
                    : searchItem
                      ? "typing"
                      : "idle"
              }
              onKeyDown={handleInputKeyDown}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            />

            {(isOpen || isClosing) &&
              searchItem &&
              createPortal(
                <div
                  ref={itemDropdownRef}
                  style={portalStyle}
                  className={classNames(
                    "bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-y-auto",
                    dropDirection === "down" ? "origin-top" : "origin-bottom",
                    "transition-all duration-200 ease-out",
                    isClosing
                      ? "opacity-0 scale-y-95"
                      : isOpen && applyOpenStyles
                        ? "opacity-100 scale-y-100"
                        : `opacity-0 scale-y-95 ${
                            dropDirection === "down"
                              ? "translate-y-1"
                              : "-translate-y-1"
                          } pointer-events-none`,
                  )}
                  onMouseEnter={() => {
                    if (openTimeoutRef.current)
                      clearTimeout(openTimeoutRef.current);
                  }}
                >
                  {filteredItems.length === 0 ? (
                    <div className="p-3 text-sm text-gray-500">
                      Item tidak ditemukan.
                    </div>
                  ) : (
                    filteredItems.map((item, index) => (
                      <div
                        key={item.id}
                        ref={
                          index === highlightedIndex ? highlightedItemRef : null
                        }
                        className={classNames(
                          "p-3 cursor-pointer text-sm transition-colors duration-150",
                          index === highlightedIndex
                            ? "bg-primary/10 border-l-4 border-primary"
                            : "hover:bg-gray-100",
                        )}
                        onClick={() => handleItemSelect(item)}
                        onMouseEnter={() => setHighlightedIndex(index)}
                      >
                        <div>
                          <span className="font-semibold">{item.code}</span> -{" "}
                          {item.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          Harga:{" "}
                          {item.base_price.toLocaleString("id-ID", {
                            style: "currency",
                            currency: "IDR",
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>,
                document.body,
              )}
          </div>
          <Button
            ref={addItemButtonRef}
            type="button"
            onClick={onOpenAddItemPortal}
            onKeyDown={handleAddItemButtonKeyDown}
            disabled={isAddItemButtonDisabled}
            size="sm"
            className="flex items-center whitespace-nowrap h-[42px]"
          >
            <FaPlus className="mr-2" />
            Tambah Item Baru
          </Button>
        </div>
      </div>
    );
  },
);

export default ItemSearchBar;
