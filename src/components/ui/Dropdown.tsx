import { useEffect, useState, useRef, useCallback } from 'react';
import { DropdownProps } from '../../types';

export const Dropdown = ({
    options,
    value,
    onChange,
    placeholder = "-- Pilih --",
    name,
    required = false,
    onAddNew
}: DropdownProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredOptions, setFilteredOptions] = useState(options);
    const [dropDirection, setDropDirection] = useState<'down' | 'up'>('down');
    const [isScrollable, setIsScrollable] = useState(false);
    const [reachedBottom, setReachedBottom] = useState(false);
    const [scrolledFromTop, setScrolledFromTop] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownMenuRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const optionsContainerRef = useRef<HTMLDivElement>(null);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const selectedOption = options.find(option => option.id === value);

    useEffect(() => {
        return () => {
            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
            if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
        };
    }, []);

    const calculateDropdownPosition = useCallback(() => {
        if (!buttonRef.current || !dropdownMenuRef.current) return;
        const buttonRect = buttonRef.current.getBoundingClientRect();
        const dropdownHeight = dropdownMenuRef.current.offsetHeight;
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - buttonRect.bottom;
        const shouldDropUp = spaceBelow < dropdownHeight + 10;
        setDropDirection(shouldDropUp ? 'up' : 'down');
    }, []);

    const handleSelect = (optionId: string) => {
        onChange(optionId);
        setIsOpen(false);
        setSearchTerm('');
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && filteredOptions.length > 0) {
            e.preventDefault();
            handleSelect(filteredOptions[0].id);
        }
    };
    
    const focusSearchInput = useCallback(() => {
        if (isOpen && searchInputRef.current) {
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 5);
        }
    }, [isOpen]);

    useEffect(() => {
        if (searchTerm.trim() === '') {
            setFilteredOptions(options);
        } else {
            const filtered = options.filter(option =>
                option.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredOptions(filtered);
        }
    }, [searchTerm, options]);

    useEffect(() => {
        if (isOpen) {
            calculateDropdownPosition();
            focusSearchInput();
            window.addEventListener('scroll', calculateDropdownPosition);
            window.addEventListener('resize', calculateDropdownPosition);
        }
        return () => {
            window.removeEventListener('scroll', calculateDropdownPosition);
            window.removeEventListener('resize', calculateDropdownPosition);
        };
    }, [isOpen, focusSearchInput, calculateDropdownPosition]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isOpen && 
                dropdownRef.current && 
                !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const toggleDropdown = (e: React.MouseEvent) => {
        e.preventDefault();
        const newIsOpen = !isOpen;
        setIsOpen(newIsOpen);
        if (newIsOpen) {
            setTimeout(() => {
                calculateDropdownPosition();
                focusSearchInput();
            }, 5);
        } else {
            setSearchTerm('');
        }
    };

    const handleMouseEnter = () => {
        if (leaveTimeoutRef.current) {
            clearTimeout(leaveTimeoutRef.current);
            leaveTimeoutRef.current = null;
        }

        hoverTimeoutRef.current = setTimeout(() => {
            setIsOpen(true);
            setTimeout(() => calculateDropdownPosition(), 5);
            focusSearchInput();
        }, 100);
    };

    const handleMouseLeave = () => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }

        leaveTimeoutRef.current = setTimeout(() => {
            setIsOpen(false);
            setSearchTerm('');
        }, 150);
    };

    const checkScroll = useCallback(() => {
        if (!optionsContainerRef.current) return;
        
        const container = optionsContainerRef.current;
        const isScrollable = container.scrollHeight > container.clientHeight;
        setIsScrollable(isScrollable);
        
        const isBottom = Math.abs(
            (container.scrollHeight - container.scrollTop) - container.clientHeight
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
            optionsContainer.addEventListener('scroll', checkScroll);
            return () => {
                optionsContainer.removeEventListener('scroll', checkScroll);
            };
        }
    }, [isOpen, checkScroll]);

    return (
        <div 
            className="relative inline-flex w-full" 
            ref={dropdownRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <div className="w-full flex">
                <div className="hs-dropdown relative inline-flex w-full">
                    <button
                        ref={buttonRef}
                        type="button"
                        className="py-2.5 px-4 w-full inline-flex justify-between items-center text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-800 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        aria-haspopup="menu"
                        aria-expanded={isOpen}
                        onClick={toggleDropdown}
                    >
                        {selectedOption ? selectedOption.name : placeholder}
                        <svg
                            className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} w-4 h-4 ml-2`}
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

                    <div
                        ref={dropdownMenuRef}
                        className={`absolute left-0 ${
                            dropDirection === 'down' 
                                ? 'top-full mt-2 shadow-lg origin-top' 
                                : 'bottom-full mb-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1),0_-2px_4px_-1px_rgba(0,0,0,0.06)] origin-bottom'
                        } w-full z-20 bg-white rounded-lg border border-gray-200 transition-all duration-300 ease-in-out transform ${
                            isOpen 
                                ? 'opacity-100 scale-y-100 translate-y-0' 
                                : 'opacity-0 scale-y-0 translate-y-2 pointer-events-none'
                        }`}
                        role="menu"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {isOpen && (
                            <>
                                <div className="p-2 border-b sticky top-0 bg-white z-10 rounded-t-lg">
                                    <div className="relative flex items-center">
                                        <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
                                                <circle cx="11" cy="11" r="8"></circle>
                                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                            </svg>
                                        </div>
                                        <input
                                            ref={searchInputRef}
                                            type="text"
                                            className="flex-grow py-1 px-2 pl-8 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                                            placeholder="Cari..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            onKeyDown={handleSearchKeyDown}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        {onAddNew && (
                                            <button
                                                type="button"
                                                className="ml-2 bg-blue-500 text-white p-1.5 rounded-md hover:bg-blue-600 flex-shrink-0"
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
                                                    {option.name}
                                                </button>
                                            ))
                                        ) : (
                                            <div className="py-2 px-3 text-sm text-gray-500">Tidak ada pilihan yang sesuai</div>
                                        )}
                                    </div>
                                    {isScrollable && scrolledFromTop && (
                                        <div className="absolute top-0 left-0 w-full h-8 pointer-events-none bg-gradient-to-b from-black/20 to-transparent"></div>
                                    )}
                                    {isScrollable && !reachedBottom && (
                                        <div className="absolute bottom-0 left-0 w-full h-8 pointer-events-none bg-gradient-to-t from-black/20 to-transparent rounded-b-lg"></div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    <select
                        name={name}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="opacity-0 absolute w-0 h-0"
                        required={required}
                        tabIndex={-1}
                        aria-hidden="true"
                    >
                        <option value="">{placeholder}</option>
                        {options.map((option) => (
                            <option key={option.id} value={option.id}>
                                {option.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
};
