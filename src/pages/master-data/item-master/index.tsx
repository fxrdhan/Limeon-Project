import Button from "@/components/button";
import Pagination from "@/components/pagination";
import SearchBar from "@/components/search-bar";
import PageTitle from "@/components/page-title";
import AddEditModal from "@/components/add-edit/v1";

import { FaPlus } from "react-icons/fa";
import { Card } from "@/components/card";
import { DataGrid, DataGridRef, createTextColumn } from "@/components/ag-grid";
import {
  ColDef,
  RowClickedEvent,
} from "ag-grid-community";
import { useMasterDataManagement } from "@/handlers/masterData";
import { useRef, useState } from "react";
import { useAgGridSearch } from "@/hooks/useAgGridSearch";
import { useLocation } from "react-router-dom";
import { getSearchState } from "@/utils/search";
import { motion, LayoutGroup } from "framer-motion";
import { classNames } from "@/lib/classNames";

type MasterDataType = "item_categories" | "item_types" | "item_units";

interface TabConfig {
  key: MasterDataType;
  label: string;
  entityName: string;
  tableName: string;
  addButtonText: string;
  searchPlaceholder: string;
  nameColumnHeader: string;
  noDataMessage: string;
  searchNoDataMessage: string;
}

const tabConfigs: Record<MasterDataType, TabConfig> = {
  item_categories: {
    key: "item_categories",
    label: "Kategori",
    entityName: "Kategori",
    tableName: "item_categories",
    addButtonText: "Tambah Kategori Baru",
    searchPlaceholder: "Cari nama atau deskripsi kategori item...",
    nameColumnHeader: "Nama Kategori",
    noDataMessage: "Tidak ada data kategori yang ditemukan",
    searchNoDataMessage: "Tidak ada kategori dengan kata kunci",
  },
  item_types: {
    key: "item_types",
    label: "Jenis",
    entityName: "Jenis Item",
    tableName: "item_types",
    addButtonText: "Tambah Jenis Item Baru",
    searchPlaceholder: "Cari nama atau deskripsi jenis item...",
    nameColumnHeader: "Nama Jenis",
    noDataMessage: "Tidak ada data jenis item yang ditemukan",
    searchNoDataMessage: "Tidak ada jenis item dengan kata kunci",
  },
  item_units: {
    key: "item_units",
    label: "Satuan",
    entityName: "Satuan",
    tableName: "item_units",
    addButtonText: "Tambah Satuan Baru",
    searchPlaceholder: "Cari nama atau deskripsi satuan...",
    nameColumnHeader: "Nama Satuan",
    noDataMessage: "Tidak ada data satuan yang ditemukan",
    searchNoDataMessage: "Tidak ada satuan dengan kata kunci",
  },
};

const ItemMaster = () => {
  const [activeTab, setActiveTab] = useState<MasterDataType>("item_categories");
  const searchInputRef = useRef<HTMLInputElement>(
    null,
  ) as React.RefObject<HTMLInputElement>;
  const location = useLocation();
  const headerRef = useRef<HTMLDivElement>(null);
  const searchBarRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<DataGridRef>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const currentConfig = tabConfigs[activeTab];

  const {
    isAddModalOpen,
    setIsAddModalOpen,
    isEditModalOpen,
    setIsEditModalOpen,
    editingItem,
    data,
    setDebouncedSearch,
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
  } = useMasterDataManagement(activeTab, currentConfig.entityName, {
    realtime: true,
    searchInputRef,
    locationKey: location.key,
  });

  const { search, handleSearchChange, onGridReady, clearSearch, isExternalFilterPresent, doesExternalFilterPass } = useAgGridSearch({
    enableDebouncedSearch: true,
    onDebouncedSearchChange: setDebouncedSearch,
  });

  const handleFirstDataRendered = () => {
    setIsInitialLoad(false);
  };


  const columnDefs: ColDef[] = [
    createTextColumn({
      field: "name",
      headerName: currentConfig.nameColumnHeader,
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

  const handleTabChange = (newTab: MasterDataType) => {
    if (newTab !== activeTab) {
      setActiveTab(newTab);
      setIsInitialLoad(true);
      clearSearch();
      if (searchInputRef.current) {
        searchInputRef.current.value = "";
      }
    }
  };

  return (
    <>
      <Card
        className={
          isFetching ? "opacity-75 transition-opacity duration-300" : ""
        }
      >
        <div ref={headerRef} className="mb-6">
          <PageTitle title="Item Master" />
        </div>

        <div className="mb-6">
          <div className="flex justify-center">
            <LayoutGroup id="item-master-tabs">
              <div className="flex items-center rounded-full bg-zinc-100 p-1 shadow-md text-gray-700 overflow-hidden select-none relative">
                {Object.values(tabConfigs).map((config) => (
                  <button
                    key={config.key}
                    className={classNames(
                      "group px-4 py-2 rounded-full focus:outline-hidden select-none relative cursor-pointer z-10 transition-colors duration-150",
                      activeTab !== config.key ? "hover:bg-emerald-100 hover:text-emerald-700" : "",
                    )}
                    onClick={() => handleTabChange(config.key)}
                  >
                    {activeTab === config.key && (
                      <motion.div
                        layoutId="tab-selector-bg"
                        className="absolute inset-0 bg-primary rounded-full shadow-xs"
                        style={{ borderRadius: "9999px" }}
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 30,
                          duration: 0.3,
                        }}
                      />
                    )}
                    <span
                      className={classNames(
                        "relative z-10 select-none font-medium",
                        activeTab === config.key
                          ? "text-white"
                          : "text-gray-700 group-hover:text-emerald-700",
                      )}
                    >
                      {config.label}
                    </span>
                  </button>
                ))}
              </div>
            </LayoutGroup>
          </div>
        </div>

        <div ref={searchBarRef} className="flex items-center">
          <SearchBar
            inputRef={searchInputRef}
            value={search}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            placeholder={currentConfig.searchPlaceholder}
            className="grow"
            searchState={getSearchState(search, search, data)}
          />
          <Button
            variant="primary"
            className="flex items-center ml-4 mb-4"
            onClick={() => setIsAddModalOpen(true)}
            withGlow
          >
            <FaPlus className="mr-2" />
            {currentConfig.addButtonText}
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
              rowData={data || []}
              columnDefs={columnDefs}
              onRowClicked={onRowClicked}
              onGridReady={onGridReady}
              loading={isLoading}
              overlayNoRowsTemplate={
                search
                  ? `<span style="padding: 10px; color: #888;">${currentConfig.searchNoDataMessage} "${search}"</span>`
                  : `<span style="padding: 10px; color: #888;">${currentConfig.noDataMessage}</span>`
              }
              sizeColumnsToFit={true}
              onFirstDataRendered={handleFirstDataRendered}
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
              itemsCount={data?.length || 0}
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
        entityName={currentConfig.entityName}
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
                  message: `Apakah Anda yakin ingin menghapus ${currentConfig.entityName.toLowerCase()} "${editingItem.name}"?`,
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
        entityName={currentConfig.entityName}
      />
    </>
  );
};

export default ItemMaster;
