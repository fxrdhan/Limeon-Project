import { useState, useRef, useCallback } from "react";
import Button from "@/components/button";
import Pagination from "@/components/pagination";
import EnhancedSearchBar from "@/components/search-bar/EnhancedSearchBar";
import PageTitle from "@/components/page-title";
import { EntityManagementModal, ItemManagementModal } from "@/features/item-management";
import { Card } from "@/components/card";
import { DataGrid, DataGridRef, createTextColumn } from "@/components/ag-grid";
import { ColDef, RowClickedEvent } from "ag-grid-community";
import { FaPlus } from "react-icons/fa";
import { motion, LayoutGroup } from "framer-motion";
import classNames from "classnames";

// Use the new modular architecture
import { useMasterDataManagement } from "@/handlers/masterData";

import type { Category, MedicineType, Unit, Item as ItemDataType } from "@/types/database";
import { useUnifiedSearch } from "@/hooks/useUnifiedSearch";
import { itemMasterSearchColumns, itemSearchColumns } from "@/utils/searchColumns";

// Additional imports for Items tab
import ItemSearchToolbar from "@/components/molecules/ItemSearchToolbar";
import ItemDataTable from "@/features/item-management/components/ItemDataTable";
import { useItemGridColumns } from "@/components/molecules/ItemGridColumns";

type MasterDataType = "categories" | "types" | "units" | "items";
type MasterDataEntity = Category | MedicineType | Unit | ItemDataType;

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
  items: {
    key: "items",
    label: "Item",
    entityName: "Item",
    addButtonText: "Tambah Item Baru",
    searchPlaceholder: "Cari nama, kode, atau deskripsi item...",
    nameColumnHeader: "Nama Item",
    noDataMessage: "Tidak ada data item yang ditemukan",
    searchNoDataMessage: "Tidak ada item dengan kata kunci",
  },
};

// Define tab order with items first
const tabOrder: MasterDataType[] = ["items", "categories", "types", "units"];

const ItemMasterNew = () => {
  const [activeTab, setActiveTab] = useState<MasterDataType>("items");
  const searchInputRef = useRef<HTMLInputElement>(null) as React.RefObject<HTMLInputElement>;
  const dataGridRef = useRef<DataGridRef>(null);

  // State for Items tab modal management
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isItemModalClosing, setIsItemModalClosing] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | undefined>(undefined);
  const [currentSearchQueryForModal, setCurrentSearchQueryForModal] = useState<string | undefined>(undefined);
  const [modalRenderId, setModalRenderId] = useState(0);

  const currentConfig = tabConfigs[activeTab];

  // Grid columns configuration for Items tab
  const { columnDefs: itemColumnDefs, columnsToAutoSize } = useItemGridColumns();

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
  const itemsManagement = useMasterDataManagement("items", "Item", {
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
      case "items":
        return itemsManagement;
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
    columns: activeTab === 'items' ? itemSearchColumns : itemMasterSearchColumns,
    searchMode: 'hybrid',
    useFuzzySearch: true,
    data: data,
    onSearch: handleSearch,
    onClear: handleClear,
  });


  // Event handlers for Items tab
  const openAddItemModal = (itemId?: string, searchQuery?: string) => {
    setEditingItemId(itemId);
    setCurrentSearchQueryForModal(searchQuery);
    setIsItemModalClosing(false);
    setIsAddItemModalOpen(true);
    setModalRenderId((prevId) => prevId + 1);
  };

  const closeAddItemModal = () => {
    setIsItemModalClosing(true);
    setTimeout(() => {
      setIsAddItemModalOpen(false);
      setIsItemModalClosing(false);
      setEditingItemId(undefined);
      setCurrentSearchQueryForModal(undefined);
    }, 100);
  };

  const handleItemEdit = (item: ItemDataType) => {
    openAddItemModal(item.id);
  };

  const handleItemSelect = (itemId: string) => {
    openAddItemModal(itemId);
  };

  const handleAddItem = (itemId?: string, searchQuery?: string) => {
    openAddItemModal(itemId, searchQuery);
  };

  // Event handlers for other tabs
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
      // Reset item modal state when switching tabs
      if (isAddItemModalOpen) {
        closeAddItemModal();
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
        
        <div className="mb-4">
          <LayoutGroup id="item-master-tabs">
            <div className="flex items-center rounded-full bg-zinc-100 p-1 shadow-md text-gray-700 overflow-hidden select-none relative w-fit">
              {tabOrder.map((tabKey) => {
                const config = tabConfigs[tabKey];
                return (
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
                        ? (config.key === "items" ? "Daftar Item" : `${config.label} Item`)
                        : config.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </LayoutGroup>
        </div>

        <div className="flex items-center mb-4">
          {activeTab === 'items' ? (
            <div className="grow">
              <ItemSearchToolbar
                searchInputRef={searchInputRef}
                searchBarProps={searchBarProps}
                search={search}
                items={data as ItemDataType[]}
                onAddItem={handleAddItem}
                onItemSelect={handleItemSelect}
              />
            </div>
          ) : (
            <EnhancedSearchBar
              inputRef={searchInputRef}
              {...searchBarProps}
              onKeyDown={handleKeyDown}
              placeholder={`${currentConfig.searchPlaceholder} atau ketik # untuk pencarian kolom spesifik`}
              className="grow"
            />
          )}

          {activeTab !== 'items' && (
            <Button
              variant="primary"
              className="flex items-center ml-4"
              onClick={() => setIsAddModalOpen(true)}
              withGlow
            >
              <FaPlus className="mr-2" />
              {currentConfig.addButtonText}
            </Button>
          )}
        </div>

        {isError ? (
          <div className="text-center p-6 text-red-500">
            Error: {error?.message || "Gagal memuat data"}
          </div>
        ) : activeTab === 'items' ? (
          <ItemDataTable
            items={data as ItemDataType[]}
            columnDefs={itemColumnDefs}
            columnsToAutoSize={columnsToAutoSize}
            isLoading={isLoading}
            isError={isError}
            error={error}
            search={search}
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onRowClick={handleItemEdit}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
            onGridReady={onGridReady}
            isExternalFilterPresent={isExternalFilterPresent}
            doesExternalFilterPass={doesExternalFilterPass}
          />
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

      {/* Modals for non-items tabs */}
      {activeTab !== 'items' && (
        <>
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
      )}

      {/* Modal for items tab */}
      {activeTab === 'items' && (
        <ItemManagementModal
          key={`${editingItemId ?? "new"}-${currentSearchQueryForModal ?? ""}-${modalRenderId}`}
          isOpen={isAddItemModalOpen}
          onClose={closeAddItemModal}
          itemId={editingItemId}
          initialSearchQuery={currentSearchQueryForModal}
          isClosing={isItemModalClosing}
          setIsClosing={setIsItemModalClosing}
        />
      )}
    </>
  );
};

export default ItemMasterNew;
