import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [showHeader, setShowHeader] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleToggle = () => {
    if (!isOpen) {
      // Opening sequence
      setIsOpen(true);
      setShowHeader(true);
      setTimeout(() => {
        setShowContent(true);
      }, 200); // Header completes first, then content
    } else {
      // Closing sequence
      setShowContent(false);
      setTimeout(() => {
        setShowHeader(false);
      }, 150); // Content exits first, then header
      setTimeout(() => {
        setIsOpen(false);
      }, 300); // Finally close dropdown
    }
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
        if (isOpen) {
          // Use same closing sequence
          setShowContent(false);
          setTimeout(() => {
            setShowHeader(false);
          }, 150);
          setTimeout(() => {
            setIsOpen(false);
          }, 300);
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Reset states when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setShowHeader(false);
      setShowContent(false);
    }
  }, [isOpen]);

  // Calculate dropdown position
  const getDropdownPosition = () => {
    if (!buttonRef.current) return { top: 0, left: 0 };

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const top = buttonRect.bottom + window.scrollY + 8;
    const left = buttonRect.right + window.scrollX - 240; // Align with button right edge, dropdown to the left

    return { top, left };
  };

  const dropdownContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dropdownRef}
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[240px] overflow-hidden"
          style={getDropdownPosition()}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15 }}
        >
          <AnimatePresence>
            {showHeader && (
              <motion.div
                className="px-3 py-2 border-b border-gray-100"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
              >
                <h3 className="text-sm font-medium text-gray-700">
                  Tampilkan/Sembunyikan Kolom
                </h3>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {showContent && (
              <motion.div
                className="overflow-hidden"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                <div className="max-h-80 overflow-y-auto">
                  {columns.map(column => (
                    <div
                      key={column.key}
                      className="px-3 py-2 hover:bg-gray-50"
                    >
                      <Checkbox
                        id={`column-${column.key}`}
                        label={column.label}
                        checked={column.visible}
                        onChange={checked =>
                          handleColumnToggle(column.key, checked)
                        }
                      />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
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
