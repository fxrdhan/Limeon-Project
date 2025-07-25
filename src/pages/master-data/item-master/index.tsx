import { useState, useRef, useCallback } from "react";
import Button from "@/components/button";
import Pagination from "@/components/pagination";
import EnhancedSearchBar from "@/components/search-bar/EnhancedSearchBar";
import PageTitle from "@/components/page-title";
import { EntityManagementModal } from "@/features/item-management";
import { Card } from "@/components/card";
import { DataGrid, DataGridRef, createTextColumn } from "@/components/ag-grid";
import { ColDef, RowClickedEvent } from "ag-grid-community";
import { FaPlus } from "react-icons/fa";
import { motion, LayoutGroup } from "framer-motion";
import classNames from "classnames";

// Use the new modular architecture
import { useMasterDataManagement } from "@/handlers/masterData";

import type { Category, MedicineType, Unit } from "@/types/database";
import { useUnifiedSearch } from "@/hooks/useUnifiedSearch";
import { itemMasterSearchColumns } from "@/utils/searchColumns";

type MasterDataType = "categories" | "types" | "units";
type MasterDataEntity = Category | MedicineType | Unit;

interface TabConfig {
  key: MasterDataType;
  label: string;
  entityName: string;
  addButtonText: string;
  searchPlaceholder: string;
  nameColumnHeader: string;
  noDataMessage: string;
  searchNoDataMessage: string;
}

const tabConfigs: Record<MasterDataType, TabConfig> = {
  categories: {
    key: "categories",
    label: "Kategori",
    entityName: "Kategori",
    addButtonText: "Tambah Kategori Baru",
    searchPlaceholder: "Cari nama atau deskripsi kategori item",
    nameColumnHeader: "Nama Kategori",
    noDataMessage: "Tidak ada data kategori yang ditemukan",
    searchNoDataMessage: "Tidak ada kategori dengan kata kunci",
  },
  types: {
    key: "types",
    label: "Jenis",
    entityName: "Jenis Item",
    addButtonText: "Tambah Jenis Item Baru",
    searchPlaceholder: "Cari nama atau deskripsi jenis item...",
    nameColumnHeader: "Nama Jenis",
    noDataMessage: "Tidak ada data jenis item yang ditemukan",
    searchNoDataMessage: "Tidak ada jenis item dengan kata kunci",
  },
  units: {
    key: "units",
    label: "Satuan",
    entityName: "Satuan",
    addButtonText: "Tambah Satuan Baru",
    searchPlaceholder: "Cari nama atau deskripsi satuan...",
    nameColumnHeader: "Nama Satuan",
    noDataMessage: "Tidak ada data satuan yang ditemukan",
    searchNoDataMessage: "Tidak ada satuan dengan kata kunci",
  },
};

const ItemMasterNew = () => {
  const [activeTab, setActiveTab] = useState<MasterDataType>("categories");
  const searchInputRef = useRef<HTMLInputElement>(null) as React.RefObject<HTMLInputElement>;
  const dataGridRef = useRef<DataGridRef>(null);

  const currentConfig = tabConfigs[activeTab];

  // Data management hooks for each tab
  const categoriesManagement = useMasterDataManagement("item_categories", "Kategori", {
    searchInputRef,
  });
  const typesManagement = useMasterDataManagement("item_types", "Jenis Item", {
    searchInputRef,
  });
  const unitsManagement = useMasterDataManagement("item_units", "Satuan", {
    searchInputRef,
  });

  // Get current management based on active tab
  const getCurrentManagement = () => {
    switch (activeTab) {
      case "categories":
        return categoriesManagement;
      case "types":
        return typesManagement;
      case "units":
        return unitsManagement;
    }
  };

  const {
    data,
    isLoading,
    isError,
    queryError: error,
    isFetching,
    isAddModalOpen,
    setIsAddModalOpen,
    isEditModalOpen,
    setIsEditModalOpen,
    editingItem,
    currentPage,
    itemsPerPage,
    totalPages,
    totalItems,
    handleEdit,
    handleModalSubmit,
    handlePageChange,
    handleItemsPerPageChange,
    deleteMutation,
    openConfirmDialog,
    handleKeyDown,
    setSearch: setDataSearch,
  } = getCurrentManagement();

  // Stable callback functions to prevent infinite re-renders
  const handleSearch = useCallback((searchValue: string) => {
    setDataSearch(searchValue);
  }, [setDataSearch]);

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
    columns: itemMasterSearchColumns,
    searchMode: 'hybrid',
    useFuzzySearch: true,
    data: data,
    onSearch: handleSearch,
    onClear: handleClear,
  });


  // Event handlers
  const handleDelete = async (item: MasterDataEntity) => {
    openConfirmDialog({
      title: "Konfirmasi Hapus",
      message: `Apakah Anda yakin ingin menghapus ${currentConfig.entityName.toLowerCase()} "${item.name}"?`,
      variant: "danger",
      confirmText: "Ya, Hapus",
      onConfirm: async () => {
        await deleteMutation.mutateAsync(item.id);
      },
    });
  };

  const handleTabChange = (newTab: MasterDataType) => {
    if (newTab !== activeTab) {
      setActiveTab(newTab);
      // Clear search when switching tabs
      if (searchInputRef.current) {
        searchInputRef.current.value = "";
      }
    }
  };

  // Column definitions
  const columnDefs: ColDef[] = [
    createTextColumn({
      field: "name",
      headerName: currentConfig.nameColumnHeader,
      minWidth: 120,
    }),
    createTextColumn({
      field: "description",
      headerName: "Deskripsi",
      minWidth: 200,
      flex: 1,
      valueGetter: (params) => {
        return params.data.description || "-";
      },
    }),
  ];

  const onRowClicked = (event: RowClickedEvent) => {
    handleEdit(event.data);
  };

  return (
    <>
      <Card
        className={
          isFetching ? "opacity-75 transition-opacity duration-300" : ""
        }
      >
        <div className="mb-4">
          <PageTitle title="Item Master" />
        </div>

        <div className="flex items-center mb-4 mt-5">
          <LayoutGroup id="item-master-tabs">
            <div className="flex mb-4 items-center rounded-full bg-zinc-100 p-1 shadow-md text-gray-700 overflow-hidden select-none relative mr-4">
              {Object.values(tabConfigs).map((config) => (
                <button
                  key={config.key}
                  className={classNames(
                    "group px-4 py-2 rounded-full focus:outline-hidden select-none relative cursor-pointer z-10 transition-colors duration-150",
                    {
                      "hover:bg-emerald-100 hover:text-emerald-700":
                        activeTab !== config.key,
                    },
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
                      {
                        "text-white": activeTab === config.key,
                        "text-gray-700 group-hover:text-emerald-700":
                          activeTab !== config.key,
                      },
                    )}
                  >
                    {activeTab === config.key
                      ? `${config.label} Item`
                      : config.label}
                  </span>
                </button>
              ))}
            </div>
          </LayoutGroup>

          <EnhancedSearchBar
            inputRef={searchInputRef}
            {...searchBarProps}
            onKeyDown={handleKeyDown}
            placeholder={`${currentConfig.searchPlaceholder} atau ketik # untuk pencarian kolom spesifik`}
            className="grow"
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
            Error: {error?.message || "Gagal memuat data"}
          </div>
        ) : (
          <>
            <DataGrid
              ref={dataGridRef}
              rowData={data}
              columnDefs={columnDefs}
              onRowClicked={onRowClicked}
              onGridReady={onGridReady}
              loading={isLoading}
              overlayNoRowsTemplate={
                search
                  ? `<span style="padding: 10px; color: #888;">${currentConfig.searchNoDataMessage} "${search}"</span>`
                  : `<span style="padding: 10px; color: #888;">${currentConfig.noDataMessage}</span>`
              }
              autoSizeColumns={["name"]}
              isExternalFilterPresent={isExternalFilterPresent}
              doesExternalFilterPass={doesExternalFilterPass}
              style={{
                width: "100%",
                marginTop: "1rem",
                marginBottom: "1rem",
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

      <EntityManagementModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={async (formData) => {
          await handleModalSubmit({
            name: String(formData.name || ""),
            description: String(formData.description || ""),
            id: undefined,
          });
        }}
        isLoading={false}
        entityName={currentConfig.entityName}
      />

      <EntityManagementModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
        }}
        onSubmit={async (formData) => {
          await handleModalSubmit({
            name: String(formData.name || ""),
            description: String(formData.description || ""),
            id: editingItem?.id,
          });
        }}
        initialData={editingItem || undefined}
        onDelete={editingItem ? () => handleDelete(editingItem) : undefined}
        isLoading={false}
        isDeleting={deleteMutation.isLoading}
        entityName={currentConfig.entityName}
      />
    </>
  );
};

export default ItemMasterNew;
