import Button from '@/components/button';
import { ExportDropdown } from '@/components/export';
import PageTitle from '@/components/page-title';
import { AGGridPagination } from '@/components/pagination';
import EnhancedSearchBar from '@/components/search-bar/EnhancedSearchBar';
import IdentityDataModal from '@/components/IdentityDataModal';

import { DataGrid, createTextColumn } from '@/components/ag-grid';
import { Card } from '@/components/card';
import { useDynamicGridHeight } from '@/hooks/ag-grid/useDynamicGridHeight';
import {
  ColDef,
  GridApi,
  GridReadyEvent,
  RowClickedEvent,
} from 'ag-grid-community';
import { useCallback, useMemo, useRef, useState } from 'react';
import { TbPlus } from 'react-icons/tb';
// import { useLocation } from "react-router-dom";
import type { FieldConfig, Supplier as SupplierType } from '@/types';

// Use the new modular architecture
import { useMasterDataManagement } from '@/hooks/data/useMasterDataManagement';

import { useUnifiedSearch } from '@/hooks/data/useUnifiedSearch';
import { supplierSearchColumns } from '@/utils/searchColumns';

const SupplierListNew = () => {
  const searchInputRef = useRef<HTMLInputElement>(
    null
  ) as React.RefObject<HTMLInputElement>;

  // Grid API state for AG Grid pagination
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [currentPageSize, setCurrentPageSize] = useState<number>(10);

  // Data management hook for server-side operations
  const {
    isAddModalOpen,
    setIsAddModalOpen,
    isEditModalOpen,
    setIsEditModalOpen,
    editingItem,
    data: suppliersData,
    totalItems: _totalItems, // eslint-disable-line @typescript-eslint/no-unused-vars
    isLoading,
    isError,
    queryError,
    isFetching,
    handleEdit,
    handleModalSubmit,
    handlePageChange: _handlePageChange, // eslint-disable-line @typescript-eslint/no-unused-vars
    handleItemsPerPageChange: _handleItemsPerPageChange, // eslint-disable-line @typescript-eslint/no-unused-vars
    totalPages: _totalPages, // eslint-disable-line @typescript-eslint/no-unused-vars
    currentPage: _currentPage, // eslint-disable-line @typescript-eslint/no-unused-vars
    itemsPerPage,
    deleteMutation,
    openConfirmDialog,
    debouncedSearch,
    handleKeyDown,
    setSearch: setDataSearch,
  } = useMasterDataManagement('suppliers', 'Supplier', {
    searchInputRef,
  });

  // Stable callback functions to prevent infinite re-renders
  const handleSearch = useCallback(
    (searchValue: string) => {
      setDataSearch(searchValue);
    },
    [setDataSearch]
  );

  const handleClear = useCallback(() => {
    setDataSearch('');
  }, [setDataSearch]);

  // Unified search functionality with hybrid mode
  const {
    search,
    onGridReady: unifiedSearchOnGridReady,
    isExternalFilterPresent,
    doesExternalFilterPass,
    searchBarProps,
  } = useUnifiedSearch({
    columns: supplierSearchColumns,
    searchMode: 'hybrid',
    useFuzzySearch: true,
    data: suppliersData,
    onSearch: handleSearch,
    onClear: handleClear,
  });

  // Enhanced onGridReady to capture grid API for AGGridPagination
  const handleGridReady = useCallback(
    (params: GridReadyEvent) => {
      setGridApi(params.api);

      // Sync current page size with grid
      const gridPageSize = params.api.paginationGetPageSize();
      setCurrentPageSize(gridPageSize);

      unifiedSearchOnGridReady(params);
    },
    [unifiedSearchOnGridReady]
  );

  const suppliers = suppliersData || [];

  // Use dynamic grid height hook
  const { gridHeight } = useDynamicGridHeight({
    data: suppliers,
    currentPageSize,
    viewportOffset: 320, // navbar + toolbar + pagination + margins + bottom pagination
  });

  const supplierFields: FieldConfig[] = [
    {
      key: 'name',
      label: 'Nama Supplier',
      type: 'text',
    },
    {
      key: 'address',
      label: 'Alamat',
      type: 'textarea',
    },
    {
      key: 'phone',
      label: 'Telepon',
      type: 'tel',
    },
    {
      key: 'email',
      label: 'Email',
      type: 'email',
    },
    {
      key: 'contact_person',
      label: 'Kontak Person',
      type: 'text',
    },
  ];

  const columnDefs: ColDef[] = useMemo(() => {
    const columns: ColDef[] = [
      createTextColumn({
        field: 'name',
        headerName: 'Nama Supplier',
        minWidth: 200,
      }),
      createTextColumn({
        field: 'address',
        headerName: 'Alamat',
        minWidth: 150,
        flex: 1,
        valueGetter: params => params.data.address || '-',
      }),
      createTextColumn({
        field: 'phone',
        headerName: 'Telepon',
        minWidth: 120,
        valueGetter: params => params.data.phone || '-',
      }),
      createTextColumn({
        field: 'email',
        headerName: 'Email',
        minWidth: 150,
        valueGetter: params => params.data.email || '-',
      }),
      createTextColumn({
        field: 'contact_person',
        headerName: 'Kontak Person',
        minWidth: 150,
        valueGetter: params => params.data.contact_person || '-',
      }),
    ];

    return columns;
  }, []);

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
  };

  const onRowClicked = (event: RowClickedEvent) => {
    handleEdit(event.data);
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
          <PageTitle title="Daftar Supplier" />
        </div>
        <div className="flex items-center">
          <EnhancedSearchBar
            inputRef={searchInputRef}
            {...searchBarProps}
            onKeyDown={handleKeyDown}
            placeholder="Cari di semua kolom atau ketik # untuk pencarian kolom spesifik..."
            className="grow"
          />
          <div className="ml-4 mb-2">
            <ExportDropdown gridApi={gridApi} filename="daftar-supplier" />
          </div>
          <Button
            variant="primary"
            withGlow
            className="flex items-center ml-4 mb-2"
            onClick={() => setIsAddModalOpen(true)}
          >
            <TbPlus className="mr-2" />
            Tambah Supplier Baru
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
              rowData={suppliers as SupplierType[]}
              columnDefs={columnDefs}
              onRowClicked={onRowClicked}
              onGridReady={handleGridReady}
              loading={isLoading}
              overlayNoRowsTemplate={
                search
                  ? `<span style="padding: 10px; color: #888;">Tidak ada supplier dengan nama "${search}"</span>`
                  : '<span style="padding: 10px; color: #888;">Tidak ada data supplier yang ditemukan</span>'
              }
              autoSizeColumns={['name', 'phone', 'email', 'contact_person']}
              onFirstDataRendered={() => {}}
              isExternalFilterPresent={isExternalFilterPresent}
              doesExternalFilterPass={doesExternalFilterPass}
              style={{
                width: '100%',
                marginTop: '1rem',
                marginBottom: '1rem',
                height: `${gridHeight}px`, // Dynamic height based on pagination size
                transition: 'height 0.3s ease-in-out',
              }}
              // AG Grid Built-in Pagination (hidden - we'll use custom component)
              pagination={true}
              paginationPageSize={itemsPerPage || 10}
              suppressPaginationPanel={true} // Hide AG Grid's built-in pagination UI
            />

            {/* Custom Pagination Component using AG Grid API */}
            <AGGridPagination
              gridApi={gridApi}
              pageSizeOptions={[10, 20, 50, 100]}
              enableFloating={true}
              hideFloatingWhenModalOpen={isAddModalOpen || isEditModalOpen}
              onPageSizeChange={setCurrentPageSize}
            />
          </>
        )}
      </Card>

      <IdentityDataModal
        title="Tambah Supplier Baru"
        data={{}}
        fields={supplierFields}
        isOpen={isAddModalOpen}
        onClose={handleCloseAddModal}
        onSave={async data => {
          await handleModalSubmit({
            name: String(data.name || ''),
            description: String(data.address || ''),
            id: undefined,
          });
        }}
        mode="add"
        initialNameFromSearch={debouncedSearch}
      />

      <IdentityDataModal
        title="Edit Supplier"
        data={
          (editingItem as unknown as Record<
            string,
            string | number | boolean | null
          >) || {}
        }
        fields={supplierFields}
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        onSave={async data => {
          await handleModalSubmit({
            name: String(data.name || ''),
            description: String(data.address || ''),
            id: editingItem?.id,
          });
        }}
        onDeleteRequest={
          editingItem
            ? () => {
                openConfirmDialog({
                  title: 'Konfirmasi Hapus',
                  message: `Apakah Anda yakin ingin menghapus supplier "${editingItem.name}"?`,
                  variant: 'danger',
                  confirmText: 'Ya, Hapus',
                  onConfirm: async () => {
                    await deleteMutation.mutateAsync(editingItem.id);
                  },
                });
              }
            : undefined
        }
        mode="edit"
        imageUrl={(editingItem as SupplierType)?.image_url || undefined}
      />
    </>
  );
};

export default SupplierListNew;
