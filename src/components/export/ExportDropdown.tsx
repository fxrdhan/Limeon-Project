import React, { memo, useCallback, useState, useRef, useEffect } from 'react';
import { GridApi } from 'ag-grid-community';
import { TbTableExport, TbCsv, TbTableFilled, TbJson } from 'react-icons/tb';
import { FaGoogle } from 'react-icons/fa';
import Button from '@/components/button';
import { googleSheetsService } from '@/utils/googleSheetsApi';

interface ExportDropdownProps {
  gridApi: GridApi | null;
  filename?: string;
  className?: string;
}

const ExportDropdown: React.FC<ExportDropdownProps> = memo(
  ({ gridApi, filename = 'data-export', className = '' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isGoogleSheetsLoading, setIsGoogleSheetsLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const handleCsvExport = useCallback(() => {
      if (gridApi && !gridApi.isDestroyed()) {
        gridApi.exportDataAsCsv({
          fileName: `${filename}-${new Date().toISOString().split('T')[0]}.csv`,
          columnSeparator: ',',
          suppressQuotes: false,
          allColumns: false, // Only export visible columns
          onlySelected: false,
          processCellCallback: params => {
            // Handle special formatting for display
            if (params.value === null || params.value === undefined) {
              return '';
            }
            return params.value;
          },
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
            left: 1,
          },
          pageSetup: {
            orientation: 'Portrait',
            pageSize: 'A4',
          },
          columnWidth: params => {
            // Auto-size columns based on header text length
            const headerLength =
              params.column?.getColDef().headerName?.length || 10;
            return Math.max(headerLength * 8, 80); // Minimum 80px, 8px per character
          },
          processCellCallback: params => {
            // Handle special formatting for display
            if (params.value === null || params.value === undefined) {
              return '';
            }
            return params.value;
          },
          processHeaderCallback: params => {
            // Ensure headers are properly formatted
            return (
              params.column.getColDef().headerName || params.column.getColId()
            );
          },
        });
      }
      setIsOpen(false);
    }, [gridApi, filename]);

    const handleJsonExport = useCallback(() => {
      if (gridApi && !gridApi.isDestroyed()) {
        const rowData: unknown[] = [];
        gridApi.forEachNodeAfterFilterAndSort(node => {
          if (node.data) {
            rowData.push(node.data);
          }
        });

        const jsonString = JSON.stringify(rowData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
      setIsOpen(false);
    }, [gridApi, filename]);

    const handleGoogleSheetsExport = useCallback(async () => {
      if (!gridApi || gridApi.isDestroyed()) {
        return;
      }

      setIsGoogleSheetsLoading(true);
      try {
        // Initialize Google Sheets service if not already done
        await googleSheetsService.initialize();

        // Extract data from AG Grid
        const rowData: unknown[] = [];
        gridApi.forEachNodeAfterFilterAndSort(node => {
          if (node.data) {
            rowData.push(node.data);
          }
        });

        // Get column definitions from AG Grid
        const columnDefs = gridApi.getColumnDefs() || [];
        const visibleColumns = columnDefs.filter(
          (col): col is import('ag-grid-community').ColDef =>
            'field' in col && col.field != null && !col.hide
        );

        // Create headers and extract processed data handling nested objects and valueGetters
        const headers = visibleColumns.map(col => col.headerName || col.field!);

        // Extract data using column valueGetter or nested field access
        const processedData: string[][] = [];
        gridApi.forEachNodeAfterFilterAndSort(node => {
          if (node.data) {
            const rowValues = visibleColumns.map(col => {
              let value: unknown;

              // If column has valueGetter function, use it
              if (col.valueGetter && typeof col.valueGetter === 'function') {
                value = col.valueGetter({
                  data: node.data,
                  node: node,
                  colDef: col,
                  api: gridApi,
                  columnApi: gridApi,
                  context: undefined,
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  column: { getColId: () => col.field || '' } as any,
                  getValue: (field: string) => {
                    // Helper function for nested field access
                    return getNestedValue(node.data, field);
                  },
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } as any);
              } else if (col.field) {
                // Handle nested field access (e.g., 'category.name')
                value = getNestedValue(node.data, col.field);
              }

              return value !== null && value !== undefined ? String(value) : '';
            });
            processedData.push(rowValues);
          }
        });

        // Helper function to get nested values
        function getNestedValue(
          obj: Record<string, unknown>,
          path: string
        ): unknown {
          const keys = path.split('.');
          let current: unknown = obj;

          for (const key of keys) {
            if (current && typeof current === 'object' && current !== null) {
              current = (current as Record<string, unknown>)[key];
            } else {
              return null;
            }
          }

          return current;
        }

        // Export to Google Sheets
        const sheetUrl = await googleSheetsService.exportGridDataToSheets(
          processedData,
          headers,
          filename
        );

        // Open the created Google Sheet in a new tab
        if (sheetUrl) {
          window.open(sheetUrl, '_blank');
        }

        setIsOpen(false);
      } catch (error) {
        console.error('Failed to export to Google Sheets:', error);
        alert(
          'Failed to export to Google Sheets. Please make sure you are signed in to your Google account.'
        );
      } finally {
        setIsGoogleSheetsLoading(false);
      }
    }, [gridApi, filename]);

    // Handle click outside to close dropdown
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target as Node)
        ) {
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
          onClick={() =>
            gridApi && !gridApi.isDestroyed() && setIsOpen(!isOpen)
          }
          title="Export Data"
          className="inline-flex items-center justify-center w-8 h-8 text-primary hover:text-primary/80 transition-colors duration-200 cursor-pointer"
        >
          <TbTableExport className="h-8 w-8" />
        </button>

        {/* Dropdown Portal */}
        {isOpen && gridApi && !gridApi.isDestroyed() && (
          <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 min-w-[230px]">
            <div className="px-1 py-1">
              {/* CSV Export Option */}
              <Button
                variant="text"
                size="sm"
                withUnderline={false}
                onClick={handleCsvExport}
                className="w-full px-3 py-2 text-left text-gray-700 hover:text-gray-900 hover:bg-gray-200 flex items-center gap-2 justify-start first:rounded-t-lg last:rounded-b-lg group"
              >
                <TbCsv className="h-6 w-6 text-gray-500 group-hover:text-primary" />
                <span>Export ke CSV</span>
              </Button>

              {/* Excel Export Option */}
              <Button
                variant="text"
                size="sm"
                withUnderline={false}
                onClick={handleExcelExport}
                className="w-full px-3 py-2 text-left text-gray-700 hover:text-gray-900 hover:bg-gray-200 flex items-center gap-2 justify-start first:rounded-t-lg last:rounded-b-lg group"
              >
                <TbTableFilled className="h-6 w-6 text-gray-500 group-hover:text-primary" />
                <span>Export ke Excel</span>
              </Button>

              {/* JSON Export Option */}
              <Button
                variant="text"
                size="sm"
                withUnderline={false}
                onClick={handleJsonExport}
                className="w-full px-3 py-2 text-left text-gray-700 hover:text-gray-900 hover:bg-gray-200 flex items-center gap-2 justify-start first:rounded-t-lg last:rounded-b-lg group"
              >
                <TbJson className="h-6 w-6 text-gray-500 group-hover:text-primary" />
                <span>Export ke JSON</span>
              </Button>

              {/* Google Sheets Export Option */}
              <Button
                variant="text"
                size="sm"
                withUnderline={false}
                onClick={handleGoogleSheetsExport}
                disabled={isGoogleSheetsLoading}
                className="w-full px-3 py-2 text-left text-gray-700 hover:text-gray-900 hover:bg-gray-200 flex items-center gap-2 justify-start first:rounded-t-lg last:rounded-b-lg group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaGoogle className="h-5 w-5 text-gray-500 group-hover:text-green-600" />
                <span>
                  {isGoogleSheetsLoading
                    ? 'Exporting...'
                    : 'Export ke Google Sheets'}
                </span>
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }
);

ExportDropdown.displayName = 'ExportDropdown';

export default ExportDropdown;
