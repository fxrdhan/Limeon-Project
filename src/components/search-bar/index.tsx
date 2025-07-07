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
  const hasValue = value && value.length > 0;

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
      <div className="flex items-center gap-2">
        <LuSearch
          className={`${getSearchIconColor()} transition-all duration-300 ease-in-out ${
            hasValue
              ? "opacity-100 transform translate-x-0 scale-150"
              : "opacity-0 transform -translate-x-2 scale-100"
          }`}
          style={{
            visibility: hasValue ? "visible" : "hidden",
            width: hasValue ? "auto" : "0",
            minWidth: hasValue ? "40px" : "0",
          }}
        />
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            className={`text-sm outline-none tracking-normal w-full p-2.5 border transition-all duration-300 ease-in-out ${
              hasValue ? "pl-3" : "pl-10"
            } ${
              searchState === "not-found"
                ? "border-accent focus:border-accent focus:ring-3 focus:ring-red-100"
                : "border-gray-300 focus:border-primary focus:ring-3 focus:ring-emerald-100"
            } focus:outline-none rounded-lg`}
            value={value}
            onChange={onChange}
            onKeyDown={onKeyDown}
          />
          <LuSearch
            className={`absolute top-3.5 ${getSearchIconColor()} transition-all duration-300 ease-in-out ${
              hasValue
                ? "opacity-0 transform translate-x-2 left-3"
                : "opacity-100 transform translate-x-0 left-3"
            }`}
            style={{
              visibility: hasValue ? "hidden" : "visible",
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default SearchBar;
