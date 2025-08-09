import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HiOutlineBars3 } from 'react-icons/hi2';
import Button from '@/components/button';
import Checkbox from '@/components/checkbox';

interface ColumnOption {
  key: string;
  label: string;
  visible: boolean;
}

interface ColumnVisibilityDropdownProps {
  columns: ColumnOption[];
  onColumnToggle: (columnKey: string, visible: boolean) => void;
}

const ColumnVisibilityDropdown: React.FC<ColumnVisibilityDropdownProps> = ({
  columns,
  onColumnToggle,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleColumnToggle = (columnKey: string, checked: boolean) => {
    onColumnToggle(columnKey, checked);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Calculate dropdown position
  const getDropdownPosition = () => {
    if (!buttonRef.current) return { top: 0, left: 0 };

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const top = buttonRect.bottom + window.scrollY + 8;
    const left = buttonRect.left + window.scrollX - 200 + buttonRect.width; // Align to right

    return { top, left };
  };

  const dropdownContent = isOpen && (
    <div
      ref={dropdownRef}
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[240px] py-2"
      style={getDropdownPosition()}
    >
      <div className="px-3 py-2 border-b border-gray-100">
        <h3 className="text-sm font-medium text-gray-700">
          Tampilkan/Sembunyikan Kolom
        </h3>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {columns.map((column) => (
          <div key={column.key} className="px-3 py-2 hover:bg-gray-50">
            <Checkbox
              id={`column-${column.key}`}
              label={column.label}
              checked={column.visible}
              onChange={(checked) => handleColumnToggle(column.key, checked)}
            />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <Button
        ref={buttonRef}
        variant="secondary"
        className="flex items-center ml-2 mb-2 p-2"
        onClick={handleToggle}
        title="Atur tampilan kolom"
      >
        <HiOutlineBars3 className="h-4 w-4" />
      </Button>
      {typeof document !== 'undefined' && 
        createPortal(dropdownContent, document.body)}
    </>
  );
};

export default ColumnVisibilityDropdown;