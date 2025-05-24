import { useEffect, useState, useRef, CSSProperties, useCallback } from "react";
import { createPortal } from "react-dom";
import type { DropdownProps } from "@/types";

export const Dropdown = ({
    options,
    value,
    onChange,
    placeholder = "-- Pilih --",
    withRadio = false,
    onAddNew,
    searchList = true,
    tabIndex
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

    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownMenuRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const optionsContainerRef = useRef<HTMLDivElement>(null);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const selectedOption = options.find((option) => option?.id === value);

    useEffect(() => {
        if (!searchList && searchTerm.trim() === "") {
            setCurrentFilteredOptions(options);
        } else if (searchTerm.trim() !== "") {
            const filtered = options.filter((option) =>
                option.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setCurrentFilteredOptions(filtered);
        } else if (searchList && searchTerm.trim() === "") {
            setCurrentFilteredOptions(options);
        }
    }, [options, searchTerm, searchList, setCurrentFilteredOptions]);

    const calculateDropdownPosition = useCallback(() => {
        if (!isOpen || !dropdownMenuRef.current) {
            if (isOpen && !dropdownMenuRef.current) requestAnimationFrame(calculateDropdownPosition);
            return;
        }
        if (!buttonRef.current || !dropdownMenuRef.current) return;
        const buttonRect = buttonRef.current.getBoundingClientRect();
        const dropdownActualHeight = dropdownMenuRef.current.scrollHeight;
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - buttonRect.bottom;
        const shouldDropUp =
            spaceBelow < dropdownActualHeight + 10 &&
            buttonRect.top > dropdownActualHeight + 10;
        setDropDirection(shouldDropUp ? "up" : "down");
        const newMenuStyle: CSSProperties = {
            position: "fixed",
            left: `${buttonRect.left}px`,
            width: `${buttonRect.width}px`,
            zIndex: 1050,
        };
        const margin = 8;
        if (shouldDropUp) {
            newMenuStyle.top = `${buttonRect.top + window.scrollY - dropdownActualHeight - margin}px`;
        } else {
            newMenuStyle.top = `${buttonRect.bottom + window.scrollY + margin}px`;
        }
        setPortalStyle(newMenuStyle);
    }, [buttonRef, dropdownMenuRef, setDropDirection, setPortalStyle, isOpen]);

    const closeDropdown = useCallback(() => {
        setIsClosing(true);
        setTimeout(() => {
            setIsOpen(false);
            setIsClosing(false);
            setSearchTerm("");
        }, 100);
        setHighlightedIndex(-1);
    }, [setIsClosing, setIsOpen, setSearchTerm]);

    const handleSelect = useCallback(
        (optionId: string) => {
            onChange(optionId);
            closeDropdown();
            setTimeout(() => {
                buttonRef.current?.focus();
            }, 150);
        },
        [onChange, closeDropdown, buttonRef]
    );

    const handleDropdownKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLElement>) => {
            if (!isOpen) return;

            const items = currentFilteredOptions;
            if (!items.length && !['Escape'].includes(e.key)) return;

            let newIndex = highlightedIndex;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    newIndex = items.length ? (highlightedIndex + 1) % items.length : -1;
                    setHighlightedIndex(newIndex);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    newIndex = items.length ? (highlightedIndex - 1 + items.length) % items.length : -1;
                    setHighlightedIndex(newIndex);
                    break;
                case 'PageDown':
                    e.preventDefault();
                    if (items.length) {
                        newIndex = Math.min(highlightedIndex + 5, items.length - 1);
                        if (highlightedIndex === -1) newIndex = Math.min(4, items.length - 1);
                        setHighlightedIndex(newIndex);
                    }
                    break;
                case 'PageUp':
                    e.preventDefault();
                    if (items.length) {
                        newIndex = Math.max(highlightedIndex - 5, 0);
                        if (highlightedIndex === -1) newIndex = 0;
                        setHighlightedIndex(newIndex);
                    }
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (highlightedIndex >= 0 && highlightedIndex < items.length) {
                        handleSelect(items[highlightedIndex].id);
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    closeDropdown();
                    break;
                default:
                    return;
            }
        },
        [isOpen, currentFilteredOptions, highlightedIndex, handleSelect, closeDropdown]
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
            setIsOpen(true);
            setIsClosing(false);
        }, 100);
    }, [hoverTimeoutRef, leaveTimeoutRef, setIsOpen, setIsClosing]);

    const handleMenuEnter = useCallback(() => {
        if (leaveTimeoutRef.current) {
            clearTimeout(leaveTimeoutRef.current);
            leaveTimeoutRef.current = null;
        }
    }, [leaveTimeoutRef]);

    const handleMouseLeaveWithCloseIntent = useCallback(() => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }
        leaveTimeoutRef.current = setTimeout(() => {
            closeDropdown();
        }, 150);
    }, [hoverTimeoutRef, leaveTimeoutRef, closeDropdown]);

    const toggleDropdown = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            if (isOpen) closeDropdown();
            else setIsOpen(true);
        },
        [isOpen, closeDropdown, setIsOpen]
    );

    const checkScroll = useCallback(() => {
        if (!optionsContainerRef.current) return;
        const container = optionsContainerRef.current;
        setIsScrollable(container.scrollHeight > container.clientHeight);
        setReachedBottom(
            Math.abs(
                container.scrollHeight - container.scrollTop - container.clientHeight
            ) < 2
        );
        setScrolledFromTop(container.scrollTop > 2);
    }, [optionsContainerRef, setIsScrollable, setReachedBottom, setScrolledFromTop]);

    useEffect(() => {
        let openStyleTimerId: NodeJS.Timeout | undefined;

        if (isOpen) {
            document.body.style.overflow = 'hidden';
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
        } else {
            setApplyOpenStyles(false);
            document.body.style.overflow = '';
        }

        return () => {
            if (openStyleTimerId) clearTimeout(openStyleTimerId);
            document.body.style.overflow = '';
            if (isOpen) {
                window.removeEventListener("scroll", calculateDropdownPosition, true);
                window.removeEventListener("resize", calculateDropdownPosition);
            }
        };
    }, [isOpen, calculateDropdownPosition, manageFocusOnOpen, setApplyOpenStyles, dropdownMenuRef]);

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
            const optionElements = optionsContainerRef.current.querySelectorAll('[role="option"]');
            if (optionElements && optionElements[highlightedIndex]) {
                (optionElements[highlightedIndex] as HTMLElement).scrollIntoView({
                    block: 'nearest',
                });
            }
        }
    }, [highlightedIndex, isOpen]);

    useEffect(() => {
        setHighlightedIndex(-1);
    }, [currentFilteredOptions]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (
                (isOpen || isClosing) &&
                dropdownRef.current &&
                !dropdownRef.current.contains(target) &&
                (!dropdownMenuRef.current ||
                    (dropdownMenuRef.current &&
                        !dropdownMenuRef.current.contains(target)))
            ) {
                closeDropdown();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen, isClosing, closeDropdown, dropdownRef, dropdownMenuRef]);

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
                        className="py-2.5 px-3 w-full inline-flex justify-between items-center text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-800 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring focus:ring-teal-100 focus:border-primary transition duration-200 ease-in-out"
                        aria-haspopup="menu"
                        aria-expanded={isOpen || isClosing}
                        onClick={toggleDropdown}
                        onKeyDown={!searchList ? handleDropdownKeyDown : undefined}
                        aria-controls={isOpen ? "dropdown-options-list" : undefined}
                    >
                        {selectedOption
                            ? selectedOption.name
                            : placeholder ?? "-- Pilih --"}
                        <svg
                            className={`transition-transform duration-200 ${isOpen || isClosing ? "rotate-180" : ""
                                } w-4 h-4 ml-2`}
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
                                    ${dropDirection === "down"
                                        ? "origin-top"
                                        : "origin-bottom"
                                    }
                                    shadow-lg bg-white rounded-xl border border-gray-200
                                    transition-all duration-300 ease-out transform
                                    ${isClosing
                                        ? "opacity-0 scale-y-0 translate-y-0"
                                        : isOpen && applyOpenStyles
                                            ? "opacity-100 scale-y-100 translate-y-0"
                                            : `opacity-0 scale-y-0 ${dropDirection === "down"
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
                                            <div className="p-2 border-b sticky top-0 z-10">
                                                <div className="relative flex items-center">
                                                    <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            width="16"
                                                            height="16"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="2"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            className="text-gray-500"
                                                        >
                                                            <circle cx="11" cy="11" r="8"></circle>
                                                            <line
                                                                x1="21"
                                                                y1="21"
                                                                x2="16.65"
                                                                y2="16.65"
                                                            ></line>
                                                        </svg>
                                                    </div>
                                                    <input
                                                        ref={searchInputRef}
                                                        type="text"
                                                        className="flex-grow py-2 px-2 pl-8 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring focus:ring-teal-100 focus:border-primary transition duration-200 ease-in-out"
                                                        placeholder="Cari..."
                                                        value={searchTerm}
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                        onKeyDown={handleDropdownKeyDown}
                                                        onClick={(e) => e.stopPropagation()}
                                                        aria-autocomplete="list"
                                                        aria-expanded={isOpen}
                                                        aria-controls="dropdown-options-list"
                                                        aria-activedescendant={
                                                            highlightedIndex >= 0 && currentFilteredOptions[highlightedIndex]
                                                            ? `dropdown-option-${currentFilteredOptions[highlightedIndex].id}`
                                                            : undefined
                                                        }
                                                    />
                                                    {onAddNew && (
                                                        <button
                                                            type="button"
                                                            className="ml-2 bg-primary text-white p-1.5 rounded-lg hover:bg-secondary flex-shrink-0"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onAddNew();
                                                                closeDropdown();
                                                            }}
                                                        >
                                                            +
                                                        </button>
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
                                                className="p-1 max-h-60 overflow-y-auto focus:outline-none"
                                                onScroll={checkScroll}
                                                onKeyDown={!searchList ? handleDropdownKeyDown : undefined}
                                            >
                                                {currentFilteredOptions.length > 0 ? (
                                                    currentFilteredOptions.map((option, index) => (
                                                        <button
                                                            key={option.id}
                                                            id={`dropdown-option-${option.id}`}
                                                            role="option"
                                                            aria-selected={highlightedIndex === index}
                                                            type="button"
                                                            className={`flex items-center w-full py-2 px-3 rounded-lg text-sm text-gray-800 hover:bg-gray-100 focus:outline-none ${
                                                                highlightedIndex === index ? 'bg-gray-100' : ''
                                                            }`}
                                                            onClick={() => handleSelect(option.id)}
                                                            onMouseEnter={() => setHighlightedIndex(index)}
                                                        >
                                                            {withRadio && (
                                                                <div className="mr-2 flex items-center">
                                                                    <div
                                                                        className={`w-4 h-4 rounded-full border ${option.id === value
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
                                                            {option.name}
                                                        </button>
                                                    ))
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
                            document.body
                        )}
                </div>
            </div>
        </div>
    );
};
