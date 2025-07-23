import React, { useState, useRef } from "react";
import Button from "@/components/button";
import Pagination from "@/components/pagination";
import EnhancedSearchBar from "@/components/search-bar/EnhancedSearchBar";
import PageTitle from "@/components/page-title";
import AddEditModal from "@/components/add-edit/v1";
import { Card } from "@/components/card";
import { DataGrid, DataGridRef, createTextColumn } from "@/components/ag-grid";
import { ColDef, RowClickedEvent, GridReadyEvent } from "ag-grid-community";
import { FaPlus } from "react-icons/fa";
import { motion, LayoutGroup } from "framer-motion";
import classNames from "classnames";

// Import our new hooks
import { 
  useCategories, 
  useCategoryMutations,
  useMedicineTypes, 
  useMedicineTypeMutations,
  useUnits,
  useUnitMutations
} from "@/hooks/queries";

// Services are available but not used in this component

import type { Category, MedicineType, Unit } from "@/types/database";
import { useAlert } from "@/components/alert/hooks";
import { useConfirmDialog } from "@/components/dialog-box";
import { useEnhancedAgGridSearch } from "@/hooks/useEnhancedAgGridSearch";
import { itemMasterSearchColumns } from "@/utils/searchColumns";
import { getSearchState } from "@/utils/search";

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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterDataEntity | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dataGridRef = useRef<DataGridRef>(null);
  
  const { openConfirmDialog } = useConfirmDialog();
  const alert = useAlert();

  const currentConfig = tabConfigs[activeTab];

  // Enhanced search functionality
  const {
    search,
    handleSearchChange,
    onGridReady: originalOnGridReady,
    clearSearch,
    isExternalFilterPresent,
    doesExternalFilterPass,
    handleTargetedSearch,
    handleGlobalSearch,
  } = useEnhancedAgGridSearch({
    columns: itemMasterSearchColumns,
    useFuzzySearch: true,
  });

  // Enhanced onGridReady 
  const onGridReady = React.useCallback((params: GridReadyEvent) => {
    originalOnGridReady(params);
  }, [originalOnGridReady]);

  // Data hooks - conditionally fetch based on active tab
  const categoriesQuery = useCategories({ enabled: activeTab === "categories" });
  const typesQuery = useMedicineTypes({ enabled: activeTab === "types" });
  const unitsQuery = useUnits({ enabled: activeTab === "units" });

  // Mutation hooks
  const categoryMutations = useCategoryMutations();
  const typeMutations = useMedicineTypeMutations();
  const unitMutations = useUnitMutations();

  // Get current data and mutations based on active tab
  const getCurrentData = () => {
    switch (activeTab) {
      case "categories":
        return {
          data: categoriesQuery.data || [],
          isLoading: categoriesQuery.isLoading,
          isError: categoriesQuery.isError,
          error: categoriesQuery.error,
          isFetching: categoriesQuery.isFetching,
        };
      case "types":
        return {
          data: typesQuery.data || [],
          isLoading: typesQuery.isLoading,
          isError: typesQuery.isError,
          error: typesQuery.error,
          isFetching: typesQuery.isFetching,
        };
      case "units":
        return {
          data: unitsQuery.data || [],
          isLoading: unitsQuery.isLoading,
          isError: unitsQuery.isError,
          error: unitsQuery.error,
          isFetching: unitsQuery.isFetching,
        };
    }
  };

  const getCurrentMutations = () => {
    switch (activeTab) {
      case "categories":
        return {
          create: categoryMutations.createCategory,
          update: categoryMutations.updateCategory,
          delete: categoryMutations.deleteCategory,
        };
      case "types":
        return {
          create: typeMutations.createType,
          update: typeMutations.updateType,
          delete: typeMutations.deleteType,
        };
      case "units":
        return {
          create: unitMutations.createUnit,
          update: unitMutations.updateUnit,
          delete: unitMutations.deleteUnit,
        };
    }
  };

  const { data, isLoading, isError, error, isFetching } = getCurrentData();
  const mutations = getCurrentMutations();

  // Create a comprehensive clear function
  const handleClearSearch = React.useCallback(() => {
    // Clear the UI search state (AG Grid filters)
    clearSearch();
    // Clear the search input value
    if (searchInputRef.current) {
      searchInputRef.current.value = "";
    }
  }, [clearSearch]);

  // Client-side pagination using useMemo for stable references
  const paginatedData = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage, itemsPerPage]);

  // Pagination calculations
  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Event handlers
  const handleEdit = (item: MasterDataEntity) => {
    setEditingItem(item);
    setIsEditModalOpen(true);
  };

  const handleModalSubmit = async (formData: { name: string; description?: string }) => {
    try {
      if (editingItem) {
        // Update
        await mutations.update.mutateAsync({
          id: editingItem.id,
          data: formData
        });
        alert.success(`${currentConfig.entityName} berhasil diperbarui`);
        setIsEditModalOpen(false);
        setEditingItem(null);
      } else {
        // Create
        await mutations.create.mutateAsync(formData);
        alert.success(`${currentConfig.entityName} berhasil ditambahkan`);
        setIsAddModalOpen(false);
      }
    } catch (error) {
      console.error("Mutation error:", error);
      alert.error(`Gagal ${editingItem ? 'memperbarui' : 'menambahkan'} ${currentConfig.entityName.toLowerCase()}`);
    }
  };

  const handleDelete = async (item: MasterDataEntity) => {
    openConfirmDialog({
      title: "Konfirmasi Hapus",
      message: `Apakah Anda yakin ingin menghapus ${currentConfig.entityName.toLowerCase()} "${item.name}"?`,
      variant: "danger",
      confirmText: "Ya, Hapus",
      onConfirm: async () => {
        try {
          await mutations.delete.mutateAsync(item.id);
          alert.success(`${currentConfig.entityName} berhasil dihapus`);
          setIsEditModalOpen(false);
          setEditingItem(null);
        } catch (error) {
          console.error("Delete error:", error);
          alert.error(`Gagal menghapus ${currentConfig.entityName.toLowerCase()}`);
        }
      },
    });
  };

  const handleTabChange = (newTab: MasterDataType) => {
    if (newTab !== activeTab) {
      setActiveTab(newTab);
      setCurrentPage(1);
      handleClearSearch();
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
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
          <PageTitle title="Item Master (New Architecture)" />
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
                      "hover:bg-emerald-100 hover:text-emerald-700": activeTab !== config.key
                    }
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
                        "text-gray-700 group-hover:text-emerald-700": activeTab !== config.key
                      }
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
            value={search}
            onChange={handleSearchChange}
            placeholder={`${currentConfig.searchPlaceholder} atau ketik # untuk pencarian kolom spesifik`}
            className="grow"
            searchState={getSearchState(search, search, paginatedData)}
            columns={itemMasterSearchColumns}
            onTargetedSearch={handleTargetedSearch}
            onGlobalSearch={handleGlobalSearch}
            onClearSearch={handleClearSearch}
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
              rowData={paginatedData}
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
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              itemsCount={paginatedData.length}
              onPageChange={handlePageChange}
              onItemsPerPageChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
              hideFloatingWhenModalOpen={isAddModalOpen || isEditModalOpen}
            />
          </>
        )}
      </Card>

      <AddEditModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleModalSubmit}
        isLoading={mutations.create.isPending}
        entityName={currentConfig.entityName}
      />

      <AddEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingItem(null);
        }}
        onSubmit={handleModalSubmit}
        initialData={editingItem || undefined}
        onDelete={editingItem ? () => handleDelete(editingItem) : undefined}
        isLoading={mutations.update.isPending}
        isDeleting={mutations.delete.isPending}
        entityName={currentConfig.entityName}
      />
    </>
  );
};

export default ItemMasterNew;