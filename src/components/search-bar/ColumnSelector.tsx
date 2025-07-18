import React, { useEffect, useRef, useState } from "react";
import { SearchColumn, ColumnSelectorProps } from "@/types/search";
import { LuHash, LuSearch, LuFilter } from "react-icons/lu";
import { HiOutlineSparkles } from "react-icons/hi2";

const ColumnSelector: React.FC<ColumnSelectorProps> = ({
  columns,
  isOpen,
  onSelect,
  onClose,
  position,
  searchTerm = "",
}) => {
  const [filteredColumns, setFilteredColumns] = useState<SearchColumn[]>(columns);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const modalRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = columns.filter(
        (col) =>
          col.headerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          col.field.toLowerCase().includes(searchTerm.toLowerCase()) ||
          col.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredColumns(filtered);
      setSelectedIndex(0);
    } else {
      setFilteredColumns(columns);
      setSelectedIndex(0);
    }
  }, [searchTerm, columns]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => 
            prev < filteredColumns.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => 
            prev > 0 ? prev - 1 : filteredColumns.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredColumns[selectedIndex]) {
            onSelect(filteredColumns[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredColumns, selectedIndex, onSelect, onClose]);

  useEffect(() => {
    if (isOpen && itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [selectedIndex, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getColumnIcon = (column: SearchColumn) => {
    switch (column.type) {
      case 'number':
      case 'currency':
        return <LuHash className="w-3 h-3 text-blue-500" />;
      case 'date':
        return <LuFilter className="w-3 h-3 text-purple-500" />;
      default:
        return <LuSearch className="w-3 h-3 text-emerald-500" />;
    }
  };

  return (
    <div
      ref={modalRef}
      className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto min-w-80"
      style={{
        top: position.top + 5,
        left: position.left,
      }}
    >
      <div className="sticky top-0 bg-white border-b border-gray-100 px-3 py-2">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <HiOutlineSparkles className="w-3 h-3" />
          <span>Pilih kolom untuk pencarian targeted</span>
        </div>
      </div>
      
      {filteredColumns.length === 0 ? (
        <div className="px-3 py-4 text-sm text-gray-500 text-center">
          Tidak ada kolom yang ditemukan untuk "{searchTerm}"
        </div>
      ) : (
        <div className="py-1">
          {filteredColumns.map((column, index) => (
            <div
              key={column.field}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              className={`px-3 py-2 cursor-pointer flex items-start gap-3 hover:bg-gray-50 transition-colors ${
                index === selectedIndex ? 'bg-emerald-50 border-r-2 border-emerald-500' : ''
              }`}
              onClick={() => onSelect(column)}
            >
              <div className="flex-shrink-0 mt-0.5">
                {getColumnIcon(column)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${
                    index === selectedIndex ? 'text-emerald-700' : 'text-gray-900'
                  }`}>
                    {column.headerName}
                  </span>
                  <span className="text-xs text-gray-400 font-mono">
                    {column.field}
                  </span>
                </div>
                {column.description && (
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                    {column.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="sticky bottom-0 bg-gray-50 border-t border-gray-100 px-3 py-2">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>↑↓ navigasi • Enter pilih • Esc tutup</span>
          <span>{filteredColumns.length} kolom</span>
        </div>
      </div>
    </div>
  );
};

export default ColumnSelector;