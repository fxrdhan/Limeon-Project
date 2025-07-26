import IdentityDataModal from "@/features/identity/IdentityDataModal";
import EnhancedSearchBar from "@/components/search-bar/EnhancedSearchBar";
import Button from "@/components/button";
import Pagination from "@/components/pagination";
import PageTitle from "@/components/page-title";

import { FaPlus } from "react-icons/fa";
import { Card } from "@/components/card";
import { DataGrid, createTextColumn } from "@/components/ag-grid";
import { ColDef, RowClickedEvent } from "ag-grid-community";
import { useState, useRef, useMemo, useCallback } from "react";
// import { useLocation } from "react-router-dom";
import type { Supplier as SupplierType, FieldConfig } from "@/types";

// Use the new modular architecture
import { useMasterDataManagement } from "@/features/master-data/hooks/useMasterDataManagement";

import { useUnifiedSearch } from "@/hooks/useUnifiedSearch";
import { supplierSearchColumns } from "@/utils/searchColumns";

const SupplierListNew = () => {
  const searchInputRef = useRef<HTMLInputElement>(
    null,
  ) as React.RefObject<HTMLInputElement>;
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Data management hook for server-side operations
  const {
    isAddModalOpen,
    setIsAddModalOpen,
    isEditModalOpen,
    setIsEditModalOpen,
    editingItem,
    data: suppliersData,
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
  } = useMasterDataManagement("suppliers", "Supplier", {
    searchInputRef,
  });

  // Stable callback functions to prevent infinite re-renders
  const handleSearch = useCallback(
    (searchValue: string) => {
      setDataSearch(searchValue);
    },
    [setDataSearch],
  );

  const handleClear = useCallback(() => {
    setDataSearch("");
  }, [setDataSearch]);

  // Unified search functionality with hybrid mode
  const {
    search,
    onGridReady,
    isExternalFilterPresent,
    doesExternalFilterPass,
    searchBarProps,
  } = useUnifiedSearch({
    columns: supplierSearchColumns,
    searchMode: "hybrid",
    useFuzzySearch: true,
    data: suppliersData,
    onSearch: handleSearch,
    onClear: handleClear,
  });

  const suppliers = suppliersData || [];

  const supplierFields: FieldConfig[] = [
    {
      key: "name",
      label: "Nama Supplier",
      type: "text",
    },
    {
      key: "address",
      label: "Alamat",
      type: "textarea",
    },
    {
      key: "phone",
      label: "Telepon",
      type: "tel",
    },
    {
      key: "email",
      label: "Email",
      type: "email",
    },
    {
      key: "contact_person",
      label: "Kontak Person",
      type: "text",
    },
  ];

  const handleFirstDataRendered = () => {
    setIsInitialLoad(false);
  };

  const columnDefs: ColDef[] = useMemo(() => {
    const columns: ColDef[] = [
      createTextColumn({
        field: "name",
        headerName: "Nama Supplier",
        minWidth: 200,
      }),
      createTextColumn({
        field: "address",
        headerName: "Alamat",
        minWidth: 150,
        flex: 1,
        valueGetter: (params) => params.data.address || "-",
      }),
      createTextColumn({
        field: "phone",
        headerName: "Telepon",
        minWidth: 120,
        valueGetter: (params) => params.data.phone || "-",
      }),
      createTextColumn({
        field: "email",
        headerName: "Email",
        minWidth: 150,
        valueGetter: (params) => params.data.email || "-",
      }),
      createTextColumn({
        field: "contact_person",
        headerName: "Kontak Person",
        minWidth: 150,
        valueGetter: (params) => params.data.contact_person || "-",
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
            ? "opacity-75 transition-opacity duration-300 flex-1 flex flex-col"
            : "flex-1 flex flex-col"
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
          <Button
            variant="primary"
            withGlow
            className="flex items-center ml-4 mb-2"
            onClick={() => setIsAddModalOpen(true)}
          >
            <FaPlus className="mr-2" />
            Tambah Supplier Baru
          </Button>
        </div>
        {isError && (
          <div className="text-center p-6 text-red-500">
            Error:{" "}
            {queryError instanceof Error
              ? queryError.message
              : "Gagal memuat data"}
          </div>
        )}
        {!isError && (
          <>
            <DataGrid
              rowData={suppliers as SupplierType[]}
              columnDefs={columnDefs}
              onRowClicked={onRowClicked}
              onGridReady={onGridReady}
              loading={isLoading}
              overlayNoRowsTemplate={
                search
                  ? `<span style="padding: 10px; color: #888;">Tidak ada supplier dengan nama "${search}"</span>`
                  : '<span style="padding: 10px; color: #888;">Tidak ada data supplier yang ditemukan</span>'
              }
              autoSizeColumns={["name", "phone", "email", "contact_person"]}
              onFirstDataRendered={handleFirstDataRendered}
              animateRows={true}
              isExternalFilterPresent={isExternalFilterPresent}
              doesExternalFilterPass={doesExternalFilterPass}
              style={{
                width: "100%",
                marginTop: "1rem",
                marginBottom: "1rem",
                filter: isInitialLoad ? "blur(8px)" : "none",
                transition: "filter 0.3s ease-out",
              }}
            />
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems || 0}
              itemsPerPage={itemsPerPage || 10}
              itemsCount={suppliers?.length || 0}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
              hideFloatingWhenModalOpen={isAddModalOpen || isEditModalOpen}
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
        onSave={async (data) => {
          await handleModalSubmit({
            name: String(data.name || ""),
            description: String(data.address || ""),
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
        onSave={async (data) => {
          await handleModalSubmit({
            name: String(data.name || ""),
            description: String(data.address || ""),
            id: editingItem?.id,
          });
        }}
        onDeleteRequest={
          editingItem
            ? () => {
                openConfirmDialog({
                  title: "Konfirmasi Hapus",
                  message: `Apakah Anda yakin ingin menghapus supplier "${editingItem.name}"?`,
                  variant: "danger",
                  confirmText: "Ya, Hapus",
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
