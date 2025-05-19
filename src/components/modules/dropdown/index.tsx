import { useEffect } from "react";
import { createPortal } from "react-dom";
import { DropdownProps } from "@/types";
import { useDropdownLogic } from "@/hooks";

export const Dropdown = ({
    options,
    value,
    onChange,
    placeholder = "-- Pilih --",
    withRadio = false,
    onAddNew,
    searchList = true,
}: DropdownProps) => {
    const {
        isOpen,
        isClosing,
        searchTerm,
        setSearchTerm,
        filteredOptions,
        isScrollable,
        reachedBottom,
        scrolledFromTop,
        dropDirection,
        portalStyle,
        applyOpenStyles,
        setApplyOpenStyles,
        dropdownRef,
        buttonRef,
        dropdownMenuRef,
        searchInputRef,
        optionsContainerRef,
        selectedOption,
        calculateDropdownPosition,
        closeDropdown,
        handleSelect,
        handleSearchKeyDown,
        focusSearchInput,
        handleTriggerAreaEnter,
        handleMenuEnter,
        handleMouseLeaveWithCloseIntent,
        toggleDropdown,
        checkScroll,
    } = useDropdownLogic(options, value, onChange, searchList);

    useEffect(() => {
        let openStyleTimerId: NodeJS.Timeout | undefined;

        if (isOpen) {
            openStyleTimerId = setTimeout(() => {
                setApplyOpenStyles(true);
                requestAnimationFrame(() => {
                    if (dropdownMenuRef.current) {
                        calculateDropdownPosition();
                        focusSearchInput();
                    }
                });
            }, 20);

            window.addEventListener("scroll", calculateDropdownPosition, true);
            window.addEventListener("resize", calculateDropdownPosition);
        } else {
            setApplyOpenStyles(false);
        }

        return () => {
            if (openStyleTimerId) clearTimeout(openStyleTimerId);
            if (isOpen) {
                window.removeEventListener("scroll", calculateDropdownPosition, true);
                window.removeEventListener("resize", calculateDropdownPosition);
            }
        };
    }, [isOpen, calculateDropdownPosition, focusSearchInput, setApplyOpenStyles, dropdownMenuRef]);

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
            return () => {
                optionsContainer.removeEventListener("scroll", checkScroll);
            };
        }
    }, [isOpen, checkScroll, optionsContainerRef]);

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
                        className="py-2.5 px-4 w-full inline-flex justify-between items-center text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-800 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring focus:ring-teal-100 focus:border-primary transition duration-200 ease-in-out"
                        aria-haspopup="menu"
                        aria-expanded={isOpen || isClosing}
                        onClick={toggleDropdown}
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
                                                        onKeyDown={handleSearchKeyDown}
                                                        onClick={(e) => e.stopPropagation()}
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
