import { useState, useRef, CSSProperties } from "react";
import { useDropdownHandlers } from "@/handlers";
import type { DropdownOption } from "@/types";

export const useDropdownLogic = (
    options: DropdownOption[],
    value: string,
    onChange: (value: string) => void,
    searchList: boolean = true
) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [filteredOptions, setFilteredOptions] = useState(options);
    const [dropDirection, setDropDirection] = useState<"down" | "up">("down");
    const [isScrollable, setIsScrollable] = useState(false);
    const [reachedBottom, setReachedBottom] = useState(false);
    const [scrolledFromTop, setScrolledFromTop] = useState(false);
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

    const handlers = useDropdownHandlers({
        options,
        onChange,
        isOpen,
        setIsOpen,
        isClosing,
        setIsClosing,
        searchTerm,
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
    });

    return {
        isOpen,
        isClosing,
        searchTerm,
        filteredOptions,
        dropDirection,
        isScrollable,
        reachedBottom,
        scrolledFromTop,
        portalStyle,
        applyOpenStyles,
        dropdownRef,
        buttonRef,
        dropdownMenuRef,
        searchInputRef,
        optionsContainerRef,
        hoverTimeoutRef,
        leaveTimeoutRef,
        selectedOption,
        ...handlers,
        setIsOpen,
        setSearchTerm,
        setApplyOpenStyles,
    };
};