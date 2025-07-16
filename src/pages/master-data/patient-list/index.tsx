import AddEditModal from "@/components/add-edit/v1";
import SearchBar from "@/components/search-bar";
import Button from "@/components/button";
import Pagination from "@/components/pagination";
import PageTitle from "@/components/page-title";

import { FaPlus } from "react-icons/fa";
import { Card } from "@/components/card";
import { DataGrid, createTextColumn } from "@/components/ag-grid";
import { ColDef, RowClickedEvent } from "ag-grid-community";
import { useState, useRef, useMemo } from "react";
import { useLocation } from "react-router-dom";
import type { Patient as PatientType } from "@/types";
import { useMasterDataManagement } from "@/handlers/masterData";
import { getSearchState } from "@/utils/search";
import { useAgGridSearch } from "@/hooks/useAgGridSearch";

const PatientList = () => {
  const searchInputRef = useRef<HTMLInputElement>(
    null,
  ) as React.RefObject<HTMLInputElement>;
  const location = useLocation();
  const [isInitialLoad, setIsInitialLoad] = useState(true);

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
    addMutation,
    updateMutation,
    deleteMutation,
    openConfirmDialog,
    debouncedSearch,
    handleKeyDown,
  } = useMasterDataManagement("patients", "Pasien", {
    realtime: true,
    searchInputRef,
    locationKey: location.key,
  });

  const {
    search,
    handleSearchChange,
    onGridReady,
    isExternalFilterPresent,
    doesExternalFilterPass,
  } = useAgGridSearch();

  const patients = patientsData || [];

  const handleFirstDataRendered = () => {
    setIsInitialLoad(false);
  };

  const columnDefs: ColDef[] = useMemo(() => {
    const columns: ColDef[] = [
      createTextColumn({
        field: "name",
        headerName: "Nama Pasien",
        minWidth: 200,
        flex: 1,
      }),
      createTextColumn({
        field: "gender",
        headerName: "Jenis Kelamin",
        minWidth: 120,
        valueGetter: (params) => params.data.gender || "-",
      }),
      createTextColumn({
        field: "birth_date",
        headerName: "Tanggal Lahir",
        minWidth: 120,
        valueGetter: (params) => {
          const value = params.data.birth_date;
          return value && typeof value === "string"
            ? new Date(value).toLocaleDateString("id-ID")
            : "-";
        },
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
          <PageTitle title="Daftar Pasien" />
        </div>
        <div className="flex items-center">
          <SearchBar
            inputRef={searchInputRef}
            value={search}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            placeholder="Cari di semua kolom (nama, jenis kelamin, alamat, dll)..."
            className="grow"
            searchState={getSearchState(search, search, patients)}
          />
          <Button
            variant="primary"
            withGlow
            className="flex items-center ml-4 mb-4"
            onClick={() => setIsAddModalOpen(true)}
          >
            <FaPlus className="mr-2" />
            Tambah Pasien Baru
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
              itemsCount={patients?.length || 0}
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
        entityName="Pasien"
        initialNameFromSearch={debouncedSearch}
      />

      <AddEditModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        onSubmit={handleModalSubmit}
        initialData={editingItem || undefined}
        onDelete={
          editingItem
            ? (itemId) => {
                openConfirmDialog({
                  title: "Konfirmasi Hapus",
                  message: `Apakah Anda yakin ingin menghapus pasien "${editingItem.name}"?`,
                  variant: "danger",
                  confirmText: "Ya, Hapus",
                  onConfirm: async () => {
                    await deleteMutation.mutateAsync(itemId);
                  },
                });
              }
            : undefined
        }
        isLoading={updateMutation.isPending}
        isDeleting={deleteMutation.isPending}
        entityName="Pasien"
      />
    </>
  );
};
export default PatientList;
