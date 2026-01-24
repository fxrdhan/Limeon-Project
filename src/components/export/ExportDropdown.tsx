import Button from '@/components/button';
import { googleSheetsService } from '@/utils/googleSheetsApi';
import type { Column, GridApi, IRowNode } from 'ag-grid-community';
import { AnimatePresence, motion } from 'motion/react';
import React, {
  CSSProperties,
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  TbBrandGoogle,
  TbCsv,
  TbJson,
  TbTableExport,
  TbTableFilled,
} from 'react-icons/tb';

interface ExportDropdownProps {
  gridApi: GridApi | null;
  filename?: string;
  className?: string;
}

const ExportDropdown: React.FC<ExportDropdownProps> = memo(
  ({ gridApi, filename = 'data-export', className = '' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isGoogleSheetsLoading, setIsGoogleSheetsLoading] = useState(false);
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [portalStyle, setPortalStyle] = useState<CSSProperties>({});
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Simple toggle function
    const toggleDropdown = useCallback(() => {
      if (!gridApi || gridApi.isDestroyed()) return;

      if (isOpen) {
        setIsOpen(false);
      } else {
        // Calculate position when opening
        if (buttonRef.current) {
          const buttonRect = buttonRef.current.getBoundingClientRect();
          const dropdownWidth = 230;
          const viewportWidth = window.innerWidth;
          const margin = 8;

          let leftPosition = buttonRect.right - dropdownWidth;

          if (leftPosition + dropdownWidth > viewportWidth - margin) {
            leftPosition = viewportWidth - dropdownWidth - margin;
          }
          if (leftPosition < margin) {
            leftPosition = margin;
          }

          setPortalStyle({
            position: 'fixed',
            left: `${leftPosition}px`,
            top: `${buttonRect.bottom + window.scrollY + 8}px`,
            width: `${dropdownWidth}px`,
            zIndex: 50,
          });
        }
        setIsOpen(true);
      }
    }, [gridApi, isOpen]);

    // Close dropdown
    const closeDropdown = useCallback(() => {
      setIsOpen(false);
    }, []);

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
      closeDropdown();
    }, [gridApi, filename, closeDropdown]);

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
      closeDropdown();
    }, [gridApi, filename, closeDropdown]);

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
      closeDropdown();
    }, [gridApi, filename, closeDropdown]);

    const processAndExportData = useCallback(async (): Promise<{
      processedData: string[][];
      headers: string[];
    }> => {
      if (!gridApi || gridApi.isDestroyed()) {
        throw new Error('Grid API is not available');
      }

      // Get column definitions from AG Grid
      const columnDefs = gridApi.getColumnDefs() || [];
      const visibleColumns = columnDefs.filter(
        (col): col is import('ag-grid-community').ColDef =>
          'field' in col && col.field != null && !col.hide
      );

      // Create headers and extract processed data handling nested objects and valueGetters
      const headers = visibleColumns.map(col => col.headerName || col.field!);

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

      // Extract data using direct row data access
      const processedData: string[][] = [];

      // Get all row data directly from grid using forEachNode
      // This bypasses any filter state and gets complete dataset
      const allRowData: unknown[] = [];

      try {
        // Iterate all nodes (requires RowApiModule)
        gridApi.forEachNode(node => {
          // Skip group nodes, only process data rows
          if (node.data && !node.group) {
            allRowData.push(node.data);
          }
        });
      } catch (error) {
        console.error('❌ Error getting row data:', error);
        throw new Error(
          'Failed to retrieve grid data. Please ensure grid is ready.'
        );
      }

      // Process each row to extract column values
      allRowData.forEach((rowData, index) => {
        const rowValues = visibleColumns.map(col => {
          let value: unknown;

          // If column has valueGetter function, use it
          if (col.valueGetter && typeof col.valueGetter === 'function') {
            // Modern AG Grid v30+ approach: Column API merged into Grid API
            const column = gridApi.getColumn(col.field || '') || null;

            // Create a minimal fallback column object if needed
            const fallbackColumn: Partial<Column> = {
              getColId: () => col.field || '',
              getColDef: () => col,
            };

            try {
              value = col.valueGetter({
                data: rowData,
                // Provide minimal required node properties
                node: {
                  data: rowData,
                  id: String(index),
                  group: false,
                } as IRowNode,
                colDef: col,
                api: gridApi,
                context: undefined,
                column: (column || fallbackColumn) as Column,
                getValue: (field: string) => {
                  return getNestedValue(
                    rowData as Record<string, unknown>,
                    field
                  );
                },
              });
            } catch (error) {
              console.warn(
                `⚠️ ValueGetter error for column ${col.field}:`,
                error
              );
              // Fallback to direct field access
              if (col.field) {
                value = getNestedValue(
                  rowData as Record<string, unknown>,
                  col.field
                );
              }
            }
          } else if (col.field) {
            // Handle nested field access (e.g., 'category.name')
            value = getNestedValue(
              rowData as Record<string, unknown>,
              col.field
            );
          }

          return value !== null && value !== undefined ? String(value) : '';
        });
        processedData.push(rowValues);
      });

      return { processedData, headers };
    }, [gridApi]);

    const handleGoogleSheetsExport = useCallback(async () => {
      if (!gridApi || gridApi.isDestroyed()) {
        return;
      }

      try {
        // Initialize service first if needed
        await googleSheetsService.initialize();

        // Check if already authorized (token exists in memory for current session)
        if (googleSheetsService.isAuthorized()) {
          // Open placeholder tab and start export
          const placeholderTab = window.open('about:blank', '_blank');
          if (!placeholderTab) {
            alert('Please allow popups to open Google Sheets.');
            return;
          }

          showLoadingInTab(placeholderTab);
          performExportToTab(placeholderTab);
          return;
        }

        // Need authentication - set state and trigger auth
        setIsAuthenticating(true);

        // Trigger auth popup (synchronous with user click)
        await googleSheetsService.authorize();
        setIsAuthenticating(false);

        // Open placeholder tab after successful auth
        const placeholderTab = window.open('about:blank', '_blank');
        if (!placeholderTab) {
          alert('Please allow popups to open Google Sheets.');
          return;
        }

        showLoadingInTab(placeholderTab);
        performExportToTab(placeholderTab);
      } catch (error) {
        console.error('❌ Auth process failed:', error);
        setIsAuthenticating(false);
        alert('Authentication failed. Please allow popups and try again.');
      }

      function showLoadingInTab(tab: Window) {
        try {
          // Get font from Tailwind @theme CSS variable
          const fontFamily =
            getComputedStyle(document.documentElement)
              .getPropertyValue('--font-sans')
              .trim() || 'system-ui, sans-serif';

          tab.document.write(`
            <html>
              <head><title>Creating Google Sheet...</title></head>
              <body style="font-family: ${fontFamily}; text-align: center; padding: 50px; background: #f5f5f5;">
                <h2>☁️ Creating your Google Sheet...</h2>
                <p>Please wait while we prepare your data...</p>
                <div style="margin: 20px auto; width: 50px; height: 50px; border: 3px solid #e3e3e3; border-top: 3px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
              </body>
            </html>
          `);
        } catch {
          // Silent error
        }
      }

      async function performExportToTab(placeholderTab: Window) {
        let exportSuccess = false;

        try {
          setIsGoogleSheetsLoading(true);

          // Process data from AG Grid
          const { processedData, headers } = await processAndExportData();

          // Export to Google Sheets
          const sheetUrl = await googleSheetsService.exportGridDataToSheets(
            processedData,
            headers,
            filename
          );

          // Redirect placeholder tab to actual Google Sheet
          if (sheetUrl) {
            placeholderTab.location.href = sheetUrl;
            exportSuccess = true;
          } else {
            console.warn('⚠️ No sheet URL returned');
            placeholderTab.close();
            alert('Failed to create Google Sheet. Please try again.');
          }
        } catch (error) {
          console.error('❌ Failed to export to Google Sheets:', error);

          const errorMessage =
            error instanceof Error ? error.message : String(error);

          // Check if token expired - offer to retry
          if (errorMessage.includes('Authentication token expired')) {
            placeholderTab.close();
            if (
              confirm(
                'Your Google authentication has expired. Click OK to re-authenticate and try again.'
              )
            ) {
              // Retry the whole export process which will trigger new auth
              handleGoogleSheetsExport();
              return;
            }
          } else {
            // Close placeholder tab on other errors
            if (placeholderTab && !placeholderTab.closed) {
              placeholderTab.close();
            }
            alert(`Failed to export to Google Sheets: ${errorMessage}`);
          }
        } finally {
          setIsGoogleSheetsLoading(false);

          // Only close dropdown if export was successful
          if (exportSuccess) {
            closeDropdown();
          } else {
            // Keep dropdown open
          }
        }
      }
    }, [gridApi, filename, closeDropdown, processAndExportData]);

    // Handle click outside to close dropdown
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        // Don't close dropdown if we're in the middle of auth or export process
        if (isAuthenticating || isGoogleSheetsLoading) {
          return;
        }

        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target as Node) &&
          buttonRef.current &&
          !buttonRef.current.contains(event.target as Node)
        ) {
          closeDropdown();
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
      }

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [isOpen, closeDropdown, isAuthenticating, isGoogleSheetsLoading]);

    return (
      <div className={`relative inline-block ${className}`}>
        {/* Main Export Button */}
        <button
          ref={buttonRef}
          onClick={toggleDropdown}
          title="Export Data"
          className="inline-flex items-center justify-center w-8 h-8 text-primary hover:text-primary/80 transition-colors duration-200 cursor-pointer"
        >
          <TbTableExport className="h-8 w-8" />
        </button>

        {/* Export Dropdown Portal */}
        {gridApi &&
          !gridApi.isDestroyed() &&
          typeof document !== 'undefined' &&
          createPortal(
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  ref={dropdownRef}
                  style={portalStyle}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="origin-top bg-white rounded-xl border border-gray-200 shadow-xl"
                  role="menu"
                  onClick={e => e.stopPropagation()}
                >
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
                      disabled={isGoogleSheetsLoading || isAuthenticating}
                      className="w-full px-3 py-2 text-left text-gray-700 hover:text-gray-900 hover:bg-gray-200 flex items-center gap-2 justify-start first:rounded-t-lg last:rounded-b-lg group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <TbBrandGoogle className="h-5 w-5 text-gray-500 group-hover:text-primary" />
                      <span>
                        {isAuthenticating
                          ? 'Authenticating...'
                          : isGoogleSheetsLoading
                            ? 'Exporting...'
                            : 'Export ke Google Sheets'}
                      </span>
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>,
            document.body
          )}
      </div>
    );
  }
);

ExportDropdown.displayName = 'ExportDropdown';

export default ExportDropdown;
