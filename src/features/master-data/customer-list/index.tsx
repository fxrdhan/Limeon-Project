import IdentityDataModal from '@/components/IdentityDataModal';

import { createTextColumn } from '@/components/ag-grid';
import type { Customer as CustomerType, FieldConfig } from '@/types';
import { ColDef, RowClickedEvent } from 'ag-grid-community';
import { useMemo, useRef } from 'react';

import { useMasterDataManagement } from '@/hooks/data/useMasterDataManagement';
import { useMasterDataList } from '@/features/master-data/hooks/useMasterDataList';
import MasterDataListPage from '@/features/master-data/components/MasterDataListPage';
import { customerSearchColumns } from '@/utils/searchColumns';
import { useCustomerLevels } from '@/features/item-management/application/hooks/data/useCustomerLevels';

const CustomerList = () => {
  const searchInputRef = useRef<HTMLInputElement>(
    null
  ) as React.RefObject<HTMLInputElement>;

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
    handleDelete,
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
    data: customersData,
    searchColumns: customerSearchColumns,
    setSearch: setDataSearch,
  });

  const customers = customersData || [];

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
    <MasterDataListPage
      title="Daftar Pelanggan"
      entityName="Pelanggan"
      exportFilename="daftar-pelanggan"
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
        rowData: customers as CustomerType[],
        columnDefs,
        onRowClicked,
        onGridReady: handleGridReady,
        loading: isLoading,
        sizeColumnsToFit: true,
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
                    await handleDelete(editingItem.id);
                  },
                });
              }
            : undefined
        }
        mode="edit"
        showImageUploader={false}
      />
    </MasterDataListPage>
  );
};

export default CustomerList;
