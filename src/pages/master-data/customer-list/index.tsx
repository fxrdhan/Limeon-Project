import Button from '@/components/button';
import { ExportDropdown } from '@/components/export';
import PageTitle from '@/components/page-title';
import { AGGridPagination } from '@/components/pagination';
import EnhancedSearchBar from '@/components/search-bar/EnhancedSearchBar';
import IdentityDataModal from '@/features/identity/IdentityDataModal';

import { DataGrid, createTextColumn } from '@/components/ag-grid';
import { Card } from '@/components/card';
import { useDynamicGridHeight } from '@/hooks/ag-grid/useDynamicGridHeight';
import type { Customer as CustomerType, FieldConfig } from '@/types';
import {
  ColDef,
  GridApi,
  GridReadyEvent,
  RowClickedEvent,
} from 'ag-grid-community';
import { useCallback, useMemo, useRef, useState } from 'react';
import { TbPlus } from 'react-icons/tb';

import { useMasterDataManagement } from '@/hooks/data/useMasterDataManagement';
import { useUnifiedSearch } from '@/hooks/data/useUnifiedSearch';
import { customerSearchColumns } from '@/utils/searchColumns';
import { useCustomerLevels } from '@/features/item-management/application/hooks/data/useCustomerLevels';

const CustomerList = () => {
  const searchInputRef = useRef<HTMLInputElement>(
    null
  ) as React.RefObject<HTMLInputElement>;

  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [currentPageSize, setCurrentPageSize] = useState<number>(10);

  const {
    isAddModalOpen,
    setIsAddModalOpen,
    isEditModalOpen,
    setIsEditModalOpen,
    editingItem,
    data: customersData,
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
  } = useMasterDataManagement('customers', 'Pelanggan', {
    searchInputRef,
  });

  const { levels: customerLevels } = useCustomerLevels();

  const customerLevelOptions = useMemo(
    () =>
      customerLevels.map(level => ({
        id: level.id,
        name: level.level_name,
      })),
    [customerLevels]
  );

  const customerLevelById = useMemo(() => {
    return new Map(customerLevels.map(level => [level.id, level.level_name]));
  }, [customerLevels]);

  const defaultCustomerLevelId = customerLevels[0]?.id ?? null;

  const handleSearch = useCallback(
    (searchValue: string) => {
      setDataSearch(searchValue);
    },
    [setDataSearch]
  );

  const handleClear = useCallback(() => {
    setDataSearch('');
  }, [setDataSearch]);

  const {
    search,
    onGridReady: unifiedSearchOnGridReady,
    isExternalFilterPresent,
    doesExternalFilterPass,
    searchBarProps,
  } = useUnifiedSearch({
    columns: customerSearchColumns,
    searchMode: 'hybrid',
    useFuzzySearch: true,
    data: customersData,
    onSearch: handleSearch,
    onClear: handleClear,
  });

  const handleGridReady = useCallback(
    (params: GridReadyEvent) => {
      setGridApi(params.api);

      const gridPageSize = params.api.paginationGetPageSize();
      setCurrentPageSize(gridPageSize);

      unifiedSearchOnGridReady(params);
    },
    [unifiedSearchOnGridReady]
  );

  const customers = customersData || [];

  const { gridHeight } = useDynamicGridHeight({
    data: customers,
    currentPageSize,
    viewportOffset: 320,
  });

  const customerFields: FieldConfig[] = [
    {
      key: 'name',
      label: 'Nama Pelanggan',
      type: 'text',
    },
    {
      key: 'customer_level_id',
      label: 'Level Pelanggan',
      options: customerLevelOptions,
      isRadioDropdown: true,
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
      key: 'address',
      label: 'Alamat',
      type: 'textarea',
    },
  ];

  const columnDefs: ColDef[] = useMemo(() => {
    const columns: ColDef[] = [
      createTextColumn({
        field: 'name',
        headerName: 'Nama Pelanggan',
        minWidth: 200,
        flex: 1,
      }),
      createTextColumn({
        field: 'customer_level_id',
        headerName: 'Level',
        minWidth: 140,
        valueGetter: params =>
          customerLevelById.get(params.data.customer_level_id) || '-',
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
        field: 'address',
        headerName: 'Alamat',
        minWidth: 180,
        flex: 1,
        valueGetter: params => params.data.address || '-',
      }),
    ];

    return columns;
  }, [customerLevelById]);

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
          <PageTitle title="Daftar Pelanggan" />
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
            <ExportDropdown gridApi={gridApi} filename="daftar-pelanggan" />
          </div>
          <Button
            variant="primary"
            withGlow
            className="flex items-center ml-4 mb-2"
            onClick={() => setIsAddModalOpen(true)}
          >
            <TbPlus className="mr-2" />
            Tambah Pelanggan Baru
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
              rowData={customers as CustomerType[]}
              columnDefs={columnDefs}
              onRowClicked={onRowClicked}
              onGridReady={handleGridReady}
              loading={isLoading}
              overlayNoRowsTemplate={
                search
                  ? `<span style="padding: 10px; color: #888;">Tidak ada pelanggan dengan nama "${search}"</span>`
                  : '<span style="padding: 10px; color: #888;">Tidak ada data pelanggan yang ditemukan</span>'
              }
              sizeColumnsToFit={true}
              onFirstDataRendered={() => {}}
              isExternalFilterPresent={isExternalFilterPresent}
              doesExternalFilterPass={doesExternalFilterPass}
              style={{
                width: '100%',
                marginTop: '1rem',
                marginBottom: '1rem',
                height: `${gridHeight}px`,
                transition: 'height 0.3s ease-in-out',
              }}
              pagination={true}
              paginationPageSize={itemsPerPage || 10}
              suppressPaginationPanel={true}
            />

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
        title="Tambah Pelanggan Baru"
        data={{ customer_level_id: defaultCustomerLevelId }}
        fields={customerFields}
        isOpen={isAddModalOpen}
        onClose={handleCloseAddModal}
        onSave={async data => {
          await handleModalSubmit({
            data: {
              name: String(data.name || ''),
              customer_level_id: String(
                data.customer_level_id || defaultCustomerLevelId || ''
              ),
              phone: data.phone ? String(data.phone) : null,
              email: data.email ? String(data.email) : null,
              address: data.address ? String(data.address) : null,
            },
          });
        }}
        mode="add"
        initialNameFromSearch={debouncedSearch}
        showImageUploader={false}
      />

      <IdentityDataModal
        title="Edit Pelanggan"
        data={
          (editingItem as unknown as Record<
            string,
            string | number | boolean | null
          >) || {}
        }
        fields={customerFields}
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        onSave={async data => {
          await handleModalSubmit({
            id: editingItem?.id,
            data: {
              name: String(data.name || ''),
              customer_level_id: String(
                data.customer_level_id || defaultCustomerLevelId || ''
              ),
              phone: data.phone ? String(data.phone) : null,
              email: data.email ? String(data.email) : null,
              address: data.address ? String(data.address) : null,
            },
          });
        }}
        onDeleteRequest={
          editingItem
            ? () => {
                openConfirmDialog({
                  title: 'Konfirmasi Hapus',
                  message: `Apakah Anda yakin ingin menghapus pelanggan "${editingItem.name}"?`,
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
        showImageUploader={false}
      />
    </>
  );
};

export default CustomerList;
