import Button from "@/components/button";
import EnhancedSearchBar from "@/components/search-bar/EnhancedSearchBar";
import PageTitle from "@/components/page-title";
import Pagination from "@/components/pagination";

import { useState, useRef, useMemo, useCallback } from "react";
// import { useLocation } from "react-router-dom";
import {
  DataGrid,
  createTextColumn,
  createWrapTextColumn,
  createCurrencyColumn,
  createCenterAlignColumn,
  formatCurrency,
  formatBaseCurrency,
} from "@/components/ag-grid";
import { ColDef, RowClickedEvent } from "ag-grid-community";
import { useEnhancedAgGridSearch } from "@/hooks/useEnhancedAgGridSearch";
import { FaPlus } from "react-icons/fa";
import { Card } from "@/components/card";
import type { Item as ItemDataType, UnitConversion } from "@/types";
import type { TargetedSearch } from "@/types/search";
import AddItemPortal from "@/components/add-edit/v2";

// Use the new modular architecture
import { useMasterDataManagement } from "@/handlers/masterData-new";

import { getSearchState } from "@/utils/search";
import { itemSearchColumns } from "@/utils/searchColumns";

function ItemListNew() {
  const searchInputRef = useRef<HTMLInputElement>(
    null,
  ) as React.RefObject<HTMLInputElement>;
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const {
    search,
    handleSearchChange,
    onGridReady,
    isExternalFilterPresent,
    doesExternalFilterPass,
    handleTargetedSearch: originalHandleTargetedSearch,
    handleGlobalSearch: originalHandleGlobalSearch,
    clearSearch,
  } = useEnhancedAgGridSearch({
    columns: itemSearchColumns,
    useFuzzySearch: true,
  });

  const {
    currentPage,
    itemsPerPage,
    data: rawItems,
    totalItems: totalItemsState,
    totalPages,
    isLoading: isLoadingState,
    isError: isErrorState,
    queryError: errorState,
    handlePageChange,
    handleItemsPerPageChange,
    setSearch: setDataSearch,
  } = useMasterDataManagement("items", "Item", {
    searchInputRef,
    isCustomModalOpen: isAddItemModalOpen,
    handleSearchChange,
  });

  // Synchronize search state between UI and data management hooks
  const handleGlobalSearch = useCallback(
    (searchValue: string) => {
      // Update the UI search state
      originalHandleGlobalSearch(searchValue);
      // Update the data management search state
      setDataSearch(searchValue);
    },
    [originalHandleGlobalSearch, setDataSearch],
  );

  const handleTargetedSearch = useCallback(
    (targetedSearch: TargetedSearch | null) => {
      // Update the UI search state
      originalHandleTargetedSearch(targetedSearch);
      // For targeted search, we still need to clear the data search since
      // AG Grid will handle the filtering, not the data management hook
      setDataSearch("");
    },
    [originalHandleTargetedSearch, setDataSearch],
  );

  // Create a comprehensive clear function that synchronizes both hooks
  const handleClearSearch = useCallback(() => {
    // Clear the UI search state (AG Grid filters)
    clearSearch();
    // Clear the data management search state
    setDataSearch("");
  }, [clearSearch, setDataSearch]);

  const items = rawItems;

  const [editingItemId, setEditingItemId] = useState<string | undefined>(
    undefined,
  );
  const [currentSearchQueryForModal, setCurrentSearchQueryForModal] = useState<
    string | undefined
  >(undefined);
  const [modalRenderId, setModalRenderId] = useState(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);


  const columnsToAutoSize = [
    "code",
    "manufacturer",
    "barcode",
    "category.name",
    "type.name",
    "unit.name",
    "unit_conversions",
    "base_price",
    "sell_price",
    "stock",
  ];

  const handleFirstDataRendered = () => {
    setIsInitialLoad(false);
  };

  const columnDefs: ColDef[] = useMemo(() => {
    const columns: ColDef[] = [
      createTextColumn({
        field: "name",
        headerName: "Nama Item",
        minWidth: 200,
        flex: 1,
      }),
      createTextColumn({
        field: "manufacturer",
        headerName: "Produsen",
        minWidth: 120,
        valueGetter: (params) => params.data.manufacturer || "-",
      }),
      createTextColumn({
        field: "code",
        headerName: "Kode",
        minWidth: 80,
      }),
      createTextColumn({
        field: "barcode",
        headerName: "Barcode",
        minWidth: 100,
        valueGetter: (params) => params.data.barcode || "-",
      }),
      createTextColumn({
        field: "category.name",
        headerName: "Kategori",
        minWidth: 100,
      }),
      createWrapTextColumn({
        field: "type.name",
        headerName: "Jenis",
        minWidth: 120,
      }),
      createTextColumn({
        field: "unit.name",
        headerName: "Satuan",
        minWidth: 80,
      }),
      createTextColumn({
        field: "unit_conversions",
        headerName: "Satuan Turunan",
        minWidth: 140,
        valueGetter: (params) => {
          const conversions = params.data.unit_conversions;
          if (conversions && conversions.length > 0) {
            return conversions
              .map((uc: UnitConversion) => uc.unit?.name || "N/A")
              .join(", ");
          }
          return "-";
        },
      }),
      createCurrencyColumn({
        field: "base_price",
        headerName: "Harga Pokok",
        minWidth: 120,
        valueFormatter: (params) => formatBaseCurrency(params.value),
      }),
      createCurrencyColumn({
        field: "sell_price",
        headerName: "Harga Jual",
        minWidth: 120,
        valueFormatter: (params) => formatCurrency(params.value),
      }),
      createCenterAlignColumn({
        field: "stock",
        headerName: "Stok",
      }),
    ];

    return columns;
  }, []);

  const openAddItemModal = (itemId?: string, searchQuery?: string) => {
    // Set the data for the modal
    setEditingItemId(itemId);
    setCurrentSearchQueryForModal(searchQuery);

    // Ensure the modal is not in a closing state and is open
    setIsClosing(false);
    setIsAddItemModalOpen(true);

    // Force re-mount of the modal component by updating its key
    setModalRenderId((prevId) => prevId + 1);
  };

  const closeAddItemModal = () => {
    setIsClosing(true); // Trigger fade-out animation
    setTimeout(() => {
      setIsAddItemModalOpen(false); // Close modal after animation
      setIsClosing(false); // Reset closing state
      setEditingItemId(undefined);
      setCurrentSearchQueryForModal(undefined);
    }, 100); // Adjust timeout to match animation duration
  };

  const handleItemEdit = (item: ItemDataType) => {
    openAddItemModal(item.id);
  };

  const handleItemKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();

      if (items.length > 0) {
        const firstItem = items[0] as ItemDataType;
        openAddItemModal(firstItem.id);
      } else if (search.trim() !== "") {
        openAddItemModal(undefined, search);
      }
    }
  };
  const onRowClicked = (event: RowClickedEvent) => {
    handleItemEdit(event.data);
  };

  return (
    <>
      <Card
        className={
          isLoadingState
            ? "opacity-75 transition-opacity duration-300 flex-1 flex flex-col"
            : "flex-1 flex flex-col"
        }
      >
        <div className="mb-6">
          <PageTitle title="Daftar Item" />
        </div>
        <div className="flex items-center">
          <EnhancedSearchBar
            inputRef={searchInputRef}
            value={search}
            onChange={handleSearchChange}
            onKeyDown={handleItemKeyDown}
            placeholder="Cari di semua kolom atau ketik # untuk pencarian kolom spesifik..."
            className="grow"
            searchState={getSearchState(search, search, items)}
            columns={itemSearchColumns}
            onTargetedSearch={handleTargetedSearch}
            onGlobalSearch={handleGlobalSearch}
            onClearSearch={handleClearSearch}
          />
          <Button
            variant="primary"
            withGlow
            className="flex items-center ml-4 mb-4"
            onClick={() => openAddItemModal(undefined, search)}
          >
            <FaPlus className="mr-2" />
            Tambah Item Baru
          </Button>
        </div>
        {isErrorState && (
          <div className="text-center p-6 text-red-500">
            Error:{" "}
            {errorState instanceof Error
              ? errorState.message
              : "Gagal memuat data"}
          </div>
        )}
        {!isErrorState && (
          <>
            <DataGrid
              rowData={items as ItemDataType[]}
              columnDefs={columnDefs}
              onRowClicked={onRowClicked}
              onGridReady={onGridReady}
              loading={isLoadingState}
              overlayNoRowsTemplate={
                search
                  ? `<span style="padding: 10px; color: #888;">Tidak ada item dengan nama "${search}"</span>`
                  : '<span style="padding: 10px; color: #888;">Tidak ada data item yang ditemukan</span>'
              }
              autoSizeColumns={columnsToAutoSize}
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
              totalItems={totalItemsState}
              itemsPerPage={itemsPerPage}
              itemsCount={items.length}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          </>
        )}
      </Card>
      <AddItemPortal
        key={`${
          editingItemId ?? "new"
        }-${currentSearchQueryForModal ?? ""}-${modalRenderId}`}
        isOpen={isAddItemModalOpen}
        onClose={closeAddItemModal}
        itemId={editingItemId}
        initialSearchQuery={currentSearchQueryForModal}
        isClosing={isClosing}
        setIsClosing={setIsClosing}
      />
    </>
  );
}

export default ItemListNew;