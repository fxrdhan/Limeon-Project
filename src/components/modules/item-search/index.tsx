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

    const searchBarRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const itemDropdownRef = useRef<HTMLDivElement>(null);
    const openTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

    const openDropdown = useCallback(() => {
        if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
        setIsOpen(true);
        setIsClosing(false);
    }, []);

    const closeDropdown = useCallback(() => {
        if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
        setIsClosing(true);
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
                                filteredItems.map((item) => (
                                    <div
                                        key={item.id}
                                        className="p-3 hover:bg-gray-100 cursor-pointer text-sm"
                                        onClick={() => handleItemSelect(item)}
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
