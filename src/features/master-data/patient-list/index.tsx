import IdentityDataModal from '@/components/IdentityDataModal';

import { createTextColumn } from '@/components/ag-grid';
import type { FieldConfig, Patient as PatientType } from '@/types';
import { ColDef, RowClickedEvent } from 'ag-grid-community';
import { useMemo, useRef } from 'react';

// Use the new modular architecture
import { useMasterDataManagement } from '@/hooks/data/useMasterDataManagement';

import { useMasterDataList } from '@/features/master-data/hooks/useMasterDataList';
import MasterDataListPage from '@/features/master-data/components/MasterDataListPage';
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
    handleFieldAutosave,
    openConfirmDialog,
    debouncedSearch,
    handleKeyDown,
    setSearch: setDataSearch,
  } = useMasterDataManagement('patients', 'Pasien', {
    searchInputRef,
  });

  const {
    gridApi,
    setCurrentPageSize,
    gridHeight,
    handleGridReady,
    search,
    isExternalFilterPresent,
    doesExternalFilterPass,
    searchBarProps,
  } = useMasterDataList({
    data: patientsData,
    searchColumns: patientSearchColumns,
    setSearch: setDataSearch,
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

  const toPatientPayload = (
    data: Record<string, string | number | boolean | null>
  ) => ({
    name: String(data.name || ''),
    gender: data.gender ? String(data.gender) : null,
    birth_date: data.birth_date ? String(data.birth_date) : null,
    address: data.address ? String(data.address) : null,
    phone: data.phone ? String(data.phone) : null,
    email: data.email ? String(data.email) : null,
    image_url: data.image_url ? String(data.image_url) : null,
  });

  return (
    <MasterDataListPage
      title="Daftar Pasien"
      entityName="Pasien"
      exportFilename="daftar-pasien"
      searchInputRef={searchInputRef}
      searchBarProps={searchBarProps}
      onSearchKeyDown={handleKeyDown}
      onAddClick={() => setIsAddModalOpen(true)}
      isFetching={isFetching}
      isError={isError}
      queryError={queryError}
      searchValue={search}
      gridHeight={gridHeight}
      gridProps={{
        rowData: patients as PatientType[],
        columnDefs,
        onRowClicked,
        onGridReady: handleGridReady,
        loading: isLoading,
        sizeColumnsToFit: true,
        onFirstDataRendered: () => {},
        isExternalFilterPresent,
        doesExternalFilterPass,
        pagination: true,
        paginationPageSize: itemsPerPage || 25,
        suppressPaginationPanel: true,
      }}
      pagination={{
        gridApi,
        pageSizeOptions: [25, 50, 100, -1],
        enableFloating: true,
        hideFloatingWhenModalOpen: isAddModalOpen || isEditModalOpen,
        onPageSizeChange: setCurrentPageSize,
      }}
    >
      <IdentityDataModal
        title="Tambah Pasien Baru"
        data={{}}
        fields={patientFields}
        isOpen={isAddModalOpen}
        onClose={handleCloseAddModal}
        onSave={async data => {
          await handleModalSubmit({
            data: toPatientPayload(data),
            id: undefined,
          });
        }}
        mode="add"
        initialNameFromSearch={debouncedSearch}
        useInlineFieldActions={false}
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
            data: toPatientPayload(data),
            id: editingItem?.id,
          });
        }}
        onFieldSave={async (key, value) => {
          await handleFieldAutosave(editingItem?.id, key, value);
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
                    await handleDelete(editingItem.id);
                  },
                });
              }
            : undefined
        }
        mode="edit"
        imageUrl={(editingItem as PatientType)?.image_url || undefined}
        useInlineFieldActions={false}
      />
    </MasterDataListPage>
  );
};

export default PatientListNew;
