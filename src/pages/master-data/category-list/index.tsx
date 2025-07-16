import Button from "@/components/button";
import Pagination from "@/components/pagination";
import SearchBar from "@/components/search-bar";
import PageTitle from "@/components/page-title";
import AddEditModal from "@/components/add-edit/v1";

import { FaPlus } from "react-icons/fa";
import { Card } from "@/components/card";
import { DataGrid, DataGridRef, createTextColumn } from "@/components/ag-grid";
import { ColDef, RowClickedEvent } from "ag-grid-community";
import { useMasterDataManagement } from "@/handlers/masterData";
import { useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { getSearchState } from "@/utils/search";

const CategoryList = () => {
  const searchInputRef = useRef<HTMLInputElement>(
    null,
  ) as React.RefObject<HTMLInputElement>;
  const location = useLocation();
  const headerRef = useRef<HTMLDivElement>(null);
  const searchBarRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<DataGridRef>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const {
    isAddModalOpen,
    setIsAddModalOpen,
    isEditModalOpen,
    setIsEditModalOpen,
    editingItem: editingCategory,
    search,
    setSearch,
    data: categories,
    totalItems: totalCategories,
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
    addMutation,
    updateMutation,
    deleteMutation,
    openConfirmDialog,
    debouncedSearch,
    handleKeyDown,
  } = useMasterDataManagement("item_categories", "Kategori Item", {
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
      headerName: "Nama Kategori",
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
          <PageTitle title="Daftar Kategori Item" />
        </div>

        <div ref={searchBarRef} className="flex items-center">
          <SearchBar
            inputRef={searchInputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Cari nama atau deskripsi kategori item..."
            className="grow"
            searchState={getSearchState(search, debouncedSearch, categories)}
          />
          <Button
            variant="primary"
            className="flex items-center ml-4 mb-4"
            onClick={() => setIsAddModalOpen(true)}
            withGlow
          >
            <FaPlus className="mr-2" />
            Tambah Kategori Baru
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
              rowData={categories || []}
              columnDefs={columnDefs}
              autoHeightForSmallTables={true}
              onRowClicked={onRowClicked}
              loading={isLoading}
              overlayNoRowsTemplate={
                debouncedSearch
                  ? `<span style="padding: 10px; color: #888;">Tidak ada kategori dengan kata kunci "${debouncedSearch}"</span>`
                  : '<span style="padding: 10px; color: #888;">Tidak ada data kategori yang ditemukan</span>'
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
              totalItems={totalCategories || 0}
              itemsPerPage={itemsPerPage || 10}
              itemsCount={categories?.length || 0}
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
        isLoading={addMutation.isPending}
        entityName="Kategori"
        initialNameFromSearch={debouncedSearch}
      />

      <AddEditModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        onSubmit={handleModalSubmit}
        initialData={editingCategory || undefined}
        onDelete={
          editingCategory
            ? (categoryId) => {
                openConfirmDialog({
                  title: "Konfirmasi Hapus",
                  message: `Apakah Anda yakin ingin menghapus kategori item "${editingCategory.name}"?`,
                  variant: "danger",
                  confirmText: "Ya, Hapus",
                  onConfirm: async () => {
                    await deleteMutation.mutateAsync(categoryId);
                  },
                });
              }
            : undefined
        }
        isLoading={updateMutation.isPending}
        isDeleting={deleteMutation.isPending}
        entityName="Kategori"
      />
    </>
  );
};

export default CategoryList;
