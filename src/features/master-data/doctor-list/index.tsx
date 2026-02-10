import IdentityDataModal from '@/components/IdentityDataModal';

import { createTextColumn } from '@/components/ag-grid';
import type { Doctor as DoctorType, FieldConfig } from '@/types';
import { ColDef, RowClickedEvent } from 'ag-grid-community';
import { useMemo, useRef } from 'react';

// Use the new modular architecture
import { useMasterDataManagement } from '@/hooks/data/useMasterDataManagement';

import { useMasterDataList } from '@/features/master-data/hooks/useMasterDataList';
import MasterDataListPage from '@/features/master-data/components/MasterDataListPage';
import { doctorSearchColumns } from '@/utils/searchColumns';

const DoctorListNew = () => {
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
    handleFieldAutosave,
    handleImageSave,
    handleImageDelete,
    openConfirmDialog,
    debouncedSearch,
    handleKeyDown,
    setSearch: setDataSearch,
  } = useMasterDataManagement('doctors', 'Dokter', {
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
    data: doctorsData,
    searchColumns: doctorSearchColumns,
    setSearch: setDataSearch,
  });

  const doctors = doctorsData || [];

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

  const toDoctorPayload = (
    data: Record<string, string | number | boolean | null>
  ) => {
    const rawExperienceYears = data.experience_years;
    const hasExperienceYears =
      rawExperienceYears !== null &&
      rawExperienceYears !== undefined &&
      String(rawExperienceYears).trim() !== '';
    const parsedExperienceYears = hasExperienceYears
      ? Number(rawExperienceYears)
      : null;

    return {
      name: String(data.name || ''),
      gender: data.gender ? String(data.gender) : null,
      specialization: data.specialization ? String(data.specialization) : null,
      license_number: data.license_number ? String(data.license_number) : null,
      experience_years:
        parsedExperienceYears !== null && Number.isFinite(parsedExperienceYears)
          ? parsedExperienceYears
          : null,
      qualification: data.education ? String(data.education) : null,
      phone: data.phone ? String(data.phone) : null,
      email: data.email ? String(data.email) : null,
      image_url: data.image_url ? String(data.image_url) : null,
    };
  };

  return (
    <MasterDataListPage
      title="Daftar Dokter"
      entityName="Dokter"
      exportFilename="daftar-dokter"
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
        rowData: doctors as DoctorType[],
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
        title="Tambah Dokter Baru"
        data={{}}
        fields={doctorFields}
        isOpen={isAddModalOpen}
        onClose={handleCloseAddModal}
        onSave={async data => {
          await handleModalSubmit({
            data: toDoctorPayload(data),
            id: undefined,
          });
        }}
        mode="add"
        initialNameFromSearch={debouncedSearch}
        useInlineFieldActions={false}
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
            data: toDoctorPayload(data),
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
        onImageSave={handleImageSave}
        onImageDelete={handleImageDelete}
        useInlineFieldActions={false}
      />
    </MasterDataListPage>
  );
};

export default DoctorListNew;
