import React, { useRef, useEffect, useState } from "react";
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
  const textMeasureRef = useRef<HTMLSpanElement>(null);
  const [textWidth, setTextWidth] = useState(0);

  useEffect(() => {
    if (textMeasureRef.current && value) {
      setTextWidth(textMeasureRef.current.offsetWidth);
    }
  }, [value]);

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
          <span
            ref={textMeasureRef}
            className="absolute invisible whitespace-nowrap text-sm"
            style={{ left: hasValue ? "18px" : "10px", padding: "10px" }}
          >
            {value}
          </span>
          <span
            className={`absolute top-1/2 transform -translate-y-1/2 text-sm text-white bg-slate-400 rounded px-2 py-1 pointer-events-none ml-1 font-semibold tracking-wide transition-all duration-300 ease-in-out ${
              searchState === "not-found" && value
                ? "opacity-100 scale-100 translate-x-0"
                : "opacity-0 scale-95 translate-x-2"
            }`}
            style={{ left: `${textWidth + (hasValue ? 0 : 10)}px` }}
          >
            ENTER
          </span>
        </div>
      </div>
    </div>
  );
};

export default SearchBar;
