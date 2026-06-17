import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/tooltip';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import toast from 'react-hot-toast';
import { TbTableExport } from 'react-icons/tb';
import { getExportDropdownPortalStyle } from './export-dropdown/dropdownPosition';
import { ExportDropdownMenu } from './export-dropdown/ExportDropdownMenu';
import type { ExportDropdownProps } from './export-dropdown/types';
import { useGoogleSheetsExport } from './export-dropdown/useGoogleSheetsExport';

const getDatedExportFilename = (filename: string, extension: string) =>
  `${filename}-${new Date().toISOString().split('T')[0]}.${extension}`;

const ExportDropdown = memo(
  ({
    gridApi,
    filename = 'data-export',
    className = '',
    tooltipLabel = 'Export Data',
  }: ExportDropdownProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [portalStyle, setPortalStyle] = useState<CSSProperties>({});
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const isGridAvailable = Boolean(gridApi && !gridApi.isDestroyed());

    const closeDropdown = useCallback(() => {
      setIsOpen(false);
    }, []);

    const toggleDropdown = useCallback(() => {
      if (!gridApi || gridApi.isDestroyed()) return;

      if (isOpen) {
        setIsOpen(false);
        return;
      }

      if (buttonRef.current) {
        setPortalStyle(getExportDropdownPortalStyle(buttonRef.current));
      }
      setIsOpen(true);
    }, [gridApi, isOpen]);

    const handleCsvExport = useCallback(() => {
      if (gridApi && !gridApi.isDestroyed()) {
        gridApi.exportDataAsCsv({
          fileName: getDatedExportFilename(filename, 'csv'),
          columnSeparator: ',',
          suppressQuotes: false,
          allColumns: false,
          onlySelected: false,
          processCellCallback: params => {
            if (params.value === null || params.value === undefined) {
              return '';
            }
            return params.value;
          },
        });
      }
      closeDropdown();
    }, [closeDropdown, filename, gridApi]);

    const handleExcelExport = useCallback(() => {
      if (gridApi && !gridApi.isDestroyed()) {
        gridApi.exportDataAsExcel({
          fileName: getDatedExportFilename(filename, 'xlsx'),
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
            const headerLength =
              params.column?.getColDef().headerName?.length || 10;
            return Math.max(headerLength * 8, 80);
          },
          processCellCallback: params => {
            if (params.value === null || params.value === undefined) {
              return '';
            }
            return params.value;
          },
          processHeaderCallback: params =>
            params.column.getColDef().headerName || params.column.getColId(),
        });
      }
      closeDropdown();
    }, [closeDropdown, filename, gridApi]);

    const handleJsonExport = useCallback(() => {
      try {
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

          try {
            link.href = url;
            link.download = getDatedExportFilename(filename, 'json');
            document.body.appendChild(link);
            link.click();
          } finally {
            link.remove();
            URL.revokeObjectURL(url);
          }
        }
      } catch (error) {
        console.error('Failed to export JSON:', error);
        toast.error('Gagal export JSON');
      } finally {
        closeDropdown();
      }
    }, [closeDropdown, filename, gridApi]);

    const {
      isGoogleSheetsInitializing,
      isGoogleSheetsLoading,
      isAuthenticating,
      handleGoogleSheetsExport,
    } = useGoogleSheetsExport({
      gridApi,
      filename,
      isOpen,
      closeDropdown,
    });

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (!(event.target instanceof Node)) {
          return;
        }

        if (
          isGoogleSheetsInitializing ||
          isAuthenticating ||
          isGoogleSheetsLoading
        ) {
          return;
        }

        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target) &&
          buttonRef.current &&
          !buttonRef.current.contains(event.target)
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
    }, [
      closeDropdown,
      isAuthenticating,
      isGoogleSheetsInitializing,
      isGoogleSheetsLoading,
      isOpen,
    ]);

    return (
      <TooltipProvider>
        <div className={`relative inline-block ${className}`}>
          <Tooltip side="bottom">
            <TooltipTrigger asChild>
              <button
                ref={buttonRef}
                onClick={toggleDropdown}
                aria-label={tooltipLabel}
                className="group inline-flex items-center justify-center w-8 h-8 cursor-pointer"
              >
                <TbTableExport className="-translate-y-0.7 h-8 w-8 text-primary transition-colors duration-200 group-hover:text-primary/80" />
              </button>
            </TooltipTrigger>
            <TooltipContent>{tooltipLabel}</TooltipContent>
          </Tooltip>

          <ExportDropdownMenu
            isOpen={isOpen}
            isAvailable={isGridAvailable}
            portalStyle={portalStyle}
            dropdownRef={dropdownRef}
            isGoogleSheetsInitializing={isGoogleSheetsInitializing}
            isGoogleSheetsLoading={isGoogleSheetsLoading}
            isAuthenticating={isAuthenticating}
            onCsvExport={handleCsvExport}
            onExcelExport={handleExcelExport}
            onJsonExport={handleJsonExport}
            onGoogleSheetsExport={handleGoogleSheetsExport}
          />
        </div>
      </TooltipProvider>
    );
  }
);

ExportDropdown.displayName = 'ExportDropdown';

export default ExportDropdown;
