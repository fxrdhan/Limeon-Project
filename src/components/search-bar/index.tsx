import React from "react";
import { FaSearch } from "react-icons/fa";
import type { TableSearchProps } from "@/types";

const SearchBar: React.FC<TableSearchProps> = ({
  value,
  onChange,
  onKeyDown,
  placeholder = "Cari...",
  className = "",
  inputRef,
}) => {
  return (
    <div className={`mb-4 relative border-none outline-none ${className}`}>
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        className="text-sm outline-none tracking-normal w-full p-2.5 border rounded-lg pl-10 focus:border-primary focus:ring-3 focus:ring-teal-100 transition duration-200 ease-in-out"
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
      />
      <FaSearch className="absolute left-3 top-3.5 text-gray-400" />
    </div>
  );
};

export default SearchBar;
