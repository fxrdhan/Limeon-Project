import React, { memo, useCallback, useState, useRef, useEffect } from 'react';
import { GridApi } from 'ag-grid-community';
import { RiFileExcel2Line, RiFileTextLine } from 'react-icons/ri';
import { TbTableExport } from 'react-icons/tb';

interface ExportDropdownProps {
  gridApi: GridApi | null;
  filename?: string;
  className?: string;
}

const ExportDropdown: React.FC<ExportDropdownProps> = memo(({
  gridApi,
  filename = 'data-export',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleCsvExport = useCallback(() => {
    if (gridApi && !gridApi.isDestroyed()) {
      gridApi.exportDataAsCsv({
        fileName: `${filename}-${new Date().toISOString().split('T')[0]}.csv`,
        columnSeparator: ',',
        suppressQuotes: false,
        allColumns: false, // Only export visible columns
        onlySelected: false,
        processCellCallback: (params) => {
          // Handle special formatting for display
          if (params.value === null || params.value === undefined) {
            return '';
          }
          return params.value;
        }
      });
    }
    setIsOpen(false);
  }, [gridApi, filename]);

  const handleExcelExport = useCallback(() => {
    if (gridApi && !gridApi.isDestroyed()) {
      gridApi.exportDataAsExcel({
        fileName: `${filename}-${new Date().toISOString().split('T')[0]}.xlsx`,
        sheetName: 'Data',
        author: 'PharmaSys',
        headerRowHeight: 25,
        rowHeight: 20,
        margins: {
          top: 1,
          right: 1,
          bottom: 1,
          left: 1
        },
        pageSetup: {
          orientation: 'Portrait',
          pageSize: 'A4',
        },
        columnWidth: (params) => {
          // Auto-size columns based on header text length
          const headerLength = params.column?.getColDef().headerName?.length || 10;
          return Math.max(headerLength * 8, 80); // Minimum 80px, 8px per character
        },
        processCellCallback: (params) => {
          // Handle special formatting for display
          if (params.value === null || params.value === undefined) {
            return '';
          }
          return params.value;
        },
        processHeaderCallback: (params) => {
          // Ensure headers are properly formatted
          return params.column.getColDef().headerName || params.column.getColId();
        }
      });
    }
    setIsOpen(false);
  }, [gridApi, filename]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      {/* Main Export Button */}
      <button
        onClick={() => gridApi && !gridApi.isDestroyed() && setIsOpen(!isOpen)}
        title="Export Data"
        className="inline-flex items-center justify-center w-8 h-8 text-primary hover:text-primary/80 transition-colors duration-200 cursor-pointer"
      >
        <TbTableExport className="h-8 w-8" />
      </button>

      {/* Dropdown Portal */}
      {isOpen && gridApi && !gridApi.isDestroyed() && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[160px]">
          <div className="py-1">
            {/* CSV Export Option */}
            <button
              onClick={handleCsvExport}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-3 transition-colors duration-150"
            >
              <RiFileTextLine className="h-4 w-4 text-gray-500" />
              <span>Export ke CSV</span>
            </button>
            
            {/* Excel Export Option */}
            <button
              onClick={handleExcelExport}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-3 transition-colors duration-150"
            >
              <RiFileExcel2Line className="h-4 w-4 text-gray-500" />
              <span>Export ke Excel</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

ExportDropdown.displayName = 'ExportDropdown';

export default ExportDropdown;