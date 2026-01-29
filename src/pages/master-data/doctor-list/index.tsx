import Button from '@/components/button';
import { ExportDropdown } from '@/components/export';
import PageTitle from '@/components/page-title';
import { AGGridPagination } from '@/components/pagination';
import EnhancedSearchBar from '@/components/search-bar/EnhancedSearchBar';
import IdentityDataModal from '@/components/IdentityDataModal';

import { DataGrid, createTextColumn } from '@/components/ag-grid';
import { Card } from '@/components/card';
import { useDynamicGridHeight } from '@/hooks/ag-grid/useDynamicGridHeight';
import type { Doctor as DoctorType, FieldConfig } from '@/types';
import {
  ColDef,
  GridApi,
  GridReadyEvent,
  RowClickedEvent,
} from 'ag-grid-community';
import { useCallback, useMemo, useRef, useState } from 'react';
import { TbPlus } from 'react-icons/tb';

// Use the new modular architecture
import { useMasterDataManagement } from '@/hooks/data/useMasterDataManagement';

import { useUnifiedSearch } from '@/hooks/data/useUnifiedSearch';
import { doctorSearchColumns } from '@/utils/searchColumns';

const DoctorListNew = () => {
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
    data: doctorsData,
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
    handleDelete,
    openConfirmDialog,
    debouncedSearch,
    handleKeyDown,
    setSearch: setDataSearch,
  } = useMasterDataManagement('doctors', 'Dokter', {
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
    columns: doctorSearchColumns,
    searchMode: 'hybrid',
    useFuzzySearch: true,
    data: doctorsData,
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

  const doctors = doctorsData || [];

  // Use dynamic grid height hook
  const { gridHeight } = useDynamicGridHeight({
    data: doctors,
    currentPageSize,
    viewportOffset: 320, // navbar + toolbar + pagination + margins + bottom pagination
  });

  const doctorFields: FieldConfig[] = [
    {
      key: 'name',
      label: 'Nama Dokter',
      type: 'text',
    },
    {
      key: 'gender',
      label: 'Jenis Kelamin',
      type: 'text',
      options: [
        { id: 'L', name: 'Laki-laki' },
        { id: 'P', name: 'Perempuan' },
      ],
      isRadioDropdown: true,
    },
    {
      key: 'specialization',
      label: 'Spesialisasi',
      type: 'text',
    },
    {
      key: 'license_number',
      label: 'Nomor Lisensi',
      type: 'text',
    },
    {
      key: 'experience_years',
      label: 'Tahun Pengalaman',
      type: 'text',
    },
    {
      key: 'education',
      label: 'Pendidikan',
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
  ];

  const columnDefs: ColDef[] = useMemo(() => {
    const columns: ColDef[] = [
      createTextColumn({
        field: 'name',
        headerName: 'Nama Dokter',
        minWidth: 200,
        flex: 1,
      }),
      createTextColumn({
        field: 'gender',
        headerName: 'Jenis Kelamin',
        minWidth: 120,
        valueGetter: params => {
          const value = params.data.gender;
          return value === 'L'
            ? 'Laki-laki'
            : value === 'P'
              ? 'Perempuan'
              : value || '-';
        },
      }),
      createTextColumn({
        field: 'specialization',
        headerName: 'Spesialisasi',
        minWidth: 150,
        valueGetter: params => params.data.specialization || '-',
      }),
      createTextColumn({
        field: 'license_number',
        headerName: 'Nomor Lisensi',
        minWidth: 120,
        valueGetter: params => params.data.license_number || '-',
      }),
      createTextColumn({
        field: 'experience_years',
        headerName: 'Pengalaman',
        minWidth: 100,
        valueGetter: params => {
          const years = params.data.experience_years;
          return years ? `${years} tahun` : '-';
        },
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
          <PageTitle title="Daftar Dokter" />
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
            <ExportDropdown gridApi={gridApi} filename="daftar-dokter" />
          </div>
          <Button
            variant="primary"
            withGlow
            className="flex items-center ml-4 mb-2"
            onClick={() => setIsAddModalOpen(true)}
          >
            <TbPlus className="mr-2" />
            Tambah Dokter Baru
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
              rowData={doctors as DoctorType[]}
              columnDefs={columnDefs}
              onRowClicked={onRowClicked}
              onGridReady={handleGridReady}
              loading={isLoading}
              overlayNoRowsTemplate={
                search
                  ? `<span style="padding: 10px; color: #888;">Tidak ada dokter dengan nama "${search}"</span>`
                  : '<span style="padding: 10px; color: #888;">Tidak ada data dokter yang ditemukan</span>'
              }
              sizeColumnsToFit={true}
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
        title="Tambah Dokter Baru"
        data={{}}
        fields={doctorFields}
        isOpen={isAddModalOpen}
        onClose={handleCloseAddModal}
        onSave={async data => {
          await handleModalSubmit({
            name: String(data.name || ''),
            description: String(data.specialization || ''),
            id: undefined,
          });
        }}
        mode="add"
        initialNameFromSearch={debouncedSearch}
      />

      <IdentityDataModal
        title="Edit Dokter"
        data={
          (editingItem as unknown as Record<
            string,
            string | number | boolean | null
          >) || {}
        }
        fields={doctorFields}
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        onSave={async data => {
          await handleModalSubmit({
            name: String(data.name || ''),
            description: String(data.specialization || ''),
            id: editingItem?.id,
          });
        }}
        onDeleteRequest={
          editingItem
            ? () => {
                openConfirmDialog({
                  title: 'Konfirmasi Hapus',
                  message: `Apakah Anda yakin ingin menghapus dokter "${editingItem.name}"?`,
                  variant: 'danger',
                  confirmText: 'Ya, Hapus',
                  onConfirm: async () => {
                    await handleDelete(editingItem.id);
                  },
                });
              }
            : undefined
        }
        mode="edit"
        imageUrl={(editingItem as DoctorType)?.image_url || undefined}
      />
    </>
  );
};

export default DoctorListNew;
