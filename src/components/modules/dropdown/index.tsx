import { useEffect, useState, useRef, useCallback, CSSProperties } from "react";
import { createPortal } from "react-dom";
import { DropdownProps } from "@/types";

export const Dropdown = ({
    options,
    value,
    onChange,
    placeholder = "-- Pilih --",
    // name,
    // required = false,
    withRadio = false,
    onAddNew,
    searchList = true,
}: DropdownProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [, setIsAnimating] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [filteredOptions, setFilteredOptions] = useState(options);
    const [dropDirection, setDropDirection] = useState<"down" | "up">("down");
    const [isScrollable, setIsScrollable] = useState(false);
    const [reachedBottom, setReachedBottom] = useState(false);
    const [scrolledFromTop, setScrolledFromTop] = useState(false);
    const [portalStyle, setPortalStyle] = useState<CSSProperties>({});
    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownMenuRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const optionsContainerRef = useRef<HTMLDivElement>(null);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const selectedOption = options.find((option) => option.id === value);

    useEffect(() => {
        return () => {
            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
            if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
        };
    }, []);

    const calculateDropdownPosition = useCallback(() => {
        if (!buttonRef.current || !dropdownMenuRef.current) return;

        const buttonRect = buttonRef.current.getBoundingClientRect();
        // Use scrollHeight for true height, unaffected by transform: scaleY
        const dropdownActualHeight = dropdownMenuRef.current.scrollHeight;
        const viewportHeight = window.innerHeight;

        const spaceBelow = viewportHeight - buttonRect.bottom;
        // Ensure there's enough space above if dropping up
        const shouldDropUp =
            spaceBelow < dropdownActualHeight + 10 &&
            buttonRect.top > dropdownActualHeight + 10;

        setDropDirection(shouldDropUp ? "up" : "down");

        const newMenuStyle: CSSProperties = {
            position: "fixed",
            left: `${buttonRect.left}px`,
            width: `${buttonRect.width}px`,
            zIndex: 1050, // Ensure dropdown is above other content
        };

        const margin = 8; // Corresponds to original mt-2/mb-2 (0.5rem)

        if (shouldDropUp) {
            newMenuStyle.top = `${buttonRect.top + window.scrollY - dropdownActualHeight - margin}px`;
        } else {
            newMenuStyle.top = `${buttonRect.bottom + window.scrollY + margin}px`;
        }
        setPortalStyle(newMenuStyle);
    }, []); // Dependencies are implicitly handled by when this is called

    const closeDropdown = useCallback(() => {
        setIsClosing(true);
        setIsAnimating(true);
        setTimeout(() => {
            setIsOpen(false);
            setIsClosing(false);
            setIsAnimating(false);
            setSearchTerm("");
        }, 100);
    }, [setIsAnimating]);

    const handleSelect = (optionId: string) => {
        onChange(optionId);
        closeDropdown();
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && filteredOptions.length > 0) {
            e.preventDefault();
            handleSelect(filteredOptions[0].id);
        }
    };

    const focusSearchInput = useCallback(() => {
        if (isOpen && searchInputRef.current) {
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 5); // Keep small delay for focus
        }
    }, [isOpen]);

    useEffect(() => {
        if (!searchList) {
            setFilteredOptions(options);
        } else if (searchTerm.trim() === "") {
            setFilteredOptions(options);
        } else {
            const filtered = options.filter((option) =>
                option.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredOptions(filtered);
        }
    }, [searchTerm, options, searchList]);

    useEffect(() => {
        if (isOpen) {
            // Calculate position after a brief delay to allow menu to render in portal
            setTimeout(() => calculateDropdownPosition(), 0);
            focusSearchInput();
            window.addEventListener("scroll", calculateDropdownPosition, true); // Use capture phase for scroll
            window.addEventListener("resize", calculateDropdownPosition);
        }
        return () => {
            window.removeEventListener("scroll", calculateDropdownPosition, true);
            window.removeEventListener("resize", calculateDropdownPosition);
        };
    }, [isOpen, focusSearchInput, calculateDropdownPosition]);

    const handleTriggerAreaEnter = () => {
        if (leaveTimeoutRef.current) {
            clearTimeout(leaveTimeoutRef.current);
            leaveTimeoutRef.current = null;
        }

        hoverTimeoutRef.current = setTimeout(() => {
            setIsOpen(true);
            setIsClosing(false);
            // Position calculation will be triggered by useEffect on isOpen change
            // Or call it directly after a micro-delay if needed for faster visual feedback on hover
            setTimeout(() => calculateDropdownPosition(), 5);
            focusSearchInput();
        }, 100);
    };
    
    const handleMenuEnter = () => {
        if (leaveTimeoutRef.current) {
            clearTimeout(leaveTimeoutRef.current);
            leaveTimeoutRef.current = null;
        }
    };

    const handleMouseLeaveWithCloseIntent = () => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }

        leaveTimeoutRef.current = setTimeout(() => {
            closeDropdown();
        }, 150);
    };


    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (
                (isOpen || isClosing) &&
                dropdownRef.current &&
                !dropdownRef.current.contains(target) &&
                (!dropdownMenuRef.current || // Check if menu exists
                 (dropdownMenuRef.current && !dropdownMenuRef.current.contains(target)))
            ) {
                closeDropdown();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen, isClosing, closeDropdown]);

    const toggleDropdown = (e: React.MouseEvent) => {
        e.preventDefault();
        if (isOpen) {
            closeDropdown();
        } else {
            setIsOpen(true);
            setIsAnimating(true);
            setTimeout(() => {
                calculateDropdownPosition();
                focusSearchInput();
                setIsAnimating(false);
            }, 300);
        }
    };

    const checkScroll = useCallback(() => {
        if (!optionsContainerRef.current) return;

        const container = optionsContainerRef.current;
        const isScrollable = container.scrollHeight > container.clientHeight;
        setIsScrollable(isScrollable);

        const isBottom =
            Math.abs(
                container.scrollHeight - container.scrollTop - container.clientHeight
            ) < 2;

        const isScrolledFromTop = container.scrollTop > 2;

        setReachedBottom(isBottom);
        setScrolledFromTop(isScrolledFromTop);
    }, []);

    useEffect(() => {
        if (isOpen) {
            setTimeout(checkScroll, 50);
        }
    }, [isOpen, filteredOptions, checkScroll]);

    useEffect(() => {
        const optionsContainer = optionsContainerRef.current;
        if (optionsContainer && isOpen) {
            optionsContainer.addEventListener("scroll", checkScroll);
            return () => {
                optionsContainer.removeEventListener("scroll", checkScroll);
            };
        }
    }, [isOpen, checkScroll]);

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
                        className="py-2.5 px-4 w-full inline-flex justify-between items-center text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-800 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-1 focus:border-transparent"
                        aria-haspopup="menu"
                        aria-expanded={isOpen || isClosing}
                        onClick={toggleDropdown}
                    >
                        {selectedOption ? selectedOption.name : placeholder}
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

                    {(isOpen || isClosing) && typeof document !== "undefined" &&
                        createPortal(
                            <div
                                ref={dropdownMenuRef}
                                style={portalStyle}
                                className={`
                                    ${dropDirection === "down" ? "origin-top" : "origin-bottom"}
                                    shadow-lg bg-white rounded-xl border border-gray-200
                                    transition-all duration-300 ease-out transform
                                    ${isOpen && !isClosing
                                        ? "opacity-100 scale-y-100 translate-y-0"
                                        : isClosing
                                            ? "opacity-0 scale-y-0 translate-y-0"
                                            : "opacity-0 scale-y-0 translate-y-2 pointer-events-none"
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
                                            <div className="p-2 border-b sticky top-0 z-10 bg-white"> {/* Added bg-white here for sticky search */}
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
                                                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                                        </svg>
                                                    </div>
                                                    <input
                                                        ref={searchInputRef}
                                                        type="text"
                                                        className="flex-grow py-2 px-2 pl-8 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-primary"
                                                        placeholder="Cari..."
                                                        value={searchTerm}
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                        onKeyDown={handleSearchKeyDown}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                    {onAddNew && (
                                                        <button
                                                            type="button"
                                                            className="ml-2 bg-primary text-white p-1.5 rounded-lg hover:bg-blue-600 flex-shrink-0"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onAddNew();
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
                                                ref={optionsContainerRef}
                                                className="p-1 max-h-60 overflow-y-auto"
                                            >
                                                {filteredOptions.length > 0 ? (
                                                    filteredOptions.map((option) => (
                                                        <button
                                                            key={option.id}
                                                            type="button"
                                                            className="flex items-center w-full py-2 px-3 rounded-lg text-sm text-gray-800 hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
                                                            onClick={() => handleSelect(option.id)}
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
