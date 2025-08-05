import IdentityDataModal from '@/features/identity/IdentityDataModal';
import EnhancedSearchBar from '@/components/search-bar/EnhancedSearchBar';
import Button from '@/components/button';
import Pagination from '@/components/pagination';
import PageTitle from '@/components/page-title';

import { FaPlus } from 'react-icons/fa';
import { Card } from '@/components/card';
import { DataGrid, createTextColumn } from '@/components/ag-grid';
import { ColDef, RowClickedEvent } from 'ag-grid-community';
import { useRef, useMemo, useCallback } from 'react';
import type { Patient as PatientType, FieldConfig } from '@/types';

// Use the new modular architecture
import { useMasterDataManagement } from '@/hooks/useMasterDataManagement';

import { useUnifiedSearch } from '@/hooks/useUnifiedSearch';
import { patientSearchColumns } from '@/utils/searchColumns';

const PatientListNew = () => {
  const searchInputRef = useRef<HTMLInputElement>(
    null
  ) as React.RefObject<HTMLInputElement>;

  // Data management hook for server-side operations
  const {
    isAddModalOpen,
    setIsAddModalOpen,
    isEditModalOpen,
    setIsEditModalOpen,
    editingItem,
    data: patientsData,
    totalItems,
    isLoading,
    isError,
    queryError,
    isFetching,
    handleEdit,
    handleModalSubmit,
    handlePageChange,
    handleItemsPerPageChange,
    totalPages,
    currentPage,
    itemsPerPage,
    deleteMutation,
    openConfirmDialog,
    debouncedSearch,
    handleKeyDown,
    setSearch: setDataSearch,
  } = useMasterDataManagement('patients', 'Pasien', {
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
    onGridReady,
    isExternalFilterPresent,
    doesExternalFilterPass,
    searchBarProps,
  } = useUnifiedSearch({
    columns: patientSearchColumns,
    searchMode: 'hybrid',
    useFuzzySearch: true,
    data: patientsData,
    onSearch: handleSearch,
    onClear: handleClear,
  });

  const patients = patientsData || [];

  const patientFields: FieldConfig[] = [
    {
      key: 'name',
      label: 'Nama Pasien',
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
      key: 'birth_date',
      label: 'Tanggal Lahir',
      type: 'date',
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
  ];

  const columnDefs: ColDef[] = useMemo(() => {
    const columns: ColDef[] = [
      createTextColumn({
        field: 'name',
        headerName: 'Nama Pasien',
        minWidth: 200,
        flex: 1,
      }),
      createTextColumn({
        field: 'gender',
        headerName: 'Jenis Kelamin',
        minWidth: 120,
        valueGetter: params => params.data.gender || '-',
      }),
      createTextColumn({
        field: 'birth_date',
        headerName: 'Tanggal Lahir',
        minWidth: 120,
        valueGetter: params => {
          const value = params.data.birth_date;
          return value && typeof value === 'string'
            ? new Date(value).toLocaleDateString('id-ID')
            : '-';
        },
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
          <PageTitle title="Daftar Pasien" />
        </div>
        <div className="flex items-center">
          <EnhancedSearchBar
            inputRef={searchInputRef}
            {...searchBarProps}
            onKeyDown={handleKeyDown}
            placeholder="Cari di semua kolom atau ketik # untuk pencarian kolom spesifik..."
            className="grow"
          />
          <Button
            variant="primary"
            withGlow
            className="flex items-center ml-4 mb-2"
            onClick={() => setIsAddModalOpen(true)}
          >
            <FaPlus className="mr-2" />
            Tambah Pasien Baru
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
              rowData={patients as PatientType[]}
              columnDefs={columnDefs}
              onRowClicked={onRowClicked}
              onGridReady={onGridReady}
              loading={isLoading}
              overlayNoRowsTemplate={
                search
                  ? `<span style="padding: 10px; color: #888;">Tidak ada pasien dengan nama "${search}"</span>`
                  : '<span style="padding: 10px; color: #888;">Tidak ada data pasien yang ditemukan</span>'
              }
              sizeColumnsToFit={true}
              onFirstDataRendered={() => {}}
              animateRows={true}
              isExternalFilterPresent={isExternalFilterPresent}
              doesExternalFilterPass={doesExternalFilterPass}
              style={{
                width: '100%',
                marginTop: '1rem',
                marginBottom: '1rem',
              }}
            />
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems || 0}
              itemsPerPage={itemsPerPage || 10}
              itemsCount={patients?.length || 0}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
              hideFloatingWhenModalOpen={isAddModalOpen || isEditModalOpen}
            />
          </>
        )}
      </Card>

      <IdentityDataModal
        title="Tambah Pasien Baru"
        data={{}}
        fields={patientFields}
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
        title="Edit Pasien"
        data={
          (editingItem as unknown as Record<
            string,
            string | number | boolean | null
          >) || {}
        }
        fields={patientFields}
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
                  message: `Apakah Anda yakin ingin menghapus pasien "${editingItem.name}"?`,
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
        imageUrl={(editingItem as PatientType)?.image_url || undefined}
      />
    </>
  );
};

export default PatientListNew;
