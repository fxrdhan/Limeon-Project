import React from 'react';
import { FaSearch } from 'react-icons/fa';
import type { TableSearchProps } from '@/types';

export const SearchBar: React.FC<TableSearchProps> = ({
    value,
    onChange,
    placeholder = "Cari...",
    className = ""
}) => {
    return (
        <div className={`mb-4 relative ${className}`}>
            <input
                type="text"
                placeholder={placeholder}
                className="w-full p-2 border rounded-md pl-10 focus:outline-none focus:border-primary focus:ring-2 focus:ring-blue-300"
                value={value}
                onChange={onChange} />
            <FaSearch className="absolute left-3 top-3.5 text-gray-400" />
        </div>
    );
};
