import { useEffect, useState, useRef } from 'react';
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
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const selectedOption = options.find(option => option.id === value);

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
        if (isOpen && searchInputRef.current) {
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 100);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div className="relative inline-flex w-full" ref={dropdownRef}>
            <div className="w-full flex">
                <div className="hs-dropdown relative inline-flex w-full">
                    <button
                        type="button"
                        className="py-2 px-4 w-full inline-flex justify-between items-center text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-800 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        onClick={() => setIsOpen(!isOpen)}
                        aria-haspopup="menu"
                        aria-expanded={isOpen}
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

                    {isOpen && (
                        <div
                            className="absolute left-0 top-full mt-2 w-full z-20 bg-white shadow-md rounded-lg transition-opacity duration-300 opacity-100 border border-gray-200"
                            role="menu"
                            style={{ maxHeight: '250px', overflowY: 'auto' }}
                        >
                            <div className="p-2 border-b sticky top-0 bg-white">
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    className="w-full py-1 px-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                                    placeholder="Cari..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={handleSearchKeyDown}
                                />
                            </div>
                            <div className="p-1 max-h-60 overflow-y-auto">
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
                        </div>
                    )}

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

                {onAddNew && (
                    <button
                        type="button"
                        className="ml-2 bg-green-500 text-white p-2 rounded-md hover:bg-green-600"
                        onClick={onAddNew}
                    >
                        +
                    </button>
                )}
            </div>
        </div>
    );
};
