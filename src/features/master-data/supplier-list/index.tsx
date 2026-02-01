import IdentityDataModal from '@/components/IdentityDataModal';

import { createTextColumn } from '@/components/ag-grid';
import { ColDef, RowClickedEvent } from 'ag-grid-community';
import { useMemo, useRef } from 'react';
// import { useLocation } from "react-router-dom";
import type { FieldConfig, Supplier as SupplierType } from '@/types';

// Use the new modular architecture
import { useMasterDataManagement } from '@/hooks/data/useMasterDataManagement';

import { useMasterDataList } from '@/features/master-data/hooks/useMasterDataList';
import MasterDataListPage from '@/features/master-data/components/MasterDataListPage';
import { supplierSearchColumns } from '@/utils/searchColumns';

const SupplierListNew = () => {
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
    handleDelete,
    openConfirmDialog,
    debouncedSearch,
    handleKeyDown,
    setSearch: setDataSearch,
  } = useMasterDataManagement('suppliers', 'Supplier', {
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
    data: suppliersData,
    searchColumns: supplierSearchColumns,
    setSearch: setDataSearch,
  });

  const suppliers = suppliersData || [];

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
    <MasterDataListPage
      title="Daftar Supplier"
      entityName="Supplier"
      exportFilename="daftar-supplier"
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
        rowData: suppliers as SupplierType[],
        columnDefs,
        onRowClicked,
        onGridReady: handleGridReady,
        loading: isLoading,
        autoSizeColumns: ['name', 'phone', 'email', 'contact_person'],
        onFirstDataRendered: () => {},
        isExternalFilterPresent,
        doesExternalFilterPass,
        pagination: true,
        paginationPageSize: itemsPerPage || 10,
        suppressPaginationPanel: true,
      }}
      pagination={{
        gridApi,
        pageSizeOptions: [10, 20, 50, 100],
        enableFloating: true,
        hideFloatingWhenModalOpen: isAddModalOpen || isEditModalOpen,
        onPageSizeChange: setCurrentPageSize,
      }}
    >
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
                    await handleDelete(editingItem.id);
                  },
                });
              }
            : undefined
        }
        mode="edit"
        imageUrl={(editingItem as SupplierType)?.image_url || undefined}
      />
    </MasterDataListPage>
  );
};

export default SupplierListNew;
