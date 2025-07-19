import AddEditModal from "@/components/add-edit/v3";
import EnhancedSearchBar from "@/components/search-bar/EnhancedSearchBar";
import Button from "@/components/button";
import Pagination from "@/components/pagination";
import PageTitle from "@/components/page-title";

import { FaPlus } from "react-icons/fa";
import { Card } from "@/components/card";
import { DataGrid, createTextColumn } from "@/components/ag-grid";
import { ColDef, RowClickedEvent } from "ag-grid-community";
import { useState, useRef, useMemo } from "react";
import { useLocation } from "react-router-dom";
import type { Doctor as DoctorType, FieldConfig } from "@/types";
import { useMasterDataManagement } from "@/handlers/masterData";
import { getSearchState } from "@/utils/search";
import { useEnhancedAgGridSearch } from "@/hooks/useEnhancedAgGridSearch";
import { doctorSearchColumns } from "@/utils/searchColumns";

const DoctorList = () => {
  const searchInputRef = useRef<HTMLInputElement>(
    null,
  ) as React.RefObject<HTMLInputElement>;
  const location = useLocation();
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const {
    search,
    handleSearchChange,
    onGridReady,
    isExternalFilterPresent,
    doesExternalFilterPass,
    handleTargetedSearch,
    handleGlobalSearch,
  } = useEnhancedAgGridSearch({
    columns: doctorSearchColumns,
    useFuzzySearch: true,
  });

  const {
    isAddModalOpen,
    setIsAddModalOpen,
    isEditModalOpen,
    setIsEditModalOpen,
    editingItem,
    data: doctorsData,
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
    // addMutation,
    // updateMutation,
    deleteMutation,
    openConfirmDialog,
    debouncedSearch,
    handleKeyDown,
  } = useMasterDataManagement("doctors", "Dokter", {
    realtime: true,
    searchInputRef,
    locationKey: location.key,
    handleSearchChange,
  });

  const doctors = doctorsData || [];


  const doctorFields: FieldConfig[] = [
    {
      key: "name",
      label: "Nama Dokter",
      type: "text",
    },
    {
      key: "gender",
      label: "Jenis Kelamin",
      type: "text",
      options: [
        { id: "L", name: "Laki-laki" },
        { id: "P", name: "Perempuan" },
      ],
      isRadioDropdown: true,
    },
    {
      key: "specialization",
      label: "Spesialisasi",
      type: "text",
    },
    {
      key: "license_number",
      label: "Nomor Lisensi",
      type: "text",
    },
    {
      key: "experience_years",
      label: "Pengalaman (tahun)",
      type: "text",
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
      key: "address",
      label: "Alamat",
      type: "textarea",
    },
    {
      key: "birth_date",
      label: "Tanggal Lahir",
      type: "date",
    },
    {
      key: "qualification",
      label: "Kualifikasi",
      type: "textarea",
    },
  ];

  const handleFirstDataRendered = () => {
    setIsInitialLoad(false);
  };

  const columnDefs: ColDef[] = useMemo(() => {
    const columns: ColDef[] = [
      createTextColumn({
        field: "name",
        headerName: "Nama Dokter",
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
        field: "specialization",
        headerName: "Spesialisasi",
        minWidth: 150,
        flex: 1,
        valueGetter: (params) => params.data.specialization || "-",
      }),
      createTextColumn({
        field: "license_number",
        headerName: "Nomor Lisensi",
        minWidth: 140,
        valueGetter: (params) => params.data.license_number || "-",
      }),
      createTextColumn({
        field: "experience_years",
        headerName: "Pengalaman",
        minWidth: 100,
        valueGetter: (params) => {
          const years = params.data.experience_years;
          return years ? `${years} tahun` : "-";
        },
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
          <PageTitle title="Daftar Dokter" />
        </div>
        <div className="flex items-center">
          <EnhancedSearchBar
            inputRef={searchInputRef}
            value={search}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            placeholder="Cari di semua kolom atau ketik # untuk pencarian kolom spesifik..."
            className="grow"
            searchState={getSearchState(search, search, doctors)}
            columns={doctorSearchColumns}
            onTargetedSearch={handleTargetedSearch}
            onGlobalSearch={handleGlobalSearch}
          />
          <Button
            variant="primary"
            withGlow
            className="flex items-center ml-4 mb-4"
            onClick={() => setIsAddModalOpen(true)}
          >
            <FaPlus className="mr-2" />
            Tambah Dokter Baru
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
              rowData={doctors as DoctorType[]}
              columnDefs={columnDefs}
              onRowClicked={onRowClicked}
              onGridReady={onGridReady}
              loading={isLoading}
              overlayNoRowsTemplate={
                search
                  ? `<span style="padding: 10px; color: #888;">Tidak ada dokter dengan nama "${search}"</span>`
                  : '<span style="padding: 10px; color: #888;">Tidak ada data dokter yang ditemukan</span>'
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
              itemsCount={doctors?.length || 0}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
              hideFloatingWhenModalOpen={isAddModalOpen || isEditModalOpen}
            />
          </>
        )}
      </Card>

      <AddEditModal
        title="Tambah Dokter Baru"
        data={{}}
        fields={doctorFields}
        isOpen={isAddModalOpen}
        onClose={handleCloseAddModal}
        onSave={async (data) => {
          await handleModalSubmit({
            name: String(data.name || ""),
            description: String(data.specialization || ""),
            id: undefined,
          });
        }}
        mode="add"
        initialNameFromSearch={debouncedSearch}
      />

      <AddEditModal
        title="Edit Dokter"
        data={editingItem as unknown as Record<string, string | number | boolean | null> || {}}
        fields={doctorFields}
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        onSave={async (data) => {
          await handleModalSubmit({
            name: String(data.name || ""),
            description: String(data.specialization || ""),
            id: editingItem?.id,
          });
        }}
        onDeleteRequest={
          editingItem
            ? () => {
                openConfirmDialog({
                  title: "Konfirmasi Hapus",
                  message: `Apakah Anda yakin ingin menghapus dokter "${editingItem.name}"?`,
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
        imageUrl={(editingItem as DoctorType)?.image_url || undefined}
      />
    </>
  );
};
export default DoctorList;
