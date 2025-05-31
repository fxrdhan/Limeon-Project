import React from 'react';
import { FaSearch } from 'react-icons/fa';
import type { TableSearchProps } from '@/types';

const SearchBar: React.FC<TableSearchProps> = ({
    value,
    onChange,
    placeholder = "Cari...",
    className = "",
    inputRef
}) => {
    return (
        <div className={`mb-4 relative ${className}`}>
            <input
                ref={inputRef}
                type="text"
                placeholder={placeholder}
                className="text-sm tracking-normal w-full p-2.5 border rounded-lg pl-10 focus:outline-none focus:border-primary focus:ring focus:ring-teal-100 transition duration-200 ease-in-out"
                value={value}
                onChange={onChange} />
            <FaSearch className="absolute left-3 top-3.5 text-gray-400" />
        </div>
    );
};

export default SearchBar;
