import { useCallback, CSSProperties, useEffect } from "react";
import type { UseDropdownHandlersProps } from "@/types";

export const useDropdownHandlers = (props: UseDropdownHandlersProps) => {
    const {
        options,
        onChange,
        isOpen,
        setIsOpen,
        setIsClosing,
        setSearchTerm,
        setDropDirection,
        setPortalStyle,
        filteredOptions,
        setFilteredOptions,
        searchList,
        buttonRef,
        dropdownMenuRef,
        searchInputRef,
        optionsContainerRef,
        hoverTimeoutRef,
        leaveTimeoutRef,
        setIsScrollable,
        setReachedBottom,
        setScrolledFromTop,
    } = props;

    useEffect(() => {
        if (!searchList && props.searchTerm.trim() === "") {
            setFilteredOptions(options);
        } else if (props.searchTerm.trim() !== "") {
            const filtered = options.filter((option) =>
                option.name.toLowerCase().includes(props.searchTerm.toLowerCase())
            );
            setFilteredOptions(filtered);
        } else if (searchList && props.searchTerm.trim() === "") {
            setFilteredOptions(options);
        }
    }, [options, props.searchTerm, searchList, setFilteredOptions]);

    const calculateDropdownPosition = useCallback(() => {
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
            newMenuStyle.top = `${buttonRect.top + window.scrollY - dropdownActualHeight - margin
                }px`;
        } else {
            newMenuStyle.top = `${buttonRect.bottom + window.scrollY + margin}px`;
        }
        setPortalStyle(newMenuStyle);
    }, [buttonRef, dropdownMenuRef, setDropDirection, setPortalStyle]);

    const closeDropdown = useCallback(() => {
        setIsClosing(true);
        setTimeout(() => {
            setIsOpen(false);
            setIsClosing(false);
            setSearchTerm("");
        }, 100);
    }, [setIsClosing, setIsOpen, setSearchTerm]);

    const handleSelect = useCallback(
        (optionId: string) => {
            onChange(optionId);
            closeDropdown();
        },
        [onChange, closeDropdown]
    );

    const handleSearchKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter" && filteredOptions.length > 0) {
                e.preventDefault();
                handleSelect(filteredOptions[0].id);
            }
        },
        [filteredOptions, handleSelect]
    );

    const focusSearchInput = useCallback(() => {
        if (isOpen && searchInputRef.current) {
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 5);
        }
    }, [isOpen, searchInputRef]);

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
    }, [
        optionsContainerRef,
        setIsScrollable,
        setReachedBottom,
        setScrolledFromTop,
    ]);

    return {
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
    };
};
