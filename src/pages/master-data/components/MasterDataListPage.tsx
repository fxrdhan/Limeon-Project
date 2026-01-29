import React from 'react';
import { GridApi } from 'ag-grid-community';
import { TbPlus } from 'react-icons/tb';

import Button from '@/components/button';
import { Card } from '@/components/card';
import { ExportDropdown } from '@/components/export';
import PageTitle from '@/components/page-title';
import { AGGridPagination } from '@/components/pagination';
import EnhancedSearchBar from '@/components/search-bar/EnhancedSearchBar';
import type { EnhancedSearchBarProps } from '@/components/search-bar/types';
import { DataGrid } from '@/components/ag-grid';
import type { DataGridProps } from '@/components/ag-grid';

interface MasterDataListPaginationProps {
  gridApi: GridApi | null;
  pageSizeOptions?: number[];
  enableFloating?: boolean;
  hideFloatingWhenModalOpen?: boolean;
  onPageSizeChange?: (pageSize: number) => void;
}

interface MasterDataListPageProps {
  title: string;
  entityName: string;
  exportFilename: string;
  searchInputRef: React.RefObject<HTMLInputElement>;
  searchBarProps: EnhancedSearchBarProps;
  onSearchKeyDown: React.KeyboardEventHandler<HTMLInputElement>;
  onAddClick: () => void;
  isFetching: boolean;
  isError: boolean;
  queryError: Error | null;
  searchValue: string;
  gridHeight: number;
  gridProps: DataGridProps;
  pagination: MasterDataListPaginationProps;
  searchPlaceholder?: string;
  children?: React.ReactNode;
}

const MasterDataListPage: React.FC<MasterDataListPageProps> = ({
  title,
  entityName,
  exportFilename,
  searchInputRef,
  searchBarProps,
  onSearchKeyDown,
  onAddClick,
  isFetching,
  isError,
  queryError,
  searchValue,
  gridHeight,
  gridProps,
  pagination,
  searchPlaceholder = 'Cari di semua kolom atau ketik # untuk pencarian kolom spesifik...',
  children,
}) => {
  const entityLabel = entityName.toLowerCase();
  const overlayNoRowsTemplate = searchValue
    ? `<span style="padding: 10px; color: #888;">Tidak ada ${entityLabel} dengan nama "${searchValue}"</span>`
    : `<span style="padding: 10px; color: #888;">Tidak ada data ${entityLabel} yang ditemukan</span>`;
  const gridStyle = {
    width: '100%',
    marginTop: '1rem',
    marginBottom: '1rem',
    transition: 'height 0.3s ease-in-out',
    ...gridProps.style,
    height: `${gridHeight}px`,
  };

  return (
    <>
      <Card
        className={
          isFetching
            ? 'opacity-75 transition-opacity duration-300 flex-1 flex flex-col'
            : 'flex-1 flex flex-col'
        }
      >
        <div className="mb-6">
          <PageTitle title={title} />
        </div>
        <div className="flex items-center">
          <EnhancedSearchBar
            inputRef={searchInputRef}
            {...searchBarProps}
            onKeyDown={onSearchKeyDown}
            placeholder={searchPlaceholder}
            className="grow"
          />
          <div className="ml-4 mb-2">
            <ExportDropdown
              gridApi={pagination.gridApi}
              filename={exportFilename}
            />
          </div>
          <Button
            variant="primary"
            withGlow
            className="flex items-center ml-4 mb-2"
            onClick={onAddClick}
          >
            <TbPlus className="mr-2" />
            Tambah {entityName} Baru
          </Button>
        </div>
        {isError && (
          <div className="text-center p-6 text-red-500">
            Error:{' '}
            {queryError instanceof Error
              ? queryError.message
              : 'Gagal memuat data'}
          </div>
        )}
        {!isError && (
          <>
            <DataGrid
              {...gridProps}
              overlayNoRowsTemplate={
                gridProps.overlayNoRowsTemplate ?? overlayNoRowsTemplate
              }
              style={gridStyle}
            />

            <AGGridPagination
              gridApi={pagination.gridApi}
              pageSizeOptions={pagination.pageSizeOptions}
              enableFloating={pagination.enableFloating}
              hideFloatingWhenModalOpen={pagination.hideFloatingWhenModalOpen}
              onPageSizeChange={pagination.onPageSizeChange}
            />
          </>
        )}
      </Card>
      {children}
    </>
  );
};

export default MasterDataListPage;
