import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from 'react-dom';
import { FaPlus } from "react-icons/fa";
import { Button } from "@/components/modules";
import type { PurchaseItem, ItemSearchBarProps, Item } from "@/types";
import { classNames } from "@/lib/classNames";

const ItemSearchBar: React.FC<ItemSearchBarProps> = ({
    searchItem,
    setSearchItem,
    filteredItems,
    selectedItem,
    setSelectedItem,
    onAddItem,
}) => {
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

    const addItemToPurchase = () => {
        if (!selectedItem) return;

        const newItem: PurchaseItem = {
            id: Date.now().toString(),
            item_id: selectedItem.id,
            item_name: selectedItem.name,
            quantity: 1,
            price: selectedItem.base_price,
            discount: 0,
            subtotal: selectedItem.base_price,
            unit: selectedItem.base_unit || "Unit",
            unit_conversion_rate: 1,
            vat_percentage: 0,
            batch_no: null,
            expiry_date: null,
            item: {
                name: "",
                code: "",
            },
        };

        onAddItem(newItem);
        setSelectedItem(null);
        setSearchItem("");
    };

    const calculateDropdownPosition = useCallback(() => {
        if (!inputRef.current || !itemDropdownRef.current) return;
        const inputRect = inputRef.current.getBoundingClientRect();
        const dropdownActualHeight = itemDropdownRef.current.scrollHeight;
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - inputRect.bottom;
        const shouldDropUp = spaceBelow < dropdownActualHeight + 10 && inputRect.top > dropdownActualHeight + 10;
        setDropDirection(shouldDropUp ? "up" : "down");

        const newMenuStyle: React.CSSProperties = {
            position: "fixed",
            left: `${inputRect.left}px`,
            width: `${inputRect.width}px`,
            zIndex: 1050,
        };
        const margin = 5;
        if (shouldDropUp) {
            newMenuStyle.top = `${inputRect.top + window.scrollY - dropdownActualHeight - margin}px`;
        } else {
            newMenuStyle.top = `${inputRect.bottom + window.scrollY + margin}px`;
        }
        setPortalStyle(newMenuStyle);
    }, [inputRef, itemDropdownRef]);

    const scrollToHighlightedItem = (index: number) => {
        if (!itemDropdownRef.current) return;
        
        const dropdown = itemDropdownRef.current;
        const itemHeight = 60; // Approximate height of each item
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

        const observer = new ResizeObserver(() => {
            if (itemDropdownRef.current) {
                calculateDropdownPosition();
            }
        });

        observer.observe(inputRef.current);

        return () => {
            if (inputRef.current) {
                // eslint-disable-next-line react-hooks/exhaustive-deps
                observer.unobserve(inputRef.current);
            }
            observer.disconnect();
        };
    }, [isOpen, calculateDropdownPosition, inputRef]);

    useEffect(() => {
        const currentOpenTimeout = openTimeoutRef.current;

        const handleClickOutside = (event: MouseEvent) => {
            if (
                isOpen &&
                searchBarRef.current && !searchBarRef.current.contains(event.target as Node) &&
                itemDropdownRef.current && !itemDropdownRef.current.contains(event.target as Node)
            ) {
                closeDropdown();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            if (currentOpenTimeout) clearTimeout(currentOpenTimeout);
        };
    }, [isOpen, closeDropdown, searchBarRef, itemDropdownRef]);

    useEffect(() => {
        if (searchItem && !isOpen && !isClosing) {
            openDropdown();
        } else if (!searchItem && isOpen && !isClosing) {
            closeDropdown();
        }
    }, [searchItem, isOpen, isClosing, openDropdown, closeDropdown]);

    // Reset highlighted index when filtered items change
    useEffect(() => {
        setHighlightedIndex(-1);
    }, [filteredItems]);

    const handleItemSelect = (item: Item) => {
        if (!item) return;
        setSelectedItem(item);
        setSearchItem(item.name);
        closeDropdown();
    };

    const handleInputFocus = () => {
        if (inputRef.current?.value) {
            openDropdown();
        }
    };

    const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        setTimeout(() => {
            if (itemDropdownRef.current && !itemDropdownRef.current.contains(e.relatedTarget as Node)) {
                closeDropdown();
            } else if (!e.relatedTarget && itemDropdownRef.current && !itemDropdownRef.current.contains(document.activeElement)) {
                closeDropdown();
            }
        }, 150);
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            
            // If there's a highlighted item, select it
            if (highlightedIndex >= 0 && highlightedIndex < filteredItems.length) {
                const highlightedItem = filteredItems[highlightedIndex];
                
                const newItem: PurchaseItem = {
                    id: Date.now().toString(),
                    item_id: highlightedItem.id,
                    item_name: highlightedItem.name,
                    quantity: 1,
                    price: highlightedItem.base_price,
                    discount: 0,
                    subtotal: highlightedItem.base_price,
                    unit: highlightedItem.base_unit || "Unit",
                    unit_conversion_rate: 1,
                    vat_percentage: 0,
                    batch_no: null,
                    expiry_date: null,
                    item: {
                        name: "",
                        code: "",
                    },
                };

                onAddItem(newItem);
                setSelectedItem(null);
                setSearchItem("");
                closeDropdown();
                return;
            }
            
            // If an item is already selected, add it to the purchase
            if (selectedItem) {
                addItemToPurchase();
                return;
            }
            
            // Directly add the first filtered item to the purchase table
            if (isOpen && filteredItems.length > 0) {
                const firstItem = filteredItems[0];
                
                const newItem: PurchaseItem = {
                    id: Date.now().toString(),
                    item_id: firstItem.id,
                    item_name: firstItem.name,
                    quantity: 1,
                    price: firstItem.base_price,
                    discount: 0,
                    subtotal: firstItem.base_price,
                    unit: firstItem.base_unit || "Unit",
                    unit_conversion_rate: 1,
                    vat_percentage: 0,
                    batch_no: null,
                    expiry_date: null,
                    item: {
                        name: "",
                        code: "",
                    },
                };

                onAddItem(newItem);
                setSelectedItem(null);
                setSearchItem("");
                closeDropdown();
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (isOpen && filteredItems.length > 0) {
                const newIndex = highlightedIndex < filteredItems.length - 1 ? highlightedIndex + 1 : 0;
                setHighlightedIndex(newIndex);
                scrollToHighlightedItem(newIndex);
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (isOpen && filteredItems.length > 0) {
                const newIndex = highlightedIndex > 0 ? highlightedIndex - 1 : filteredItems.length - 1;
                setHighlightedIndex(newIndex);
                scrollToHighlightedItem(newIndex);
            }
        } else if (e.key === 'PageDown') {
            e.preventDefault();
            if (isOpen && filteredItems.length > 0) {
                const pageSize = 5; // Show 5 items per page
                const newIndex = Math.min(highlightedIndex + pageSize, filteredItems.length - 1);
                setHighlightedIndex(newIndex);
                scrollToHighlightedItem(newIndex);
            }
        } else if (e.key === 'PageUp') {
            e.preventDefault();
            if (isOpen && filteredItems.length > 0) {
                const pageSize = 5; // Show 5 items per page
                const newIndex = Math.max(highlightedIndex - pageSize, 0);
                setHighlightedIndex(newIndex);
                scrollToHighlightedItem(newIndex);
            }
        } else if (e.key === 'Escape') {
            if (isOpen) {
                closeDropdown();
            }
        }
    };

    return (
        <div className="mb-4" ref={searchBarRef}>
            <div className="flex space-x-2">
                <div className="relative flex-1">
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Cari nama atau kode item..."
                        className="w-full text-sm p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-primary focus:ring focus:ring-teal-100 transition duration-200 ease-in-out"
                        value={searchItem}
                        onChange={(e) => {
                            const value = e.target.value;
                            setSearchItem(value);
                            // Clear selected item when user starts typing again
                            if (selectedItem && value !== selectedItem.name) {
                                setSelectedItem(null);
                            }
                        }}
                        onFocus={handleInputFocus}
                        onKeyDown={handleInputKeyDown}
                        onBlur={handleInputBlur}
                    />

                    {(isOpen || isClosing) && searchItem && createPortal(
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
                                        : `opacity-0 scale-y-95 ${dropDirection === "down" ? "translate-y-1" : "-translate-y-1"} pointer-events-none`
                            )}
                            onMouseEnter={() => { if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current); }}
                        >
                            {filteredItems.length === 0 ? (
                                <div className="p-3 text-sm text-gray-500">
                                    Item tidak ditemukan.
                                </div>
                            ) : (
                                filteredItems.map((item, index) => (
                                    <div
                                        key={item.id}
                                        ref={index === highlightedIndex ? highlightedItemRef : null}
                                        className={classNames(
                                            "p-3 cursor-pointer text-sm transition-colors duration-150",
                                            index === highlightedIndex 
                                                ? "bg-primary/10 border-l-4 border-primary" 
                                                : "hover:bg-gray-100"
                                        )}
                                        onClick={() => handleItemSelect(item)}
                                        onMouseEnter={() => setHighlightedIndex(index)}
                                    >
                                        <div>
                                            <span className="font-semibold">{item.code}</span> - {item.name}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            Harga: {item.base_price.toLocaleString("id-ID", { style: "currency", currency: "IDR" })}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>,
                        document.body
                    )}
                </div>
                <Button
                    type="button"
                    onClick={addItemToPurchase}
                    disabled={!selectedItem}
                    className="flex items-center whitespace-nowrap"
                >
                    <FaPlus className="mr-2" />
                    Tambah Item
                </Button>
            </div>
        </div>
    );
};

export default ItemSearchBar;
