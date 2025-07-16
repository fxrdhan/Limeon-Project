import Button from "@/components/button";
import Pagination from "@/components/pagination";
import SearchBar from "@/components/search-bar";
import PageTitle from "@/components/page-title";
import AddEditModal from "@/components/add-edit/v1";

import { Card } from "@/components/card";
import { DataGrid, DataGridRef, createTextColumn } from "@/components/ag-grid";
import { ColDef, RowClickedEvent } from "ag-grid-community";
import { FaPlus } from "react-icons/fa";
import { useMasterDataManagement } from "@/handlers/masterData";
import { useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { getSearchState } from "@/utils/search";

const TypeList = () => {
  const location = useLocation();
  const searchInputRef = useRef<HTMLInputElement>(
    null,
  ) as React.RefObject<HTMLInputElement>;
  const headerRef = useRef<HTMLDivElement>(null);
  const searchBarRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<DataGridRef>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const {
    isAddModalOpen,
    setIsAddModalOpen,
    isEditModalOpen,
    setIsEditModalOpen,
    editingItem: editingType,
    search,
    setSearch,
    data: types,
    totalItems: totalTypes,
    totalPages,
    currentPage,
    itemsPerPage,
    isLoading,
    isError,
    queryError,
    isFetching,
    deleteMutation: deleteTypeMutation,
    openConfirmDialog,
    handleEdit,
    handleModalSubmit,
    handlePageChange,
    handleItemsPerPageChange,
    addMutation: addTypeMutation,
    updateMutation: updateTypeMutation,
    debouncedSearch,
    handleKeyDown,
  } = useMasterDataManagement("item_types", "Jenis Item", {
    realtime: true,
    searchInputRef,
    locationKey: location.key,
  });

  const handleFirstDataRendered = () => {
    setIsInitialLoad(false);
  };

  const columnDefs: ColDef[] = [
    createTextColumn({
      field: "name",
      headerName: "Nama Jenis",
      minWidth: 120,
      flex: 1,
    }),
    createTextColumn({
      field: "description",
      headerName: "Deskripsi",
      minWidth: 200,
      flex: 2,
      valueGetter: (params) => {
        return "description" in params.data && params.data.description
          ? params.data.description
          : "-";
      },
    }),
  ];

  const onRowClicked = (event: RowClickedEvent) => {
    handleEdit(event.data);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
  };

  return (
    <>
      <Card
        className={
          isFetching ? "opacity-75 transition-opacity duration-300" : ""
        }
      >
        <div ref={headerRef} className="mb-6">
          <PageTitle title="Daftar Jenis Item" />
        </div>

        <div ref={searchBarRef} className="flex items-center">
          <SearchBar
            inputRef={searchInputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Cari nama atau deskripsi jenis item..."
            className="grow"
            searchState={getSearchState(search, debouncedSearch, types)}
          />
          <Button
            variant="primary"
            className="flex items-center ml-4 mb-4"
            onClick={() => setIsAddModalOpen(true)}
            withGlow
          >
            <FaPlus className="mr-2" />
            Tambah Jenis Item Baru
          </Button>
        </div>

        {isError ? (
          <div className="text-center p-6 text-red-500">
            Error: {queryError?.message || "Gagal memuat data"}
          </div>
        ) : (
          <>
            <DataGrid
              ref={gridRef}
              rowData={types || []}
              columnDefs={columnDefs}
              autoHeightForSmallTables={true}
              onRowClicked={onRowClicked}
              loading={isLoading}
              overlayNoRowsTemplate={
                debouncedSearch
                  ? `<span style="padding: 10px; color: #888;">Tidak ada jenis item dengan kata kunci "${debouncedSearch}"</span>`
                  : '<span style="padding: 10px; color: #888;">Tidak ada data jenis item yang ditemukan</span>'
              }
              sizeColumnsToFit={true}
              onFirstDataRendered={handleFirstDataRendered}
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
              totalItems={totalTypes || 0}
              itemsPerPage={itemsPerPage || 10}
              itemsCount={types?.length || 0}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
              hideFloatingWhenModalOpen={isAddModalOpen || isEditModalOpen}
            />
          </>
        )}
      </Card>

      <AddEditModal
        isOpen={isAddModalOpen}
        onClose={handleCloseAddModal}
        onSubmit={handleModalSubmit}
        isLoading={addTypeMutation.isPending}
        entityName="Jenis Item"
        initialNameFromSearch={debouncedSearch}
      />

      <AddEditModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        onSubmit={handleModalSubmit}
        initialData={editingType || undefined}
        onDelete={
          editingType
            ? (typeId) => {
                openConfirmDialog({
                  title: "Konfirmasi Hapus",
                  message: `Apakah Anda yakin ingin menghapus jenis item "${editingType.name}"?`,
                  variant: "danger",
                  confirmText: "Ya, Hapus",
                  onConfirm: async () => {
                    await deleteTypeMutation.mutateAsync(typeId);
                  },
                });
              }
            : undefined
        }
        isLoading={updateTypeMutation.isPending}
        isDeleting={deleteTypeMutation.isPending}
        entityName="Jenis Item"
      />
    </>
  );
};

export default TypeList;
