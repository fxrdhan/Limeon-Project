import React from "react";
import { LuSearch } from "react-icons/lu";
import type { TableSearchProps } from "@/types";

const SearchBar: React.FC<TableSearchProps> = ({
  value,
  onChange,
  onKeyDown,
  placeholder = "Cari...",
  className = "",
  inputRef,
  searchState = "idle",
}) => {
  const getSearchIconColor = () => {
    switch (searchState) {
      case "idle":
        return "text-gray-400";
      case "typing":
        return "text-gray-800";
      case "found":
        return "text-primary";
      case "not-found":
        return "text-red-500";
      default:
        return "text-gray-400";
    }
  };
  return (
    <div className={`mb-4 relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        className="text-sm outline-none tracking-normal w-full p-2.5 border border-gray-300 focus:outline-none rounded-lg pl-10 focus:border-primary focus:ring-3 focus:ring-emerald-100 transition duration-200 ease-in-out"
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
      />
      <LuSearch className={`absolute left-3 top-3.5 ${getSearchIconColor()}`} />
    </div>
  );
};

export default SearchBar;
